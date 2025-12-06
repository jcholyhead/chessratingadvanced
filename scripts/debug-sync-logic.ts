import { playerDataService } from '../lib/player-data'
import { closeConnection } from '../lib/mongodb'

async function debugSyncLogic() {
  console.log('🔍 Debugging sync logic for Kate Walker...\n')
  
  const kateCode = '285392K'
  
  try {
    // Get Kate's current data
    const kateData = await playerDataService.getPlayerData(kateCode, false)
    
    if (!kateData) {
      console.log('❌ Kate not found in MongoDB')
      return
    }
    
    console.log('📂 Kate Walker current data:')
    console.log(`   Name: ${kateData.full_name}`)
    console.log(`   ECF Code: ${kateData.ECF_code}`)
    console.log(`   Last ECF Sync Date: ${kateData.last_ecf_sync_date}`)
    console.log(`   Last ECF Sync Date Type: ${typeof kateData.last_ecf_sync_date}`)
    console.log(`   Sync In Progress: ${kateData.sync_in_progress}`)
    
    // Manual needsSync calculation
    console.log('\n🧮 Manual needsSync calculation:')
    
    if (!kateData.last_ecf_sync_date) {
      console.log('   ✅ No last sync date - should sync: TRUE')
    } else {
      const now = new Date()
      const lastSync = new Date(kateData.last_ecf_sync_date)
      const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)
      const SYNC_COOLDOWN_HOURS = 24
      
      console.log(`   Now: ${now.toISOString()}`)
      console.log(`   Last Sync: ${lastSync.toISOString()}`)
      console.log(`   Hours Since Sync: ${hoursSinceSync}`)
      console.log(`   Cooldown Hours: ${SYNC_COOLDOWN_HOURS}`)
      console.log(`   Should Sync (${hoursSinceSync} >= ${SYNC_COOLDOWN_HOURS}): ${hoursSinceSync >= SYNC_COOLDOWN_HOURS}`)
      
      if (hoursSinceSync >= SYNC_COOLDOWN_HOURS) {
        console.log('   ✅ Should sync: TRUE')
      } else {
        console.log('   ❌ Should NOT sync: FALSE')
      }
    }
    
    // Check all relevant fields that might affect sync
    console.log('\n🔍 All sync-related fields:')
    console.log(`   last_ecf_sync_date: ${kateData.last_ecf_sync_date}`)
    console.log(`   sync_in_progress: ${kateData.sync_in_progress}`)
    console.log(`   sync_error_count: ${kateData.sync_error_count}`)
    console.log(`   last_sync_error: ${kateData.last_sync_error}`)
    
    // Check if there are any other date fields that might be confusing the sync
    console.log('\n📅 All date-related fields:')
    Object.keys(kateData).forEach(key => {
      const value = (kateData as any)[key]
      if (value instanceof Date || (typeof value === 'string' && value.match(/\d{4}-\d{2}-\d{2}/))) {
        console.log(`   ${key}: ${value}`)
      }
    })
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await closeConnection()
  }
}

debugSyncLogic() 