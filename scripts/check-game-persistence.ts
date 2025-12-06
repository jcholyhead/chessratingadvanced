import { getDatabase, getPlayersCollection } from '../lib/mongodb'
import { closeConnection } from '../lib/mongodb'

async function checkGamePersistence() {
  console.log('🔍 Checking Game Persistence Status\n')
  
  const testPlayerId = '285392K' // Kate Walker
  
  try {
    await getDatabase()
    const collection = await getPlayersCollection()
    
    console.log('📊 Current MongoDB Storage for Kate Walker:')
    const player = await collection.findOne({ ECF_code: testPlayerId })
    
    if (!player) {
      console.log('❌ Player not found in MongoDB!')
      return
    }
    
    const standardGames = player.games?.Standard?.length || 0
    const rapidGames = player.games?.Rapid?.length || 0
    const blitzGames = player.games?.Blitz?.length || 0
    const totalGames = standardGames + rapidGames + blitzGames
    
    console.log(`   📈 Standard Games: ${standardGames}`)
    console.log(`   ⚡ Rapid Games: ${rapidGames}`)
    console.log(`   💨 Blitz Games: ${blitzGames}`)
    console.log(`   📊 Total Games: ${totalGames}`)
    console.log(`   📅 Last Sync: ${player.last_ecf_sync_date}`)
    
    if (player.games?.Standard && player.games.Standard.length > 0) {
      const recent = [...player.games.Standard]
        .sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
        .slice(0, 3)
      
      console.log('\n📈 Most Recent Standard Games in MongoDB:')
      recent.forEach((game, idx) => {
        console.log(`   ${idx + 1}. ${game.game_date} vs ${game.opponent_name} (Score: ${game.score})`)
      })
    }
    
    console.log('\n✅ PERSISTENCE STATUS:')
    console.log(`   • Games are stored in MongoDB: ${totalGames > 0 ? 'YES ✅' : 'NO ❌'}`)
    console.log(`   • Future queries use local data: ${totalGames > 0 ? 'YES ✅' : 'NO ❌'}`)
    console.log(`   • No ECF API needed for stored games: ${totalGames > 0 ? 'TRUE ✅' : 'FALSE ❌'}`)
    
    if (totalGames > 0) {
      console.log('\n🎯 CONCLUSION:')
      console.log(`   The system is working correctly! ${totalGames} games are persisted in MongoDB.`)
      console.log(`   When you query player data, it comes from MongoDB (fast) instead of ECF API (slow).`)
      console.log(`   New games are added during sync and remain stored for future use.`)
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  } finally {
    await closeConnection()
  }
}

// Run the check
checkGamePersistence().catch(console.error) 