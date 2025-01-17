'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { formatDate } from '@/lib/utils'
import PlayerRatingChart from './PlayerRatingChart'
import CommonOpponentsTable from './CommonOpponentsTable'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const PLAYER_CODES = [
  '188586J', '293875D', '105483B', '170263E', '136665J',
  '245324B', '175386B', '263810B', '252763H', '300121A',
  '123515B', '103888G', '329301E', '305272C', '258871H'
];

const GAME_TYPES = ['Standard', 'Rapid', 'Blitz'];

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Game {
  game_date: string
  colour: string
  score: number
  opponent_name: string
  opponent_rating: number
  player_rating: number
  event_name: string
  opponent_no: string
}

const GAMES_PER_PAGE = 20

export default function ChessResultsTable() {
  const searchParams = useSearchParams()
  const [playerCode, setPlayerCode] = useState(() => {
    const urlPlayerCode = searchParams?.get('playerCode');
    return urlPlayerCode || PLAYER_CODES[Math.floor(Math.random() * PLAYER_CODES.length)];
  });
  const [gameType, setGameType] = useState('Standard')
  const [currentPage, setCurrentPage] = useState(1)
  const [playerName, setPlayerName] = useState<string | null>(null) 
  const { data, error, isLoading } = useSWR<{ games: Game[] }>(
    `/api/chess-results?playerCode=${playerCode}&gameType=${gameType}`,
    fetcher
  )

  useEffect(() => {
    const newPlayerCode = searchParams?.get('playerCode');
    if (newPlayerCode) {
      setPlayerCode(newPlayerCode);
      setCurrentPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchPlayerDetails = async () => {
      try {
        const response = await fetch(`/api/player-details?playerCode=${playerCode}`)
        const data = await response.json()
        setPlayerName(data.full_name)
      } catch (error) {
        console.error('Error fetching player details:', error)
      }
    }

    fetchPlayerDetails()
  }, [playerCode]) 

  const filteredGames = useMemo(() => {
    if (!data?.games) return []
    return data.games.filter(game => 
      game.player_rating && 
      game.opponent_name && 
      (game.score === 0 || game.score === 1 || game.score === 5)
    )
  }, [data])

  const totalPages = Math.ceil(filteredGames.length / GAMES_PER_PAGE)
  const paginatedGames = filteredGames.slice(
    (currentPage - 1) * GAMES_PER_PAGE,
    currentPage * GAMES_PER_PAGE
  )

  if (error) return <div className="text-red-500">Failed to load: {error.message}</div>
  if (isLoading) return <div className="text-blue-500">Loading...</div>

  return (
    <div className="space-y-8 w-full">
      <div className="mb-4"> 
        {playerName && <h2 className="text-2xl font-bold mb-2">{playerName}</h2>}
        <div className="flex items-center gap-4">
          <div>
            <label htmlFor="playerCode" className="mr-2">
              Player Code:
            </label>
            <input
              type="text"
              id="playerCode"
              value={playerCode}
              onChange={(e) => setPlayerCode(e.target.value)}
              className="border p-1 rounded"
            />
          </div>
        </div>
      </div>
      <Tabs value={gameType} onValueChange={setGameType}>
        <TabsList>
          {GAME_TYPES.map((type) => (
            <TabsTrigger key={type} value={type}>
              {type}
            </TabsTrigger>
          ))}
        </TabsList>
        {GAME_TYPES.map((type) => (
          <TabsContent key={type} value={type}>
            {filteredGames.length > 0 ? (
              <>
                <div className="w-full mb-8">
                  <PlayerRatingChart games={filteredGames} gameType={type} />
                </div>
                <CommonOpponentsTable games={filteredGames} gameType={type} />
                <div className="overflow-x-auto mt-8">
                  <table className="min-w-full bg-white border border-gray-300">
                    <thead>
                      <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                        <th className="py-3 px-6 text-left">Date</th>
                        <th className="py-3 px-6 text-left">Color</th>
                        <th className="py-3 px-6 text-left">Score</th>
                        <th className="py-3 px-6 text-left">Opponent</th>
                        <th className="py-3 px-6 text-left">Opponent Rating</th>
                        <th className="py-3 px-6 text-left">Player Rating</th>
                        <th className="py-3 px-6 text-left">Event</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-600 text-sm font-light">
                      {paginatedGames.map((game, index) => (
                        <tr key={index} className="border-b border-gray-200 hover:bg-gray-100">
                          <td className="py-3 px-6 text-left whitespace-nowrap">
                            {formatDate(game.game_date)}
                          </td>
                          <td className="py-3 px-6 text-left">{game.colour}</td>
                          <td className="py-3 px-6 text-left">{game.score}</td>
                          <td className="py-3 px-6 text-left">
                            <Link href={`/?playerCode=${game.opponent_no}`} className="text-blue-600 hover:underline">
                              {game.opponent_name}
                            </Link>
                          </td>
                          <td className="py-3 px-6 text-left">{game.opponent_rating}</td>
                          <td className="py-3 px-6 text-left">{game.player_rating}</td>
                          <td className="py-3 px-6 text-left">{game.event_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-gray-500">No valid games found for this player code and game type.</div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

