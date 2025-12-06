import { getDatabase, getPlayersCollection } from '../lib/mongodb'
import { closeConnection } from '../lib/mongodb'

async function checkDuplicatePlayers() {
  console.log('🔍 Checking for duplicate player documents...\n')
  
  try {
    await getDatabase()
    const collection = await getPlayersCollection()
    
    // Find all ECF codes that appear more than once
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: '$ECF_code',
          count: { $sum: 1 },
          names: { $push: '$full_name' },
          ids: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray()
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate player documents found!')
    } else {
      console.log(`❌ Found ${duplicates.length} ECF codes with duplicate documents:\n`)
      
      for (const dup of duplicates) {
        console.log(`ECF Code: ${dup._id}`)
        console.log(`  Count: ${dup.count}`)
        console.log(`  Names: ${dup.names.join(', ')}`)
        console.log(`  Document IDs: ${dup.ids.join(', ')}`)
        console.log()
      }
    }
    
    // Also check total player count
    const totalPlayers = await collection.countDocuments()
    const uniqueCodes = await collection.distinct('ECF_code')
    
    console.log('\n📊 Database Statistics:')
    console.log(`   Total player documents: ${totalPlayers}`)
    console.log(`   Unique ECF codes: ${uniqueCodes.length}`)
    console.log(`   Extra documents: ${totalPlayers - uniqueCodes.length}`)
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  } finally {
    await closeConnection()
  }
}

checkDuplicatePlayers().catch(console.error)

