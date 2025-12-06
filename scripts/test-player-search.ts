import { playerDataService } from '../lib/player-data'
import { closeConnection } from '../lib/mongodb'

async function testPlayerSearchClubDisplay() {
  console.log('🧪 Testing Player Search Club Display Fix...\n')

  try {
    // Test search for players that might have clubs array
    const testQueries = ['Smith', 'Jones', 'Brown', 'Wilson']
    
    for (const query of testQueries) {
      console.log(`🔍 Testing search query: "${query}"`)
      
      const players = await playerDataService.searchPlayers(query, 5)
      console.log(`   Found ${players.length} players`)
      
      for (const player of players) {
        const clubDisplay = player.club_name || 
          (player.clubs && player.clubs.length > 0 ? player.clubs[0].club_name : 'No club')
        
        console.log(`   📋 ${player.full_name} (${player.ECF_code})`)
        console.log(`      Club (direct): ${player.club_name || 'None'}`)
        console.log(`      Clubs array: ${player.clubs ? player.clubs.length + ' clubs' : 'None'}`)
        if (player.clubs && player.clubs.length > 0) {
          console.log(`      First club: ${player.clubs[0].club_name}`)
        }
        console.log(`      Display value: ${clubDisplay}`)
        console.log()
      }
      
      if (players.length === 0) {
        console.log(`   ❌ No players found for "${query}"`)
      }
      
      console.log('---')
    }

    // Test the API endpoint directly
    console.log('\n🌐 Testing API endpoint...')
    const response = await fetch('http://localhost:3000/api/player-search?name=Smith')
    if (response.ok) {
      const data = await response.json()
      console.log(`✅ API returned ${data.players?.length || 0} players`)
      
      if (data.players && data.players.length > 0) {
        const firstPlayer = data.players[0]
        console.log(`📋 First player: ${firstPlayer.full_name}`)
        console.log(`   Club name: ${firstPlayer.club_name || 'None'}`)
        console.log(`   Clubs array: ${firstPlayer.clubs ? 'Present' : 'None'}`)
      }
    } else {
      console.log(`❌ API test failed: ${response.status}`)
    }

  } catch (error) {
    console.error('💥 Test failed:', error)
  } finally {
    await closeConnection()
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testPlayerSearchClubDisplay()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { testPlayerSearchClubDisplay } 