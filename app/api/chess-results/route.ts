import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const playerCode = searchParams.get('playerCode')

  if (!playerCode) {
    return NextResponse.json({ error: 'Player code is required' }, { status: 400 })
  }

  const apiUrl = `https://rating.englishchess.org.uk/v2/new/api.php?v2/games/Standard/player/${playerCode}`

  try {
    const response = await fetch(apiUrl)
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching chess results:', error)
    return NextResponse.json({ error: 'Failed to fetch chess results' }, { status: 500 })
  }
}

