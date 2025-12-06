# Chess Rating Analytics Dashboard - Architecture Documentation

## 1. Overview

The Chess Rating Analytics Dashboard is a Next.js-based web application that provides enhanced analytics for English Chess Federation (ECF) ratings. The application uses a **local-first architecture** with MongoDB for fast data access and background synchronization with the ECF API.

> **📖 For detailed data flow diagrams and API documentation, see [docs/data-architecture.md](docs/data-architecture.md)**

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                  │
│                                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│   │   Player    │    │   Rating    │    │   Chess     │    │   Common    │ │
│   │   Search    │    │   Chart     │    │   Results   │    │  Opponents  │ │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ │
│          │                  │                  │                  │         │
│          └──────────────────┴─────────┬────────┴──────────────────┘         │
│                                       │ SWR / fetch                         │
└───────────────────────────────────────┼─────────────────────────────────────┘
                                        │
┌───────────────────────────────────────┼─────────────────────────────────────┐
│                              NEXT.JS SERVER                                  │
│                                       │                                      │
│   ┌───────────────────────────────────┴───────────────────────────────────┐ │
│   │                         API ROUTES (/app/api/)                         │ │
│   │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │ │
│   │  │player-search │ │player-details│ │chess-results │ │official-rating│ │ │
│   │  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘  │ │
│   └─────────┼────────────────┼────────────────┼────────────────┼──────────┘ │
│             │                │                │                │            │
│   ┌─────────┴────────────────┴────────────────┴────────────────┴─────────┐  │
│   │                    SERVICE LAYER (/lib/)                              │  │
│   │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │  │
│   │  │ player-data.ts │  │ player-sync.ts │  │  realtime.ts   │          │  │
│   │  │ (Data Service) │  │ (ECF Sync)     │  │  (SSE)         │          │  │
│   │  └───────┬────────┘  └───────┬────────┘  └────────────────┘          │  │
│   └──────────┼───────────────────┼───────────────────────────────────────┘  │
│              │                   │                                          │
└──────────────┼───────────────────┼──────────────────────────────────────────┘
               │                   │
               ▼                   ▼
      ┌────────────────┐  ┌────────────────┐
      │    MongoDB     │  │    ECF API     │
      │  (localhost)   │  │  (external)    │
      │                │  │                │
      │  • players     │  │  • /v2/games   │
      │  • games       │  │  • /v2/player  │
      │  • ratings     │  │  • /v2/players │
      └────────────────┘  └────────────────┘
```

## 3. Key Technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 (App Router) | Server-side rendering, routing |
| **UI** | React + Tailwind CSS + shadcn/ui | Component library |
| **Data Fetching** | SWR | Client-side caching and revalidation |
| **Database** | MongoDB | Local data storage |
| **Real-time** | Server-Sent Events (SSE) | Live updates |
| **Charts** | Recharts | Rating visualizations |
| **External API** | ECF Rating API | Source of truth for player data |

## 4. Project Structure

```
chess-rating-analytics/
├── app/
│   ├── api/
│   │   ├── chess-results/route.ts      # Game results endpoint
│   │   ├── official-rating/route.ts    # Rating lookup endpoint
│   │   ├── player-details/route.ts     # Player profile endpoint
│   │   ├── player-search/route.ts      # Search endpoint
│   │   ├── player-sync/route.ts        # Manual sync trigger
│   │   └── player-updates/route.ts     # SSE real-time updates
│   ├── player/[playerCode]/page.tsx    # Dynamic player pages
│   ├── about/page.tsx
│   ├── faq/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                             # shadcn/ui components
│   ├── BestResults.tsx
│   ├── ChessResultsTable.tsx           # Main game display component
│   ├── CommonOpponentsTable.tsx
│   ├── EventList.tsx
│   ├── LiveRating.tsx
│   ├── NavBar.tsx
│   ├── OfficialRating.tsx
│   ├── PlayerRatingChart.tsx
│   ├── PlayerSearch.tsx
│   └── PlayerSearchWrapper.tsx
├── lib/
│   ├── mongodb.ts                      # MongoDB connection & schemas
│   ├── player-data.ts                  # Data service layer
│   ├── player-sync.ts                  # ECF sync service
│   ├── realtime.ts                     # SSE manager
│   ├── utils.ts                        # Utility functions
│   └── appUtils.ts
├── scripts/                            # Maintenance scripts
├── docs/                               # Documentation
└── planning/                           # Planning documents
```

## 5. Data Architecture

### 5.1 Local-First Strategy

The application prioritizes local data for fast response times:

1. **Primary reads** from MongoDB (< 1ms response)
2. **Background sync** with ECF API when pages are visited
3. **24-hour cooldown** prevents excessive API calls
4. **Real-time updates** via SSE when new data arrives

### 5.2 MongoDB Schema

```typescript
// Player document structure
interface PlayerDocument {
  ECF_code: string              // Primary key
  full_name: string
  category: string              // GOLD, SILVER, BRONZE
  
  games: {
    Standard?: GameRecord[]
    Rapid?: GameRecord[]
    Blitz?: GameRecord[]
  }
  
  official_ratings: {
    Standard?: { rating: number, category: string }
    Rapid?: { rating: number, category: string }
    Blitz?: { rating: number, category: string }
  }
  
  // Sync tracking
  last_ecf_sync_date?: Date
  sync_in_progress?: boolean
}
```

### 5.3 Sync System

```
Page Visit → Check Cooldown (24h) → Fetch ECF Data → Compare Games → Add New → Notify SSE
```

Key features:
- Incremental sync (100 → 1000 → 2000 games)
- Duplicate detection by stable fields (date, opponent, event, score)
- Real-time notifications to connected clients

## 6. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/player-search` | GET | Search players by name |
| `/api/player-details` | GET | Get full player profile |
| `/api/chess-results` | GET | Get games by type |
| `/api/official-rating` | GET | Get current/historical rating |
| `/api/player-updates` | GET | SSE stream for real-time updates |

## 7. Component Architecture

### 7.1 Page Components

- **ChessResultsTable**: Main orchestrator, fetches data via SWR
- **PlayerSearch**: Autocomplete search with debouncing
- **PlayerRatingChart**: Interactive rating history chart

### 7.2 Data Flow

```
URL Change → SWR Fetch → API Route → Service Layer → MongoDB → Response
                                            ↓
                                    (If stale: Sync ECF)
                                            ↓
                                    SSE Notification → UI Update
```

## 8. Performance Optimizations

1. **MongoDB Indexes**: Text search, ECF code lookup, game dates
2. **SWR Caching**: Client-side cache with background revalidation
3. **Pagination**: Large game lists paginated (20 per page)
4. **Memoization**: `useMemo`/`useCallback` for expensive calculations
5. **Debouncing**: Search input debounced to reduce API calls

## 9. External Integrations

### ECF Rating API

```
Base URL: https://rating.englishchess.org.uk/v2/new/api.php

Endpoints:
  ?v2/players/name/{name}           # Search
  ?v2/player/{code}                 # Player details
  ?v2/games/{S|R|B}/player/{code}   # Game history
```

## 10. Related Documentation

- **[Data Architecture](docs/data-architecture.md)**: Detailed data flows, schemas, API reference
- **[MongoDB Migration](planning/feature-mongo-migration.md)**: Migration status and planning
- **[API Documentation](docs/api/)**: Endpoint specifications

---

*Architecture updated: December 2025*
