#!/usr/bin/env tsx

import { getPlayersCollection, PlayerDocument, closeConnection } from '../lib/mongodb'

/**
 * Sample player data import script
 * This will fetch a few players from ECF API and import them into MongoDB
 */

const SAMPLE_PLAYER_IDS = [
  '123456A', // Example ECF codes - replace with real ones
  '234567B',
  '345678C',
  '456789D',
  '567890E'
]

interface ECFPlayerResponse {
  ECF_code: string
  FIDE_no?: string
  category: string
  club_code?: string
  club_name?: string
  date_last_game?: string
  due_date?: string
  flag?: string
  full_name: string
  games: {
    Standard?: any[]
    Rapid?: any[]
    Blitz?: any[]
  }
  gender?: string
  max_processing_time_daily?: string
  member_no?: string
  nation?: string
  nation2?: string
  official_ratings: {
    Standard?: {
      rating: number
      category: string
    }
    Rapid?: {
      rating: number
      category: string
    }
    Blitz?: {
      rating: number
      category: string
    }
  }
  processing_time?: string
  success?: boolean
  title?: string
  total_processing_time_today?: string
}

async function fetchPlayerFromECF(playerId: string): Promise<ECFPlayerResponse | null> {
  try {
    console.log(`Fetching player ${playerId} from ECF API...`)
    const url = `https://rating.englishchess.org.uk/v2/new/api.php?v2/player/${playerId}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ChessRatingAnalytics/1.0',
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      console.log(`   ❌ ECF API responded with status ${response.status}`)
      return null
    }

    const data = await response.json()
    
    if (!data.success || !data.ECF_code) {
      console.log(`   ❌ Invalid player data or player not found`)
      return null
    }

    console.log(`   ✅ Successfully fetched ${data.full_name}`)
    return data
  } catch (error) {
    console.log(`   ❌ Failed to fetch player ${playerId}:`, error)
    return null
  }
}

async function convertToPlayerDocument(ecfData: ECFPlayerResponse): Promise<PlayerDocument> {
  return {
    ECF_code: ecfData.ECF_code,
    FIDE_no: ecfData.FIDE_no,
    category: ecfData.category,
    club_code: ecfData.club_code,
    club_name: ecfData.club_name,
    date_last_game: ecfData.date_last_game,
    due_date: ecfData.due_date,
    flag: ecfData.flag,
    full_name: ecfData.full_name,
    games: {
      Standard: ecfData.games.Standard || [],
      Rapid: ecfData.games.Rapid || [],
      Blitz: ecfData.games.Blitz || []
    },
    gender: ecfData.gender,
    max_processing_time_daily: ecfData.max_processing_time_daily,
    member_no: ecfData.member_no,
    nation: ecfData.nation,
    nation2: ecfData.nation2,
    official_ratings: ecfData.official_ratings,
    processing_time: ecfData.processing_time,
    success: ecfData.success,
    title: ecfData.title,
    total_processing_time_today: ecfData.total_processing_time_today,
    
    // Initialize sync tracking fields
    total_games_count: (ecfData.games.Standard?.length || 0) + 
                      (ecfData.games.Rapid?.length || 0) + 
                      (ecfData.games.Blitz?.length || 0),
    sync_in_progress: false,
    sync_error_count: 0
  }
}

async function importSampleData() {
  console.log('📥 Starting sample data import...\n')

  try {
    const collection = await getPlayersCollection()
    let importedCount = 0
    let skippedCount = 0

    for (const playerId of SAMPLE_PLAYER_IDS) {
      try {
        // Check if player already exists
        const existingPlayer = await collection.findOne({ ECF_code: playerId })
        if (existingPlayer) {
          console.log(`⏭️  Player ${playerId} already exists, skipping...`)
          skippedCount++
          continue
        }

        // Fetch from ECF API
        const ecfData = await fetchPlayerFromECF(playerId)
        if (!ecfData) {
          console.log(`⏭️  Skipping player ${playerId} (not found or error)`)
          skippedCount++
          continue
        }

        // Convert and insert
        const playerDoc = await convertToPlayerDocument(ecfData)
        await collection.insertOne(playerDoc)
        
        console.log(`✅ Imported ${playerDoc.full_name} (${playerDoc.ECF_code})`)
        importedCount++

        // Add a small delay to be respectful to ECF API
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Failed to import player ${playerId}:`, error)
        skippedCount++
      }
    }

    console.log('\n📊 Import Summary:')
    console.log(`   • Successfully imported: ${importedCount} players`)
    console.log(`   • Skipped: ${skippedCount} players`)
    console.log(`   • Total processed: ${importedCount + skippedCount} players`)

    if (importedCount > 0) {
      console.log('\n🎉 Sample data import completed successfully!')
      console.log('You can now test the search functionality with the imported players.')
    } else {
      console.log('\n⚠️  No new players were imported.')
      console.log('This might be because:')
      console.log('   • Players already exist in the database')
      console.log('   • ECF API is not responding')
      console.log('   • The sample player IDs are not valid')
    }

  } catch (error) {
    console.error('💥 Import failed:', error)
    process.exit(1)
  } finally {
    await closeConnection()
    console.log('\n🔌 MongoDB connection closed')
  }
}

// Alternative: Import by searching for players by name
async function importPlayersByName(names: string[]) {
  console.log('📥 Starting import by player names...\n')

  try {
    const collection = await getPlayersCollection()
    let importedCount = 0

    for (const name of names) {
      try {
        console.log(`🔍 Searching for players named "${name}"...`)
        const searchUrl = `https://rating.englishchess.org.uk/v2/new/api.php?v2/players/name/${name}`
        
        const response = await fetch(searchUrl, {
          headers: { 'User-Agent': 'ChessRatingAnalytics/1.0' },
          signal: AbortSignal.timeout(10000)
        })

        if (!response.ok) continue

        const searchData = await response.json()
        const players = searchData.players || []

        console.log(`   Found ${players.length} players`)

        // Import first few players from search results
        for (const player of players.slice(0, 3)) {
          const existingPlayer = await collection.findOne({ ECF_code: player.ECF_code })
          if (existingPlayer) continue

          const fullPlayerData = await fetchPlayerFromECF(player.ECF_code)
          if (fullPlayerData) {
            const playerDoc = await convertToPlayerDocument(fullPlayerData)
            await collection.insertOne(playerDoc)
            console.log(`   ✅ Imported ${playerDoc.full_name} (${playerDoc.ECF_code})`)
            importedCount++
          }

          await new Promise(resolve => setTimeout(resolve, 1000))
        }

      } catch (error) {
        console.error(`❌ Failed to search/import for name "${name}":`, error)
      }
    }

    console.log(`\n🎉 Imported ${importedCount} players by name search`)

  } catch (error) {
    console.error('💥 Name-based import failed:', error)
  } finally {
    await closeConnection()
  }
}

// Run the import if this script is executed directly
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--by-name')) {
    // Import by searching common names
    const commonNames = ['Smith', 'Jones', 'Brown', 'Wilson', 'Taylor']
    importPlayersByName(commonNames)
      .then(() => process.exit(0))
      .catch(() => process.exit(1))
  } else {
    // Import by specific ECF codes
    importSampleData()
      .then(() => process.exit(0))
      .catch(() => process.exit(1))
  }
} 