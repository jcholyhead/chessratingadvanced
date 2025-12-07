/**
 * Fetch New Players Script
 * 
 * This script finds new players that don't exist in the database by:
 * 1. Finding the largest ECF code (numeric part) currently in the database
 * 2. Sequentially fetching player info from the ECF API starting from that number
 * 3. Creating minimal player documents (games will be synced when profile is viewed)
 * 
 * ECF codes are like "319013E" where the numeric part (319013) is sequential.
 * Note: ECF codes >= 900000 are reserved for special cases and are excluded.
 * 
 * Usage: 
 *   npx tsx scripts/fetch-new-players.ts [options]
 * 
 * Options:
 *   --start <number>   Start from a specific ECF code number instead of auto-detecting
 *   --count <number>   Number of new players to attempt to fetch (default: 100)
 *   --dry-run          Show what would be fetched without actually inserting
 * 
 * Examples:
 *   npx tsx scripts/fetch-new-players.ts                    # Auto-detect start, fetch up to 100
 *   npx tsx scripts/fetch-new-players.ts --count 500        # Fetch up to 500 new players
 *   npx tsx scripts/fetch-new-players.ts --start 320000     # Start from ECF code 320000
 */

import { getPlayersCollection, PlayerDocument, closeConnection } from '../lib/mongodb'

const ECF_API_BASE = 'https://rating.englishchess.org.uk/v2/new/api.php'

interface ECFPlayerResponse {
  ECF_code: string
  FIDE_no?: string
  category: string
  club_code?: string
  club_name?: string
  clubs?: Array<{ club_code: string; club_name: string }>
  date_last_game?: string
  due_date?: string
  flag?: string
  full_name: string
  gender?: string
  member_no?: string
  nation?: string
  nation2?: string
  title?: string
  official_ratings?: {
    Standard?: { rating: number; category: string }
    Rapid?: { rating: number; category: string }
    Blitz?: { rating: number; category: string }
  }
  // Some endpoints return ratings in this format
  Standard_rating?: string
  Standard_category?: string
  Rapid_rating?: string
  Rapid_category?: string
  Blitz_rating?: string
  Blitz_category?: string
  // API metadata
  success?: boolean
  processing_time?: string
  total_processing_time_today?: string
  max_processing_time_daily?: string
}

/**
 * Extract the numeric part from an ECF code
 * e.g., "319013E" -> 319013
 */
function extractECFNumber(ecfCode: string): number {
  const match = ecfCode.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Fetch player by ECF code number from ECF API
 * The API accepts just the numeric part and returns the full code with letter
 */
async function fetchPlayerByECFNumber(ecfNumber: number): Promise<ECFPlayerResponse | null> {
  const url = `${ECF_API_BASE}?v2/players/code/${ecfNumber}`
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ChessRatingAnalytics/1.0',
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      return null
    }

    const data: ECFPlayerResponse = await response.json()
    
    if (!data.success || !data.ECF_code) {
      return null
    }

    return data
  } catch (error) {
    // Silently fail for network errors - just means no player at this number
    return null
  }
}

/**
 * Convert ECF response to PlayerDocument (minimal - no games)
 */
function convertToPlayerDocument(ecfData: ECFPlayerResponse): PlayerDocument {
  // Handle different rating formats from different endpoints
  let official_ratings: PlayerDocument['official_ratings'] = {}
  
  // Check for nested official_ratings object first
  if (ecfData.official_ratings) {
    official_ratings = ecfData.official_ratings
  } else {
    // Fall back to flat rating fields
    if (ecfData.Standard_rating) {
      const rating = parseInt(ecfData.Standard_rating, 10)
      if (!isNaN(rating) && rating > 0) {
        official_ratings.Standard = {
          rating,
          category: ecfData.Standard_category || ''
        }
      }
    }
    
    if (ecfData.Rapid_rating) {
      const rating = parseInt(ecfData.Rapid_rating, 10)
      if (!isNaN(rating) && rating > 0) {
        official_ratings.Rapid = {
          rating,
          category: ecfData.Rapid_category || ''
        }
      }
    }
    
    if (ecfData.Blitz_rating) {
      const rating = parseInt(ecfData.Blitz_rating, 10)
      if (!isNaN(rating) && rating > 0) {
        official_ratings.Blitz = {
          rating,
          category: ecfData.Blitz_category || ''
        }
      }
    }
  }

  return {
    ECF_code: ecfData.ECF_code,
    FIDE_no: ecfData.FIDE_no,
    category: ecfData.category || '',
    club_code: ecfData.club_code,
    club_name: ecfData.club_name,
    clubs: ecfData.clubs,
    date_last_game: ecfData.date_last_game,
    due_date: ecfData.due_date,
    flag: ecfData.flag,
    full_name: ecfData.full_name,
    gender: ecfData.gender,
    member_no: ecfData.member_no,
    nation: ecfData.nation,
    nation2: ecfData.nation2,
    title: ecfData.title,
    official_ratings,
    // Empty games - will be populated on first sync
    games: {
      Standard: [],
      Rapid: [],
      Blitz: []
    },
    // Initialize sync tracking fields - null means never synced
    total_games_count: 0,
    sync_in_progress: false,
    sync_error_count: 0
    // Deliberately NOT setting last_ecf_sync_date so games get synced on first view
  }
}

/**
 * Find the largest ECF code number in the database
 * Excludes codes >= 900000 which are used for special cases
 */
async function findLargestECFNumber(): Promise<number> {
  const collection = await getPlayersCollection()
  
  // Get all ECF codes
  const result = await collection.find(
    { ECF_code: { $exists: true, $ne: null, $ne: '' } },
    { projection: { ECF_code: 1 } }
  ).toArray()
  
  let maxECFNumber = 0
  
  for (const player of result) {
    if (player.ECF_code) {
      const num = extractECFNumber(player.ECF_code)
      // Exclude special case codes (900000+)
      if (num > maxECFNumber && num < 900000) {
        maxECFNumber = num
      }
    }
  }
  
  return maxECFNumber
}

/**
 * Add a delay between API calls
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Parse command line arguments
 */
function parseArgs(): { start: number | null; count: number; dryRun: boolean } {
  const args = process.argv.slice(2)
  let start: number | null = null
  let count = 100
  let dryRun = false
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) {
      start = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--count' && args[i + 1]) {
      count = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--dry-run') {
      dryRun = true
    }
  }
  
  return { start, count, dryRun }
}

async function fetchNewPlayers() {
  const { start, count, dryRun } = parseArgs()
  
  console.log('\n🔍 Fetch New Players Script\n')
  
  if (dryRun) {
    console.log('🏃 DRY RUN MODE - No changes will be made\n')
  }
  
  try {
    const collection = await getPlayersCollection()
    
    // Find starting point
    let startECFNumber: number
    
    if (start !== null) {
      startECFNumber = start
      console.log(`📍 Starting from specified ECF code: ${startECFNumber}`)
    } else {
      const largestECFNumber = await findLargestECFNumber()
      startECFNumber = largestECFNumber + 1
      console.log(`📍 Largest ECF code in database: ${largestECFNumber}`)
      console.log(`📍 Starting from ECF code: ${startECFNumber}`)
    }
    
    console.log(`📊 Will attempt to fetch up to ${count} new players`)
    console.log('')
    
    let currentECFNumber = startECFNumber
    let foundCount = 0
    let insertedCount = 0
    let skippedCount = 0
    let notFoundCount = 0
    let consecutiveNotFound = 0
    const maxConsecutiveNotFound = 100 // Stop if we hit 100 consecutive missing codes
    
    while (foundCount < count && consecutiveNotFound < maxConsecutiveNotFound && currentECFNumber < 900000) {
      process.stdout.write(`\r🔄 Checking ${currentECFNumber}... (found: ${foundCount}, inserted: ${insertedCount}, not found: ${notFoundCount})`)
      
      const playerData = await fetchPlayerByECFNumber(currentECFNumber)
      
      if (playerData) {
        consecutiveNotFound = 0
        foundCount++
        
        // Check if player already exists by ECF_code
        const existingPlayer = await collection.findOne({ ECF_code: playerData.ECF_code })
        
        if (existingPlayer) {
          skippedCount++
          console.log(`\n⏭️  ${playerData.ECF_code}: ${playerData.full_name} - already exists`)
        } else {
          if (dryRun) {
            console.log(`\n🔍 ${playerData.ECF_code}: Would insert ${playerData.full_name}`)
          } else {
            const playerDoc = convertToPlayerDocument(playerData)
            await collection.insertOne(playerDoc)
            insertedCount++
            console.log(`\n✅ ${playerData.ECF_code}: Inserted ${playerData.full_name}`)
          }
        }
      } else {
        consecutiveNotFound++
        notFoundCount++
      }
      
      currentECFNumber++
      
      // Small delay to be respectful to ECF API
      await delay(100)
    }
    
    console.log('\n')
    
    if (currentECFNumber >= 900000) {
      console.log(`⚠️  Stopped at ECF code 900000 (codes 900000+ are reserved for special cases)`)
    } else if (consecutiveNotFound >= maxConsecutiveNotFound) {
      console.log(`⚠️  Stopped after ${maxConsecutiveNotFound} consecutive empty ECF codes`)
      console.log(`   This likely means we've reached the end of assigned ECF codes.`)
    }
    
    console.log('\n📊 Summary:')
    console.log(`   ECF codes checked: ${currentECFNumber - startECFNumber}`)
    console.log(`   Players found: ${foundCount}`)
    console.log(`   Players inserted: ${insertedCount}`)
    console.log(`   Players skipped (already exist): ${skippedCount}`)
    console.log(`   Empty ECF codes: ${notFoundCount}`)
    console.log(`   Last ECF code checked: ${currentECFNumber - 1}`)
    
    if (insertedCount > 0) {
      console.log(`\n🎉 Successfully added ${insertedCount} new players!`)
      console.log('   Their games will be synced when their profiles are first viewed.')
    } else if (dryRun && foundCount > 0) {
      console.log(`\n🔍 Dry run complete. Would have inserted ${foundCount - skippedCount} new players.`)
    } else {
      console.log('\n📭 No new players to add.')
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await closeConnection()
  }
}

fetchNewPlayers().catch(console.error)
