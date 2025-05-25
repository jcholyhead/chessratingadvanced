# API Error Handling

This document provides comprehensive information about error handling in the Chess Rating Analytics Dashboard API, including error codes, common scenarios, and troubleshooting guidance.

## Error Response Format

All API endpoints return errors in a consistent JSON format:

```typescript
interface ErrorResponse {
  error: string;           // Human-readable error message
  details?: string;        // Additional error details (optional)
  code?: string;          // Error code for programmatic handling (optional)
  timestamp?: string;     // ISO timestamp of when error occurred (optional)
}
```

## HTTP Status Codes

The API uses standard HTTP status codes to indicate the type of error:

| Status Code | Meaning | Description |
|-------------|---------|-------------|
| `200` | OK | Request successful |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Authentication required (future use) |
| `403` | Forbidden | Access denied (future use) |
| `404` | Not Found | Requested resource not found |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server-side error occurred |
| `502` | Bad Gateway | External API (ECF) error |
| `503` | Service Unavailable | Service temporarily unavailable |
| `504` | Gateway Timeout | External API (ECF) timeout |

## Error Categories

### 1. Validation Errors (400)

These errors occur when request parameters are invalid or missing.

#### Missing Required Parameters

```json
{
  "error": "Player code is required",
  "code": "MISSING_PARAMETER"
}
```

**Common scenarios:**
- `/api/player-details` called without `playerCode`
- `/api/chess-results` called without `playerCode`
- `/api/official-rating` called without `playerCode` or `gameType`

#### Invalid Parameter Format

```json
{
  "error": "Name must be at least 3 characters long",
  "code": "INVALID_PARAMETER_LENGTH"
}
```

**Common scenarios:**
- Player search with name shorter than 3 characters
- Invalid ECF player code format
- Invalid game type parameter

#### Invalid Game Type

```json
{
  "error": "Invalid game type. Must be one of: Standard, Rapid, Blitz",
  "code": "INVALID_GAME_TYPE"
}
```

**Valid game types:**
- `Standard` (for classical chess)
- `Rapid` (for rapid chess)
- `Blitz` (for blitz chess)

### 2. External API Errors (500-504)

These errors occur when the ECF API is unavailable or returns errors.

#### ECF API Unavailable

```json
{
  "error": "Failed to fetch player details",
  "details": "ECF API returned status 500",
  "code": "EXTERNAL_API_ERROR"
}
```

#### ECF API Timeout

```json
{
  "error": "Request timeout",
  "details": "ECF API did not respond within 30 seconds",
  "code": "EXTERNAL_API_TIMEOUT"
}
```

#### Invalid ECF Response

```json
{
  "error": "Invalid response from ECF API",
  "details": "Expected JSON, received HTML",
  "code": "INVALID_EXTERNAL_RESPONSE"
}
```

### 3. Resource Not Found (404)

```json
{
  "error": "Player not found",
  "details": "No player found with code: ABC123",
  "code": "PLAYER_NOT_FOUND"
}
```

**Common scenarios:**
- Player code doesn't exist in ECF database
- Player has been removed or merged in ECF system
- Typo in player code

### 4. Rate Limiting (429)

```json
{
  "error": "Too many requests",
  "details": "Rate limit exceeded. Please try again in 60 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

**Note:** Currently not implemented but planned for future use.

## Endpoint-Specific Errors

### Player Search (`/api/player-search`)

| Error Code | HTTP Status | Description | Solution |
|------------|-------------|-------------|-----------|
| `MISSING_PARAMETER` | 400 | `name` parameter missing | Include `name` query parameter |
| `INVALID_PARAMETER_LENGTH` | 400 | Name too short (< 3 chars) | Use at least 3 characters |
| `EXTERNAL_API_ERROR` | 500 | ECF API error | Check ECF API status, try again later |

**Example request:**
```bash
GET /api/player-search?name=Smith
```

### Player Details (`/api/player-details`)

| Error Code | HTTP Status | Description | Solution |
|------------|-------------|-------------|-----------|
| `MISSING_PARAMETER` | 400 | `playerCode` parameter missing | Include `playerCode` query parameter |
| `PLAYER_NOT_FOUND` | 404 | Player doesn't exist | Verify player code is correct |
| `EXTERNAL_API_ERROR` | 500 | ECF API error | Check ECF API status, try again later |

**Example request:**
```bash
GET /api/player-details?playerCode=123456
```

### Chess Results (`/api/chess-results`)

| Error Code | HTTP Status | Description | Solution |
|------------|-------------|-------------|-----------|
| `MISSING_PARAMETER` | 400 | `playerCode` parameter missing | Include `playerCode` query parameter |
| `INVALID_GAME_TYPE` | 400 | Invalid `gameType` parameter | Use: Standard, Rapid, or Blitz |
| `PLAYER_NOT_FOUND` | 404 | Player doesn't exist | Verify player code is correct |
| `NO_GAMES_FOUND` | 404 | No games for this player/type | Player may not have played this game type |
| `EXTERNAL_API_ERROR` | 500 | ECF API error | Check ECF API status, try again later |

**Example request:**
```bash
GET /api/chess-results?playerCode=123456&gameType=Standard
```

### Official Rating (`/api/official-rating`)

| Error Code | HTTP Status | Description | Solution |
|------------|-------------|-------------|-----------|
| `MISSING_PARAMETER` | 400 | Missing required parameters | Include both `playerCode` and `gameType` |
| `INVALID_GAME_TYPE` | 400 | Invalid `gameType` parameter | Use: Standard, Rapid, or Blitz |
| `PLAYER_NOT_FOUND` | 404 | Player doesn't exist | Verify player code is correct |
| `RATING_NOT_FOUND` | 404 | No rating for this game type | Player may not have rating in this category |
| `EXTERNAL_API_ERROR` | 500 | ECF API error | Check ECF API status, try again later |

**Example request:**
```bash
GET /api/official-rating?playerCode=123456&gameType=Standard
```

## Error Handling Best Practices

### For Frontend Development

#### 1. Handle Different Error Types

```typescript
async function fetchPlayerDetails(playerCode: string) {
  try {
    const response = await fetch(`/api/player-details?playerCode=${playerCode}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      
      switch (response.status) {
        case 400:
          throw new ValidationError(errorData.error);
        case 404:
          throw new NotFoundError(errorData.error);
        case 500:
          throw new ServerError(errorData.error);
        default:
          throw new Error(errorData.error);
      }
    }
    
    return await response.json();
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError) {
      throw new NetworkError('Network connection failed');
    }
    throw error;
  }
}
```

#### 2. Implement Retry Logic

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        return await response.json();
      }
      
      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(await response.text());
      }
      
      // Retry on 5xx errors (server errors)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      throw new Error(`Request failed after ${maxRetries} attempts`);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

#### 3. User-Friendly Error Messages

```typescript
function getDisplayMessage(error: ApiError): string {
  switch (error.code) {
    case 'MISSING_PARAMETER':
      return 'Please provide all required information.';
    case 'PLAYER_NOT_FOUND':
      return 'Player not found. Please check the player code and try again.';
    case 'EXTERNAL_API_ERROR':
      return 'Unable to fetch data right now. Please try again in a few minutes.';
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too many requests. Please wait a moment before trying again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
```

### For Backend Development

#### 1. Consistent Error Responses

```typescript
class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string,
    public details?: string
  ) {
    super(message);
  }
}

function handleError(error: ApiError | Error): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({
      error: error.message,
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString()
    }, { status: error.statusCode });
  }
  
  // Log unexpected errors
  console.error('Unexpected error:', error);
  
  return NextResponse.json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  }, { status: 500 });
}
```

#### 2. Input Validation

```typescript
function validatePlayerCode(playerCode: string): void {
  if (!playerCode) {
    throw new ApiError('Player code is required', 400, 'MISSING_PARAMETER');
  }
  
  if (!/^\d+$/.test(playerCode)) {
    throw new ApiError('Player code must be numeric', 400, 'INVALID_PARAMETER_FORMAT');
  }
}

function validateGameType(gameType: string): void {
  const validTypes = ['Standard', 'Rapid', 'Blitz'];
  
  if (!gameType) {
    throw new ApiError('Game type is required', 400, 'MISSING_PARAMETER');
  }
  
  if (!validTypes.includes(gameType)) {
    throw new ApiError(
      `Invalid game type. Must be one of: ${validTypes.join(', ')}`,
      400,
      'INVALID_GAME_TYPE'
    );
  }
}
```

## Monitoring and Logging

### Error Logging

All errors should be logged with appropriate detail levels:

```typescript
// Log error details for debugging
console.error('ECF API Error:', {
  endpoint: apiUrl,
  playerCode,
  gameType,
  status: response.status,
  error: error.message,
  timestamp: new Date().toISOString()
});
```

### Error Metrics

Track these metrics for monitoring:

- **Error rate by endpoint**
- **Error rate by status code**
- **External API error rate**
- **Response time percentiles**
- **Cache hit/miss ratios**

## Troubleshooting Guide

### Common Issues and Solutions

#### "Player code is required"
**Cause:** Missing `playerCode` parameter  
**Solution:** Include the player code in the query string

#### "Name must be at least 3 characters long"
**Cause:** Search term too short  
**Solution:** Use at least 3 characters for player search

#### "Failed to fetch player details"
**Cause:** ECF API is down or slow  
**Solution:** Wait and try again, check ECF website status

#### "Player not found"
**Cause:** Invalid or non-existent player code  
**Solution:** Verify player code from ECF website

#### Slow API responses
**Cause:** ECF API performance issues  
**Solution:** Check cache configuration, consider increasing cache duration

### Debug Mode

For development, you can enable detailed error logging:

```bash
NODE_ENV=development npm run dev
```

This will provide additional error details and stack traces.

---

*For specific endpoint documentation, see:*
- *[ECF Integration Overview](ecf-integration.md)*
- *[Rate Limiting Guide](rate-limiting.md)*

*Last updated: May 2025* 