import { playerSyncService } from '../lib/player-sync'
import { playerDataService } from '../lib/player-data'
import { closeConnection } from '../lib/mongodb'

async function forceKateSync() {
  console.log('🔄 Force syncing Kate Walker...\n')
  
  const kateCode = '285392K'
  
  try {
    // Check current data
    console.log('📂 Before sync:')
    const beforeData = await playerDataService.getPlayerData(kateCode, false)
    if (beforeData) {
      console.log(`   Last sync: ${beforeData.last_ecf_sync_date}`)
      console.log(`   Standard games: ${beforeData.games?.Standard?.length || 0}`)
      
      if (beforeData.games?.Standard?.length > 0) {
        const sorted = [...beforeData.games.Standard].sort((a, b) => 
          new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
        )
        console.log(`   Most recent game: ${sorted[0].game_date} vs ${sorted[0].opponent_name}`)
      }
    }
    
    // Force sync using the forceSyncPlayer method (this bypasses needsSync check)
    console.log('\n🚀 Forcing sync...')
    const syncResult = await playerSyncService.forceSyncPlayer(kateCode)
    console.log(`   Force sync result: ${syncResult ? 'Success' : 'Failed'}`)
    
    // Check data after sync
    console.log('\n📂 After sync:')
    const afterData = await playerDataService.getPlayerData(kateCode, false)
    if (afterData) {
      console.log(`   Last sync: ${afterData.last_ecf_sync_date}`)
      console.log(`   Standard games: ${afterData.games?.Standard?.length || 0}`)
      
      if (afterData.games?.Standard?.length > 0) {
        const sorted = [...afterData.games.Standard].sort((a, b) => 
          new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
        )
        console.log(`   Most recent game: ${sorted[0].game_date} vs ${sorted[0].opponent_name}`)
        
        // Check for 2025 games
        const games2025 = afterData.games.Standard.filter(g => g.game_date.startsWith('2025'))
        console.log(`   2025 games: ${games2025.length}`)
        
        // Compare with ECF API expectation (should have game from 2025-04-08)
        const aprilGames = afterData.games.Standard.filter(g => g.game_date.startsWith('2025-04'))
        console.log(`   April 2025 games: ${aprilGames.length}`)
        
        if (aprilGames.length > 0) {
          console.log(`   ✅ SUCCESS: Found recent games from April 2025!`)
          aprilGames.forEach(game => {
            console.log(`     ${game.game_date} vs ${game.opponent_name}`)
          })
        } else {
          console.log(`   ❌ PROBLEM: Still no April 2025 games`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Force sync failed:', error)
  } finally {
    await closeConnection()
  }
}

forceKateSync() 