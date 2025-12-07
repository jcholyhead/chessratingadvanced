/**
 * Backfill Old Ratings Script
 * 
 * This script fills in missing rating information for games from before the ECF
 * rating system change. It fetches the old 3-digit ratings from the ECF API
 * and converts them to the new 4-digit format.
 * 
 * Conversion formula: new_rating = old_rating * 7.5 + 700
 * 
 * Usage: npx tsx scripts/backfill-old-ratings.ts <playerCode>
 * Example: npx tsx scripts/backfill-old-ratings.ts 319013E
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
  // Other fields exist but we don't need them
}

/**
 * Convert old 3-digit ECF rating to new 4-digit format
 * Formula: new = old * 7.5 + 700
 */
function convertOldRating(oldRating: number): number {
  return Math.round(oldRating * 7.5 + 700)
}

/**
 * Fetch historical rating from ECF API
 * Returns the converted new-format rating, or null if player had no rating at that time
 */
async function fetchHistoricalRating(
  playerNo: number | string,
  gameDate: string,
  gameType: string
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
      console.log(`   ⚠️ HTTP ${response.status} for player ${playerNo} on ${gameDate}`)
      return null
    }

    const data: ECFRatingResponse = await response.json()
    
    if (!data.success) {
      // Player didn't have a rating at that time - this is expected
      return null
    }

    // The old rating is in the revised_rating field
    const oldRating = data.revised_rating
    
    if (oldRating === undefined || oldRating === null || oldRating === '') {
      return null
    }

    const oldRatingNum = typeof oldRating === 'string' ? parseInt(oldRating, 10) : oldRating
    
    if (isNaN(oldRatingNum) || oldRatingNum <= 0) {
      return null
    }

    // Convert to new format
    return convertOldRating(oldRatingNum)
  } catch (error) {
    console.error(`   ❌ Error fetching rating for ${playerNo} on ${gameDate}:`, error)
    return null
  }
}

/**
 * Check if a game needs rating backfill
 */
function needsBackfill(game: GameRecord): boolean {
  const opponentRating = game.opponent_rating
  const playerRating = game.player_rating
  
  // Check if opponent_rating is missing/empty
  const opponentMissing = opponentRating === '' || 
                          opponentRating === null || 
                          opponentRating === undefined ||
                          (typeof opponentRating === 'number' && isNaN(opponentRating))
  
  // Check if player_rating is missing/empty
  const playerMissing = playerRating === '' || 
                        playerRating === null || 
                        playerRating === undefined ||
                        (typeof playerRating === 'number' && isNaN(playerRating))
  
  return opponentMissing || playerMissing
}

/**
 * Add a delay between API calls to be respectful of the ECF server
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function backfillOldRatings(playerCode: string) {
  console.log(`\n🔧 Backfilling old ratings for player ${playerCode}\n`)
  
  try {
    const collection = await getPlayersCollection()
    const player = await collection.findOne({ ECF_code: playerCode })
    
    if (!player) {
      console.log(`❌ Player ${playerCode} not found in database`)
      return
    }
    
    console.log(`✅ Found player: ${player.full_name}`)
    
    // Extract the numeric part of the player code for API calls
    const playerNo = playerCode.replace(/[A-Z]/gi, '')
    
    const gameTypes = ['Standard', 'Rapid', 'Blitz'] as const
    let totalUpdated = 0
    let totalSkipped = 0
    let totalNoRating = 0
    
    for (const gameType of gameTypes) {
      const games = player.games?.[gameType] || []
      
      if (games.length === 0) {
        console.log(`\n📊 ${gameType}: No games found`)
        continue
      }
      
      // Find games that need backfill
      const gamesNeedingBackfill = games.filter(needsBackfill)
      
      console.log(`\n📊 ${gameType}: ${gamesNeedingBackfill.length}/${games.length} games need rating backfill`)
      
      if (gamesNeedingBackfill.length === 0) {
        continue
      }
      
      // Process each game that needs backfill
      let updatedCount = 0
      let skippedCount = 0
      let noRatingCount = 0
      
      for (let i = 0; i < gamesNeedingBackfill.length; i++) {
        const game = gamesNeedingBackfill[i]
        const gameDate = game.game_date
        
        console.log(`\n   Processing game ${i + 1}/${gamesNeedingBackfill.length}: ${gameDate} vs ${game.opponent_name}`)
        
        let opponentRatingNew: number | null = null
        let playerRatingNew: number | null = null
        
        // Fetch opponent rating if missing
        const opponentMissing = game.opponent_rating === '' || 
                                game.opponent_rating === null || 
                                game.opponent_rating === undefined
        
        if (opponentMissing && game.opponent_no) {
          console.log(`   Fetching opponent rating for ${game.opponent_no}...`)
          opponentRatingNew = await fetchHistoricalRating(game.opponent_no, gameDate, gameType)
          
          if (opponentRatingNew !== null) {
            console.log(`   ✅ Opponent rating: ${opponentRatingNew}`)
          } else {
            console.log(`   ⚪ Opponent had no rating at that time`)
            noRatingCount++
          }
          
          await delay(200) // Be nice to the API
        }
        
        // Fetch player rating if missing
        const playerMissing = game.player_rating === '' || 
                              game.player_rating === null || 
                              game.player_rating === undefined
        
        if (playerMissing) {
          console.log(`   Fetching player rating for ${playerNo}...`)
          playerRatingNew = await fetchHistoricalRating(playerNo, gameDate, gameType)
          
          if (playerRatingNew !== null) {
            console.log(`   ✅ Player rating: ${playerRatingNew}`)
          } else {
            console.log(`   ⚪ Player had no rating at that time`)
            noRatingCount++
          }
          
          await delay(200) // Be nice to the API
        }
        
        // Update the game in MongoDB if we got any ratings
        if (opponentRatingNew !== null || playerRatingNew !== null) {
          // Build the update query to find and update this specific game
          const updateFields: Record<string, number> = {}
          
          if (opponentRatingNew !== null) {
            updateFields[`games.${gameType}.$[game].opponent_rating`] = opponentRatingNew
          }
          if (playerRatingNew !== null) {
            updateFields[`games.${gameType}.$[game].player_rating`] = playerRatingNew
          }
          
          // Update the specific game in the array
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
            updatedCount++
            console.log(`   💾 Updated game in database`)
          } else {
            skippedCount++
            console.log(`   ⚠️ No documents modified (game may not exist or already updated)`)
          }
        } else {
          skippedCount++
        }
      }
      
      console.log(`\n   📈 ${gameType} Summary:`)
      console.log(`      Updated: ${updatedCount}`)
      console.log(`      Skipped (no rating available): ${skippedCount}`)
      console.log(`      No rating at time: ${noRatingCount}`)
      
      totalUpdated += updatedCount
      totalSkipped += skippedCount
      totalNoRating += noRatingCount
    }
    
    console.log(`\n\n📊 TOTAL SUMMARY:`)
    console.log(`   Games updated: ${totalUpdated}`)
    console.log(`   Games skipped: ${totalSkipped}`)
    console.log(`   Cases where player had no rating: ${totalNoRating}`)
    console.log(`\n✅ Backfill complete for ${player.full_name}`)
    
  } catch (error) {
    console.error('❌ Backfill failed:', error)
  } finally {
    await closeConnection()
  }
}

// Main execution
const playerCode = process.argv[2]

if (!playerCode) {
  console.log('Usage: npx tsx scripts/backfill-old-ratings.ts <playerCode>')
  console.log('Example: npx tsx scripts/backfill-old-ratings.ts 319013E')
  process.exit(1)
}

backfillOldRatings(playerCode).catch(console.error)

