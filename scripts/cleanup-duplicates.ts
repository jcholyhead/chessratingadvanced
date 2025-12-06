import { getDatabase, getPlayersCollection, GameRecord } from '../lib/mongodb'
import { closeConnection } from '../lib/mongodb'

/**
 * Creates a unique key for a game based on its identity fields.
 * This matches the fixed isDuplicateGame logic.
 */
function getGameKey(game: GameRecord): string {
  return `${game.game_date}|${game.colour?.toLowerCase()}|${game.opponent_no}|${game.event_code}|${game.score}`
}

/**
 * Removes duplicate games from a games array, keeping the first occurrence.
 */
function deduplicateGames(games: GameRecord[]): { unique: GameRecord[], removed: number } {
  const seen = new Set<string>()
  const unique: GameRecord[] = []
  let removed = 0

  for (const game of games) {
    const key = getGameKey(game)
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(game)
    } else {
      removed++
    }
  }

  return { unique, removed }
}

async function cleanupDuplicates() {
  const targetPlayerCode = process.argv[2] // Optional: specific player code
  
  console.log('🧹 Cleaning up duplicate games...\n')
  
  if (targetPlayerCode) {
    console.log(`🎯 Targeting specific player: ${targetPlayerCode}\n`)
  } else {
    console.log('🌐 Processing ALL players in database\n')
  }
  
  try {
    await getDatabase()
    const collection = await getPlayersCollection()
    
    // Build query
    const query = targetPlayerCode ? { ECF_code: targetPlayerCode } : {}
    const players = await collection.find(query).toArray()
    
    console.log(`📊 Found ${players.length} player(s) to process\n`)
    
    let totalPlayersUpdated = 0
    let totalGamesRemoved = 0
    const gameTypes = ['Standard', 'Rapid', 'Blitz'] as const
    
    for (const player of players) {
      let playerUpdated = false
      let playerGamesRemoved = 0
      const updatedGames: Partial<Record<typeof gameTypes[number], GameRecord[]>> = {}
      
      for (const gameType of gameTypes) {
        const games = player.games?.[gameType] || []
        if (games.length === 0) continue
        
        const { unique, removed } = deduplicateGames(games)
        
        if (removed > 0) {
          playerUpdated = true
          playerGamesRemoved += removed
          updatedGames[gameType] = unique
          console.log(`   ${player.full_name} (${player.ECF_code}): Removed ${removed} duplicate ${gameType} games`)
        }
      }
      
      if (playerUpdated) {
        // Update the player document with deduplicated games
        const updateDoc: Record<string, GameRecord[]> = {}
        for (const [gameType, games] of Object.entries(updatedGames)) {
          updateDoc[`games.${gameType}`] = games
        }
        
        await collection.updateOne(
          { ECF_code: player.ECF_code },
          { $set: updateDoc }
        )
        
        totalPlayersUpdated++
        totalGamesRemoved += playerGamesRemoved
      }
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📋 CLEANUP SUMMARY')
    console.log('='.repeat(50))
    console.log(`   Players processed: ${players.length}`)
    console.log(`   Players updated: ${totalPlayersUpdated}`)
    console.log(`   Duplicate games removed: ${totalGamesRemoved}`)
    console.log('='.repeat(50))
    
    if (totalGamesRemoved > 0) {
      console.log('\n✅ Cleanup completed successfully!')
    } else {
      console.log('\n✨ No duplicates found - database is clean!')
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  } finally {
    await closeConnection()
  }
}

cleanupDuplicates().catch(console.error)

