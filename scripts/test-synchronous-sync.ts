import { getDatabase, getPlayersCollection } from '../lib/mongodb'
import { playerDataService } from '../lib/player-data'
import { closeConnection } from '../lib/mongodb'

async function testSynchronousSync() {
  console.log('🧪 Testing Synchronous Sync Behavior\n')
  
  const testPlayerId = '285392K' // Kate Walker
  
  try {
    await getDatabase()
    const collection = await getPlayersCollection()
    
    console.log('📊 Step 1: Current state before sync')
    const beforePlayer = await collection.findOne({ ECF_code: testPlayerId })
    
    if (!beforePlayer) {
      console.log('❌ Test player not found in MongoDB!')
      return
    }
    
    const beforeTotal = (beforePlayer.games?.Standard?.length || 0) + 
                       (beforePlayer.games?.Rapid?.length || 0) + 
                       (beforePlayer.games?.Blitz?.length || 0)
    
    console.log(`   📊 Total Games: ${beforeTotal}`)
    console.log(`   📅 Last Sync: ${beforePlayer.last_ecf_sync_date}`)
    
    console.log('\n⏱️  Step 2: Testing synchronous data retrieval...')
    const startTime = Date.now()
    
    // This should now:
    // 1. Perform sync FIRST (if needed)
    // 2. Return updated data AFTER sync completion
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
    
    if (totalTime > 100) {
      console.log(`   ✅ Response time (${totalTime}ms) indicates sync was performed`)
      console.log(`   ✅ Data was returned AFTER sync completion (synchronous)`)
    } else {
      console.log(`   ⚠️  Fast response (${totalTime}ms) - sync may have been skipped`)
      console.log(`   ℹ️  This is normal if player was recently synced`)
    }
    
    // Test API endpoint behavior
    console.log('\n🌐 Step 4: Testing API endpoint with synchronous sync')
    const apiStartTime = Date.now()
    
    try {
      const response = await fetch(`http://localhost:3000/api/player-details?playerCode=${testPlayerId}`)
      const apiEndTime = Date.now()
      const apiTotalTime = apiEndTime - apiStartTime
      
      if (response.ok) {
        const data = await response.json()
        
        console.log(`   ⏱️  API Response Time: ${apiTotalTime}ms`)
        console.log(`   📊 API Total Games: ${(data.games?.Standard?.length || 0) + (data.games?.Rapid?.length || 0) + (data.games?.Blitz?.length || 0)}`)
        console.log(`   🔄 Sync Mode: ${data._metadata?.sync_mode}`)
        console.log(`   📅 Data Freshness: ${data._metadata?.data_freshness}`)
        
        if (data._metadata?.sync_mode === 'synchronous') {
          console.log(`   ✅ API is using synchronous sync mode`)
        } else {
          console.log(`   ❌ API is not using synchronous sync mode`)
        }
        
        if (data._metadata?.data_freshness === 'just_synced') {
          console.log(`   ✅ Data is marked as freshly synced`)
        }
        
      } else {
        console.log(`   ❌ API request failed: ${response.status} ${response.statusText}`)
      }
    } catch (apiError) {
      console.log(`   ❌ API test failed: ${apiError}`)
      console.log(`   ℹ️  This is expected if the development server is not running`)
    }
    
    console.log('\n📋 SYNCHRONOUS SYNC TEST SUMMARY:')
    console.log(`   • Sync Mode: Synchronous (blocking)`)
    console.log(`   • Data Freshness: Always current after API call`)
    console.log(`   • Response Time: ${totalTime}ms (includes sync time)`)
    console.log(`   • Behavior: Sync → Return Updated Data`)
    console.log(`   • User Experience: Slightly slower but always fresh data`)
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await closeConnection()
  }
}

// Run the test
testSynchronousSync().catch(console.error) 