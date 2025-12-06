import { getDatabase, getPlayersCollection, GameRecord } from '../lib/mongodb'
import { closeConnection } from '../lib/mongodb'

/**
 * Creates a unique key for a game based on its identity fields.
 */
function getGameKey(game: GameRecord): string {
  return `${game.game_date}|${game.colour?.toLowerCase()}|${game.opponent_no}|${game.event_code}|${game.score}`
}

/**
 * Merges games from two arrays, removing duplicates.
 */
function mergeGames(games1: GameRecord[], games2: GameRecord[]): GameRecord[] {
  const seen = new Set<string>()
  const merged: GameRecord[] = []

  // First add all games from games1
  for (const game of games1) {
    const key = getGameKey(game)
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(game)
    }
  }

  // Then add unique games from games2
  for (const game of games2) {
    const key = getGameKey(game)
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(game)
    }
  }

  return merged
}

async function mergeDuplicatePlayers() {
  console.log('🔧 Merging duplicate player documents...\n')
  
  try {
    await getDatabase()
    const collection = await getPlayersCollection()
    
    // Find all ECF codes that appear more than once
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: '$ECF_code',
          count: { $sum: 1 },
          docs: { $push: '$$ROOT' }
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
      return
    }
    
    console.log(`Found ${duplicates.length} ECF codes with duplicates\n`)
    
    for (const dup of duplicates) {
      const ecfCode = dup._id
      const docs = dup.docs
      
      console.log(`\n📋 Processing ECF Code: ${ecfCode}`)
      console.log(`   Documents: ${docs.length}`)
      
      // Sort by last_ecf_sync_date to keep the most recently synced
      docs.sort((a: any, b: any) => {
        const dateA = a.last_ecf_sync_date ? new Date(a.last_ecf_sync_date).getTime() : 0
        const dateB = b.last_ecf_sync_date ? new Date(b.last_ecf_sync_date).getTime() : 0
        return dateB - dateA // Most recent first
      })
      
      const primary = docs[0]
      const others = docs.slice(1)
      
      console.log(`   Primary document: ${primary.full_name} (${primary._id})`)
      console.log(`   Documents to merge:`)
      others.forEach((doc: any) => {
        console.log(`     - ${doc.full_name} (${doc._id})`)
      })
      
      // Merge games from all documents
      const gameTypes = ['Standard', 'Rapid', 'Blitz'] as const
      const mergedGames: Record<string, GameRecord[]> = {}
      
      for (const gameType of gameTypes) {
        let allGames = primary.games?.[gameType] || []
        
        for (const other of others) {
          const otherGames = other.games?.[gameType] || []
          allGames = mergeGames(allGames, otherGames)
        }
        
        mergedGames[gameType] = allGames
        
        const primaryCount = primary.games?.[gameType]?.length || 0
        const mergedCount = allGames.length
        if (mergedCount > primaryCount) {
          console.log(`   ${gameType}: ${primaryCount} → ${mergedCount} games (added ${mergedCount - primaryCount})`)
        }
      }
      
      // Update primary document with merged games
      await collection.updateOne(
        { _id: primary._id },
        { 
          $set: { 
            'games.Standard': mergedGames['Standard'],
            'games.Rapid': mergedGames['Rapid'],
            'games.Blitz': mergedGames['Blitz']
          } 
        }
      )
      
      // Delete the other documents
      for (const other of others) {
        await collection.deleteOne({ _id: other._id })
        console.log(`   ✅ Deleted duplicate: ${other.full_name} (${other._id})`)
      }
      
      console.log(`   ✅ Merged successfully into ${primary.full_name}`)
    }
    
    console.log('\n✅ All duplicate players merged!')
    
  } catch (error) {
    console.error('❌ Merge failed:', error)
  } finally {
    await closeConnection()
  }
}

mergeDuplicatePlayers().catch(console.error)

