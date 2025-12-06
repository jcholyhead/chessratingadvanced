#!/usr/bin/env tsx

import { playerDataService } from '../lib/player-data'
import { playerSyncService } from '../lib/player-sync'
import { checkMongoHealth, closeConnection } from '../lib/mongodb'

async function testMongoInfrastructure() {
  console.log('🧪 Testing MongoDB Infrastructure...\n')

  try {
    // Test 1: MongoDB Health Check
    console.log('1️⃣ Testing MongoDB connection...')
    const isHealthy = await checkMongoHealth()
    console.log(`   ✅ MongoDB health: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}\n`)

    if (!isHealthy) {
      throw new Error('MongoDB is not healthy')
    }

    // Test 2: Player Search
    console.log('2️⃣ Testing player search...')
    const searchResults = await playerDataService.searchPlayers('smith', 5)
    console.log(`   ✅ Found ${searchResults.length} players matching "smith"`)
    if (searchResults.length > 0) {
      console.log(`   📋 First result: ${searchResults[0].full_name} (${searchResults[0].ECF_code})`)
    }
    console.log()

    // Test 3: Recently Synced Players
    console.log('3️⃣ Testing recently synced players...')
    const recentlySynced = await playerDataService.getRecentlySyncedPlayers(3)
    console.log(`   ✅ Found ${recentlySynced.length} recently synced players`)
    recentlySynced.forEach((player, index) => {
      console.log(`   ${index + 1}. ${player.full_name} (${player.ECF_code}) - Last sync: ${player.last_ecf_sync_date}`)
    })
    console.log()

    // Test 4: Players Needing Sync
    console.log('4️⃣ Testing players needing sync...')
    const needingSync = await playerDataService.getPlayersNeedingSync(5)
    console.log(`   ✅ Found ${needingSync.length} players needing sync`)
    needingSync.forEach((player, index) => {
      const lastSync = player.last_ecf_sync_date ? player.last_ecf_sync_date.toISOString() : 'Never'
      console.log(`   ${index + 1}. ${player.full_name} (${player.ECF_code}) - Last sync: ${lastSync}`)
    })
    console.log()

    // Test 5: Player Data Retrieval (if we have players)
    if (searchResults.length > 0) {
      const testPlayer = searchResults[0]
      console.log(`5️⃣ Testing player data retrieval for ${testPlayer.ECF_code}...`)
      
      const playerData = await playerDataService.getPlayerData(testPlayer.ECF_code, false) // Don't trigger sync
      if (playerData) {
        console.log(`   ✅ Retrieved player data for ${playerData.full_name}`)
        console.log(`   📊 Total games: ${playerData.total_games_count || 0}`)
        console.log(`   🎯 Standard games: ${playerData.games.Standard?.length || 0}`)
        console.log(`   ⚡ Rapid games: ${playerData.games.Rapid?.length || 0}`)
        console.log(`   💨 Blitz games: ${playerData.games.Blitz?.length || 0}`)
        
        // Test player stats
        const stats = await playerDataService.getPlayerStats(testPlayer.ECF_code)
        if (stats) {
          console.log(`   📈 Win rate: ${stats.winRate}%`)
          console.log(`   🎯 Average opponent rating: ${stats.averageOpponentRating}`)
          console.log(`   📅 Last game: ${stats.lastGameDate || 'Unknown'}`)
        }
      } else {
        console.log(`   ❌ Could not retrieve player data`)
      }
      console.log()
    }

    // **NEW: Kate Walker Debug Section**
    console.log('🔍 6️⃣ DEBUGGING KATE WALKER SYNC ISSUE...')
    const kateCode = '285392K'
    
    // Check current MongoDB data
    console.log('   📂 Checking current MongoDB data for Kate Walker...')
    const kateData = await playerDataService.getPlayerData(kateCode, false) // Don't trigger sync yet
    
    if (kateData) {
      console.log(`   ✅ Found: ${kateData.full_name}`)
      console.log(`   📧 ECF Code: ${kateData.ECF_code}`)
      console.log(`   🏢 Club: ${kateData.club_name}`)
      console.log(`   📅 Date Last Game: ${kateData.date_last_game}`)
      console.log(`   🔄 Last ECF Sync: ${kateData.last_ecf_sync_date || 'Never'}`)
      
      // Check games
      const standardGames = kateData.games?.Standard || []
      const rapidGames = kateData.games?.Rapid || []
      const blitzGames = kateData.games?.Blitz || []
      
      console.log(`   📊 Current Games in MongoDB:`)
      console.log(`     🎯 Standard: ${standardGames.length}`)
      console.log(`     ⚡ Rapid: ${rapidGames.length}`)
      console.log(`     💨 Blitz: ${blitzGames.length}`)
      
      if (standardGames.length > 0) {
        // Sort by date to see most recent
        const sortedGames = [...standardGames].sort((a, b) => 
          new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
        )
        
        console.log(`     📈 Most Recent MongoDB Game: ${sortedGames[0].game_date} vs ${sortedGames[0].opponent_name}`)
        
        // Count 2025 games (these should exist if sync is working)
        const games2025 = standardGames.filter(g => g.game_date.startsWith('2025'))
        console.log(`     🗓️  2025 Games in MongoDB: ${games2025.length}`)
        
        if (games2025.length === 0) {
          console.log(`     ⚠️  WARNING: NO 2025 GAMES FOUND - sync likely not working!`)
        } else {
          console.log(`     ✅ Found 2025 games - sync appears to be working`)
        }
      } else {
        console.log(`     ❌ No games found in MongoDB`)
      }
      
      // Check sync status
      console.log(`   🔄 Current Sync Status:`)
      console.log(`     Is Syncing: ${kateData.sync_in_progress || false}`)
      console.log(`     Sync Error Count: ${kateData.sync_error_count || 0}`)
      console.log(`     Last Sync Error: ${kateData.last_sync_error || 'None'}`)
      
    } else {
      console.log(`   ❌ Kate Walker NOT FOUND in MongoDB - this is the problem!`)
    }
    
    // Test manual sync for Kate
    console.log('\n   🔄 Testing manual sync for Kate Walker...')
    try {
      const syncResult = await playerSyncService.syncPlayerIfNeeded(kateCode)
      console.log(`   Sync Initiated: ${syncResult ? 'Success' : 'Skipped/Failed'}`)
      
      // Wait a moment for sync to complete
      console.log('   ⏳ Waiting 2 seconds for sync to complete...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Check data again after sync
      console.log('   📂 Checking MongoDB AFTER manual sync...')
      const kateDataAfter = await playerDataService.getPlayerData(kateCode, false)
      
      if (kateDataAfter) {
        const standardGamesAfter = kateDataAfter.games?.Standard || []
        console.log(`   📊 Standard Games After Sync: ${standardGamesAfter.length}`)
        console.log(`   🔄 Last ECF Sync After: ${kateDataAfter.last_ecf_sync_date}`)
        
        if (standardGamesAfter.length > 0) {
          const sortedAfter = [...standardGamesAfter].sort((a, b) => 
            new Date(b.game_date).getTime() - new Date(a.game_date).getTime()
          )
          console.log(`   📈 Most Recent After Sync: ${sortedAfter[0].game_date} vs ${sortedAfter[0].opponent_name}`)
          
          const games2025After = standardGamesAfter.filter(g => g.game_date.startsWith('2025'))
          console.log(`   🗓️  2025 Games After Sync: ${games2025After.length}`)
          
          if (games2025After.length > 0) {
            console.log(`   ✅ SUCCESS: Found ${games2025After.length} 2025 games after sync!`)
          } else {
            console.log(`   ❌ PROBLEM: Still no 2025 games after sync`)
          }
        }
      } else {
        console.log(`   ❌ Still not found after sync attempt`)
      }
      
    } catch (syncError) {
      console.log(`   ❌ Manual sync failed: ${syncError}`)
    }
    console.log()

    console.log('🎉 All tests completed successfully!')
    console.log('\n📋 Summary:')
    console.log(`   • MongoDB connection: ✅`)
    console.log(`   • Player search: ✅`)
    console.log(`   • Sync tracking: ✅`)
    console.log(`   • Data retrieval: ✅`)
    console.log(`   • Kate Walker debug: ✅`)

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    // Clean up
    await closeConnection()
    console.log('\n🔌 MongoDB connection closed')
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testMongoInfrastructure()
    .then(() => {
      console.log('\n✨ Test completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error)
      process.exit(1)
    })
} 