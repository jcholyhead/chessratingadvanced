/**
 * Count players eligible for AI summaries
 * 
 * Counts players with 2+ games in the last 30 days
 * 
 * Usage: npx tsx scripts/count-eligible-summaries.ts
 */

import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME = 'chess_ratings_analytics'

async function countEligiblePlayers() {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.log('Connected to MongoDB')
    
    const db = client.db(DB_NAME)
    const collection = db.collection('players')
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]
    
    console.log(`\nCutoff date: ${cutoffDate}`)
    console.log('Counting players with 2+ games since then...\n')
    
    // Aggregation to count players with 2+ games in last 30 days
    const result = await collection.aggregate([
      {
        $project: {
          ECF_code: 1,
          full_name: 1,
          recentGames: {
            $sum: [
              { 
                $size: { 
                  $filter: { 
                    input: { $ifNull: ['$games.Standard', []] }, 
                    as: 'g', 
                    cond: { $gte: ['$$g.game_date', cutoffDate] } 
                  } 
                } 
              },
              { 
                $size: { 
                  $filter: { 
                    input: { $ifNull: ['$games.Rapid', []] }, 
                    as: 'g', 
                    cond: { $gte: ['$$g.game_date', cutoffDate] } 
                  } 
                } 
              },
              { 
                $size: { 
                  $filter: { 
                    input: { $ifNull: ['$games.Blitz', []] }, 
                    as: 'g', 
                    cond: { $gte: ['$$g.game_date', cutoffDate] } 
                  } 
                } 
              }
            ]
          }
        }
      },
      { $match: { recentGames: { $gte: 2 } } },
      { $count: 'eligiblePlayers' }
    ]).toArray()
    
    const eligibleCount = result[0]?.eligiblePlayers || 0
    
    // Get total player count for context
    const totalPlayers = await collection.countDocuments()
    
    // Get breakdown by game count
    const breakdown = await collection.aggregate([
      {
        $project: {
          recentGames: {
            $sum: [
              { $size: { $filter: { input: { $ifNull: ['$games.Standard', []] }, as: 'g', cond: { $gte: ['$$g.game_date', cutoffDate] } } } },
              { $size: { $filter: { input: { $ifNull: ['$games.Rapid', []] }, as: 'g', cond: { $gte: ['$$g.game_date', cutoffDate] } } } },
              { $size: { $filter: { input: { $ifNull: ['$games.Blitz', []] }, as: 'g', cond: { $gte: ['$$g.game_date', cutoffDate] } } } }
            ]
          }
        }
      },
      {
        $bucket: {
          groupBy: '$recentGames',
          boundaries: [0, 1, 2, 5, 10, 20, 50, 100],
          default: '100+',
          output: { count: { $sum: 1 } }
        }
      }
    ]).toArray()
    
    console.log('=== Results ===')
    console.log(`Total players in database: ${totalPlayers.toLocaleString()}`)
    console.log(`Players eligible for AI summary (2+ games): ${eligibleCount.toLocaleString()}`)
    console.log(`Percentage eligible: ${((eligibleCount / totalPlayers) * 100).toFixed(1)}%`)
    
    console.log('\n=== Breakdown by recent game count ===')
    for (const bucket of breakdown) {
      const label = bucket._id === '100+' ? '100+' : 
                    bucket._id === 0 ? '0' :
                    `${bucket._id}-${bucket._id === 50 ? 99 : (bucket._id === 20 ? 49 : (bucket._id === 10 ? 19 : (bucket._id === 5 ? 9 : (bucket._id === 2 ? 4 : 1))))}` 
      console.log(`  ${String(bucket._id).padStart(4)} games: ${bucket.count.toLocaleString()} players`)
    }
    
    // Estimate API costs
    console.log('\n=== Estimated API costs (monthly regeneration) ===')
    const costs = [
      { name: 'GPT-4o-mini', perSummary: 0.0002 },
      { name: 'Claude Haiku', perSummary: 0.0004 },
      { name: 'GPT-4o', perSummary: 0.003 },
      { name: 'Claude Sonnet', perSummary: 0.005 },
    ]
    
    for (const model of costs) {
      const monthlyCost = eligibleCount * model.perSummary
      console.log(`  ${model.name.padEnd(15)}: $${monthlyCost.toFixed(2)}`)
    }
    
  } finally {
    await client.close()
  }
}

countEligiblePlayers().catch(console.error)

