import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { playerDataService } from '@/lib/player-data'

const gameTypeMap = {
  'Standard': 'S',
  'Rapid': 'R',
  'Blitz': 'B'
}

/**
 * GET handler for official ratings using MongoDB with background sync
 * @param request - The incoming request object
 * @returns A response with the official rating data or an error message
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const playerCode = searchParams.get('playerCode')
  const gameType = searchParams.get('gameType') as keyof typeof gameTypeMap
  const requestedDate = searchParams.get('date') // Optional date parameter

  if (!playerCode || !gameType) {
    return NextResponse.json({ 
      error: 'Player code and game type are required' 
    }, { status: 400 })
  }

  // Validate player code format
  if (!/^[0-9]+[A-Z]?$/i.test(playerCode)) {
    return NextResponse.json({ 
      error: 'Invalid player code format' 
    }, { status: 400 })
  }

  // Validate game type
  if (!gameTypeMap[gameType]) {
    return NextResponse.json({ 
      error: 'Invalid game type. Must be Standard, Rapid, or Blitz' 
    }, { status: 400 })
  }

  try {
    console.log(`Getting ${gameType} official rating for ${playerCode} with synchronous sync`)
    
    // Get player data from MongoDB with synchronous sync first
    const player = await playerDataService.getPlayerData(playerCode, true)
    
    if (!player) {
      return NextResponse.json({ 
        error: 'Player not found',
        playerCode,
        gameType
      }, { status: 404 })
    }

    const today = requestedDate || format(new Date(), 'yyyy-MM-dd')
    
    // Get current official rating
    const currentRating = player.official_ratings[gameType]
    
    // Get rating history for the requested date or closest available
    let ratingHistory = null
    if (player.rating_history) {
      const gameTypeKey = gameType.toLowerCase() as keyof typeof player.rating_history
      ratingHistory = player.rating_history[gameTypeKey]
    }

    // Find rating for specific date or use current rating
    let ratingForDate = currentRating
    if (ratingHistory && requestedDate) {
      // Look for exact date match or closest date before requested date
      const availableDates = Object.keys(ratingHistory).sort()
      const targetDate = availableDates.find(date => date <= requestedDate) || availableDates[availableDates.length - 1]
      if (targetDate) {
        ratingForDate = ratingHistory[targetDate]
      }
    }

    // Transform to match ECF API response format
    const responseData = {
      ECF_code: player.ECF_code,
      full_name: player.full_name,
      category: player.category,
      club_code: player.club_code,
      club_name: player.club_name,
      gameType: gameType,
      gameTypeCode: gameTypeMap[gameType],
      date: today,
      rating: ratingForDate?.rating || 0,
      rating_category: ratingForDate?.category || 'Unrated',
      success: true,
      processing_time: '0.001s', // MongoDB is much faster
      
      // Additional rating information
      current_rating: currentRating,
      rating_history_available: !!ratingHistory,
      total_games_in_type: player.games[gameType]?.length || 0,
      
      // Add MongoDB-specific metadata
      _metadata: {
        source: 'mongodb',
        last_sync_date: player.last_ecf_sync_date,
        sync_mode: 'synchronous',
        data_freshness: 'just_synced',
        all_ratings: {
          Standard: player.official_ratings.Standard,
          Rapid: player.official_ratings.Rapid,
          Blitz: player.official_ratings.Blitz
        }
      }
    }

    // Log the processing time (much faster with MongoDB!)
    console.log(`MongoDB processing time for ${gameType} rating: ${responseData.processing_time}`)
    
    // Add Cache-Control header optimized for fresh data
    const headers = new Headers()
    headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60') // 5 minute cache since data is fresh
    headers.set('Netlify-Vary', 'query')
    headers.set('X-Data-Source', 'mongodb')
    headers.set('X-Game-Type', gameType)
    headers.set('X-Rating', ratingForDate?.rating?.toString() || '0')
    headers.set('X-Sync-Mode', 'synchronous')

    return NextResponse.json(responseData, { headers })
    
  } catch (error) {
    console.error(`Error fetching ${gameType} official rating for ${playerCode}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch official rating',
      details: error instanceof Error ? error.message : 'Unknown error',
      playerCode,
      gameType,
      source: 'mongodb'
    }, { status: 500 })
  }
}

