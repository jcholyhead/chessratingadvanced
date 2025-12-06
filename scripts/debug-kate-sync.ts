import { MongoService } from '../lib/mongodb'
import { PlayerDataService } from '../lib/player-data'

async function debugKateSync() {
  console.log('🔍 Debugging Kate Walker sync issue...\n')
  
  const playerCode = '285392K'
  
  try {
    // Check what's in MongoDB first
    console.log('📂 Checking MongoDB data for Kate Walker...')
    const mongoData = await MongoService.getPlayerByCode(playerCode)
    
    if (mongoData) {
      console.log(`   ✅ Found in MongoDB: ${mongoData.full_name}`)
      console.log(`   Last ECF Sync: ${mongoData.last_ecf_sync || 'Never'}`)
      console.log(`   Standard Games: ${mongoData.games?.Standard?.length || 0}`)
      console.log(`   Rapid Games: ${mongoData.games?.Rapid?.length || 0}`)
      console.log(`   Blitz Games: ${mongoData.games?.Blitz?.length || 0}`)
      
      if (mongoData.games?.Standard?.length > 0) {
        const sortedGames = mongoData.games.Standard.sort((a: any, b: any) => 
          new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
        )
        console.log(`   Most Recent MongoDB Game: ${sortedGames[0].game_date} vs ${sortedGames[0].opponent_name}`)
        
        // Check for 2025 games
        const games2025 = mongoData.games.Standard.filter((g: any) => g.game_date.startsWith('2025'))
        console.log(`   2025 Games in MongoDB: ${games2025.length}`)
      }
      
      // Check sync status
      console.log(`\n🔄 Sync Status:`)
      console.log(`   Needs Sync: ${PlayerDataService.playerNeedsSync(mongoData)}`)
      console.log(`   Is Syncing: ${mongoData.is_syncing || false}`)
      
    } else {
      console.log(`   ❌ Not found in MongoDB`)
    }
    
    // Test ECF API directly
    console.log(`\n🌐 Testing ECF API directly...`)
    const ecfData = await PlayerDataService.fetchFromECF(playerCode)
    
    if (ecfData) {
      console.log(`   ✅ ECF API Response: ${ecfData.full_name}`)
      console.log(`   Date Last Game: ${ecfData.date_last_game}`)
      console.log(`   Standard Games: ${ecfData.games?.Standard?.length || 0}`)
      
      if (ecfData.games?.Standard?.length > 0) {
        const sortedEcfGames = ecfData.games.Standard.sort((a: any, b: any) => 
          new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
        )
        console.log(`   Most Recent ECF Game: ${sortedEcfGames[0].game_date} vs ${sortedEcfGames[0].opponent_name}`)
        
        // Check for 2025 games
        const ecfGames2025 = ecfData.games.Standard.filter((g: any) => g.game_date.startsWith('2025'))
        console.log(`   2025 Games from ECF: ${ecfGames2025.length}`)
      }
    } else {
      console.log(`   ❌ ECF API failed`)
    }
    
    // Test sync operation manually
    console.log(`\n🔄 Testing manual sync...`)
    
    try {
      const syncResult = await PlayerDataService.syncPlayer(playerCode)
      console.log(`   Sync Result: ${syncResult ? 'Success' : 'Failed'}`)
      
      // Check MongoDB again after sync
      const updatedData = await MongoService.getPlayerByCode(playerCode)
      if (updatedData) {
        console.log(`   After Sync - Standard Games: ${updatedData.games?.Standard?.length || 0}`)
        console.log(`   After Sync - Last ECF Sync: ${updatedData.last_ecf_sync}`)
        
        if (updatedData.games?.Standard?.length > 0) {
          const afterSyncGames = updatedData.games.Standard.sort((a: any, b: any) => 
            new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
          )
          console.log(`   After Sync - Most Recent: ${afterSyncGames[0].game_date} vs ${afterSyncGames[0].opponent_name}`)
          
          const afterSync2025 = updatedData.games.Standard.filter((g: any) => g.game_date.startsWith('2025'))
          console.log(`   After Sync - 2025 Games: ${afterSync2025.length}`)
        }
      }
      
    } catch (syncError) {
      console.log(`   ❌ Sync Error: ${syncError}`)
    }
    
    // Test the API endpoint that the frontend uses
    console.log(`\n🔌 Testing player-details API endpoint...`)
    
    try {
      const apiResponse = await fetch(`http://localhost:3000/api/player-details?playerCode=${playerCode}`)
      if (apiResponse.ok) {
        const apiData = await apiResponse.json()
        console.log(`   ✅ API Response: ${apiData.full_name}`)
        console.log(`   API Total Games: ${apiData.total_games}`)
        console.log(`   API Last Game Date: ${apiData.last_game_date}`)
        console.log(`   API Data Source: ${apiData._metadata?.source}`)
        console.log(`   API Last Sync: ${apiData._metadata?.last_sync}`)
      } else {
        console.log(`   ❌ API Error: ${apiResponse.status}`)
      }
    } catch (apiError) {
      console.log(`   ❌ API Connection Error: ${apiError}`)
    }
    
  } catch (error) {
    console.log(`❌ Debug Error: ${error}`)
  } finally {
    await MongoService.close()
  }
}

debugKateSync() 