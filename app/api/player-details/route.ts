import { NextRequest, NextResponse } from 'next/server'
import { playerDataService } from '@/lib/player-data'

/**
 * GET handler for player details using MongoDB with background sync
 * @param request - The incoming request object
 * @returns A response with the player details or an error message
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const playerCode = searchParams.get('playerCode')

  if (!playerCode) {
    return NextResponse.json({ 
      error: 'Player code is required' 
    }, { status: 400 })
  }

  // Validate player code format (ECF codes are numbers optionally followed by a letter)
  if (!/^[0-9]+[A-Z]?$/i.test(playerCode)) {
    return NextResponse.json({ 
      error: 'Invalid player code format' 
    }, { status: 400 })
  }

  try {
    console.log(`Getting player details for ${playerCode} with synchronous sync`)
    
    // Get player data from MongoDB with synchronous sync first
    const player = await playerDataService.getPlayerData(playerCode, true)
    
    if (!player) {
      return NextResponse.json({ 
        error: 'Player not found',
        playerCode
      }, { status: 404 })
    }

    // Transform MongoDB data to match ECF API response format
    const responseData = {
      ECF_code: player.ECF_code,
      FIDE_no: player.FIDE_no,
      category: player.category,
      club_code: player.club_code,
      club_name: player.club_name,
      clubs: player.clubs,
      date_last_game: player.date_last_game,
      due_date: player.due_date,
      flag: player.flag,
      full_name: player.full_name,
      games: player.games,
      gender: player.gender,
      max_processing_time_daily: player.max_processing_time_daily,
      member_no: player.member_no,
      nation: player.nation,
      nation2: player.nation2,
      official_ratings: player.official_ratings,
      processing_time: player.processing_time,
      success: true, // Always true for MongoDB data
      title: player.title,
      total_processing_time_today: player.total_processing_time_today,
      rating_history: player.rating_history,
      
      // Add MongoDB-specific metadata
      _metadata: {
        source: 'mongodb',
        last_sync_date: player.last_ecf_sync_date,
        sync_mode: 'synchronous',
        total_games: player.total_games_count || 0,
        data_freshness: 'just_synced'
      }
    }

    // Add Cache-Control header optimized for fresh data
    const headers = new Headers()
    headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60') // 5 minute cache since data is fresh
    headers.set('Netlify-Vary', 'query')
    headers.set('X-Data-Source', 'mongodb')
    headers.set('X-Sync-Mode', 'synchronous')

    return NextResponse.json(responseData, { headers })
    
  } catch (error) {
    console.error(`Error fetching player details for ${playerCode}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch player details',
      details: error instanceof Error ? error.message : 'Unknown error',
      playerCode,
      source: 'mongodb'
    }, { status: 500 })
  }
}

