# AI-Generated Player Activity Summaries

## Goal

Add a card to the player information page that displays a 100-200 word AI-generated summary of the player's recent chess activity. The summary should read like a brief news report, highlighting notable results, tournament performances, and rating changes.

## Context

- Summaries are generated at most once every 30 days per player
- **Minimum threshold**: Player must have 2+ games in the last 30 days to get a summary
- Stored in the player record (only most recent displayed)
- Should handle both active players (20+ games/month) and less active players (2-5 games)
- Players below threshold simply don't see the summary card
- Want to experiment with different LLM providers

## Example Outputs

**Active player (GM Hebden, 22 games in 30 days):**
> "Grandmaster Mark Hebden has been in strong form at the 2025 XTX Markets London Chess Classic Open, scoring 5 wins, 4 draws, and 2 losses in the prestigious event. The veteran English GM, rated 2454, faced stiff opposition including Israeli super-GM Ilya Smirin (2671) and rising star Shreyas Royal (2605). Hebden also maintained his commitments to club chess, securing comfortable wins for Syston in the Leicestershire League. His 45.5% win rate across 22 standard games this month reflects the challenging level of competition he continues to seek."

**Less active player (3 games in 30 days):**
> "James Holyhead returned to the board for the Darwinian Knights in the Shropshire Rapid League, playing three games on November 26th. The 1394-rated player earned a hard-fought draw against higher-rated Mark Smith (1624) but fell to Julie Van Kemenade and Gary White. A quiet month for the Telepost club member, who will be looking to bounce back in upcoming fixtures."

---

## LLM Provider Options

### Option 1: OpenAI GPT-4o-mini
| Aspect | Details |
|--------|---------|
| **Pros** | Fast, cheap, good quality for simple tasks, widely used |
| **Cons** | Rate limits on free tier, requires API key management |
| **Cost** | ~$0.15/1M input tokens, ~$0.60/1M output tokens |
| **Estimate** | ~$0.0002 per summary (~500 input + 200 output tokens) |
| **Monthly (1000 players)** | ~$0.20 |

### Option 2: OpenAI GPT-4o
| Aspect | Details |
|--------|---------|
| **Pros** | Highest quality, best at nuanced writing, handles edge cases well |
| **Cons** | More expensive, slower |
| **Cost** | ~$2.50/1M input, ~$10/1M output tokens |
| **Estimate** | ~$0.003 per summary |
| **Monthly (1000 players)** | ~$3.00 |

### Option 3: Anthropic Claude 3.5 Haiku
| Aspect | Details |
|--------|---------|
| **Pros** | Very fast, good writing quality, competitive pricing |
| **Cons** | Separate API/billing from OpenAI |
| **Cost** | ~$0.25/1M input, ~$1.25/1M output tokens |
| **Estimate** | ~$0.0004 per summary |
| **Monthly (1000 players)** | ~$0.40 |

### Option 4: Anthropic Claude 3.5 Sonnet
| Aspect | Details |
|--------|---------|
| **Pros** | Excellent writing quality, thoughtful summaries |
| **Cons** | Higher cost than Haiku |
| **Cost** | ~$3/1M input, ~$15/1M output tokens |
| **Estimate** | ~$0.005 per summary |
| **Monthly (1000 players)** | ~$5.00 |

### Option 5: Google Gemini 1.5 Flash
| Aspect | Details |
|--------|---------|
| **Pros** | Very cheap, fast, generous free tier |
| **Cons** | Quality slightly below GPT-4o/Claude Sonnet |
| **Cost** | ~$0.075/1M input, ~$0.30/1M output tokens |
| **Estimate** | ~$0.0001 per summary |
| **Monthly (1000 players)** | ~$0.10 |

### Recommendation
Start with **GPT-4o-mini** or **Claude 3.5 Haiku** for the best cost/quality balance. Both produce good writing at minimal cost. Can upgrade to GPT-4o or Claude Sonnet if quality needs improvement.

---

## Key Decisions

- [ ] **LLM Provider**: TBD (start with GPT-4o-mini, make configurable)
- [x] **Regeneration frequency**: 30 days minimum between regenerations
- [x] **Summary length**: 100-200 words
- [x] **Storage**: In player document, array of summaries with timestamps
- [x] **Minimum activity threshold**: 2+ games in last 30 days required for summary generation
- [ ] **UI placement**: Card in player info section (exact position TBD)
- [ ] **Below threshold handling**: Don't show summary card at all (or show subtle "Not enough recent activity")
- [ ] **Error handling**: Fail gracefully, don't block page load

---

## Database Schema Addition

```typescript
// Add to PlayerDocument interface
ai_summaries?: Array<{
  generated_at: Date
  period_start: string  // YYYY-MM-DD
  period_end: string    // YYYY-MM-DD
  summary: string
  model: string         // e.g., "gpt-4o-mini", "claude-3.5-haiku"
  games_analyzed: number
}>
```

---

## Actions

### Stage 1: Backend Service

- [ ] **TODO: Create AI summary service**
  - [ ] Create `lib/ai-summary.ts` with provider abstraction
  - [ ] Implement OpenAI provider (GPT-4o-mini)
  - [ ] Create prompt template for generating summaries
  - [ ] Add minimum activity check (2+ games in last 30 days)
  - [ ] Add rate limiting / cooldown check (30 days)

- [ ] **TODO: Add database schema**
  - [ ] Update `PlayerDocument` interface in `lib/mongodb.ts`
  - [ ] Add `ai_summaries` array field

- [ ] **TODO: Create API endpoint**
  - [ ] Create `app/api/player-summary/route.ts`
  - [ ] GET: Return latest summary if exists and fresh
  - [ ] POST: Generate new summary (with cooldown check)
  - [ ] Return appropriate status for "no summary yet" vs "summary exists"

### Stage 2: Frontend Component

- [ ] **TODO: Create PlayerSummary component**
  - [ ] Create `components/PlayerSummary.tsx`
  - [ ] Display summary card with generated date
  - [ ] Show loading state while fetching
  - [ ] Handle "no activity" state
  - [ ] Handle "generating..." state
  - [ ] Style to match new design system

- [ ] **TODO: Integrate into player page**
  - [ ] Add component to `ChessResultsTable.tsx` player info section
  - [ ] Trigger summary fetch/generation on player load
  - [ ] Don't block page render on summary

### Stage 3: Additional Providers

- [ ] **TODO: Add Claude provider**
  - [ ] Implement Anthropic API integration
  - [ ] Make provider configurable via env var

- [ ] **TODO: Add Gemini provider (optional)**
  - [ ] Implement Google AI API integration

### Stage 4: Polish & Monitoring

- [ ] **TODO: Add summary regeneration UI**
  - [ ] "Regenerate" button (respects 30-day cooldown)
  - [ ] Show when summary was last generated

- [ ] **TODO: Add monitoring**
  - [ ] Log API costs per generation
  - [ ] Track generation success/failure rates

---

## Environment Variables

```bash
# Choose one provider
AI_PROVIDER=openai  # or "anthropic" or "google"

# API Keys (only need the one for chosen provider)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Optional overrides
AI_MODEL=gpt-4o-mini  # Override default model for provider
AI_SUMMARY_COOLDOWN_DAYS=30
```

---

## Appendix

### Prompt Template

```
You are a chess correspondent writing brief news updates. Based on the player data below, write a 100-200 word summary of their recent activity.

Guidelines:
- Write in third person, past tense
- Lead with the most notable achievement or event
- Mention specific tournaments, opponents, and results where interesting
- Include rating context (their rating, notable higher/lower rated opponents)
- For titled players (GM, IM, FM), use their title
- For players with no recent games, acknowledge this briefly and positively
- Keep the tone professional but engaging, like a sports news brief
- Do not use phrases like "In conclusion" or "Overall"

Player Data:
{JSON data here}
```

### Example Player Data (Active)

See user message for full JSON examples of:
- GM Mark Hebden (22 games, London Chess Classic)
- James Holyhead (3 games, Shropshire Rapid League)

