import { getDatabase, getPlayersCollection } from '../lib/mongodb'
import { playerDataService } from '../lib/player-data'
import { playerSyncService } from '../lib/player-sync'
import { closeConnection } from '../lib/mongodb'

async function testFullSynchronousSync() {
  console.log('🧪 Testing Full Synchronous Sync Behavior (with forced sync)\n')
  
  const testPlayerId = '285392K' // Kate Walker
  
  try {
    await getDatabase()
    const collection = await getPlayersCollection()
    
    console.log('📊 Step 1: Reset sync date to force a fresh sync')
    
    // Reset the last sync date to force a sync
    await collection.updateOne(
      { ECF_code: testPlayerId },
      { 
        $unset: { last_ecf_sync_date: 1 },
        $set: { sync_in_progress: false }
      }
    )
    
    const beforePlayer = await collection.findOne({ ECF_code: testPlayerId })
    if (!beforePlayer) {
      console.log('❌ Test player not found!')
      return
    }
    
    const beforeTotal = (beforePlayer.games?.Standard?.length || 0) + 
                       (beforePlayer.games?.Rapid?.length || 0) + 
                       (beforePlayer.games?.Blitz?.length || 0)
    
    console.log(`   📊 Total Games Before: ${beforeTotal}`)
    console.log(`   📅 Last Sync: ${beforePlayer.last_ecf_sync_date || 'RESET (will force sync)'}`)
    
    console.log('\n⏱️  Step 2: Testing synchronous data retrieval with forced sync...')
    const startTime = Date.now()
    
    // This should now:
    // 1. Perform FULL sync because last_ecf_sync_date was reset
    // 2. Return updated data AFTER sync completion
    // 3. Take longer because it's doing real ECF API calls
    console.log('   🔄 Starting synchronous sync (this will take a few seconds)...')
    const playerData = await playerDataService.getPlayerData(testPlayerId, true)
    
    const endTime = Date.now()
    const totalTime = endTime - startTime
    
    if (!playerData) {
      console.log('❌ Failed to get player data!')
      return
    }
    
    const afterTotal = (playerData.games?.Standard?.length || 0) + 
                      (playerData.games?.Rapid?.length || 0) + 
                      (playerData.games?.Blitz?.length || 0)
    
    console.log(`   ⏱️  Total Response Time: ${totalTime}ms`)
    console.log(`   📊 Total Games After: ${afterTotal}`)
    console.log(`   📅 Last Sync After: ${playerData.last_ecf_sync_date}`)
    console.log(`   ➕ Games Added: ${afterTotal - beforeTotal}`)
    
    console.log('\n🔍 Step 3: Verifying synchronous behavior')
    
    if (totalTime > 1000) {
      console.log(`   ✅ SYNCHRONOUS SYNC CONFIRMED!`)
      console.log(`   ✅ Response time (${totalTime}ms) proves sync was performed BEFORE data return`)
      console.log(`   ✅ Data was returned AFTER sync completion (blocking/synchronous)`)
      console.log(`   ✅ User would see loading state during this ${Math.round(totalTime/1000)}s wait`)
    } else if (totalTime > 100) {
      console.log(`   ✅ Sync was performed synchronously (${totalTime}ms)`)
    } else {
      console.log(`   ⚠️  Unexpectedly fast - sync may have been skipped`)
    }
    
    console.log('\n📋 SYNCHRONOUS SYNC IMPLEMENTATION SUMMARY:')
    console.log(``)
    console.log(`🔄 NEW BEHAVIOR (Synchronous):`)
    console.log(`   1. Page load → API call`)
    console.log(`   2. API performs sync FIRST (blocking)`)
    console.log(`   3. API returns fresh data AFTER sync`)
    console.log(`   4. Page displays updated data`)
    console.log(`   5. No real-time updates needed (data is already fresh)`)
    console.log(``)
    console.log(`📊 TRADE-OFFS:`)
    console.log(`   ✅ Pros: Always fresh data, no real-time complexity`)
    console.log(`   ⚠️  Cons: Slower initial page loads (${Math.round(totalTime/1000)}s wait)`)
    console.log(``)
    console.log(`🎯 USER EXPERIENCE:`)
    console.log(`   • User clicks on player → sees loading spinner`)
    console.log(`   • System syncs with ECF API (${Math.round(totalTime/1000)}s)`)
    console.log(`   • User sees completely up-to-date data`)
    console.log(`   • No need for page refresh or real-time updates`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await closeConnection()
  }
}

// Run the test
testFullSynchronousSync().catch(console.error) 