import { NextRequest, NextResponse } from 'next/server'

/**
 * Real-time update message types
 */
export interface PlayerSyncMessage {
  type: 'player_sync_complete' | 'player_sync_started' | 'player_sync_error'
  playerId: string
  data?: {
    newGamesCount?: number
    gameType?: 'Standard' | 'Rapid' | 'Blitz'
    newGames?: any[]
    error?: string
  }
  timestamp: string
}

/**
 * Client connection for Server-Sent Events
 */
export interface SSEConnection {
  id: string
  playerId: string
  controller: ReadableStreamDefaultController
  lastHeartbeat: Date
}

/**
 * Global connection manager for Server-Sent Events
 */
class SSEConnectionManager {
  private connections: Map<string, SSEConnection> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor() {
    // Start heartbeat to keep connections alive
    this.startHeartbeat()
  }

  /**
   * Add a new SSE connection
   */
  addConnection(connection: SSEConnection): void {
    this.connections.set(connection.id, connection)
    console.log(`SSE connection added: ${connection.id} for player ${connection.playerId}`)
  }

  /**
   * Remove an SSE connection
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId)
    if (connection) {
      try {
        connection.controller.close()
      } catch (error) {
        // Connection may already be closed
      }
      this.connections.delete(connectionId)
      console.log(`SSE connection removed: ${connectionId}`)
    }
  }

  /**
   * Send message to all connections for a specific player
   */
  sendToPlayer(playerId: string, message: PlayerSyncMessage): void {
    const playerConnections = Array.from(this.connections.values())
      .filter(conn => conn.playerId === playerId)

    playerConnections.forEach(connection => {
      try {
        const data = `data: ${JSON.stringify(message)}\n\n`
        connection.controller.enqueue(new TextEncoder().encode(data))
        connection.lastHeartbeat = new Date()
      } catch (error) {
        console.error(`Failed to send message to connection ${connection.id}:`, error)
        this.removeConnection(connection.id)
      }
    })

    console.log(`Sent message to ${playerConnections.length} connections for player ${playerId}`)
  }

  /**
   * Send heartbeat to all connections to keep them alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date()
      const connections = Array.from(this.connections.values())

      connections.forEach(connection => {
        try {
          // Send heartbeat
          const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: now.toISOString() })}\n\n`
          connection.controller.enqueue(new TextEncoder().encode(heartbeat))
          
          // Remove stale connections (no activity for 5 minutes)
          const timeSinceLastHeartbeat = now.getTime() - connection.lastHeartbeat.getTime()
          if (timeSinceLastHeartbeat > 5 * 60 * 1000) {
            this.removeConnection(connection.id)
          }
        } catch (error) {
          this.removeConnection(connection.id)
        }
      })
    }, 30000) // Send heartbeat every 30 seconds
  }

  /**
   * Get connection count for monitoring
   */
  getConnectionCount(): number {
    return this.connections.size
  }

  /**
   * Get connections for a specific player
   */
  getPlayerConnectionCount(playerId: string): number {
    return Array.from(this.connections.values())
      .filter(conn => conn.playerId === playerId).length
  }

  /**
   * Cleanup all connections (for shutdown)
   */
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }
    this.connections.forEach(connection => {
      try {
        connection.controller.close()
      } catch (error) {
        // Ignore close errors
      }
    })
    this.connections.clear()
  }
}

// Global SSE connection manager
export const sseManager = new SSEConnectionManager()

/**
 * Create Server-Sent Events endpoint for real-time updates
 */
export function createSSEResponse(playerId: string): Response {
  const connectionId = `${playerId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const stream = new ReadableStream({
    start(controller) {
      // Add connection to manager
      const connection: SSEConnection = {
        id: connectionId,
        playerId,
        controller,
        lastHeartbeat: new Date()
      }
      sseManager.addConnection(connection)

      // Send initial connection message
      const initialMessage: PlayerSyncMessage = {
        type: 'player_sync_started',
        playerId,
        timestamp: new Date().toISOString()
      }
      const data = `data: ${JSON.stringify(initialMessage)}\n\n`
      controller.enqueue(new TextEncoder().encode(data))
    },
    cancel() {
      // Remove connection when client disconnects
      sseManager.removeConnection(connectionId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  })
}

/**
 * Notify clients that player sync has started
 */
export function notifyPlayerSyncStarted(playerId: string): void {
  const message: PlayerSyncMessage = {
    type: 'player_sync_started',
    playerId,
    timestamp: new Date().toISOString()
  }
  sseManager.sendToPlayer(playerId, message)
}

/**
 * Notify clients that player sync has completed with new games
 */
export function notifyPlayerSyncComplete(
  playerId: string, 
  newGamesCount: number, 
  gameType: 'Standard' | 'Rapid' | 'Blitz',
  newGames?: any[]
): void {
  const message: PlayerSyncMessage = {
    type: 'player_sync_complete',
    playerId,
    data: {
      newGamesCount,
      gameType,
      newGames
    },
    timestamp: new Date().toISOString()
  }
  sseManager.sendToPlayer(playerId, message)
}

/**
 * Notify clients that player sync encountered an error
 */
export function notifyPlayerSyncError(playerId: string, error: string): void {
  const message: PlayerSyncMessage = {
    type: 'player_sync_error',
    playerId,
    data: {
      error
    },
    timestamp: new Date().toISOString()
  }
  sseManager.sendToPlayer(playerId, message)
}

/**
 * Get real-time connection statistics for monitoring
 */
export function getConnectionStats(): {
  totalConnections: number
  connectionsByPlayer: Record<string, number>
} {
  const totalConnections = sseManager.getConnectionCount()
  const connectionsByPlayer: Record<string, number> = {}
  
  // This would need to be implemented in the SSEConnectionManager if needed
  // For now, just return total count
  
  return {
    totalConnections,
    connectionsByPlayer
  }
} 