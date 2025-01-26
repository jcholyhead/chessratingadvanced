"use client"

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { formatDate, calculatePerformanceRating } from "@/lib/utils"
import PlayerRatingChart from "./PlayerRatingChart"
import CommonOpponentsTable from "./CommonOpponentsTable"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import EventList from "./EventList"
import { OfficialRating } from "./OfficialRating"
import { LiveRating } from "./LiveRating"
import { BestResults } from "./BestResults"

// Helper function to sort games by date and opponent name
const sortGames = (games: Game[]) => {
  return [...games].sort((a, b) => {
    const dateA = new Date(a.game_date).getTime()
    const dateB = new Date(b.game_date).getTime()
    return dateB - dateA || a.opponent_name.localeCompare(b.opponent_name)
  })
}

// Constants
const PLAYER_CODES = [
  "188586J",
  "293875D",
  "105483B",
  "170263E",
  "136665J",
  "245324B",
  "175386B",
  "263810B",
  "252763H",
  "300121A",
  "123515B",
  "103888G",
  "329301E",
  "305272C",
  "258871H",
]
const GAME_TYPES = ["Standard", "Rapid", "Blitz"]
const PRESET_COLORS = ["#E76E50", "#E76E50", "#E76E50", "#E76E50", "#E76E50"]
const PERFORMANCE_GAME_COUNTS = [5, 10, 15, 20, 25, 30, 40, 50]
const TIME_RANGES = [
  { label: "All-time", value: "all" },
  { label: "2y", value: "2y" },
  { label: "1y", value: "1y" },
  { label: "6m", value: "6m" },
  { label: "3m", value: "3m" },
]
const GAMES_PER_PAGE = 20

// SWR fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Game interface
interface Game {
  game_date: string
  colour: string
  score: number
  opponent_name: string
  opponent_rating: number
  player_rating: number
  increment: number
  event_name: string
  opponent_no: string
  id?: string
  event_code: string
}

interface ChessResultsTableProps {
  initialPlayerCode: string | null
}

export default function ChessResultsTable({ initialPlayerCode }: ChessResultsTableProps) {
  const router = useRouter()
  const [playerCode, setPlayerCode] = useState(
    initialPlayerCode || PLAYER_CODES[Math.floor(Math.random() * PLAYER_CODES.length)],
  )
  const [gameType, setGameType] = useState("Standard")
  const [currentPage, setCurrentPage] = useState(1)
  const [playerName, setPlayerName] = useState<string | null>(null)
  const [colorIndices, setColorIndices] = useState<{ [key: string]: number }>({})
  const [performanceGameCount, setPerformanceGameCount] = useState(10)
  const [stableFilteredGames, setStableFilteredGames] = useState<Game[]>([])
  const [timeRange, setTimeRange] = useState("all")
  const [groupByEvent, setGroupByEvent] = useState(true)
  const [liveRating, setLiveRating] = useState<number | null>(null)
  const [officialRating, setOfficialRating] = useState<number | null>(null)

  const renderCount = useRef(0)

  if (!playerCode) {
    return <div>Please enter a player code to view results.</div>
  }

  // Fetch chess results data
  const { data, error, isLoading } = useSWR<{ games: Game[] }>(
    `/api/chess-results?playerCode=${playerCode}&gameType=${gameType}`,
    fetcher,
  )

  // Update player code when initialPlayerCode changes
  useEffect(() => {
    if (initialPlayerCode && initialPlayerCode !== playerCode) {
      setPlayerCode(initialPlayerCode)
      setCurrentPage(1)
      setColorIndices({})
    }
  }, [initialPlayerCode])

  // Fetch player details
  useEffect(() => {
    const fetchPlayerDetails = async () => {
      try {
        const response = await fetch(`/api/player-details?playerCode=${playerCode}`)
        const data = await response.json()
        setPlayerName(data.full_name)
      } catch (error) {
        console.error("Error fetching player details:", error)
      }
    }

    fetchPlayerDetails()
  }, [playerCode])

  // Set color indices for charts
  useEffect(() => {
    if (!colorIndices[gameType]) {
      setColorIndices((prev) => ({
        ...prev,
        [gameType]: Math.floor(Math.random() * PRESET_COLORS.length),
      }))
    }
  }, [gameType, colorIndices])

  // Process and filter games data
  useEffect(() => {
    if (data?.games && data.games.length > 0) {
      // Find the first non-empty player_rating

      const games = data.games
        .filter(
          (game) =>
            game.opponent_name && (game.score === 0 || game.score === 1 || game.score === 5),
        )
        .map((game, index) => ({
          ...game,
          id: `game-${index}-${renderCount.current}`,
        }))

      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const gameDate = new Date(games[0].game_date)
      if (gameDate < firstDayOfMonth) {
        setLiveRating(null)
      } else {
        const game0 = games[0]
        const game1 = games[1]

        try {
          if (game0.game_date != game1.game_date) {
            setLiveRating(game0.player_rating)
          } else {
            if (game0.player_rating - (game1.player_rating + game0.increment) < 1) {
              setLiveRating(game0.player_rating)
            } else if (game1.player_rating - (game0.player_rating + game1.increment) < 1) {
              setLiveRating(game1.player_rating)
            }
          }
        } catch {
          setLiveRating(null)
        }
      }
      const sortedGames = sortGames(games)

      setStableFilteredGames(sortedGames)
    } else {
      setLiveRating(null)
      setStableFilteredGames([])
    }
  }, [data])

  // Apply time range filter
  const timeFilteredGames = useMemo(() => {
    const now = new Date()
    const filterDate = new Date()
    switch (timeRange) {
      case "5y":
        filterDate.setFullYear(now.getFullYear() - 5)
        break
      case "2y":
        filterDate.setFullYear(now.getFullYear() - 2)
        break
      case "1y":
        filterDate.setFullYear(now.getFullYear() - 1)
        break
      case "6m":
        filterDate.setMonth(now.getMonth() - 6)
        break
      case "3m":
        filterDate.setMonth(now.getMonth() - 3)
        break
      default:
        return sortGames(stableFilteredGames)
    }
    return sortGames(stableFilteredGames.filter((game) => new Date(game.game_date) >= filterDate))
  }, [stableFilteredGames, timeRange])

  // Calculate total pages for pagination
  const totalPages = useMemo(() => Math.ceil(timeFilteredGames.length / GAMES_PER_PAGE), [timeFilteredGames])

  // Get paginated games
  const paginatedGames = useMemo(() => {
    const startIndex = (currentPage - 1) * GAMES_PER_PAGE
    const endIndex = startIndex + GAMES_PER_PAGE
    const sortedGames = sortGames(timeFilteredGames)
    const games = sortedGames.slice(startIndex, endIndex)
    return games
  }, [timeFilteredGames, currentPage])

  // Calculate performance rating
  const performanceRating = useMemo(() => {
    if (stableFilteredGames.length > 0) {
      const sortedGames = sortGames(stableFilteredGames)
      const gamesForCalculation = sortedGames.slice(0, performanceGameCount)
      return calculatePerformanceRating(gamesForCalculation)
    }
    return null
  }, [stableFilteredGames, performanceGameCount])

  // Event handlers
  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }, [])

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }, [totalPages])

  const handlePlayerCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPlayerCode = e.target.value
      setPlayerCode(newPlayerCode)
      setCurrentPage(1)
      router.push(`/player/${newPlayerCode}`)
    },
    [router],
  )

  const handlePerformanceGameCountChange = useCallback((value: string) => {
    setPerformanceGameCount(Number.parseInt(value, 10))
    setStableFilteredGames((prevGames) => [...prevGames]) // Trigger a re-render
  }, [])

  const handleTimeRangeChange = useCallback((value: string) => {
    setTimeRange(value)
    setCurrentPage(1)
  }, [])

  // Error and loading states
  if (error) return <div className="text-red-500">Failed to load: {error.message}</div>
  if (isLoading) return <div className="text-blue-500">Loading...</div>

  // Render component
  return (
    <div className="space-y-8 w-full">
      {/* Responsive layout for player info, best results, and rating chart */}
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column: Player information and performance rating */}
          <div className="w-full lg:w-1/2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>{playerName || "Player Information"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col space-y-4">
                  <OfficialRating
                    playerCode={playerCode}
                    gameType={gameType as "Standard" | "Rapid" | "Blitz"}
                    setOfficialRating={setOfficialRating}
                  />
                  <LiveRating
                    rating={liveRating}
                    gameType={gameType as "Standard" | "Rapid" | "Blitz"}
                    officialRating={officialRating}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-medium text-gray-700 w-52">Player Code:</span>
                    <input
                      type="text"
                      id="playerCode"
                      value={playerCode}
                      onChange={handlePlayerCodeChange}
                      className="border p-1 rounded text-sm"
                    />
                  </div>
                  {stableFilteredGames.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                      <span className="text-base font-medium text-gray-700 w-52">Performance Rating:</span>
                      <div className="flex items-center space-x-2">
                        <Select
                          onValueChange={handlePerformanceGameCountChange}
                          value={performanceGameCount.toString()}
                        >
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
                        <span className="text-lg font-semibold">{performanceRating}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Best Results (visible only on larger screens) */}
          <div className="w-full lg:w-1/2 hidden lg:block">
            {timeFilteredGames.length > 0 && <BestResults games={timeFilteredGames} gameType={gameType} />}
          </div>
        </div>

        {/* Game type tabs and time range selector */}
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
              <div className="w-full mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Rating Chart</h3>
                  <Tabs value={timeRange} onValueChange={handleTimeRangeChange}>
                    <TabsList>
                      {TIME_RANGES.map((range) => (
                        <TabsTrigger key={range.value} value={range.value}>
                          {range.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
                {timeFilteredGames.length > 0 ? (
                  <PlayerRatingChart games={timeFilteredGames} gameType={type} colorIndex={colorIndices[type] || 0} />
                ) : (
                  <div className="text-gray-500 h-[400px] flex items-center justify-center">
                    No games found for the selected time range.
                  </div>
                )}
              </div>

              {/* Best Results (visible only on smaller screens, below the rating chart) */}
              <div className="lg:hidden mb-8">
                {timeFilteredGames.length > 0 && <BestResults games={timeFilteredGames} gameType={gameType} />}
              </div>

              {timeFilteredGames.length > 0 && (
                <>
                  <CommonOpponentsTable games={timeFilteredGames} gameType={type} />
                  <div className="flex items-center space-x-2 mt-8 mb-4">
                    <Switch id="group-by-event" checked={groupByEvent} onCheckedChange={setGroupByEvent} />
                    <Label htmlFor="group-by-event">Group games by event</Label>
                  </div>
                  {groupByEvent ? (
                    <EventList games={timeFilteredGames} />
                  ) : (
                    <>
                      <div className="overflow-x-auto">
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
                                <td className="py-3 px-6 text-left whitespace-nowrap">{formatDate(game.game_date)}</td>
                                <td className="py-3 px-6 text-left">{game.colour}</td>
                                <td className="py-3 px-6 text-left">{game.score === 5 ? "½" : game.score}</td>
                                <td className="py-3 px-6 text-left">
                                  <Link
                                    href={`/?playerCode=${game.opponent_no}`}
                                    className="text-blue-600 hover:underline"
                                  >
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
                        <Button onClick={handlePreviousPage} disabled={currentPage === 1}>
                          Previous
                        </Button>
                        <span>
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button onClick={handleNextPage} disabled={currentPage === totalPages}>
                          Next
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}

