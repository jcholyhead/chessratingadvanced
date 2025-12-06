async function debugECFAPI() {
  console.log('🔍 Debugging ECF API URL formats for Kate Walker (285392K)...\n')
  
  const playerId = '285392K'
  
  // Test different URL formats
  const urlFormats = [
    // Current format being used in sync
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/S/player/${playerId}/limit/100`,
    
    // Alternative formats
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/S/player/${playerId}/limit/100`,
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/S/player=${playerId}&limit=100`,
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/S/player=${playerId}`,
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/S/${playerId}/limit/100`,
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/S/${playerId}`,
    
    // Check if the working format from the existing app works
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/S/${playerId}`,
    
    // Without limit
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/S/player/${playerId}`,
    
    // Without v2 prefix
    `https://rating.englishchess.org.uk/v2/new/api.php?games/S/player/${playerId}/limit/100`
  ]
  
  for (let i = 0; i < urlFormats.length; i++) {
    const url = urlFormats[i]
    console.log(`\n${i + 1}. Testing: ${url}`)
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ChessRatingAnalytics/1.0'
        }
      })
      
      console.log(`   Status: ${response.status}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log(`   Success: ${data.success}`)
        
        if (data.games) {
          const standardGames = data.games.Standard || []
          console.log(`   Standard Games: ${standardGames.length}`)
          
          if (standardGames.length > 0) {
            const sortedGames = standardGames.sort((a: any, b: any) => 
              new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
            )
            const mostRecent = sortedGames[0]
            console.log(`   ✅ Most Recent: ${mostRecent.game_date} vs ${mostRecent.opponent_name}`)
            
            // Show recent games to verify
            console.log('   Recent games:')
            sortedGames.slice(0, 3).forEach((game: any, index: number) => {
              console.log(`     ${index + 1}. ${game.game_date} vs ${game.opponent_name}`)
            })
            
            // This format works!
            console.log(`   🎯 WORKING URL FORMAT FOUND!`)
            break
          } else {
            console.log(`   ❌ No games returned`)
          }
        } else {
          console.log(`   ❌ No games field in response`)
          console.log(`   Response keys: ${Object.keys(data).join(', ')}`)
        }
      } else {
        console.log(`   ❌ HTTP Error: ${response.status}`)
      }
    } catch (error) {
      console.log(`   ❌ Fetch Error: ${error}`)
    }
  }
  
  // Also test the player details endpoint to see what format it uses
  console.log('\n\n🔍 Testing player details endpoint...')
  const playerDetailsUrl = `https://rating.englishchess.org.uk/v2/new/api.php?v2/player=${playerId}`
  console.log(`Testing: ${playerDetailsUrl}`)
  
  try {
    const response = await fetch(playerDetailsUrl, {
      headers: {
        'User-Agent': 'ChessRatingAnalytics/1.0'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log(`Player Details Success: ${data.success}`)
      console.log(`Player Name: ${data.full_name}`)
      console.log(`Date Last Game: ${data.date_last_game}`)
      
      if (data.games) {
        const standardGames = data.games.Standard || []
        console.log(`Standard Games in Player Details: ${standardGames.length}`)
        
        if (standardGames.length > 0) {
          const sortedGames = standardGames.sort((a: any, b: any) => 
            new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
          )
          const mostRecent = sortedGames[0]
          console.log(`✅ Most Recent from Player Details: ${mostRecent.game_date} vs ${mostRecent.opponent_name}`)
        }
      }
    }
  } catch (error) {
    console.log(`Player details fetch error: ${error}`)
  }
}

debugECFAPI() 