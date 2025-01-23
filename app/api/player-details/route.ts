import { NextRequest, NextResponse } from 'next/server'

/**
 * GET handler for player details
 * @param request - The incoming request object
 * @returns A response with the player details or an error message
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const playerCode = searchParams.get('playerCode')

  if (!playerCode) {
    return NextResponse.json({ error: 'Player code is required' }, { status: 400 })
  }

  const apiUrl = `https://rating.englishchess.org.uk/v2/new/api.php?v2/players/code/${playerCode}`

  try {
    const response = await fetch(apiUrl)
    const data = await response.json()
    // Add Cache-Control header
    const headers = new Headers()
    headers.set('Cache-Control', 'public, s-maxage=64800, stale-while-revalidate=600') // 18 hour cache, 10 minutes stale-while-revalidate
    headers.set('Netlify-Vary', 'query')
    return NextResponse.json(data, { headers })
  } catch (error) {
    console.error('Error fetching player details:', error)
    return NextResponse.json({ error: 'Failed to fetch player details' }, { status: 500 })
  }
}

