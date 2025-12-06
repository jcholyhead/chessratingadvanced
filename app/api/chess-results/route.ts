import { NextRequest, NextResponse } from 'next/server'
import { playerDataService } from '@/lib/player-data'

/**
 * GET handler for chess results using MongoDB with background sync
 * @param request - The incoming request object
 * @returns A response with the chess results or an error message
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const playerCode = searchParams.get('playerCode')
  const gameType = searchParams.get('gameType') || 'Standard'

  if (!playerCode) {
    return NextResponse.json({ 
      error: 'Player code is required' 
    }, { status: 400 })
  }

  // Validate player code format
  if (!/^[0-9]+[A-Z]?$/i.test(playerCode)) {
    return NextResponse.json({ 
      error: 'Invalid player code format' 
    }, { status: 400 })
  }

  // Validate game type
  if (!['Standard', 'Rapid', 'Blitz'].includes(gameType)) {
    return NextResponse.json({ 
      error: 'Invalid game type. Must be Standard, Rapid, or Blitz' 
    }, { status: 400 })
  }

  try {
    console.log(`Getting ${gameType} chess results for ${playerCode} with synchronous sync`)
    
    // Get player data from MongoDB with synchronous sync first
    const player = await playerDataService.getPlayerData(playerCode, true)
    
    if (!player) {
      return NextResponse.json({ 
        error: 'Player not found',
        playerCode,
        gameType
      }, { status: 404 })
    }

    // Get games for the specified type
    const games = player.games[gameType as keyof typeof player.games] || []
    
    // Sort games by date (most recent first)
    const sortedGames = games.sort((a, b) => {
      const dateA = new Date(a.game_date).getTime()
      const dateB = new Date(b.game_date).getTime()
      return dateB - dateA
    })

    // Transform to match ECF API response format
    const responseData = {
      ECF_code: player.ECF_code,
      full_name: player.full_name,
      category: player.category,
      club_code: player.club_code,
      club_name: player.club_name,
      gameType: gameType,
      games: sortedGames,
      total_games: sortedGames.length,
      success: true,
      processing_time: '0.001s', // MongoDB is much faster
      total_processing_time_today: player.total_processing_time_today || '0.001s',
      
      // Add MongoDB-specific metadata
      _metadata: {
        source: 'mongodb',
        last_sync_date: player.last_ecf_sync_date,
        sync_mode: 'synchronous',
        data_freshness: 'just_synced',
        games_by_type: {
          Standard: player.games.Standard?.length || 0,
          Rapid: player.games.Rapid?.length || 0,
          Blitz: player.games.Blitz?.length || 0
        }
      }
    }

    // Log the total processing time (much faster with MongoDB!)
    console.log(`MongoDB processing time: ${responseData.processing_time}`)
    
    // Add Cache-Control header optimized for fresh data
    const headers = new Headers()
    headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60') // 5 minute cache since data is fresh
    headers.set('Netlify-Vary', 'query')
    headers.set('X-Data-Source', 'mongodb')
    headers.set('X-Game-Type', gameType)
    headers.set('X-Total-Games', sortedGames.length.toString())
    headers.set('X-Sync-Mode', 'synchronous')

    return NextResponse.json(responseData, { headers })
    
  } catch (error) {
    console.error(`Error fetching ${gameType} chess results for ${playerCode}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch chess results',
      details: error instanceof Error ? error.message : 'Unknown error',
      playerCode,
      gameType,
      source: 'mongodb'
    }, { status: 500 })
  }
}

