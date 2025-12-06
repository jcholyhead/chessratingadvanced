# Chess Rating Analytics - Data Architecture & API Documentation

## Table of Contents

1. [System Overview](#system-overview)
2. [Data Architecture](#data-architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Sync System](#sync-system)
7. [Real-time Updates](#real-time-updates)
8. [External APIs](#external-apis)

---

## System Overview

The Chess Rating Analytics Dashboard provides enhanced analytics for English Chess Federation (ECF) ratings. The system uses a **local-first architecture** with MongoDB for fast data access and background synchronization with the ECF API for data freshness.

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14 (App Router) | Server-side rendering, routing |
| UI | React + Tailwind CSS + shadcn/ui | Component library |
| Data Fetching | SWR | Client-side caching and revalidation |
| Database | MongoDB | Local data storage |
| Real-time | Server-Sent Events (SSE) | Live updates |
| External API | ECF Rating API | Source of truth for player data |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  ChessResults   │  │  PlayerSearch   │  │  OfficialRating │              │
│  │     Table       │  │   Component     │  │    Component    │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │ SWR fetch          │ SWR fetch          │ fetch                 │
└───────────┼────────────────────┼────────────────────┼────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NEXT.JS API ROUTES                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ /api/chess-     │  │ /api/player-    │  │ /api/official-  │              │
│  │    results      │  │    search       │  │    rating       │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                        │
│           └────────────────────┴────────────────────┘                        │
│                                │                                             │
│                    ┌───────────┴───────────┐                                 │
│                    │  playerDataService    │                                 │
│                    │   (lib/player-data)   │                                 │
│                    └───────────┬───────────┘                                 │
│                                │                                             │
│              ┌─────────────────┼─────────────────┐                           │
│              ▼                 ▼                 ▼                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   MongoDB       │  │  playerSync     │  │   SSE Manager   │              │
│  │   Connection    │  │    Service      │  │   (realtime)    │              │
│  │ (lib/mongodb)   │  │ (lib/player-    │  │ (lib/realtime)  │              │
│  │                 │  │     sync)       │  │                 │              │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────┘              │
│           │                    │                                             │
└───────────┼────────────────────┼─────────────────────────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────┐    ┌─────────────────┐
│    MongoDB      │    │    ECF API      │
│   (localhost)   │    │  (external)     │
└─────────────────┘    └─────────────────┘
```

---

## Data Architecture

### Data Flow Strategy

The system uses a **local-first approach**:

1. **Primary reads** come from MongoDB (sub-millisecond response)
2. **Background sync** fetches updates from ECF API when pages are visited
3. **24-hour cooldown** prevents excessive API calls
4. **Real-time updates** notify clients when new data arrives

### Data Sources

| Source | Purpose | Latency |
|--------|---------|---------|
| MongoDB | Primary data store | < 1ms |
| ECF API | Source of truth, sync source | 2-5 seconds |

---

## Database Schema

### MongoDB Collection: `players`

```typescript
interface PlayerDocument {
  // Identity
  _id: ObjectId
  ECF_code: string              // Unique identifier (e.g., "319013E")
  FIDE_no?: string              // FIDE ID if applicable
  full_name: string             // Display name
  
  // Player Info
  category: string              // Membership category (GOLD, SILVER, BRONZE)
  gender?: string
  nation?: string
  title?: string                // Chess title (FM, IM, GM, etc.)
  
  // Club Affiliations
  club_code?: string            // Primary club code
  club_name?: string            // Primary club name
  clubs?: Array<{
    club_code: string
    club_name: string
  }>
  
  // Games (nested by type)
  games: {
    Standard?: GameRecord[]
    Rapid?: GameRecord[]
    Blitz?: GameRecord[]
  }
  
  // Official Ratings
  official_ratings: {
    Standard?: { rating: number, category: string }
    Rapid?: { rating: number, category: string }
    Blitz?: { rating: number, category: string }
  }
  
  // Rating History
  rating_history?: {
    standard?: Record<string, { rating: number, category: string }>
    rapid?: Record<string, { rating: number, category: string }>
    blitz?: Record<string, { rating: number, category: string }>
  }
  
  // Activity
  date_last_game?: string       // YYYY-MM-DD format
  
  // Sync Tracking
  last_ecf_sync_date?: Date     // When last synced with ECF
  sync_in_progress?: boolean    // Prevents concurrent syncs
  sync_error_count?: number     // Consecutive failure count
  last_sync_error?: string      // Last error message
  total_games_count?: number    // Total games across all types
}

interface GameRecord {
  game_date: string             // YYYY-MM-DD
  colour: string                // "W" or "B" (or "w"/"b")
  score: number | string        // 1, 0, 5 (for draw), or "1", "0", "0.5"
  opponent_name: string
  opponent_no: number           // Opponent's ECF code (numeric part)
  opponent_rating: number | string
  player_rating: number | string
  increment: number | string    // Rating change
  event_code: string            // Event identifier
  event_name: string
  section_title: string
  club_code: string
  org_name: string | null
}
```

### MongoDB Indexes

```javascript
// Text search for player names
{ full_name: "text" }

// Fast lookups by ECF code (unique)
{ ECF_code: 1 }  // unique: true

// Club-based queries
{ club_code: 1, club_name: 1 }

// Sync management
{ last_ecf_sync_date: 1 }
{ sync_in_progress: 1 }

// Game date sorting
{ "games.Standard.game_date": 1 }
{ "games.Rapid.game_date": 1 }
{ "games.Blitz.game_date": 1 }

// Data freshness
{ date_last_game: 1 }
```

---

## API Endpoints

### Internal API Routes

All endpoints are located in `/app/api/` and serve data from MongoDB.

#### 1. Player Search

```
GET /api/player-search?name={query}&limit={limit}
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| name | string | Yes | - | Search query (min 2 chars) |
| limit | number | No | 20 | Max results (max 50) |

**Response:**
```json
{
  "players": [
    {
      "ECF_code": "319013E",
      "full_name": "Holyhead, James",
      "category": "GOLD",
      "club_code": "2TPT",
      "club_name": "Telepost (Shrewsbury)",
      "official_ratings": {
        "Standard": { "rating": 1650, "category": "K" }
      },
      "date_last_game": "2025-10-07",
      "total_games": 298
    }
  ],
  "total_found": 1,
  "query": "holyhead",
  "source": "mongodb",
  "success": true
}
```

---

#### 2. Player Details

```
GET /api/player-details?playerCode={code}
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| playerCode | string | Yes | ECF code (e.g., "319013E") |

**Behavior:**
1. Checks if player needs sync (24h cooldown)
2. Performs synchronous sync if needed
3. Returns full player data

**Response:**
```json
{
  "ECF_code": "319013E",
  "full_name": "Holyhead, James",
  "category": "GOLD",
  "club_code": "2TPT",
  "club_name": "Telepost (Shrewsbury)",
  "clubs": [...],
  "official_ratings": {...},
  "games": {
    "Standard": [...],
    "Rapid": [...],
    "Blitz": [...]
  },
  "rating_history": {...},
  "success": true,
  "_metadata": {
    "source": "mongodb",
    "last_sync_date": "2025-12-06T14:04:25.000Z",
    "sync_mode": "synchronous",
    "data_freshness": "just_synced"
  }
}
```

---

#### 3. Chess Results

```
GET /api/chess-results?playerCode={code}&gameType={type}
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| playerCode | string | Yes | - | ECF code |
| gameType | string | No | Standard | Standard, Rapid, or Blitz |

**Response:**
```json
{
  "ECF_code": "319013E",
  "full_name": "Holyhead, James",
  "gameType": "Standard",
  "games": [
    {
      "game_date": "2025-10-07",
      "colour": "W",
      "score": 0,
      "opponent_name": "Chan, Waylon",
      "opponent_no": 368162,
      "opponent_rating": 1679,
      "player_rating": 1643,
      "increment": -9,
      "event_code": "NRSL26",
      "event_name": "Shropshire League"
    }
  ],
  "total_games": 247,
  "success": true,
  "_metadata": {
    "source": "mongodb",
    "games_by_type": {
      "Standard": 247,
      "Rapid": 44,
      "Blitz": 7
    }
  }
}
```

---

#### 4. Official Rating

```
GET /api/official-rating?playerCode={code}&gameType={type}&date={date}
```

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| playerCode | string | Yes | - | ECF code |
| gameType | string | Yes | - | Standard, Rapid, or Blitz |
| date | string | No | today | YYYY-MM-DD for historical rating |

**Response:**
```json
{
  "ECF_code": "319013E",
  "full_name": "Holyhead, James",
  "gameType": "Standard",
  "rating": 1650,
  "rating_category": "K",
  "current_rating": { "rating": 1650, "category": "K" },
  "rating_history_available": true,
  "total_games_in_type": 247,
  "success": true
}
```

---

#### 5. Player Updates (SSE)

```
GET /api/player-updates?playerCode={code}
```

**Description:** Server-Sent Events endpoint for real-time updates.

**Event Types:**
```typescript
// Sync started
{ "type": "player_sync_started", "playerId": "319013E", "timestamp": "..." }

// Sync completed with new games
{ 
  "type": "player_sync_complete", 
  "playerId": "319013E",
  "data": {
    "newGamesCount": 5,
    "gameType": "Standard",
    "newGames": [...]
  },
  "timestamp": "..."
}

// Sync error
{ "type": "player_sync_error", "playerId": "319013E", "data": { "error": "..." } }

// Heartbeat (every 30s)
{ "type": "heartbeat", "timestamp": "..." }
```

---

## Data Flow Diagrams

### Flow 1: Player Page Visit

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     USER VISITS /player/319013E                              │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
         ┌────────────────────┐              ┌────────────────────┐
         │  GET /api/chess-   │              │  GET /api/player-  │
         │      results       │              │      details       │
         │ ?playerCode=319013E│              │ ?playerCode=319013E│
         └─────────┬──────────┘              └─────────┬──────────┘
                   │                                   │
                   └─────────────┬─────────────────────┘
                                 ▼
                   ┌─────────────────────────┐
                   │  playerDataService.     │
                   │  getPlayerData(code,    │
                   │               true)     │
                   └─────────────┬───────────┘
                                 │
                   ┌─────────────┴───────────────────────┐
                   │                                     │
                   ▼                                     ▼
         ┌─────────────────────┐              ┌─────────────────────┐
         │   CHECK: Player     │              │   CHECK: Needs      │
         │   exists in MongoDB?│              │   sync? (24h)       │
         └─────────┬───────────┘              └─────────┬───────────┘
                   │ YES                                │
                   │                         ┌──────────┴──────────┐
                   │                         │ NO                  │ YES
                   │                         ▼                     ▼
                   │              ┌─────────────────┐   ┌─────────────────┐
                   │              │ Return MongoDB  │   │  SYNC WITH ECF  │
                   │              │ data directly   │   │  (see Flow 2)   │
                   │              └────────┬────────┘   └────────┬────────┘
                   │                       │                     │
                   └───────────────────────┴─────────────────────┘
                                           │
                                           ▼
                             ┌─────────────────────────┐
                             │   Return player data    │
                             │   to frontend           │
                             └─────────────────────────┘
```

### Flow 2: ECF Sync Process

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                          SYNC TRIGGERED                                      │
│                    (24+ hours since last sync)                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                   ┌─────────────────────────────────┐
                   │  1. Mark sync_in_progress=true  │
                   │  2. Notify SSE: sync_started    │
                   └─────────────────┬───────────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
    ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
    │  SYNC STANDARD   │   │   SYNC RAPID     │   │   SYNC BLITZ     │
    └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
             │                      │                      │
             ▼                      ▼                      ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │  For each game type:                                             │
    │                                                                  │
    │  1. Fetch 100 games from ECF API                                 │
    │     GET /v2/games/{S|R|B}/player/{code}/limit/100                │
    │                                                                  │
    │  2. Compare with MongoDB games (isDuplicateGame)                 │
    │     - Match on: date, colour, opponent_no, event_code, score     │
    │     - IGNORE: opponent_rating, player_rating (can change)        │
    │                                                                  │
    │  3. If no new games found:                                       │
    │     - Fetch 1000 games, compare again                            │
    │     - If still none, fetch 2000 games (max)                      │
    │                                                                  │
    │  4. Add only NEW games to MongoDB                                │
    │     - $push to games.{Type} array                                │
    │     - Update date_last_game if newer                             │
    │                                                                  │
    │  5. Notify SSE: sync_complete (with new games)                   │
    └──────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                   ┌─────────────────────────────────┐
                   │  Update sync metadata:          │
                   │  - last_ecf_sync_date = now     │
                   │  - sync_in_progress = false     │
                   │  - total_games_count += new     │
                   └─────────────────────────────────┘
```

### Flow 3: Player Search

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    USER TYPES IN SEARCH BOX                                  │
│                         "holyhead"                                           │
└──────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                   ┌─────────────────────────────────┐
                   │  Debounce (300ms wait)          │
                   └─────────────────┬───────────────┘
                                     │
                                     ▼
                   ┌─────────────────────────────────┐
                   │  GET /api/player-search         │
                   │      ?name=holyhead             │
                   └─────────────────┬───────────────┘
                                     │
                                     ▼
                   ┌─────────────────────────────────┐
                   │  MongoDB Query:                 │
                   │  - Text search on full_name     │
                   │  - Regex on name.first/last     │
                   │  - Regex on ECF_code            │
                   └─────────────────┬───────────────┘
                                     │
                                     ▼
                   ┌─────────────────────────────────┐
                   │  Return matching players        │
                   │  (limited to 20 results)        │
                   └─────────────────┬───────────────┘
                                     │
                                     ▼
                   ┌─────────────────────────────────┐
                   │  Display autocomplete dropdown  │
                   │  with player names & clubs      │
                   └─────────────────────────────────┘
```

---

## Sync System

### Configuration

```typescript
// lib/player-sync.ts
class PlayerSyncService {
  private readonly SYNC_COOLDOWN_HOURS = 24      // Minimum time between syncs
  private readonly INITIAL_GAME_LIMIT = 100      // First fetch attempt
  private readonly EXTENDED_GAME_LIMIT = 1000    // Second fetch attempt
  private readonly MAX_GAME_LIMIT = 2000         // Final fetch attempt
}
```

### Duplicate Detection

Games are identified by these **stable fields** (won't change over time):

| Field | Description |
|-------|-------------|
| `game_date` | Date the game was played |
| `colour` | Which side player had (W/B) |
| `opponent_no` | Opponent's ECF code |
| `event_code` | Event identifier |
| `score` | Game result (1/0/0.5) |

**Excluded from comparison** (can change when ECF recalculates):
- `opponent_rating`
- `player_rating`
- `opponent_name`

### Sync States

```
┌─────────────┐      Sync       ┌─────────────┐
│   IDLE      │  ─────────────► │  SYNCING    │
│             │   triggered     │             │
│ sync_in_    │                 │ sync_in_    │
│ progress=   │                 │ progress=   │
│   false     │                 │   true      │
└──────┬──────┘                 └──────┬──────┘
       ▲                               │
       │         Complete              │
       └───────────────────────────────┘
```

---

## Real-time Updates

### Server-Sent Events (SSE)

The system uses SSE for pushing updates to connected clients.

**File:** `lib/realtime.ts`

**Connection Management:**
- Connections stored in `SSEConnectionManager`
- Heartbeat every 30 seconds
- Stale connections removed after 5 minutes
- Connections grouped by player ID

**Usage in Frontend:**

```typescript
// Connect to SSE
const eventSource = new EventSource(`/api/player-updates?playerCode=${playerCode}`)

// Listen for updates
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  
  if (data.type === 'player_sync_complete') {
    // New games available - refresh data
    mutate(`/api/chess-results?playerCode=${playerCode}`)
  }
}
```

---

## External APIs

### ECF Rating API

**Base URL:** `https://rating.englishchess.org.uk/v2/new/api.php`

#### Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `?v2/players/name/{name}` | Search players by name |
| `?v2/player/{code}` | Get player details |
| `?v2/games/{type}/player/{code}/limit/{n}` | Get games for player |

#### Game Type Codes

| Type | Code |
|------|------|
| Standard | S |
| Rapid | R |
| Blitz | B |

#### Example Requests

```bash
# Search for players named "Smith"
curl "https://rating.englishchess.org.uk/v2/new/api.php?v2/players/name/Smith"

# Get player details
curl "https://rating.englishchess.org.uk/v2/new/api.php?v2/player/319013E"

# Get last 100 Standard games
curl "https://rating.englishchess.org.uk/v2/new/api.php?v2/games/S/player/319013E/limit/100"
```

#### Rate Limiting

- ECF API has processing time limits
- Response includes: `processing_time`, `total_processing_time_today`, `max_processing_time_daily`
- Our sync system uses 24-hour cooldowns to stay well within limits

---

## File Reference

| File | Purpose |
|------|---------|
| `lib/mongodb.ts` | MongoDB connection, schema types, indexes |
| `lib/player-data.ts` | PlayerDataService - main data access layer |
| `lib/player-sync.ts` | PlayerSyncService - ECF sync logic |
| `lib/realtime.ts` | SSE connection manager, notifications |
| `app/api/player-search/route.ts` | Search API endpoint |
| `app/api/player-details/route.ts` | Player details API endpoint |
| `app/api/chess-results/route.ts` | Chess results API endpoint |
| `app/api/official-rating/route.ts` | Official rating API endpoint |
| `app/api/player-updates/route.ts` | SSE updates endpoint |

---

## Maintenance Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/debug-duplicates.ts` | Check player for duplicate games | `npx tsx scripts/debug-duplicates.ts` |
| `scripts/cleanup-duplicates.ts` | Remove duplicate games | `npx tsx scripts/cleanup-duplicates.ts [playerCode]` |
| `scripts/check-duplicate-players.ts` | Find duplicate player docs | `npx tsx scripts/check-duplicate-players.ts` |
| `scripts/merge-duplicate-players.ts` | Merge duplicate players | `npx tsx scripts/merge-duplicate-players.ts` |
| `scripts/test-all-endpoints.ts` | Test all API endpoints | `npx tsx scripts/test-all-endpoints.ts` |

---

*Last updated: December 2025*

