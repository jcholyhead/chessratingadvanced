import { NextRequest } from 'next/server'
import { createSSEResponse } from '@/lib/realtime'

/**
 * GET handler for Server-Sent Events player updates
 * @param request - The incoming request object
 * @returns A Server-Sent Events response stream
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const playerId = searchParams.get('playerId')

  if (!playerId) {
    return new Response('Player ID is required', { status: 400 })
  }

  // Validate player ID format (ECF code)
  if (!/^[0-9]+[A-Z]?$/.test(playerId)) {
    return new Response('Invalid player ID format', { status: 400 })
  }

  try {
    // Create and return SSE response
    return createSSEResponse(playerId)
  } catch (error) {
    console.error('Error creating SSE connection:', error)
    return new Response('Failed to create SSE connection', { status: 500 })
  }
} 