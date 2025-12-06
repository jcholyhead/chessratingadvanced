import { NextRequest, NextResponse } from 'next/server'
import { playerSyncService } from '@/lib/player-sync'

/**
 * POST /api/player-sync
 * Trigger sync for a specific player when their page is visited
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { playerId, force = false } = body

    // Validate playerId
    if (!playerId || typeof playerId !== 'string') {
      return NextResponse.json(
        { error: 'Player ID is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate playerId format (ECF codes are numbers optionally followed by a letter)
    if (!/^[0-9]+[A-Z]?$/i.test(playerId)) {
      return NextResponse.json(
        { error: 'Invalid player ID format' },
        { status: 400 }
      )
    }

    console.log(`Sync request for player ${playerId}, force: ${force}`)

    let syncResult: boolean
    if (force) {
      syncResult = await playerSyncService.forceSyncPlayer(playerId)
    } else {
      syncResult = await playerSyncService.syncPlayerIfNeeded(playerId)
    }

    return NextResponse.json({
      success: true,
      playerId,
      syncTriggered: syncResult,
      message: syncResult 
        ? 'Player sync completed with new data' 
        : 'Player sync not needed or no new data found'
    })

  } catch (error) {
    console.error('Player sync API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error during player sync',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/player-sync?playerId=123A
 * Check sync status for a player
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')

    if (!playerId) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      )
    }

    // Validate playerId format
    if (!/^[0-9]+[A-Z]?$/i.test(playerId)) {
      return NextResponse.json(
        { error: 'Invalid player ID format' },
        { status: 400 }
      )
    }

    // Import here to avoid circular dependencies
    const { getPlayersCollection } = await import('@/lib/mongodb')
    const collection = await getPlayersCollection()
    const player = await collection.findOne(
      { ECF_code: playerId },
      { 
        projection: {
          ECF_code: 1,
          sync_in_progress: 1,
          last_ecf_sync_date: 1,
          sync_error_count: 1,
          last_sync_error: 1,
          total_games_count: 1
        }
      }
    )

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      playerId: player.ECF_code,
      syncInProgress: player.sync_in_progress || false,
      lastSyncDate: player.last_ecf_sync_date,
      syncErrorCount: player.sync_error_count || 0,
      lastSyncError: player.last_sync_error,
      totalGamesCount: player.total_games_count || 0
    })

  } catch (error) {
    console.error('Player sync status API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error while checking sync status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 