import { getDatabase, getPlayersCollection, GameRecord } from '../lib/mongodb'
import { closeConnection } from '../lib/mongodb'

async function debugDuplicates() {
  console.log('🔍 Debugging duplicate games for player 319013E\n')
  
  const playerCode = '319013E'
  
  try {
    await getDatabase()
    const collection = await getPlayersCollection()
    
    const player = await collection.findOne({ ECF_code: playerCode })
    
    if (!player) {
      console.log('❌ Player not found in MongoDB')
      return
    }
    
    console.log(`✅ Found player: ${player.full_name}`)
    console.log(`📅 Last ECF Sync: ${player.last_ecf_sync_date}`)
    console.log(`🔄 Sync In Progress: ${player.sync_in_progress || false}`)
    console.log()
    
    // Check each game type for duplicates
    const gameTypes = ['Standard', 'Rapid', 'Blitz'] as const
    
    for (const gameType of gameTypes) {
      const games = player.games?.[gameType] || []
      console.log(`\n📊 ${gameType} Games: ${games.length} total`)
      
      if (games.length === 0) continue
      
      // Find duplicates by creating a unique key for each game
      const gameKeys = new Map<string, GameRecord[]>()
      
      games.forEach((game: GameRecord) => {
        // Create a unique key based on game properties
        const key = `${game.game_date}|${game.opponent_name}|${game.opponent_no}|${game.event_code}|${game.score}|${game.colour}`
        
        if (!gameKeys.has(key)) {
          gameKeys.set(key, [])
        }
        gameKeys.get(key)!.push(game)
      })
      
      // Find entries with more than one game (duplicates)
      const duplicates = Array.from(gameKeys.entries())
        .filter(([_, games]) => games.length > 1)
      
      if (duplicates.length === 0) {
        console.log(`   ✅ No duplicates found`)
      } else {
        console.log(`   ❌ Found ${duplicates.length} sets of duplicates:`)
        
        duplicates.slice(0, 10).forEach(([key, dupeGames], idx) => {
          console.log(`\n   Duplicate Set ${idx + 1} (${dupeGames.length} copies):`)
          console.log(`   Key: ${key}`)
          dupeGames.forEach((game, gameIdx) => {
            console.log(`     Copy ${gameIdx + 1}:`)
            console.log(`       Date: ${game.game_date}`)
            console.log(`       Opponent: ${game.opponent_name} (${game.opponent_no})`)
            console.log(`       Event: ${game.event_name} (${game.event_code})`)
            console.log(`       Score: ${game.score}`)
            console.log(`       Colour: ${game.colour}`)
            console.log(`       Player Rating: ${game.player_rating}`)
            console.log(`       Opponent Rating: ${game.opponent_rating}`)
          })
        })
        
        if (duplicates.length > 10) {
          console.log(`\n   ... and ${duplicates.length - 10} more duplicate sets`)
        }
        
        // Calculate total duplicate count
        const totalDuplicates = duplicates.reduce((sum, [_, games]) => sum + games.length - 1, 0)
        console.log(`\n   📈 Summary: ${totalDuplicates} extra copies should be removed`)
        console.log(`   📈 Unique games: ${games.length - totalDuplicates}`)
      }
    }
    
    // Check sync history
    console.log('\n\n📋 SYNC METADATA:')
    console.log(`   last_ecf_sync_date: ${player.last_ecf_sync_date}`)
    console.log(`   sync_in_progress: ${player.sync_in_progress}`)
    console.log(`   sync_error_count: ${player.sync_error_count || 0}`)
    console.log(`   last_sync_error: ${player.last_sync_error || 'None'}`)
    console.log(`   total_games_count: ${player.total_games_count || 'Not set'}`)
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await closeConnection()
  }
}

debugDuplicates().catch(console.error)

