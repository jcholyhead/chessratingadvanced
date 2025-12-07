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
import { FavouriteButton, getFavouritePlayerCode } from "./FavouriteButton"

// Helper function to sort games by date and opponent name
const sortGames = (games: Game[]) => {
  return [...games].sort((a, b) => {
    const dateA = new Date(a.game_date).getTime()
    const dateB = new Date(b.game_date).getTime()
    return dateB - dateA 
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
  { label: "5y", value: "5y" },
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
  const [playerCode, setPlayerCode] = useState(() => {
    // Priority: 1. initialPlayerCode (from URL), 2. favourite from localStorage, 3. random
    if (initialPlayerCode) {
      return initialPlayerCode
    }
    // Check localStorage for favourite (only on client)
    if (typeof window !== 'undefined') {
      const favourite = getFavouritePlayerCode()
      if (favourite) {
        return favourite
      }
    }
    // Fall back to random
    return PLAYER_CODES[Math.floor(Math.random() * PLAYER_CODES.length)]
  })
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
  const [playerClubs, setPlayerClubs] = useState<Array<{ club_code: string; club_name: string }>>([])


  const renderCount = useRef(0)
  const hasScrolledRef = useRef(false)
  
  // Scroll to top on initial mount with a player code from URL
  useEffect(() => {
    if (initialPlayerCode && !hasScrolledRef.current) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      hasScrolledRef.current = true
    }
  }, [])
  
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
      // Scroll to top when navigating to a new player
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [initialPlayerCode])

  // Fetch player details
  useEffect(() => {
    const fetchPlayerDetails = async () => {
      try {
        const response = await fetch(`/api/player-details?playerCode=${playerCode}`)
        const data = await response.json()
        setPlayerName(data.full_name)
        setPlayerClubs(data.clubs || [])
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
  if (error) return (
    <div className="flex items-center justify-center p-8 rounded-xl bg-destructive/10 text-destructive">
      <span className="font-medium">Failed to load: {error.message}</span>
    </div>
  )
  if (isLoading) return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span>Loading player data...</span>
      </div>
    </div>
  )

  // Render component
  return (
    <div className="space-y-8 w-full">
      {/* Responsive layout for player info, best results, and rating chart */}
      <div className="space-y-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column: Player information and performance rating */}
          <div className="w-full lg:w-1/2">
            <Card className="h-full card-hover border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <span className="text-foreground">{playerName || "Player Information"}</span>
                  {playerName && (
                    <FavouriteButton playerCode={playerCode} playerName={playerName} />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col space-y-3">
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
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground w-40">Player Code</span>
                    <input
                      type="text"
                      id="playerCode"
                      value={playerCode}
                      onChange={handlePlayerCodeChange}
                      className="px-3 py-1.5 rounded-lg border bg-secondary/50 text-sm font-mono-display focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  {playerClubs.length > 0 && (
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-40">
                        {playerClubs.length === 1 ? 'Club' : 'Clubs'}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {playerClubs.map((club) => (
                          <Link
                            key={club.club_code}
                            href={`/club/${club.club_code}`}
                            className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                          >
                            {club.club_name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {stableFilteredGames.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-40">Performance</span>
                      <div className="flex items-center gap-3">
                        <Select
                          onValueChange={handlePerformanceGameCountChange}
                          value={performanceGameCount.toString()}
                        >
                          <SelectTrigger className="w-[160px] h-9">
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
                        <span className="text-xl font-bold font-mono-display text-primary">{performanceRating}</span>
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
              <Card className="mb-8 card-hover border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <CardTitle className="text-lg">Rating History</CardTitle>
                    <Tabs value={timeRange} onValueChange={handleTimeRangeChange}>
                      <TabsList className="bg-secondary/70">
                        {TIME_RANGES.map((range) => (
                          <TabsTrigger key={range.value} value={range.value} className="text-xs px-3">
                            {range.label}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {timeFilteredGames.length > 0 ? (
                    <PlayerRatingChart games={timeFilteredGames} gameType={type} colorIndex={colorIndices[type] || 0} currentRating={liveRating ?? officialRating ?? 0} />
                  ) : (
                    <div className="text-muted-foreground h-[400px] flex flex-col items-center justify-center gap-2">
                      <svg className="h-12 w-12 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>No games found for the selected time range</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Best Results (visible only on smaller screens, below the rating chart) */}
              <div className="lg:hidden mb-8">
                {timeFilteredGames.length > 0 && <BestResults games={timeFilteredGames} gameType={gameType} />}
              </div>

              {timeFilteredGames.length > 0 && (
                <>
                  <CommonOpponentsTable games={timeFilteredGames} gameType={type} />
                  <div className="flex items-center gap-3 mt-8 mb-4 p-3 rounded-lg bg-secondary/50">
                    <Switch id="group-by-event" checked={groupByEvent} onCheckedChange={setGroupByEvent} />
                    <Label htmlFor="group-by-event" className="text-sm font-medium cursor-pointer">
                      Group games by event
                    </Label>
                  </div>
                  {groupByEvent ? (
                    <EventList games={timeFilteredGames} />
                  ) : (
                    <>
                      {/* Mobile card layout */}
                      <div className="md:hidden space-y-3">
                        {paginatedGames.map((game) => (
                          <div 
                            key={game.id} 
                            className="rounded-xl border bg-card p-4 card-hover"
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/?playerCode=${game.opponent_no}`}
                                  className="link-primary font-medium text-base block truncate"
                                >
                                  {game.opponent_name}
                                </Link>
                                <p className="text-sm text-muted-foreground truncate mt-0.5">
                                  {game.event_name}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                  game.colour.toUpperCase() === 'W' 
                                    ? 'bg-white border-2 border-foreground/20 text-foreground' 
                                    : 'bg-foreground text-background'
                                }`}>
                                  {game.colour.toUpperCase()}
                                </span>
                                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                                  game.score === 1 ? 'bg-green-100 text-green-700' :
                                  game.score === 0 ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {game.score === 5 ? "½" : game.score}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-mono-display text-muted-foreground">
                                {formatDate(game.game_date)}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">
                                  vs <span className="font-mono-display">{game.opponent_rating || '—'}</span>
                                </span>
                                <span className="font-mono-display font-semibold text-primary">
                                  {game.player_rating || '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Desktop table layout */}
                      <div className="hidden md:block overflow-x-auto rounded-xl border bg-card">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b bg-secondary/50">
                              <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                              <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Color</th>
                              <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</th>
                              <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opponent</th>
                              <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opp. Rating</th>
                              <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Rating</th>
                              <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {paginatedGames.map((game) => (
                              <tr key={game.id} className="table-row-hover">
                                <td className="py-3 px-4 whitespace-nowrap text-sm font-mono-display">{formatDate(game.game_date)}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                    game.colour.toUpperCase() === 'W' 
                                      ? 'bg-white border-2 border-foreground/20 text-foreground' 
                                      : 'bg-foreground text-background'
                                  }`}>
                                    {game.colour.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-semibold ${
                                    game.score === 1 ? 'bg-green-100 text-green-700' :
                                    game.score === 0 ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {game.score === 5 ? "½" : game.score}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <Link
                                    href={`/?playerCode=${game.opponent_no}`}
                                    className="link-primary animated-underline"
                                  >
                                    {game.opponent_name}
                                  </Link>
                                </td>
                                <td className="py-3 px-4 font-mono-display text-sm text-muted-foreground">{game.opponent_rating || '—'}</td>
                                <td className="py-3 px-4 font-mono-display text-sm font-medium">{game.player_rating || '—'}</td>
                                <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate">{game.event_name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="flex justify-between items-center mt-6">
                        <Button 
                          onClick={handlePreviousPage} 
                          disabled={currentPage === 1}
                          variant="outline"
                          size="sm"
                          className="interactive"
                        >
                          <span className="hidden sm:inline">Previous</span>
                          <span className="sm:hidden">Prev</span>
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">{currentPage}</span>
                          <span className="mx-1">/</span>
                          <span className="font-semibold text-foreground">{totalPages}</span>
                        </span>
                        <Button 
                          onClick={handleNextPage} 
                          disabled={currentPage === totalPages}
                          variant="outline"
                          size="sm"
                          className="interactive"
                        >
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

