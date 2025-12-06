async function testKatePlayerDetails() {
  console.log('🔍 Testing Kate Walker games from ECF API...\n')
  
  const playerId = '285392K'
  
  // Test the games endpoint that the user confirmed is working
  const gamesUrl = `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/S/player/${playerId}/limit/100`
  console.log(`Testing: ${gamesUrl}`)
  
  try {
    const response = await fetch(gamesUrl, {
      headers: {
        'User-Agent': 'ChessRatingAnalytics/1.0'
      }
    })
    
    console.log(`Status: ${response.status}`)
    
    if (response.ok) {
      const data = await response.json()
      console.log(`\n📋 ECF API Response for Kate Walker Games:`)
      console.log(`   Success: ${data.success}`)
      console.log(`   Processing Time: ${data.processing_time}`)
      
      // The games are directly in data.games array (not nested under Standard)
      const games = data.games || []
      console.log(`   Total Standard Games: ${games.length}`)
      
      if (games.length > 0) {
        console.log(`\n📊 Recent Standard Games:`)
        
        // Sort games by date (most recent first)
        const sortedGames = games.sort((a: any, b: any) => 
          new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
        )
        
        // Show first 5 games
        sortedGames.slice(0, 5).forEach((game: any, index: number) => {
          const result = game.score === 1 ? 'W' : game.score === 0 ? 'L' : game.score === 5 ? 'D' : `Score: ${game.score}`
          console.log(`   ${index + 1}. ${game.game_date} vs ${game.opponent_name} (${game.opponent_rating}) - ${result}`)
        })
        
        const mostRecent = sortedGames[0]
        console.log(`\n🎯 Most Recent Game: ${mostRecent.game_date} vs ${mostRecent.opponent_name}`)
        
        // Count games by month in 2025 to see recent activity
        console.log(`\n📅 Games by month in 2025:`)
        const gamesByMonth: Record<string, number> = {}
        
        games.forEach((game: any) => {
          if (game.game_date.startsWith('2025')) {
            const month = game.game_date.substring(0, 7) // YYYY-MM
            gamesByMonth[month] = (gamesByMonth[month] || 0) + 1
          }
        })
        
        Object.entries(gamesByMonth)
          .sort()
          .forEach(([month, count]) => {
            console.log(`   ${month}: ${count} games`)
          })
        
        // Show a sample game structure
        console.log(`\n🔧 Sample game structure:`)
        const sampleGame = games[0]
        console.log(`   Fields: ${Object.keys(sampleGame).join(', ')}`)
        
        console.log(`\n✅ API is working correctly!`)
        
      } else {
        console.log(`   ❌ No games returned`)
      }
      
    } else {
      console.log(`❌ HTTP Error: ${response.status}`)
      const errorText = await response.text()
      console.log(`Error details: ${errorText}`)
    }
  } catch (error) {
    console.log(`❌ Error: ${error}`)
  }
  
  // Also test player details endpoint for comparison
  console.log(`\n\n🔍 Testing player details endpoint for comparison...`)
  const playerUrl = `https://rating.englishchess.org.uk/v2/new/api.php?v2/player=${playerId}`
  console.log(`Testing: ${playerUrl}`)
  
  try {
    const response = await fetch(playerUrl, {
      headers: {
        'User-Agent': 'ChessRatingAnalytics/1.0'
      }
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log(`   Success: ${data.success}`)
      console.log(`   Player: ${data.full_name}`)
      console.log(`   Date Last Game: ${data.date_last_game}`)
      console.log(`   Club: ${data.club_name}`)
      
      // Check if player details also includes games
      if (data.games) {
        console.log(`   📊 Games in player details: ${Object.keys(data.games).join(', ')}`)
        if (data.games.Standard) {
          console.log(`   Standard games in player details: ${data.games.Standard.length}`)
        }
      } else {
        console.log(`   📊 No games field in player details`)
      }
    }
  } catch (error) {
    console.log(`   Error fetching player details: ${error}`)
  }
}

testKatePlayerDetails() 