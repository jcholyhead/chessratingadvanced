import { getDatabase, getPlayersCollection, GameRecord } from '../lib/mongodb'
import { playerSyncService } from '../lib/player-sync'

async function debugKateWalker() {
  console.log('🔍 Debugging Kate Walker (285392K) sync issue...\n')
  
  try {
    // Connect to database
    await getDatabase()
    const collection = await getPlayersCollection()
    
    // 1. Check current player data in MongoDB
    console.log('1. Current player data in MongoDB:')
    const player = await collection.findOne({ ECF_code: '285392K' })
    
    if (!player) {
      console.log('❌ Player not found in MongoDB')
      return
    }
    
    console.log(`   Name: ${player.full_name}`)
    console.log(`   Last ECF Sync: ${player.last_ecf_sync_date || 'Never'}`)
    console.log(`   Sync in Progress: ${player.sync_in_progress || false}`)
    console.log(`   Last Sync Error: ${player.last_sync_error || 'None'}`)
    console.log(`   Total Games Count: ${player.total_games_count || 0}`)
    console.log(`   Date Last Game: ${player.date_last_game}`)
    
    // Check current games count
    const standardGames = player.games?.Standard || []
    const rapidGames = player.games?.Rapid || []
    const blitzGames = player.games?.Blitz || []
    
    console.log('\n2. Current games in MongoDB:')
    console.log(`   Standard Games: ${standardGames.length}`)
    console.log(`   Rapid Games: ${rapidGames.length}`)
    console.log(`   Blitz Games: ${blitzGames.length}`)
    
    if (standardGames.length > 0) {
      // Sort by date to find most recent
      const sortedGames = standardGames.sort((a: GameRecord, b: GameRecord) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
      const mostRecent = sortedGames[0]
      console.log(`   Most Recent Standard Game: ${mostRecent.game_date} vs ${mostRecent.opponent_name}`)
    }
    
    if (rapidGames.length > 0) {
      const sortedGames = rapidGames.sort((a: GameRecord, b: GameRecord) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
      const mostRecent = sortedGames[0]
      console.log(`   Most Recent Rapid Game: ${mostRecent.game_date} vs ${mostRecent.opponent_name}`)
    }
    
    // 3. Check what ECF API returns currently
    console.log('\n3. Checking ECF API directly:')
    
    // Fetch recent Standard games from ECF API
    const ecfUrl = 'https://rating.englishchess.org.uk/v2/new/api.php?v2/games/S/player/285392K/limit/100'
    console.log(`   Fetching: ${ecfUrl}`)
    
    try {
      const response = await fetch(ecfUrl, {
        headers: {
          'User-Agent': 'ChessRatingAnalytics/1.0'
        }
      })
      
      if (!response.ok) {
        console.log(`   ❌ ECF API error: ${response.status}`)
      } else {
        const data = await response.json()
        const ecfStandardGames = data.games?.Standard || []
        
        console.log(`   ECF API Standard Games: ${ecfStandardGames.length}`)
        
        if (ecfStandardGames.length > 0) {
          // Sort ECF games by date
          const sortedEcfGames = ecfStandardGames.sort((a: GameRecord, b: GameRecord) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
          const mostRecentEcf = sortedEcfGames[0]
          console.log(`   Most Recent ECF Game: ${mostRecentEcf.game_date} vs ${mostRecentEcf.opponent_name}`)
          
          // Compare with MongoDB data
          const isGameInMongo = standardGames.some(game => 
            game.game_date === mostRecentEcf.game_date &&
            game.opponent_name === mostRecentEcf.opponent_name
          )
          
          console.log(`   Is most recent ECF game in MongoDB: ${isGameInMongo ? '✅ Yes' : '❌ No'}`)
          
          // Show top 5 recent ECF games
          console.log('\n   Top 5 recent ECF games:')
          sortedEcfGames.slice(0, 5).forEach((game: GameRecord, index: number) => {
            const inMongo = standardGames.some(mgame => 
              mgame.game_date === game.game_date &&
              mgame.opponent_name === game.opponent_name
            )
            console.log(`   ${index + 1}. ${game.game_date} vs ${game.opponent_name} ${inMongo ? '✅' : '❌'}`)
          })
        }
      }
    } catch (error) {
      console.log(`   ❌ Failed to fetch ECF data: ${error}`)
    }
    
    // 4. Test sync mechanism
    console.log('\n4. Testing sync mechanism:')
    
    // Check if player needs sync
    const now = new Date()
    const lastSync = player.last_ecf_sync_date ? new Date(player.last_ecf_sync_date) : null
    const hoursSinceSync = lastSync ? (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60) : 999
    
    console.log(`   Hours since last sync: ${hoursSinceSync.toFixed(1)}`)
    console.log(`   Needs sync (24h cooldown): ${hoursSinceSync >= 24 ? '✅ Yes' : '❌ No'}`)
    console.log(`   Sync in progress: ${player.sync_in_progress ? '✅ Yes' : '❌ No'}`)
    
    // 5. Force a sync to test
    console.log('\n5. Force syncing player...')
    const syncResult = await playerSyncService.forceSyncPlayer('285392K')
    console.log(`   Sync result: ${syncResult ? '✅ Success' : '❌ Failed'}`)
    
    // 6. Check updated data
    console.log('\n6. Checking updated data after sync:')
    const updatedPlayer = await collection.findOne({ ECF_code: '285392K' })
    
    if (updatedPlayer) {
      const updatedStandardGames = updatedPlayer.games?.Standard || []
      console.log(`   Updated Standard Games: ${updatedStandardGames.length} (was ${standardGames.length})`)
      console.log(`   Updated Last Sync: ${updatedPlayer.last_ecf_sync_date}`)
      console.log(`   Updated Date Last Game: ${updatedPlayer.date_last_game}`)
      
      if (updatedStandardGames.length > standardGames.length) {
        const newGamesCount = updatedStandardGames.length - standardGames.length
        console.log(`   ✅ Added ${newGamesCount} new games`)
        
        // Show new games
        const sortedUpdatedGames = updatedStandardGames.sort((a: GameRecord, b: GameRecord) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
        console.log('\n   New games added:')
        sortedUpdatedGames.slice(0, newGamesCount).forEach((game: GameRecord, index: number) => {
          console.log(`   ${index + 1}. ${game.game_date} vs ${game.opponent_name}`)
        })
      } else if (updatedStandardGames.length === standardGames.length) {
        console.log('   ⚠️  No new games added after sync')
      }
    }
    
  } catch (error) {
    console.error('Debug script failed:', error)
  } finally {
    process.exit(0)
  }
}

debugKateWalker() 