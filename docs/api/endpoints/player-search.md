# Player Search API

Search for chess players by name in the ECF database.

## Endpoint

```
GET /api/player-search
```

## Description

This endpoint allows you to search for chess players by their name. It returns a list of matching players with their basic information including ECF codes, names, and membership details.

## Parameters

### Query Parameters

| Parameter | Type | Required | Description | Validation |
|-----------|------|----------|-------------|------------|
| `name` | string | Yes | Player name to search for | Minimum 3 characters |

### Example Request

```bash
curl "https://your-domain.com/api/player-search?name=Smith"
```

## Response Format

### Success Response (200 OK)

```json
{
  "players": [
    {
      "ECF_code": "123456A",
      "full_name": "Smith, John",
      "first_name": "John",
      "surname": "Smith",
      "gender": "M",
      "member_no": "A12345",
      "club_name": "London Chess Club",
      "club_code": "LCC",
      "nation": "England",
      "FIDE_no": "987654321",
      "category": "Adult"
    },
    {
      "ECF_code": "654321B",
      "full_name": "Smith, Jane",
      "first_name": "Jane",
      "surname": "Smith",
      "gender": "F",
      "member_no": "B54321",
      "club_name": "Manchester Chess Society",
      "club_code": "MCS",
      "nation": "England",
      "FIDE_no": "123456789",
      "category": "Adult"
    }
  ],
  "total_count": 2,
  "search_term": "Smith"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `players` | array | Array of player objects matching the search |
| `total_count` | number | Total number of players found |
| `search_term` | string | The search term that was used |

### Player Object Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `ECF_code` | string | Unique ECF player identifier | "123456A" |
| `full_name` | string | Player's full name (surname, first name) | "Smith, John" |
| `first_name` | string | Player's first name | "John" |
| `surname` | string | Player's surname | "Smith" |
| `gender` | string | Player's gender (M/F) | "M" |
| `member_no` | string | ECF membership number | "A12345" |
| `club_name` | string | Current club name | "London Chess Club" |
| `club_code` | string | Club code | "LCC" |
| `nation` | string | Player's nation | "England" |
| `FIDE_no` | string | FIDE rating number (if available) | "987654321" |
| `category` | string | Player category | "Adult" |

## Error Responses

### 400 Bad Request - Missing Name Parameter

```json
{
  "error": "Name parameter is required",
  "message": "Please provide a name parameter to search for players",
  "code": "MISSING_NAME_PARAMETER",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

### 400 Bad Request - Name Too Short

```json
{
  "error": "Name parameter too short",
  "message": "Name parameter must be at least 3 characters long",
  "code": "NAME_TOO_SHORT",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "details": {
    "provided_length": 2,
    "minimum_length": 3
  }
}
```

### 500 Internal Server Error - ECF API Error

```json
{
  "error": "Failed to fetch player data",
  "message": "Unable to retrieve player information from ECF API",
  "code": "ECF_API_ERROR",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

### 502 Bad Gateway - ECF API Unavailable

```json
{
  "error": "ECF API unavailable",
  "message": "The ECF API is currently unavailable. Please try again later.",
  "code": "ECF_API_UNAVAILABLE",
  "timestamp": "2025-01-27T10:30:00.000Z"
}
```

## Caching

This endpoint implements aggressive caching to improve performance:

- **Cache Duration**: 18 hours (64,800 seconds)
- **Cache Headers**: `Cache-Control: public, s-maxage=64800, stale-while-revalidate=600`
- **Cache Variation**: Based on query parameters

### Cache Behavior

- **Cache Hit**: Response served immediately from cache (< 100ms)
- **Cache Miss**: Fresh data fetched from ECF API (1-3 seconds)
- **Stale While Revalidate**: Serves stale content while updating in background

## Usage Examples

### JavaScript/TypeScript

```typescript
async function searchPlayers(name: string) {
  if (name.length < 3) {
    throw new Error('Name must be at least 3 characters long');
  }

  try {
    const response = await fetch(`/api/player-search?name=${encodeURIComponent(name)}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to search players');
    }
    
    const data = await response.json();
    return data.players;
  } catch (error) {
    console.error('Player search error:', error);
    throw error;
  }
}

// Usage
const players = await searchPlayers('Smith');
console.log(`Found ${players.length} players`);
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';
import { debounce } from 'lodash';

interface Player {
  ECF_code: string;
  full_name: string;
  first_name: string;
  surname: string;
  club_name: string;
}

export function usePlayerSearch() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchPlayers = debounce(async (name: string) => {
    if (name.length < 3) {
      setPlayers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/player-search?name=${encodeURIComponent(name)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message);
      }
      
      const data = await response.json();
      setPlayers(data.players);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, 300);

  return { players, loading, error, searchPlayers };
}
```

### cURL Examples

```bash
# Basic search
curl "https://your-domain.com/api/player-search?name=Smith"

# Search with special characters (URL encoded)
curl "https://your-domain.com/api/player-search?name=O%27Connor"

# Search with spaces
curl "https://your-domain.com/api/player-search?name=John%20Smith"
```

## Rate Limiting

Currently, this endpoint uses caching-based rate limiting:

- **Cache-based protection**: Reduces load through intelligent caching
- **Future rate limits**: 20 requests per minute (planned)
- **Burst allowance**: Short-term higher limits for good actors (planned)

See [Rate Limiting Documentation](../rate-limiting.md) for more details.

## Best Practices

### For Frontend Development

1. **Implement debouncing** for search input (300ms recommended)
2. **Validate input length** before making requests (minimum 3 characters)
3. **Handle loading states** appropriately
4. **Cache results** on the client side when possible
5. **Provide clear error messages** to users

### For Search UX

1. **Show loading indicators** during search
2. **Display "no results" messages** when appropriate
3. **Highlight matching text** in search results
4. **Limit displayed results** to prevent overwhelming users
5. **Provide search suggestions** for common misspellings

### Performance Optimization

```typescript
// Good: Debounced search with caching
const debouncedSearch = useMemo(
  () => debounce(async (term: string) => {
    const cached = getFromCache(`search:${term}`);
    if (cached) return cached;
    
    const results = await searchPlayers(term);
    setInCache(`search:${term}`, results, 300000); // 5 minutes
    return results;
  }, 300),
  []
);

// Avoid: Immediate search on every keystroke
const handleInputChange = (value: string) => {
  searchPlayers(value); // This will overwhelm the API
};
```

## Related Endpoints

- [Player Details API](player-details.md) - Get detailed information for a specific player
- [Chess Results API](chess-results.md) - Get game results for a player
- [Official Rating API](official-rating.md) - Get current ratings for a player

## Troubleshooting

### Common Issues

#### No Results Found

**Possible causes:**
- Player name spelling variations
- Player not in ECF database
- Search term too specific

**Solutions:**
- Try partial names or common variations
- Check ECF website directly
- Use broader search terms

#### Slow Response Times

**Possible causes:**
- Cache miss requiring ECF API call
- ECF API performance issues
- Network connectivity problems

**Solutions:**
- Implement client-side caching
- Add loading indicators
- Consider retry logic with exponential backoff

#### Search Not Working

**Possible causes:**
- Name parameter missing or too short
- Special characters not properly encoded
- API endpoint unavailable

**Solutions:**
- Validate input before sending requests
- Properly encode URL parameters
- Check API status and error responses

---

*Related documentation:*
- *[ECF Integration Overview](../ecf-integration.md)*
- *[Error Handling Guide](../error-handling.md)*
- *[Rate Limiting](../rate-limiting.md)*

*Last updated: May 2025* 