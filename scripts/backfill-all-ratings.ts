/**
 * Backfill All Ratings Script
 * 
 * This script runs the rating backfill process across all players in the database.
 * It processes players in batches and sets a flag to prevent re-processing.
 * 
 * Usage: 
 *   npx tsx scripts/backfill-all-ratings.ts [options]
 * 
 * Options:
 *   --batch <number>    Number of players to process per batch (default: 100)
 *   --dry-run           Show what would be processed without making changes
 *   --verbose           Show detailed output for each game
 * 
 * Examples:
 *   npx tsx scripts/backfill-all-ratings.ts                     # Process 100 players
 *   npx tsx scripts/backfill-all-ratings.ts --batch 200         # Process 200 players
 *   npx tsx scripts/backfill-all-ratings.ts --dry-run           # Preview without changes
 * 
 * Just run the script repeatedly until all players are processed.
 * The ratings_backfilled flag ensures players aren't processed twice.
 */

import { getPlayersCollection, closeConnection, GameRecord, PlayerDocument } from '../lib/mongodb'

const ECF_API_BASE = 'https://rating.englishchess.org.uk/v2/new/api.php'

// Map game types to ECF API codes
const GAME_TYPE_MAP: Record<string, string> = {
  'Standard': 'S',
  'Rapid': 'R',
  'Blitz': 'B'
}

interface ECFRatingResponse {
  success: boolean
  revised_rating?: number | string
  original_rating?: number | string
  rating?: number | string
}

interface BackfillStats {
  gamesUpdated: number
  gamesSkipped: number
  noRatingCount: number
  apiCalls: number
  cacheHits: number
}

// Cache for ratings by player+month+gameType
// Key format: "{playerNo}_{gameType}_{YYYY-MM}"
// Value: rating number, or null if player had no rating that month
const ratingCache = new Map<string, number | null>()

/**
 * Convert old 3-digit ECF rating to new 4-digit format
 * Formula: new = old * 7.5 + 700
 */
function convertOldRating(oldRating: number): number {
  return Math.round(oldRating * 7.5 + 700)
}

/**
 * Get the month key for caching (YYYY-MM)
 */
function getMonthKey(gameDate: string): string {
  // gameDate is YYYY-MM-DD format
  return gameDate.substring(0, 7)
}

/**
 * Build cache key for a player's rating in a given month
 */
function buildCacheKey(playerNo: number | string, gameType: string, gameDate: string): string {
  const month = getMonthKey(gameDate)
  return `${playerNo}_${gameType}_${month}`
}

/**
 * Fetch historical rating from ECF API (raw, no caching)
 * Returns the converted new-format rating, or null if player had no rating at that time
 */
async function fetchHistoricalRatingFromAPI(
  playerNo: number | string,
  gameDate: string,
  gameType: string,
  verbose: boolean
): Promise<number | null> {
  const typeCode = GAME_TYPE_MAP[gameType] || 'S'
  const url = `${ECF_API_BASE}?v2/ratings/${typeCode}/${playerNo}/${gameDate}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ChessRatingAnalytics/1.0',
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      if (verbose) console.log(`      ⚠️ HTTP ${response.status} for player ${playerNo} on ${gameDate}`)
      return null
    }

    const data: ECFRatingResponse = await response.json()
    
    if (!data.success) {
      return null
    }

    const oldRating = data.revised_rating
    
    if (oldRating === undefined || oldRating === null || oldRating === '') {
      return null
    }

    const oldRatingNum = typeof oldRating === 'string' ? parseInt(oldRating, 10) : oldRating
    
    if (isNaN(oldRatingNum) || oldRatingNum <= 0) {
      return null
    }

    return convertOldRating(oldRatingNum)
  } catch (error) {
    if (verbose) console.error(`      ❌ Error fetching rating for ${playerNo} on ${gameDate}:`, error)
    return null
  }
}

/**
 * Get historical rating with monthly caching
 * ECF ratings are updated monthly, so all games in the same month have the same rating
 * Returns: { rating: number | null, fromCache: boolean }
 */
async function getHistoricalRating(
  playerNo: number | string,
  gameDate: string,
  gameType: string,
  verbose: boolean
): Promise<{ rating: number | null; fromCache: boolean }> {
  const cacheKey = buildCacheKey(playerNo, gameType, gameDate)
  
  // Check cache first
  if (ratingCache.has(cacheKey)) {
    return { rating: ratingCache.get(cacheKey)!, fromCache: true }
  }
  
  // Not in cache, fetch from API
  const rating = await fetchHistoricalRatingFromAPI(playerNo, gameDate, gameType, verbose)
  
  // Cache the result (including null for "no rating")
  ratingCache.set(cacheKey, rating)
  
  return { rating, fromCache: false }
}

/**
 * Check if a game needs rating backfill
 */
function needsBackfill(game: GameRecord): boolean {
  const opponentRating = game.opponent_rating
  const playerRating = game.player_rating
  
  const opponentMissing = opponentRating === '' || 
                          opponentRating === null || 
                          opponentRating === undefined ||
                          (typeof opponentRating === 'number' && isNaN(opponentRating))
  
  const playerMissing = playerRating === '' || 
                        playerRating === null || 
                        playerRating === undefined ||
                        (typeof playerRating === 'number' && isNaN(playerRating))
  
  return opponentMissing || playerMissing
}

/**
 * Add a delay between API calls
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Process a single player's games for backfill
 */
async function backfillPlayerRatings(
  player: PlayerDocument,
  dryRun: boolean,
  verbose: boolean
): Promise<BackfillStats> {
  const stats: BackfillStats = {
    gamesUpdated: 0,
    gamesSkipped: 0,
    noRatingCount: 0,
    apiCalls: 0,
    cacheHits: 0
  }
  
  const collection = await getPlayersCollection()
  const playerCode = player.ECF_code
  const playerNo = playerCode.replace(/[A-Z]/gi, '')
  
  const gameTypes = ['Standard', 'Rapid', 'Blitz'] as const
  
  for (const gameType of gameTypes) {
    const games = player.games?.[gameType] || []
    const gamesNeedingBackfill = games.filter(needsBackfill)
    
    if (gamesNeedingBackfill.length === 0) {
      continue
    }
    
    if (verbose) {
      console.log(`      ${gameType}: ${gamesNeedingBackfill.length} games need backfill`)
    }
    
    for (const game of gamesNeedingBackfill) {
      const gameDate = game.game_date
      
      let opponentRatingNew: number | null = null
      let playerRatingNew: number | null = null
      
      // Fetch opponent rating if missing
      const opponentMissing = game.opponent_rating === '' || 
                              game.opponent_rating === null || 
                              game.opponent_rating === undefined
      
      if (opponentMissing && game.opponent_no) {
        const result = await getHistoricalRating(game.opponent_no, gameDate, gameType, verbose)
        opponentRatingNew = result.rating
        
        if (result.fromCache) {
          stats.cacheHits++
        } else {
          stats.apiCalls++
          await delay(20) // Only delay on actual API calls
        }
        
        if (opponentRatingNew === null) {
          stats.noRatingCount++
        }
      }
      
      // Fetch player rating if missing
      const playerMissing = game.player_rating === '' || 
                            game.player_rating === null || 
                            game.player_rating === undefined
      
      if (playerMissing) {
        const result = await getHistoricalRating(playerNo, gameDate, gameType, verbose)
        playerRatingNew = result.rating
        
        if (result.fromCache) {
          stats.cacheHits++
        } else {
          stats.apiCalls++
          await delay(20) // Only delay on actual API calls
        }
        
        if (playerRatingNew === null) {
          stats.noRatingCount++
        }
      }
      
      // Update the game in MongoDB if we got any ratings
      if (!dryRun && (opponentRatingNew !== null || playerRatingNew !== null)) {
        const updateFields: Record<string, number> = {}
        
        if (opponentRatingNew !== null) {
          updateFields[`games.${gameType}.$[game].opponent_rating`] = opponentRatingNew
        }
        if (playerRatingNew !== null) {
          updateFields[`games.${gameType}.$[game].player_rating`] = playerRatingNew
        }
        
        const result = await collection.updateOne(
          { ECF_code: playerCode },
          { $set: updateFields },
          {
            arrayFilters: [{
              'game.game_date': game.game_date,
              'game.opponent_no': game.opponent_no,
              'game.event_code': game.event_code,
              'game.colour': game.colour,
              'game.score': game.score
            }]
          }
        )
        
        if (result.modifiedCount > 0) {
          stats.gamesUpdated++
        } else {
          stats.gamesSkipped++
        }
      } else if (opponentRatingNew !== null || playerRatingNew !== null) {
        // Dry run - count as would be updated
        stats.gamesUpdated++
      } else {
        stats.gamesSkipped++
      }
    }
  }
  
  return stats
}

/**
 * Mark a player as having been backfilled
 */
async function markPlayerBackfilled(playerCode: string): Promise<void> {
  const collection = await getPlayersCollection()
  await collection.updateOne(
    { ECF_code: playerCode },
    { 
      $set: { 
        ratings_backfilled: true,
        ratings_backfill_date: new Date()
      }
    }
  )
}

/**
 * Count total games needing backfill for a player
 */
function countGamesNeedingBackfill(player: PlayerDocument): number {
  let count = 0
  const gameTypes = ['Standard', 'Rapid', 'Blitz'] as const
  
  for (const gameType of gameTypes) {
    const games = player.games?.[gameType] || []
    count += games.filter(needsBackfill).length
  }
  
  return count
}

/**
 * Parse command line arguments
 */
function parseArgs(): { batch: number; dryRun: boolean; verbose: boolean } {
  const args = process.argv.slice(2)
  let batch = 100
  let dryRun = false
  let verbose = false
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch' && args[i + 1]) {
      batch = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--dry-run') {
      dryRun = true
    } else if (args[i] === '--verbose') {
      verbose = true
    }
  }
  
  return { batch, dryRun, verbose }
}

async function backfillAllRatings() {
  const { batch, dryRun, verbose } = parseArgs()
  
  console.log('\n🔧 Backfill All Ratings Script\n')
  
  if (dryRun) {
    console.log('🏃 DRY RUN MODE - No changes will be made\n')
  }
  
  console.log(`📊 Batch size: ${batch}`)
  console.log('')
  
  try {
    const collection = await getPlayersCollection()
    
    // Find players that haven't been backfilled yet
    const query = { ratings_backfilled: { $ne: true } }
    
    const totalUnprocessed = await collection.countDocuments(query)
    console.log(`📋 Total players needing backfill: ${totalUnprocessed}`)
    
    if (totalUnprocessed === 0) {
      console.log('\n✅ All players have been backfilled!')
      return
    }
    
    // Get batch of players to process
    const players = await collection
      .find(query)
      .limit(batch)
      .toArray()
    
    console.log(`📦 Processing ${players.length} players\n`)
    
    let totalGamesUpdated = 0
    let totalGamesSkipped = 0
    let totalNoRating = 0
    let totalApiCalls = 0
    let totalCacheHits = 0
    let playersProcessed = 0
    let playersWithUpdates = 0
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      const gamesNeedingBackfill = countGamesNeedingBackfill(player)
      
      if (gamesNeedingBackfill === 0) {
        // No games need backfill, just mark as processed
        if (!dryRun) {
          await markPlayerBackfilled(player.ECF_code)
        }
        process.stdout.write(`\r   [${i + 1}/${players.length}] ${player.ECF_code} ${player.full_name} - No games need backfill, marked complete`)
        playersProcessed++
        continue
      }
      
      console.log(`\n   [${i + 1}/${players.length}] ${player.ECF_code} ${player.full_name} (${gamesNeedingBackfill} games)`)
      
      const stats = await backfillPlayerRatings(player, dryRun, verbose)
      
      totalGamesUpdated += stats.gamesUpdated
      totalGamesSkipped += stats.gamesSkipped
      totalNoRating += stats.noRatingCount
      totalApiCalls += stats.apiCalls
      totalCacheHits += stats.cacheHits
      playersProcessed++
      
      if (stats.gamesUpdated > 0) {
        playersWithUpdates++
      }
      
      console.log(`      ✅ Updated: ${stats.gamesUpdated}, Skipped: ${stats.gamesSkipped}, API: ${stats.apiCalls}, Cache: ${stats.cacheHits}`)
      
      // Mark player as backfilled
      if (!dryRun) {
        await markPlayerBackfilled(player.ECF_code)
      }
    }
    
    const cacheEfficiency = totalApiCalls + totalCacheHits > 0 
      ? Math.round((totalCacheHits / (totalApiCalls + totalCacheHits)) * 100) 
      : 0
    
    console.log('\n\n' + '='.repeat(60))
    console.log('📊 BATCH SUMMARY')
    console.log('='.repeat(60))
    console.log(`   Players processed: ${playersProcessed}`)
    console.log(`   Players with updates: ${playersWithUpdates}`)
    console.log(`   Total games updated: ${totalGamesUpdated}`)
    console.log(`   Total games skipped: ${totalGamesSkipped}`)
    console.log(`   Cases with no rating available: ${totalNoRating}`)
    console.log('')
    console.log(`   🌐 API calls made: ${totalApiCalls}`)
    console.log(`   💾 Cache hits: ${totalCacheHits} (${cacheEfficiency}% efficiency)`)
    console.log('')
    console.log(`   Remaining unprocessed: ${totalUnprocessed - playersProcessed}`)
    
    if (totalUnprocessed - playersProcessed > 0) {
      console.log(`\n💡 Run the script again to process the next batch`)
    } else {
      console.log('\n🎉 All players have been backfilled!')
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await closeConnection()
  }
}

backfillAllRatings().catch(console.error)

