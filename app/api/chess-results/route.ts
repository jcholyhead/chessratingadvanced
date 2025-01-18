import { NextRequest, NextResponse } from 'next/server'

/**
 * GET handler for chess results
 * @param request - The incoming request object
 * @returns A response with the chess results or an error message
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const playerCode = searchParams.get('playerCode')
  const gameType = searchParams.get('gameType') || 'Standard'

  if (!playerCode) {
    return NextResponse.json({ error: 'Player code is required' }, { status: 400 })
  }

  const apiUrl = `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/${gameType}/player/${playerCode}`

  try {
    const response = await fetch(apiUrl)
    const data = await response.json()
    
    // Log the total processing time
    if (data.total_processing_time_today) {
      console.log(`Total processing time today: ${data.total_processing_time_today}`)
    }
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching chess results:', error)
    return NextResponse.json({ error: 'Failed to fetch chess results' }, { status: 500 })
  }
}

