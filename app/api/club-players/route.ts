import { NextRequest, NextResponse } from 'next/server'
import { getPlayersCollection, getClubsCollection } from '@/lib/mongodb'
import { playerSyncService } from '@/lib/player-sync'

/**
 * GET handler for fetching all players associated with a club
 * @param request - The incoming request object
 * @returns A response with the club info and list of players
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const clubCode = searchParams.get('clubCode')

  if (!clubCode) {
    return NextResponse.json({ 
      error: 'Club code is required' 
    }, { status: 400 })
  }

  try {
    const playersCollection = await getPlayersCollection()
    const clubsCollection = await getClubsCollection()
    
    // Get club info
    const club = await clubsCollection.findOne({ club_code: clubCode })
    
    // Find all players who have this club in their clubs array
    const players = await playersCollection
      .find(
        { 
          $or: [
            { 'clubs.club_code': clubCode },
            { club_code: clubCode }
          ]
        },
        {
          projection: {
            ECF_code: 1,
            full_name: 1,
            official_ratings: 1,
            date_last_game: 1,
            category: 1
          }
        }
      )
      .sort({ full_name: 1 })
      .toArray()

    // Helper to validate rating (must be positive number)
    const getValidRating = (rating: unknown): number | null => {
      if (typeof rating === 'number' && rating > 0) {
        return rating
      }
      return null
    }

    // Transform players to include their primary rating
    const playersWithRatings = players.map(player => {
      const standardRating = getValidRating(player.official_ratings?.Standard?.rating)
      const rapidRating = getValidRating(player.official_ratings?.Rapid?.rating)
      const blitzRating = getValidRating(player.official_ratings?.Blitz?.rating)
      
      return {
        ECF_code: player.ECF_code,
        full_name: player.full_name,
        category: player.category,
        date_last_game: player.date_last_game,
        ratings: {
          standard: standardRating,
          rapid: rapidRating,
          blitz: blitzRating
        },
        // Primary rating: prefer standard, then rapid, then blitz
        primary_rating: standardRating ?? rapidRating ?? blitzRating ?? null
      }
    })

    // Sort by primary rating (highest first), then by name for unrated players
    playersWithRatings.sort((a, b) => {
      if (a.primary_rating === null && b.primary_rating === null) {
        return a.full_name.localeCompare(b.full_name)
      }
      if (a.primary_rating === null) return 1
      if (b.primary_rating === null) return -1
      return b.primary_rating - a.primary_rating
    })

    // Trigger rating sync for all players (fire-and-forget)
    // Ratings update regularly, so we fetch latest values in background
    const allPlayerCodes = playersWithRatings.map(p => p.ECF_code)
    if (allPlayerCodes.length > 0) {
      playerSyncService.syncPlayersRatings(allPlayerCodes).catch(() => {})
    }

    const responseData = {
      club_code: clubCode,
      club_name: club?.club_name || clubCode,
      assoc_name: club?.assoc_name || null,
      players: playersWithRatings,
      total_players: playersWithRatings.length,
      success: true
    }

    const headers = new Headers()
    headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600') // 1 hour cache
    headers.set('X-Data-Source', 'mongodb')

    return NextResponse.json(responseData, { headers })
    
  } catch (error) {
    console.error(`Error fetching players for club ${clubCode}:`, error)
    return NextResponse.json({ 
      error: 'Failed to fetch club players',
      details: error instanceof Error ? error.message : 'Unknown error',
      clubCode
    }, { status: 500 })
  }
}

