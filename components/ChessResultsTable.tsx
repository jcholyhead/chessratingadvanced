'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { formatDate, calculatePerformanceRating } from '@/lib/utils'
import PlayerRatingChart from './PlayerRatingChart'
import CommonOpponentsTable from './CommonOpponentsTable'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const sortGames = (games: Game[]) => {
  return [...games].sort((a, b) => {
    const dateA = new Date(a.game_date).getTime();
    const dateB = new Date(b.game_date).getTime();
    return dateB - dateA || a.opponent_name.localeCompare(b.opponent_name);
  });
};

const PLAYER_CODES = [
  '188586J', '293875D', '105483B', '170263E', '136665J',
  '245324B', '175386B', '263810B', '252763H', '300121A',
  '123515B', '103888G', '329301E', '305272C', '258871H'
];

const GAME_TYPES = ['Standard', 'Rapid', 'Blitz'];

const PRESET_COLORS = ['#E76E50', '#E76E50', '#E76E50', '#E76E50', '#E76E50'];

const PERFORMANCE_GAME_COUNTS = [5, 10, 15, 20, 25, 30, 40, 50];

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
  id?: string
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
  const [colorIndices, setColorIndices] = useState<{[key: string]: number}>({})
  const [performanceGameCount, setPerformanceGameCount] = useState(10)
  const [stableFilteredGames, setStableFilteredGames] = useState<Game[]>([])
  
  const renderCount = useRef(0)

  const { data, error, isLoading } = useSWR<{ games: Game[] }>(
    `/api/chess-results?playerCode=${playerCode}&gameType=${gameType}`,
    fetcher
  )

  useEffect(() => {
    const newPlayerCode = searchParams?.get('playerCode');
    if (newPlayerCode && newPlayerCode !== playerCode) {
      setPlayerCode(newPlayerCode);
      setCurrentPage(1);
      setColorIndices({});
    }
  }, [searchParams, playerCode]);

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

  useEffect(() => {
    if (!colorIndices[gameType]) {
      setColorIndices(prev => ({
        ...prev,
        [gameType]: Math.floor(Math.random() * PRESET_COLORS.length)
      }));
    }
  }, [gameType, colorIndices]);

  useMemo(() => {
    renderCount.current += 1;
    console.log(`Recalculating filteredGames. Render count: ${renderCount.current}`);
    
    if (!data?.games) return []
    
    const games = data.games
      .filter(game => 
        game.player_rating && 
        game.opponent_name && 
        (game.score === 0 || game.score === 1 || game.score === 5)
      )
      .map((game, index) => ({
        ...game,
        id: `game-${index}-${renderCount.current}`
      }));
    
    const sortedGames = sortGames(games);
    
    console.log('Sorted games:', sortedGames.map(g => ({ id: g.id, date: g.game_date, opponent: g.opponent_name })));
    
    setStableFilteredGames(sortedGames);
    return sortedGames;
  }, [data]);

  const totalPages = useMemo(() => Math.ceil(stableFilteredGames.length / GAMES_PER_PAGE), [stableFilteredGames]);

  const paginatedGames = useMemo(() => {
    const sortedGames = sortGames(stableFilteredGames);
    const startIndex = (currentPage - 1) * GAMES_PER_PAGE;
    const endIndex = startIndex + GAMES_PER_PAGE;
    const games = sortedGames.slice(startIndex, endIndex);
    console.log(`Paginated games for page ${currentPage}:`, games.map(g => ({ id: g.id, date: g.game_date, opponent: g.opponent_name })));
    return games;
  }, [stableFilteredGames, currentPage]);

  const performanceRating = useMemo(() => {
    if (stableFilteredGames.length > 0) {
      const sortedGames = sortGames(stableFilteredGames);
      const gamesForCalculation = sortedGames.slice(0, performanceGameCount);
      console.log('Performance Rating Calculation Input:', {
        gameCount: performanceGameCount,
        games: gamesForCalculation.map(game => ({
          date: game.game_date,
          opponent_rating: game.opponent_rating,
          score: game.score
        }))
      });
      return calculatePerformanceRating(gamesForCalculation)
    }
    return null
  }, [stableFilteredGames, performanceGameCount]);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const handlePlayerCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayerCode(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePerformanceGameCountChange = useCallback((value: string) => {
    console.log('Performance Game Count Changed:', value);
    setPerformanceGameCount(parseInt(value, 10));
    setStableFilteredGames(prevGames => [...prevGames]); // Trigger a re-render
  }, []);

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
              onChange={handlePlayerCodeChange}
              className="border p-1 rounded"
            />
            {performanceRating !== null && (
              <div className="mt-2 flex items-center space-x-1 mr-2">
                <p className="text-sm mr-2">
                  Performance Rating:
                </p>
                <Select onValueChange={handlePerformanceGameCountChange} value={performanceGameCount.toString()}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select game count" />
                  </SelectTrigger>
                  <SelectContent>
                    {PERFORMANCE_GAME_COUNTS.map((count) => (
                      <SelectItem key={count} value={count.toString()}>
                        Last {count} games
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="ml-2 font-semibold">{performanceRating}</span>
              </div>
            )}
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
            {stableFilteredGames.length > 0 ? (
              <>
                <div className="w-full mb-8">
                  <PlayerRatingChart 
                    games={stableFilteredGames} 
                    gameType={type} 
                    colorIndex={colorIndices[type] || 0} 
                  />
                </div>
                <CommonOpponentsTable games={stableFilteredGames} gameType={type} />
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
                      {paginatedGames.map((game) => (
                        <tr key={game.id} className="border-b border-gray-200 hover:bg-gray-100">
                          <td className="py-3 px-6 text-left whitespace-nowrap">
                            {formatDate(game.game_date)}
                          </td>
                          <td className="py-3 px-6 text-left">{game.colour}</td>
                          <td className="py-3 px-6 text-left">
                            {game.score === 5 ? '½' : game.score}
                          </td>
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
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <Button
                    onClick={handleNextPage}
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

