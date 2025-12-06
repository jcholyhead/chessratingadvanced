import { getDatabase, getPlayersCollection, GameRecord } from '../lib/mongodb'
import { closeConnection } from '../lib/mongodb'

interface ECFApiGame {
  game_date: string
  colour: string
  score: number | string
  opponent_name: string
  opponent_no: number
  opponent_rating: number | string
  increment: number | string
  player_rating: number | string
  club_code: string
  event_code: string
  org_name: string | null
  event_name: string
  section_title: string
}

// Test the duplicate detection logic used in sync service
const isDuplicateGame = (newGame: ECFApiGame, existingGames: GameRecord[]): boolean => {
  return existingGames.some(existing => 
    existing.game_date === newGame.game_date &&
    existing.colour?.toLowerCase() === newGame.colour?.toLowerCase() &&
    existing.opponent_no === newGame.opponent_no &&
    existing.event_code === newGame.event_code &&
    String(existing.score) === String(newGame.score) &&
    String(existing.opponent_rating) === String(newGame.opponent_rating) &&
    existing.opponent_name === newGame.opponent_name
  )
}

const findNewGames = (ecfGames: ECFApiGame[], mongoGames: GameRecord[]): ECFApiGame[] => {
  return ecfGames.filter(ecfGame => !isDuplicateGame(ecfGame, mongoGames))
}

async function debugKateSyncDetailed() {
  console.log('🔍 DETAILED DEBUG: Kate Walker Sync Issue Investigation\n')
  
  const kateCode = '285392K'
  
  try {
    // Connect to database
    await getDatabase()
    const collection = await getPlayersCollection()
    
    // 1. Get Kate's current MongoDB data
    console.log('📂 Step 1: Current MongoDB Data for Kate Walker')
    const player = await collection.findOne({ ECF_code: kateCode })
    
    if (!player) {
      console.log('❌ Kate Walker not found in MongoDB!')
      return
    }
    
    console.log(`   ✅ Found: ${player.full_name}`)
    console.log(`   📅 Last ECF Sync: ${player.last_ecf_sync_date || 'Never'}`)
    console.log(`   🔄 Sync In Progress: ${player.sync_in_progress || false}`)
    
    const mongoStandardGames = player.games?.Standard || []
    console.log(`   📊 MongoDB Standard Games: ${mongoStandardGames.length}`)
    
    if (mongoStandardGames.length > 0) {
      const sortedMongoGames = [...mongoStandardGames].sort((a, b) => 
        new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
      )
      console.log(`   📈 Most Recent MongoDB Game: ${sortedMongoGames[0].game_date} vs ${sortedMongoGames[0].opponent_name}`)
      
      // Check for 2025 games in MongoDB
      const mongo2025Games = mongoStandardGames.filter(g => g.game_date.startsWith('2025'))
      console.log(`   🗓️  2025 Games in MongoDB: ${mongo2025Games.length}`)
      
      if (mongo2025Games.length > 0) {
        console.log('   📋 2025 Games in MongoDB:')
        mongo2025Games.forEach((game, idx) => {
          console.log(`     ${idx + 1}. ${game.game_date} vs ${game.opponent_name} (Score: ${game.score})`)
        })
      }
    }
    
    // 2. Fetch current ECF API data
    console.log('\n🌐 Step 2: Fetching Current ECF API Data')
    const ecfUrl = 'https://rating.englishchess.org.uk/v2/new/api.php?v2/games/S/player/285392K/limit/100'
    console.log(`   🔗 URL: ${ecfUrl}`)
    
    const response = await fetch(ecfUrl, {
      headers: {
        'User-Agent': 'ChessRatingAnalytics/1.0'
      }
    })
    
    if (!response.ok) {
      console.log(`   ❌ ECF API Error: ${response.status}`)
      return
    }
    
    const ecfData = await response.json()
    console.log(`   ✅ ECF API Success: ${ecfData.success}`)
    console.log(`   ⏱️  Processing Time: ${ecfData.processing_time}`)
    
    // CRITICAL: Check ECF response structure
    console.log('\n🔍 Step 3: ECF Response Structure Analysis')
    console.log(`   📋 ECF Response Keys: ${Object.keys(ecfData).join(', ')}`)
    
    // The issue might be here - check if games are nested under 'games.Standard' or directly in 'games'
    let ecfGames: ECFApiGame[] = []
    
    if (ecfData.games) {
      if (Array.isArray(ecfData.games)) {
        // Games are directly an array
        ecfGames = ecfData.games
        console.log(`   📊 ECF Games (direct array): ${ecfGames.length}`)
      } else if (ecfData.games.Standard) {
        // Games are nested under Standard
        ecfGames = ecfData.games.Standard
        console.log(`   📊 ECF Games (under Standard): ${ecfGames.length}`)
      } else {
        console.log(`   ❌ Unexpected ECF games structure:`, Object.keys(ecfData.games))
        console.log(`   📋 Games object:`, ecfData.games)
      }
    } else {
      console.log(`   ❌ No games field in ECF response`)
    }
    
    if (ecfGames.length === 0) {
      console.log('   ❌ No ECF games found - this could be the issue!')
      return
    }
    
    // Sort ECF games by date
    const sortedEcfGames = [...ecfGames].sort((a, b) => 
      new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
    )
    
    console.log(`   📈 Most Recent ECF Game: ${sortedEcfGames[0].game_date} vs ${sortedEcfGames[0].opponent_name}`)
    
    // Check for 2025 games in ECF data
    const ecf2025Games = ecfGames.filter(g => g.game_date.startsWith('2025'))
    console.log(`   🗓️  2025 Games in ECF: ${ecf2025Games.length}`)
    
    if (ecf2025Games.length > 0) {
      console.log('   📋 2025 Games in ECF:')
      ecf2025Games.forEach((game, idx) => {
        console.log(`     ${idx + 1}. ${game.game_date} vs ${game.opponent_name} (Score: ${game.score})`)
      })
    }
    
    // 3. Detailed comparison of game matching logic
    console.log('\n🔍 Step 4: Game Comparison Logic Analysis')
    
    const newGames = findNewGames(ecfGames, mongoStandardGames)
    console.log(`   📊 New Games Found by Logic: ${newGames.length}`)
    
    if (newGames.length === 0) {
      console.log('   ❌ NO NEW GAMES - This confirms the sync issue!')
      
      // Let's debug why no new games are found
      console.log('\n🔍 Step 5: Field-by-Field Comparison Debug')
      
      // Take the most recent ECF game and compare it against MongoDB games
      const recentEcfGame = sortedEcfGames[0]
      console.log(`   🎯 Testing Recent ECF Game: ${recentEcfGame.game_date} vs ${recentEcfGame.opponent_name}`)
      
      // Check if this specific game exists in MongoDB
      const matchingMongoGames = mongoStandardGames.filter(mg => 
        mg.game_date === recentEcfGame.game_date &&
        mg.opponent_name === recentEcfGame.opponent_name
      )
      
      console.log(`   🔍 Matching by date+opponent: ${matchingMongoGames.length}`)
      
      if (matchingMongoGames.length > 0) {
        const matchingGame = matchingMongoGames[0]
        console.log('   📋 Field-by-field comparison:')
        console.log(`     game_date: ECF="${recentEcfGame.game_date}" | MongoDB="${matchingGame.game_date}" | Match: ${recentEcfGame.game_date === matchingGame.game_date}`)
        console.log(`     colour: ECF="${recentEcfGame.colour}" | MongoDB="${matchingGame.colour}" | Match: ${recentEcfGame.colour?.toLowerCase() === matchingGame.colour?.toLowerCase()}`)
        console.log(`     opponent_no: ECF="${recentEcfGame.opponent_no}" | MongoDB="${matchingGame.opponent_no}" | Match: ${recentEcfGame.opponent_no === matchingGame.opponent_no}`)
        console.log(`     event_code: ECF="${recentEcfGame.event_code}" | MongoDB="${matchingGame.event_code}" | Match: ${recentEcfGame.event_code === matchingGame.event_code}`)
        console.log(`     score: ECF="${recentEcfGame.score}" | MongoDB="${matchingGame.score}" | Match: ${String(recentEcfGame.score) === String(matchingGame.score)}`)
        console.log(`     opponent_rating: ECF="${recentEcfGame.opponent_rating}" | MongoDB="${matchingGame.opponent_rating}" | Match: ${String(recentEcfGame.opponent_rating) === String(matchingGame.opponent_rating)}`)
        console.log(`     opponent_name: ECF="${recentEcfGame.opponent_name}" | MongoDB="${matchingGame.opponent_name}" | Match: ${recentEcfGame.opponent_name === matchingGame.opponent_name}`)
        
        // Check if this game would be considered a duplicate
        const isDupe = isDuplicateGame(recentEcfGame, [matchingGame])
        console.log(`   🎯 Would be considered duplicate: ${isDupe}`)
        
        if (isDupe) {
          console.log('   ✅ This game already exists - duplicate detection working correctly')
        } else {
          console.log('   ❌ This game is NOT considered duplicate but should be!')
        }
      } else {
        console.log('   ✅ This ECF game is NOT in MongoDB - should be added!')
        
        // Check if there are ANY games from this date
        const sameDate = mongoStandardGames.filter(mg => mg.game_date === recentEcfGame.game_date)
        console.log(`   📅 MongoDB games from same date (${recentEcfGame.game_date}): ${sameDate.length}`)
        
        if (sameDate.length > 0) {
          console.log('   📋 Same date games in MongoDB:')
          sameDate.forEach(game => {
            console.log(`     vs ${game.opponent_name} (${game.opponent_no})`)
          })
        }
      }
      
      // Let's also check a few more recent ECF games
      console.log('\n🔍 Step 6: Testing Multiple Recent ECF Games')
      sortedEcfGames.slice(0, 5).forEach((ecfGame, idx) => {
        const existsInMongo = mongoStandardGames.some(mg => 
          mg.game_date === ecfGame.game_date &&
          mg.opponent_name === ecfGame.opponent_name
        )
        console.log(`   ${idx + 1}. ${ecfGame.game_date} vs ${ecfGame.opponent_name} | In MongoDB: ${existsInMongo ? '✅' : '❌'}`)
      })
      
    } else {
      console.log(`   ✅ ${newGames.length} new games found!`)
      console.log('   📋 New games that should be added:')
      newGames.forEach((game, idx) => {
        console.log(`     ${idx + 1}. ${game.game_date} vs ${game.opponent_name}`)
      })
    }
    
    // 4. Test the actual sync service call
    console.log('\n🔄 Step 7: Testing Actual Sync Service')
    console.log('   This would help identify if the issue is in the sync service itself...')
    
    console.log('\n✅ Debug Analysis Complete!')
    console.log('\n📋 SUMMARY:')
    console.log(`   • MongoDB Games: ${mongoStandardGames.length}`)
    console.log(`   • ECF API Games: ${ecfGames.length}`)
    console.log(`   • New Games Detected: ${newGames.length}`)
    console.log(`   • Issue: ${newGames.length === 0 ? 'No new games detected despite expecting them' : 'Sync should work correctly'}`)
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  } finally {
    await closeConnection()
  }
}

// Run the debug
debugKateSyncDetailed().catch(console.error) 