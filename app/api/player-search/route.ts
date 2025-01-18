import { NextRequest, NextResponse } from 'next/server'

/**
 * GET handler for player search
 * @param request - The incoming request object
 * @returns A response with the search results or an error message
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get('name')

  if (!name || name.length < 3) {
    return NextResponse.json({ error: 'Name must be at least 3 characters long' }, { status: 400 })
  }

  const apiUrl = `https://www.ecfrating.org.uk/v2/new/api.php?v2/players/name/${name}`

  try {
    const response = await fetch(apiUrl)
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching player search results:', error)
    return NextResponse.json({ error: 'Failed to fetch player search results' }, { status: 500 })
  }
}

