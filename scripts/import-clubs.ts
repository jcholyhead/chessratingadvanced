/**
 * Import Clubs Script
 * 
 * This script fetches all active ECF chess clubs from the ECF API
 * and imports them into the MongoDB clubs collection.
 * 
 * Usage: npx tsx scripts/import-clubs.ts
 * 
 * Options:
 *   --dry-run    Show what would be imported without making changes
 */

import { getClubsCollection, ClubDocument, closeConnection } from '../lib/mongodb'

const ECF_API_URL = 'https://rating.englishchess.org.uk/v2/new/api.php?v2/clubs/all_active'

interface ECFClubResponse {
  clubs: Array<{
    club_code: string
    club_name: string
    comment: string
    assoc_code: string
    assoc_name: string | null
  }>
  success: boolean
  processing_time: string
  total_processing_time_today: string
  max_processing_time_daily: string
}

/**
 * Fetch all active clubs from ECF API
 */
async function fetchClubsFromECF(): Promise<ECFClubResponse['clubs']> {
  console.log('🌐 Fetching clubs from ECF API...')
  
  const response = await fetch(ECF_API_URL, {
    headers: {
      'User-Agent': 'ChessRatingAnalytics/1.0',
    },
    signal: AbortSignal.timeout(30000) // 30 second timeout for large response
  })

  if (!response.ok) {
    throw new Error(`ECF API responded with status ${response.status}`)
  }

  const data: ECFClubResponse = await response.json()
  
  if (!data.success) {
    throw new Error('ECF API returned success: false')
  }

  console.log(`✅ Fetched ${data.clubs.length} clubs from ECF API`)
  return data.clubs
}

/**
 * Convert ECF club data to ClubDocument
 */
function convertToClubDocument(ecfClub: ECFClubResponse['clubs'][0]): ClubDocument {
  return {
    club_code: ecfClub.club_code,
    club_name: ecfClub.club_name.trim(), // Trim whitespace from names
    comment: ecfClub.comment || undefined,
    assoc_code: ecfClub.assoc_code || undefined,
    assoc_name: ecfClub.assoc_name,
    last_updated: new Date()
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): { dryRun: boolean } {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run')
  }
}

async function importClubs() {
  const { dryRun } = parseArgs()
  
  console.log('\n🏢 Import Clubs Script\n')
  
  if (dryRun) {
    console.log('🏃 DRY RUN MODE - No changes will be made\n')
  }
  
  try {
    // Fetch clubs from ECF API
    const ecfClubs = await fetchClubsFromECF()
    
    const collection = await getClubsCollection()
    
    // Get existing clubs count
    const existingCount = await collection.countDocuments()
    console.log(`📊 Existing clubs in database: ${existingCount}`)
    
    let insertedCount = 0
    let updatedCount = 0
    let skippedCount = 0
    
    // Process each club
    for (const ecfClub of ecfClubs) {
      const clubDoc = convertToClubDocument(ecfClub)
      
      if (dryRun) {
        // Check if exists
        const existing = await collection.findOne({ club_code: clubDoc.club_code })
        if (existing) {
          updatedCount++
        } else {
          insertedCount++
        }
        continue
      }
      
      // Upsert: update if exists, insert if not
      const result = await collection.updateOne(
        { club_code: clubDoc.club_code },
        { $set: clubDoc },
        { upsert: true }
      )
      
      if (result.upsertedCount > 0) {
        insertedCount++
      } else if (result.modifiedCount > 0) {
        updatedCount++
      } else {
        skippedCount++
      }
    }
    
    // Create index on club_code if it doesn't exist
    if (!dryRun) {
      await collection.createIndex(
        { club_code: 1 },
        { unique: true, name: 'club_code_unique' }
      )
      
      // Create text index for searching
      await collection.createIndex(
        { club_name: 'text' },
        { name: 'club_name_text' }
      )
      
      // Index for association queries
      await collection.createIndex(
        { assoc_code: 1 },
        { name: 'assoc_code_index' }
      )
      
      console.log('\n📇 Indexes created/verified')
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('📊 IMPORT SUMMARY')
    console.log('='.repeat(50))
    console.log(`   Total clubs from ECF: ${ecfClubs.length}`)
    console.log(`   New clubs inserted: ${insertedCount}`)
    console.log(`   Existing clubs updated: ${updatedCount}`)
    console.log(`   Unchanged (skipped): ${skippedCount}`)
    
    if (dryRun) {
      console.log('\n🔍 Dry run complete. No changes were made.')
    } else {
      console.log('\n🎉 Club import completed successfully!')
    }
    
    // Show some sample clubs
    console.log('\n📋 Sample clubs:')
    const sampleClubs = ecfClubs.slice(0, 5)
    for (const club of sampleClubs) {
      console.log(`   ${club.club_code}: ${club.club_name.trim()} (${club.assoc_name || 'No association'})`)
    }
    if (ecfClubs.length > 5) {
      console.log(`   ... and ${ecfClubs.length - 5} more`)
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  } finally {
    await closeConnection()
  }
}

importClubs().catch(console.error)

