/**
 * Export Player Activity Script
 * 
 * Extracts a player's information and recent activity in JSON format.
 * 
 * Usage:
 *   npx tsx scripts/export-player-activity.ts <playerCode> [--days N] [--output file.json]
 * 
 * Examples:
 *   npx tsx scripts/export-player-activity.ts 319013E
 *   npx tsx scripts/export-player-activity.ts 319013E --days 60
 *   npx tsx scripts/export-player-activity.ts 319013E --days 30 --output player-data.json
 */

import { MongoClient } from 'mongodb'
import * as fs from 'fs'

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DB_NAME = process.env.MONGODB_DB || 'chess_ratings_analytics'

interface GameRecord {
  game_date: string
  colour: string
  score: number
  opponent_name: string
  opponent_no: number
  opponent_rating: number | string
  player_rating: number | string
  increment: number | string
  event_code: string
  event_name: string
  section_title?: string
  club_code?: string
  org_name?: string | null
}

interface PlayerDocument {
  ECF_code: string
  full_name: string
  category?: string
  club_code?: string
  club_name?: string
  clubs?: Array<{ club_code: string; club_name: string }>
  FIDE_no?: string
  title?: string
  gender?: string
  nation?: string
  date_last_game?: string
  official_ratings?: {
    Standard?: { rating: number; category: string }
    Rapid?: { rating: number; category: string }
    Blitz?: { rating: number; category: string }
  }
  games: {
    Standard?: GameRecord[]
    Rapid?: GameRecord[]
    Blitz?: GameRecord[]
  }
  last_ecf_sync_date?: Date
}

interface ExportData {
  exported_at: string
  player: {
    ecf_code: string
    full_name: string
    category?: string
    fide_no?: string
    title?: string
    gender?: string
    nation?: string
    clubs: Array<{ club_code: string; club_name: string }>
    official_ratings: {
      standard: number | null
      rapid: number | null
      blitz: number | null
    }
    date_last_game?: string
    last_synced?: string
  }
  activity: {
    period: {
      from: string
      to: string
      days: number
    }
    summary: {
      total_games: number
      standard_games: number
      rapid_games: number
      blitz_games: number
      wins: number
      draws: number
      losses: number
      win_rate: string
    }
    games: {
      standard: GameRecord[]
      rapid: GameRecord[]
      blitz: GameRecord[]
    }
  }
}

function parseArgs(): { playerCode: string; days: number; outputFile: string | null } {
  const args = process.argv.slice(2)
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Export Player Activity Script

Usage:
  npx tsx scripts/export-player-activity.ts <playerCode> [options]

Options:
  --days N        Number of days to include (default: 30)
  --output FILE   Write output to file instead of stdout
  --help, -h      Show this help message

Examples:
  npx tsx scripts/export-player-activity.ts 319013E
  npx tsx scripts/export-player-activity.ts 319013E --days 60
  npx tsx scripts/export-player-activity.ts 319013E --output player.json
`)
    process.exit(0)
  }
  
  const playerCode = args[0]
  let days = 30
  let outputFile: string | null = null
  
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      days = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[i + 1]
      i++
    }
  }
  
  return { playerCode, days, outputFile }
}

function filterGamesByDate(games: GameRecord[] | undefined, cutoffDate: Date): GameRecord[] {
  if (!games) return []
  
  return games.filter(game => {
    const gameDate = new Date(game.game_date)
    return gameDate >= cutoffDate
  }).sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
}

function calculateStats(games: GameRecord[]): { wins: number; draws: number; losses: number } {
  let wins = 0, draws = 0, losses = 0
  
  for (const game of games) {
    if (game.score === 1) wins++
    else if (game.score === 0) losses++
    else if (game.score === 5 || game.score === 0.5) draws++
  }
  
  return { wins, draws, losses }
}

async function exportPlayerActivity(playerCode: string, days: number): Promise<ExportData | null> {
  const client = new MongoClient(MONGODB_URI)
  
  try {
    await client.connect()
    console.error(`Connected to MongoDB`)
    
    const db = client.db(DB_NAME)
    const collection = db.collection<PlayerDocument>('players')
    
    // Try exact match first
    let player = await collection.findOne({ ECF_code: playerCode })
    
    // If not found and numeric only, try prefix match
    if (!player && /^[0-9]+$/.test(playerCode)) {
      player = await collection.findOne({ 
        ECF_code: { $regex: `^${playerCode}[A-Z]$`, $options: 'i' } 
      })
      if (player) {
        console.error(`Resolved ${playerCode} to ${player.ECF_code}`)
      }
    }
    
    if (!player) {
      console.error(`Player ${playerCode} not found in database`)
      return null
    }
    
    console.error(`Found player: ${player.full_name} (${player.ECF_code})`)
    
    // Calculate date range
    const now = new Date()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    // Filter games by date
    const standardGames = filterGamesByDate(player.games?.Standard, cutoffDate)
    const rapidGames = filterGamesByDate(player.games?.Rapid, cutoffDate)
    const blitzGames = filterGamesByDate(player.games?.Blitz, cutoffDate)
    
    const allRecentGames = [...standardGames, ...rapidGames, ...blitzGames]
    const stats = calculateStats(allRecentGames)
    const totalGames = allRecentGames.length
    const winRate = totalGames > 0 
      ? ((stats.wins / totalGames) * 100).toFixed(1) + '%'
      : 'N/A'
    
    // Build export data
    const exportData: ExportData = {
      exported_at: now.toISOString(),
      player: {
        ecf_code: player.ECF_code,
        full_name: player.full_name,
        category: player.category,
        fide_no: player.FIDE_no,
        title: player.title,
        gender: player.gender,
        nation: player.nation,
        clubs: player.clubs || (player.club_code ? [{ club_code: player.club_code, club_name: player.club_name || '' }] : []),
        official_ratings: {
          standard: player.official_ratings?.Standard?.rating ?? null,
          rapid: player.official_ratings?.Rapid?.rating ?? null,
          blitz: player.official_ratings?.Blitz?.rating ?? null,
        },
        date_last_game: player.date_last_game,
        last_synced: player.last_ecf_sync_date?.toISOString(),
      },
      activity: {
        period: {
          from: cutoffDate.toISOString().split('T')[0],
          to: now.toISOString().split('T')[0],
          days: days,
        },
        summary: {
          total_games: totalGames,
          standard_games: standardGames.length,
          rapid_games: rapidGames.length,
          blitz_games: blitzGames.length,
          wins: stats.wins,
          draws: stats.draws,
          losses: stats.losses,
          win_rate: winRate,
        },
        games: {
          standard: standardGames,
          rapid: rapidGames,
          blitz: blitzGames,
        },
      },
    }
    
    return exportData
    
  } finally {
    await client.close()
  }
}

async function main() {
  const { playerCode, days, outputFile } = parseArgs()
  
  console.error(`Exporting activity for player ${playerCode} (last ${days} days)...`)
  
  const data = await exportPlayerActivity(playerCode, days)
  
  if (!data) {
    process.exit(1)
  }
  
  const jsonOutput = JSON.stringify(data, null, 2)
  
  if (outputFile) {
    fs.writeFileSync(outputFile, jsonOutput)
    console.error(`\nExported to ${outputFile}`)
    console.error(`\nSummary:`)
  } else {
    console.log(jsonOutput)
    console.error(`\n--- Summary ---`)
  }
  
  console.error(`Player: ${data.player.full_name} (${data.player.ecf_code})`)
  console.error(`Period: ${data.activity.period.from} to ${data.activity.period.to}`)
  console.error(`Total games: ${data.activity.summary.total_games}`)
  console.error(`  Standard: ${data.activity.summary.standard_games}`)
  console.error(`  Rapid: ${data.activity.summary.rapid_games}`)
  console.error(`  Blitz: ${data.activity.summary.blitz_games}`)
  console.error(`Results: ${data.activity.summary.wins}W / ${data.activity.summary.draws}D / ${data.activity.summary.losses}L (${data.activity.summary.win_rate})`)
  
  if (data.player.official_ratings.standard || data.player.official_ratings.rapid || data.player.official_ratings.blitz) {
    console.error(`Ratings: S=${data.player.official_ratings.standard || '-'} R=${data.player.official_ratings.rapid || '-'} B=${data.player.official_ratings.blitz || '-'}`)
  }
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

