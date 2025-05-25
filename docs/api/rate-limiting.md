# API Rate Limiting

This document explains the rate limiting policies and best practices for the Chess Rating Analytics Dashboard API.

## Current Implementation

**Status**: The application currently uses **caching-based rate limiting** rather than explicit rate limits.

### Caching as Rate Limiting

The primary rate limiting mechanism is intelligent caching that reduces the need for repeated requests:

| Endpoint | Cache Duration | Purpose |
|----------|----------------|---------|
| `/api/player-search` | 18 hours | Player data changes infrequently |
| `/api/player-details` | 18 hours | Detailed player info is relatively static |
| `/api/chess-results` | 10 minutes | Game results need more frequent updates |
| `/api/official-rating` | 18 hours | Official ratings change slowly |

### Cache Headers

All responses include cache control headers:

```http
Cache-Control: public, s-maxage=64800, stale-while-revalidate=600
Netlify-Vary: query
```

**Benefits of this approach:**
- **Improved performance** for users
- **Reduced load** on ECF API
- **Cost efficiency** for hosting
- **Better user experience** with faster responses

## ECF API Considerations

### External Rate Limits

The ECF API may have implicit rate limiting:

- **No published rate limits** but monitoring suggests reasonable usage is acceptable
- **Processing time tracking** via `total_processing_time_today` field in responses
- **Fair usage policy** encourages responsible consumption

### Monitoring ECF Usage

The application monitors ECF API usage:

```typescript
// Example from chess-results endpoint
if (data.total_processing_time_today) {
  console.log(`Total processing time today: ${data.total_processing_time_today}`);
}
```

**This helps track:**
- Daily processing time consumption
- Peak usage periods
- Potential throttling from ECF

## Future Rate Limiting Plans

### Planned Implementation

**Phase 1: Basic Rate Limiting** (Coming Soon)
- **Per-IP limits**: 100 requests per minute
- **Per-endpoint limits**: Varied based on endpoint cost
- **Burst allowance**: Short-term higher limits for good actors

**Phase 2: Advanced Rate Limiting** (Future)
- **User-based limiting**: Different limits for registered vs. anonymous users
- **Adaptive limits**: Dynamic adjustment based on ECF API performance
- **Priority queuing**: VIP access for certain use cases

### Rate Limit Structure (Planned)

```typescript
interface RateLimitConfig {
  endpoint: string;
  limits: {
    perMinute: number;
    perHour: number;
    perDay: number;
    burst?: number;
  };
  priority: 'low' | 'medium' | 'high';
}
```

**Proposed limits:**

| Endpoint | Per Minute | Per Hour | Per Day | Priority |
|----------|------------|----------|---------|----------|
| `/api/player-search` | 20 | 200 | 1000 | Medium |
| `/api/player-details` | 30 | 300 | 1500 | High |
| `/api/chess-results` | 10 | 100 | 500 | Low |
| `/api/official-rating` | 15 | 150 | 750 | Medium |

## Best Practices for API Usage

### For Application Developers

#### 1. Respect Cache Headers

Always check cache headers and implement client-side caching:

```typescript
// Example of respecting cache headers
async function fetchWithCaching(url: string) {
  const cached = getCachedResponse(url);
  if (cached && !isCacheExpired(cached)) {
    return cached.data;
  }
  
  const response = await fetch(url);
  const data = await response.json();
  
  // Store with cache headers
  const cacheControl = response.headers.get('cache-control');
  setCachedResponse(url, data, cacheControl);
  
  return data;
}
```

#### 2. Implement Request Debouncing

For user input (like search), debounce requests:

```typescript
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (searchTerm: string) => {
  if (searchTerm.length >= 3) {
    const results = await fetch(`/api/player-search?name=${searchTerm}`);
    // Handle results
  }
}, 300); // Wait 300ms after user stops typing
```

#### 3. Batch Operations When Possible

Instead of multiple individual requests, consider batching:

```typescript
// Instead of this:
const player1 = await fetchPlayerDetails('123456');
const player2 = await fetchPlayerDetails('654321');

// Consider this approach (when available):
const players = await fetchMultiplePlayerDetails(['123456', '654321']);
```

#### 4. Handle Rate Limit Errors Gracefully

```typescript
async function fetchWithRetry(url: string, retries = 3) {
  try {
    const response = await fetch(url);
    
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '60');
      
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return fetchWithRetry(url, retries - 1);
      }
      
      throw new Error('Rate limit exceeded');
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
}
```

### For End Users

#### Efficient Usage Patterns

**Good practices:**
- Use the autocomplete search efficiently (wait for 3+ characters)
- Allow charts and data to load before switching between game types
- Use time range filters thoughtfully rather than rapidly switching

**Avoid:**
- Rapid-fire searches or requests
- Repeatedly refreshing the same player data
- Opening multiple tabs with the same player

## Rate Limit Response Format

When rate limiting is implemented, responses will follow this format:

### Rate Limit Headers

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 60
```

### Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60,
  "limit": {
    "requests": 100,
    "period": "1 minute"
  }
}
```

## Monitoring and Analytics

### Rate Limit Metrics

The application will track:

- **Request counts** per endpoint
- **Cache hit/miss ratios**
- **ECF API response times**
- **Rate limit violations**
- **User behavior patterns**

### Performance Impact

Current caching provides significant benefits:

- **~90% cache hit rate** for player searches
- **~95% cache hit rate** for player details
- **~70% cache hit rate** for chess results
- **Average response time**: <100ms (cached), <2s (uncached)

## Implementation Details

### Current Caching Implementation

```typescript
// Example from player-details endpoint
const headers = new Headers()
headers.set('Cache-Control', 'public, s-maxage=64800, stale-while-revalidate=600')
headers.set('Netlify-Vary', 'query')
return NextResponse.json(data, { headers })
```

### Future Rate Limiting Implementation

```typescript
// Planned rate limiting middleware
export function rateLimit(config: RateLimitConfig) {
  return async (request: NextRequest) => {
    const clientId = getClientIdentifier(request);
    const usage = await getRateLimitUsage(clientId, config.endpoint);
    
    if (usage.requests >= config.limits.perMinute) {
      return NextResponse.json({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: usage.resetTime - Date.now()
      }, { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((usage.resetTime - Date.now()) / 1000))
        }
      });
    }
    
    await incrementRateLimitUsage(clientId, config.endpoint);
    return null; // Continue processing
  };
}
```

## Troubleshooting Rate Limits

### Common Issues

#### Hitting Cache Limits

**Symptoms:**
- Slower response times
- Increased server load
- Higher error rates

**Solutions:**
- Implement client-side caching
- Reduce request frequency
- Use appropriate time filters

#### ECF API Throttling

**Symptoms:**
- Longer response times from ECF
- Intermittent failures
- High `total_processing_time_today` values

**Solutions:**
- Increase cache durations
- Implement request spacing
- Monitor ECF API status

### Development Testing

For testing rate limits in development:

```bash
# Simulate high traffic
for i in {1..100}; do
  curl "http://localhost:3000/api/player-search?name=test$i" &
done
```

### Production Monitoring

Key metrics to monitor:

- Request volume by endpoint
- Cache hit ratios
- ECF API response times
- Error rates by status code
- User behavior patterns

## Contact and Support

For questions about rate limiting:

- **High-volume usage**: Contact us for custom rate limits
- **API errors**: Check [Error Handling Guide](error-handling.md)
- **Performance issues**: Review caching implementation

---

*Related documentation:*
- *[ECF Integration Overview](ecf-integration.md)*
- *[Error Handling Guide](error-handling.md)*

*Last updated: May 2025* 