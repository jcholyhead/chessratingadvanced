# ECF API Integration

This document explains how the Chess Rating Analytics Dashboard integrates with the English Chess Federation (ECF) API to provide enhanced chess rating analytics.

## Overview

The application serves as a middleware layer between users and the ECF API, providing:
- **Enhanced data visualization** beyond the standard ECF website
- **Caching and performance optimization** to reduce load on ECF servers
- **Unified interface** for different types of chess rating queries
- **Error handling and resilience** for better user experience

## ECF API Base Information

- **Base URL**: `https://rating.englishchess.org.uk/v2/new/api.php`
- **API Version**: v2
- **Data Format**: JSON
- **Authentication**: Not required for public rating data

## Integration Architecture

### Data Flow

```
User Request → Application API → ECF API → Response Processing → Cached Response → User
```

1. **User initiates request** through the web interface
2. **Application API** receives and validates the request
3. **ECF API call** is made with appropriate parameters
4. **Response processing** includes error handling and data transformation
5. **Caching headers** are applied for performance optimization
6. **Final response** is returned to the user

### Caching Strategy

The application implements intelligent caching to optimize performance:

- **Player Search**: 18-hour cache (`s-maxage=64800`)
- **Player Details**: 18-hour cache (`s-maxage=64800`)
- **Chess Results**: 10-minute cache (`s-maxage=600`)
- **Official Ratings**: 18-hour cache (`s-maxage=64800`)

## API Endpoints Integration

### 1. Player Search Integration

**Internal Endpoint**: `GET /api/player-search`

**ECF API Mapping**:
```
/api/player-search?name={searchTerm}
↓
https://rating.englishchess.org.uk/v2/new/api.php?v2/players/name/{searchTerm}
```

**Purpose**: Find players by name for autocomplete search functionality.

### 2. Player Details Integration

**Internal Endpoint**: `GET /api/player-details`

**ECF API Mapping**:
```
/api/player-details?playerCode={code}
↓
https://rating.englishchess.org.uk/v2/new/api.php?v2/players/code/{code}
```

**Purpose**: Retrieve detailed information about a specific player.

### 3. Chess Results Integration

**Internal Endpoint**: `GET /api/chess-results`

**ECF API Mapping**:
```
/api/chess-results?playerCode={code}&gameType={type}
↓
https://rating.englishchess.org.uk/v2/new/api.php?v2/games/{type}/player/{code}/limit/2000
```

**Purpose**: Fetch game history and results for rating analysis.

### 4. Official Rating Integration

**Internal Endpoint**: `GET /api/official-rating`

**ECF API Mapping**:
```
/api/official-rating?playerCode={code}&gameType={type}
↓
https://rating.englishchess.org.uk/v2/new/api.php?v2/ratings/{typeCode}/{code}/{date}
```

**Game Type Mapping**:
- `Standard` → `S`
- `Rapid` → `R`
- `Blitz` → `B`

## Data Models

### Player Search Response

```typescript
interface PlayerSearchResult {
  players: {
    ECF_code: string;
    full_name: string;
    club_name?: string;
    county?: string;
  }[];
}
```

### Player Details Response

```typescript
interface PlayerDetails {
  ECF_code: string;
  full_name: string;
  club_name: string;
  county: string;
  category: string;
  standard_rating?: number;
  rapid_rating?: number;
  blitz_rating?: number;
  // Additional fields as provided by ECF API
}
```

### Chess Results Response

```typescript
interface ChessResults {
  games: {
    date: string;
    event_name: string;
    opponent_name: string;
    opponent_rating: number;
    result: 'W' | 'L' | 'D';
    rating_change: number;
    new_rating: number;
  }[];
  total_games: number;
  total_processing_time_today?: number;
}
```

### Official Rating Response

```typescript
interface OfficialRating {
  ECF_code: string;
  rating: number;
  game_type: string;
  effective_date: string;
  games_played: number;
}
```

## Error Handling

### Application-Level Errors

The application handles various error scenarios:

1. **Validation Errors** (400)
   - Missing required parameters
   - Invalid parameter formats
   - Insufficient search term length

2. **External API Errors** (500)
   - ECF API unavailable
   - Network timeouts
   - Invalid responses from ECF

3. **Rate Limiting** (429)
   - Too many requests to ECF API
   - Application-level rate limiting

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
}
```

Example error responses:
```json
{
  "error": "Player code is required",
  "code": "MISSING_PARAMETER"
}

{
  "error": "Failed to fetch player details",
  "details": "ECF API returned status 500",
  "code": "EXTERNAL_API_ERROR"
}
```

## Performance Considerations

### Request Optimization

- **Parameter validation** before making ECF API calls
- **Intelligent caching** to reduce unnecessary requests
- **Request batching** where possible
- **Graceful degradation** when ECF API is slow

### Monitoring and Logging

The application logs:
- **Processing times** for ECF API calls
- **Error rates** and failure patterns
- **Cache hit/miss ratios**
- **Daily request volumes**

## Rate Limiting and Fair Usage

### ECF API Considerations

- The ECF API may have implicit rate limits
- Our application implements caching to minimize requests
- Monitor `total_processing_time_today` field in responses

### Application Rate Limiting

Current implementation:
- **No explicit rate limiting** on our endpoints
- **Caching** serves as primary rate limiting mechanism
- **Monitoring** to detect and prevent abuse

## Data Freshness and Updates

### Update Frequency

- **Player ratings**: Updated after each rated tournament
- **Game results**: Typically updated within hours of tournament completion
- **Player details**: Updated as players register or change clubs

### Cache Invalidation

Different cache durations based on data volatility:
- **Static data** (player details): 18 hours
- **Dynamic data** (recent games): 10 minutes
- **Rating data**: 18 hours (ratings change infrequently)

## Integration Best Practices

### For Developers

1. **Always validate parameters** before making ECF API calls
2. **Handle network errors gracefully** with appropriate user feedback
3. **Respect caching headers** to minimize unnecessary requests
4. **Log performance metrics** for monitoring and optimization
5. **Test with various player codes** to ensure robust error handling

### For Operations

1. **Monitor ECF API availability** and response times
2. **Set up alerts** for high error rates or slow responses
3. **Review cache performance** regularly
4. **Plan for ECF API downtime** with appropriate fallbacks

## Future Enhancements

### Planned Improvements

- **WebSocket integration** for real-time rating updates
- **Bulk data retrieval** for performance optimization
- **Advanced caching strategies** with intelligent invalidation
- **Offline support** with local data caching

### API Versioning

- Current integration uses ECF API v2
- Monitor for ECF API updates and version changes
- Plan migration strategies for future API versions

---

*For specific endpoint documentation, see:*
- *[Player Search API](player-search.md)*
- *[Player Details API](player-details.md)*
- *[Chess Results API](chess-results.md)*
- *[Official Rating API](official-rating.md)*

*Last updated: May 2025* 