import { NextRequest, NextResponse } from 'next/server'
import { playerDataService } from '@/lib/player-data'
import { playerSyncService } from '@/lib/player-sync'

/**
 * GET handler for player search using MongoDB
 * @param request - The incoming request object
 * @returns A response with the search results or an error message
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get('name')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!name || name.length < 2) {
    return NextResponse.json({ 
      error: 'Search query must be at least 2 characters long' 
    }, { status: 400 })
  }

  try {
    console.log(`Searching for players with query: "${name}"`)
    
    const players = await playerDataService.searchPlayers(name, Math.min(limit, 50))
    
    // Transform MongoDB data to match ECF API response format
    const transformedPlayers = players.map(player => {
      // If club_name is missing but clubs array exists, use first club
      let clubName = player.club_name
      let clubCode = player.club_code
      
      if (!clubName && player.clubs && player.clubs.length > 0) {
        clubName = player.clubs[0].club_name
        clubCode = player.clubs[0].club_code
      }
      
      return {
        ECF_code: player.ECF_code,
        full_name: player.full_name,
        category: player.category,
        club_code: clubCode,
        club_name: clubName,
        clubs: player.clubs,
        official_ratings: player.official_ratings,
        date_last_game: player.date_last_game,
        total_games: player.total_games_count || 0,
        last_sync_date: player.last_ecf_sync_date
      }
    })

    // Trigger rating sync for all players (fire-and-forget)
    // Ratings update regularly, so we fetch latest values in background
    const allPlayerCodes = transformedPlayers.map(p => p.ECF_code)
    if (allPlayerCodes.length > 0) {
      playerSyncService.syncPlayersRatings(allPlayerCodes).catch(() => {})
    }

    const response = {
      players: transformedPlayers,
      total_found: transformedPlayers.length,
      query: name,
      source: 'mongodb',
      success: true
    }

    // Add Cache-Control header for faster subsequent requests
    const headers = new Headers()
    headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60') // 5 minute cache, 1 minute stale-while-revalidate
    headers.set('Netlify-Vary', 'query')

    return NextResponse.json(response, { headers })
    
  } catch (error) {
    console.error('Error searching players in MongoDB:', error)
    return NextResponse.json({ 
      error: 'Failed to search players',
      details: error instanceof Error ? error.message : 'Unknown error',
      source: 'mongodb'
    }, { status: 500 })
  }
}

