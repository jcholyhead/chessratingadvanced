import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'

const gameTypeMap = {
  'Standard': 'S',
  'Rapid': 'R',
  'Blitz': 'B'
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const playerCode = searchParams.get('playerCode')
  const gameType = searchParams.get('gameType') as keyof typeof gameTypeMap

  if (!playerCode || !gameType) {
    return NextResponse.json({ error: 'Player code and game type are required' }, { status: 400 })
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const apiUrl = `https://rating.englishchess.org.uk/v2/new/api.php?v2/ratings/${gameTypeMap[gameType]}/${playerCode}/${today}`

  try {
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching official rating:', error)
    return NextResponse.json({ error: 'Failed to fetch official rating' }, { status: 404 })
  }
}

