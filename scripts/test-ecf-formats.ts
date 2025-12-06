async function testECFFormats() {
  console.log('🔍 Testing ECF API formats based on documentation...\n')
  
  const playerId = '285392K'
  const gameType = 'S' // Standard
  
  // Test different URL formats based on the documentation
  const testUrls = [
    // From documentation: v2/games/{type}/player/{code}/limit/2000
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/${gameType}/player/${playerId}/limit/2000`,
    
    // Test without limit (just like player details)
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/${gameType}/player/${playerId}`,
    
    // Test with query style limit
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/${gameType}/player/${playerId}&limit=100`,
    
    // Test the format that's similar to player details
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/player=${playerId}`,
    
    // Maybe the games endpoint doesn't need a separate call
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/player=${playerId}&includeGames=true`,
    
    // Maybe there's a simpler format
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/${playerId}`,
    
    // Test the player details endpoint to see if it returns games
    `https://rating.englishchess.org.uk/v2/new/api.php?v2/player=${playerId}`
  ]
  
  for (let i = 0; i < testUrls.length; i++) {
    const url = testUrls[i]
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
        console.log(`   Player: ${data.full_name || 'N/A'}`)
        console.log(`   Date Last Game: ${data.date_last_game || 'N/A'}`)
        
        // Check if games are in the response
        if (data.games) {
          const standardGames = data.games.Standard || []
          const rapidGames = data.games.Rapid || []
          const blitzGames = data.games.Blitz || []
          
          console.log(`   📊 Games in response:`)
          console.log(`      Standard: ${standardGames.length}`)
          console.log(`      Rapid: ${rapidGames.length}`)
          console.log(`      Blitz: ${blitzGames.length}`)
          
          if (standardGames.length > 0) {
            const sortedGames = standardGames.sort((a: any, b: any) => 
              new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
            )
            const mostRecent = sortedGames[0]
            console.log(`   🎯 Most Recent Standard Game: ${mostRecent.game_date} vs ${mostRecent.opponent_name}`)
            
            // Show a few recent games
            console.log(`   📋 Recent games:`)
            sortedGames.slice(0, 3).forEach((game: any, index: number) => {
              console.log(`      ${index + 1}. ${game.game_date} vs ${game.opponent_name}`)
            })
            
            console.log(`   ✅ WORKING FORMAT FOUND! This endpoint returns games.`)
          } else {
            console.log(`   ⚠️  No Standard games returned`)
          }
        } else {
          console.log(`   ❌ No games field in response`)
          console.log(`   Available fields: ${Object.keys(data).join(', ')}`)
        }
      } else {
        console.log(`   ❌ HTTP Error: ${response.status}`)
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error}`)
    }
  }
}

testECFFormats() 