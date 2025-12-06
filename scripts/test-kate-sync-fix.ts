import { playerSyncService } from '../lib/player-sync'
import { getDatabase, getPlayersCollection } from '../lib/mongodb'
import { closeConnection } from '../lib/mongodb'

async function testKateSyncFix() {
  console.log('🔧 Testing Kate Walker Sync Fix\n')
  
  const kateCode = '285392K'
  
  try {
    await getDatabase()
    const collection = await getPlayersCollection()
    
    // 1. Check Kate's current data
    console.log('📂 Step 1: Current MongoDB data for Kate Walker')
    const beforePlayer = await collection.findOne({ ECF_code: kateCode })
    
    if (!beforePlayer) {
      console.log('❌ Kate Walker not found in MongoDB!')
      return
    }
    
    const beforeStandardGames = beforePlayer.games?.Standard || []
    console.log(`   📊 Current Standard Games: ${beforeStandardGames.length}`)
    console.log(`   📅 Last ECF Sync: ${beforePlayer.last_ecf_sync_date}`)
    console.log(`   🔄 Sync In Progress: ${beforePlayer.sync_in_progress || false}`)
    
    if (beforeStandardGames.length > 0) {
      const sortedBefore = [...beforeStandardGames].sort((a, b) => 
        new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
      )
      console.log(`   📈 Most Recent Game: ${sortedBefore[0].game_date} vs ${sortedBefore[0].opponent_name}`)
      
      const before2025 = beforeStandardGames.filter(g => g.game_date.startsWith('2025'))
      console.log(`   🗓️  2025 Games: ${before2025.length}`)
    }
    
    // 2. Force sync Kate Walker
    console.log('\n🚀 Step 2: Force syncing Kate Walker with fixed code...')
    const syncResult = await playerSyncService.forceSyncPlayer(kateCode)
    console.log(`   🔄 Sync Result: ${syncResult ? 'SUCCESS ✅' : 'FAILED ❌'}`)
    
    // 3. Check Kate's data after sync
    console.log('\n📂 Step 3: MongoDB data after sync')
    const afterPlayer = await collection.findOne({ ECF_code: kateCode })
    
    if (!afterPlayer) {
      console.log('❌ Kate Walker not found after sync!')
      return
    }
    
    const afterStandardGames = afterPlayer.games?.Standard || []
    console.log(`   📊 Standard Games After Sync: ${afterStandardGames.length} (was ${beforeStandardGames.length})`)
    console.log(`   📅 Last ECF Sync: ${afterPlayer.last_ecf_sync_date}`)
    
    const newGamesAdded = afterStandardGames.length - beforeStandardGames.length
    console.log(`   ➕ New Games Added: ${newGamesAdded}`)
    
    if (afterStandardGames.length > 0) {
      const sortedAfter = [...afterStandardGames].sort((a, b) => 
        new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
      )
      console.log(`   📈 Most Recent Game After: ${sortedAfter[0].game_date} vs ${sortedAfter[0].opponent_name}`)
      
      const after2025 = afterStandardGames.filter(g => g.game_date.startsWith('2025'))
      console.log(`   🗓️  2025 Games After: ${after2025.length}`)
    }
    
    // 4. Verify expected results
    console.log('\n🎯 Step 4: Verification')
    
    if (newGamesAdded > 0) {
      console.log(`   ✅ SUCCESS: Added ${newGamesAdded} new games!`)
      
      // Show some of the new games
      const newGames = afterStandardGames
        .filter(ag => !beforeStandardGames.some(bg => 
          bg.game_date === ag.game_date && bg.opponent_name === ag.opponent_name
        ))
        .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
      
      console.log('   📋 New games added:')
      newGames.slice(0, 5).forEach((game, idx) => {
        console.log(`     ${idx + 1}. ${game.game_date} vs ${game.opponent_name} (Score: ${game.score})`)
      })
      
      if (newGames.length > 5) {
        console.log(`     ... and ${newGames.length - 5} more`)
      }
      
      // Check if we got the April 2025 game we expected
      const aprilGame = newGames.find(g => g.game_date === '2025-04-08' && g.opponent_name === 'Rutter, Nick J')
      if (aprilGame) {
        console.log(`   🎯 ✅ Found expected April 2025 game: ${aprilGame.game_date} vs ${aprilGame.opponent_name}`)
      } else {
        console.log(`   ⚠️  Expected April 2025 game not found`)
      }
      
    } else if (newGamesAdded === 0) {
      console.log(`   ⚠️  No new games added - this could mean:`)
      console.log(`      • All games are already synced (sync working correctly)`)
      console.log(`      • The bug still exists`)
      console.log(`      • Kate hasn't played new games since last sync`)
      
      // Check if the most recent game matches what we expect from ECF
      const sortedAfter = [...afterStandardGames].sort((a, b) => 
        new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
      )
      
      if (sortedAfter.length > 0 && sortedAfter[0].game_date === '2025-04-08') {
        console.log(`   ✅ Most recent game is April 2025 - sync appears to be working correctly`)
      } else {
        console.log(`   ❌ Most recent game is ${sortedAfter[0]?.game_date} - expected 2025-04-08`)
      }
    } else {
      console.log(`   ❌ UNEXPECTED: Game count decreased by ${Math.abs(newGamesAdded)}`)
    }
    
    console.log('\n📋 SUMMARY:')
    console.log(`   • Sync Result: ${syncResult ? 'Success' : 'Failed'}`)
    console.log(`   • Games Before: ${beforeStandardGames.length}`)
    console.log(`   • Games After: ${afterStandardGames.length}`)
    console.log(`   • New Games: ${newGamesAdded}`)
    console.log(`   • Fix Status: ${newGamesAdded > 0 ? 'WORKING ✅' : 'NEEDS INVESTIGATION ❓'}`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await closeConnection()
  }
}

// Run the test
testKateSyncFix().catch(console.error) 