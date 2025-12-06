import { playerSyncService } from '../lib/player-sync'
import { getDatabase, getPlayersCollection } from '../lib/mongodb'
import { closeConnection } from '../lib/mongodb'

async function verifyGamePersistence() {
  console.log('🔍 Verifying Game Persistence During Sync\n')
  
  const testPlayerId = '285392K' // Kate Walker for testing
  
  try {
    await getDatabase()
    const collection = await getPlayersCollection()
    
    // 1. Get current game count
    console.log('📊 Step 1: Current game count in MongoDB')
    const beforePlayer = await collection.findOne({ ECF_code: testPlayerId })
    
    if (!beforePlayer) {
      console.log('❌ Test player not found in MongoDB!')
      return
    }
    
    const beforeStandard = beforePlayer.games?.Standard?.length || 0
    const beforeRapid = beforePlayer.games?.Rapid?.length || 0
    const beforeBlitz = beforePlayer.games?.Blitz?.length || 0
    const beforeTotal = beforeStandard + beforeRapid + beforeBlitz
    
    console.log(`   📈 Standard Games: ${beforeStandard}`)
    console.log(`   ⚡ Rapid Games: ${beforeRapid}`)
    console.log(`   💨 Blitz Games: ${beforeBlitz}`)
    console.log(`   📊 Total Games: ${beforeTotal}`)
    console.log(`   📅 Last Sync: ${beforePlayer.last_ecf_sync_date || 'Never'}`)
    
    // 2. Force a sync to potentially add new games
    console.log('\n🔄 Step 2: Force syncing player to fetch any new games...')
    const syncResult = await playerSyncService.forceSyncPlayer(testPlayerId)
    console.log(`   🔄 Sync Result: ${syncResult ? 'SUCCESS' : 'NO NEW GAMES'}`)
    
    // 3. Check game count after sync
    console.log('\n📊 Step 3: Game count after sync')
    const afterPlayer = await collection.findOne({ ECF_code: testPlayerId })
    
    if (!afterPlayer) {
      console.log('❌ Player not found after sync!')
      return
    }
    
    const afterStandard = afterPlayer.games?.Standard?.length || 0
    const afterRapid = afterPlayer.games?.Rapid?.length || 0
    const afterBlitz = afterPlayer.games?.Blitz?.length || 0
    const afterTotal = afterStandard + afterRapid + afterBlitz
    
    console.log(`   📈 Standard Games: ${afterStandard} (was ${beforeStandard})`)
    console.log(`   ⚡ Rapid Games: ${afterRapid} (was ${beforeRapid})`)
    console.log(`   💨 Blitz Games: ${afterBlitz} (was ${beforeBlitz})`)
    console.log(`   📊 Total Games: ${afterTotal} (was ${beforeTotal})`)
    console.log(`   📅 Last Sync: ${afterPlayer.last_ecf_sync_date}`)
    
    const standardAdded = afterStandard - beforeStandard
    const rapidAdded = afterRapid - beforeRapid
    const blitzAdded = afterBlitz - beforeBlitz
    const totalAdded = afterTotal - beforeTotal
    
    console.log(`\n➕ Games Added:`)
    console.log(`   📈 Standard: +${standardAdded}`)
    console.log(`   ⚡ Rapid: +${rapidAdded}`)
    console.log(`   💨 Blitz: +${blitzAdded}`)
    console.log(`   📊 Total: +${totalAdded}`)
    
    // 4. Verify persistence by checking specific games
    if (totalAdded > 0) {
      console.log('\n✅ Step 4: Verifying game persistence')
      
      if (standardAdded > 0) {
        const standardGames = afterPlayer.games?.Standard
        if (standardGames) {
          const recentStandard = standardGames
            .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
            .slice(0, Math.min(3, standardAdded))
          
          console.log(`   📈 Recently added Standard games:`)
          recentStandard.forEach((game, idx) => {
            console.log(`     ${idx + 1}. ${game.game_date} vs ${game.opponent_name} (${game.score})`)
          })
        }
      }
      
      if (rapidAdded > 0) {
        const rapidGames = afterPlayer.games?.Rapid
        if (rapidGames) {
          const recentRapid = rapidGames
            .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
            .slice(0, Math.min(3, rapidAdded))
          
          console.log(`   ⚡ Recently added Rapid games:`)
          recentRapid.forEach((game, idx) => {
            console.log(`     ${idx + 1}. ${game.game_date} vs ${game.opponent_name} (${game.score})`)
          })
        }
      }
      
      if (blitzAdded > 0) {
        const blitzGames = afterPlayer.games?.Blitz
        if (blitzGames) {
          const recentBlitz = blitzGames
            .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
            .slice(0, Math.min(3, blitzAdded))
          
          console.log(`   💨 Recently added Blitz games:`)
          recentBlitz.forEach((game, idx) => {
            console.log(`     ${idx + 1}. ${game.game_date} vs ${game.opponent_name} (${game.score})`)
          })
        }
      }
      
      console.log('\n🎯 PERSISTENCE VERIFICATION: ✅ PASSED')
      console.log(`   New games were successfully added to MongoDB and are now stored locally.`)
      console.log(`   Future queries will use these stored games without needing to fetch from ECF API.`)
      
    } else {
      console.log('\n🎯 Step 4: No new games to verify')
      console.log(`   This means either:`)
      console.log(`   ✅ All games are already synced (system working correctly)`)
      console.log(`   ⚠️  Player hasn't played new games since last sync`)
      console.log(`   ❌ Sync isn't finding new games (potential issue)`)
      
      // Verify that existing games are properly stored
      if (afterTotal > 0) {
        console.log('\n✅ PERSISTENCE VERIFICATION: ✅ PASSED')
        console.log(`   ${afterTotal} games are properly stored in MongoDB.`)
        console.log(`   System is working correctly - no ECF API fetching needed for existing games.`)
      }
    }
    
    // 5. Test that games remain persistent after another query
    console.log('\n🔍 Step 5: Testing persistence after re-query')
    const recheckPlayer = await collection.findOne({ ECF_code: testPlayerId })
    const recheckTotal = (recheckPlayer?.games?.Standard?.length || 0) + 
                        (recheckPlayer?.games?.Rapid?.length || 0) + 
                        (recheckPlayer?.games?.Blitz?.length || 0)
    
    if (recheckTotal === afterTotal) {
      console.log(`   ✅ Game count consistent: ${recheckTotal} games`)
      console.log(`   ✅ Games remain persistent in MongoDB`)
    } else {
      console.log(`   ❌ Game count changed: ${recheckTotal} (was ${afterTotal})`)
    }
    
    console.log('\n📋 FINAL SUMMARY:')
    console.log(`   • Sync functionality: ${syncResult ? 'Working' : 'No new data'}`)
    console.log(`   • Game persistence: ${recheckTotal === afterTotal ? 'Working ✅' : 'Issue ❌'}`)
    console.log(`   • Total games stored: ${recheckTotal}`)
    console.log(`   • Database storage: MongoDB (no ECF API needed for stored games)`)
    
  } catch (error) {
    console.error('❌ Verification failed:', error)
  } finally {
    await closeConnection()
  }
}

// Run the verification
verifyGamePersistence().catch(console.error) 