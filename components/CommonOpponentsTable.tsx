import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Users } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

/**
 * Represents a single game in the chess results
 */
interface Game {
  game_date: string
  opponent_name: string
  opponent_no: string
  score: number
  opponent_rating: number
  player_rating: number
  event_name: string
}

/**
 * Props for the CommonOpponentsTable component
 */
interface CommonOpponentsTableProps {
  games: Game[]
  gameType?: string
}

/**
 * Represents statistics for a single opponent
 */
interface OpponentStats {
  name: string
  opponent_no: string
  totalGames: number
  wins: number
  losses: number
  draws: number
  games: Game[]
}

/**
 * CommonOpponentsTable Component
 *
 * This component displays a table of the most common opponents a player has faced,
 * along with statistics for games played against each opponent. It now includes
 * expandable rows to show details of individual games.
 *
 * @param games - An array of Game objects representing all games played
 * @param gameType - The type of chess game (e.g., 'Standard', 'Rapid', 'Blitz')
 *
 * @returns A table displaying the top 10 most common opponents and their statistics
 */
export default function CommonOpponentsTable({ games, gameType }: CommonOpponentsTableProps) {
  const [expandedOpponents, setExpandedOpponents] = useState<Set<string>>(new Set())

  // Calculate opponent statistics
  const opponentStats = useMemo(() => {
    const stats: { [key: string]: OpponentStats } = {}
    games.forEach((game) => {
      if (!stats[game.opponent_name]) {
        stats[game.opponent_name] = {
          name: game.opponent_name,
          opponent_no: game.opponent_no,
          totalGames: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          games: [],
        }
      }
      stats[game.opponent_name].totalGames++
      if (game.score === 1) stats[game.opponent_name].wins++
      else if (game.score === 0) stats[game.opponent_name].losses++
      else if (game.score === 5) stats[game.opponent_name].draws++
      stats[game.opponent_name].games.push(game)
    })
    return Object.values(stats)
      .sort((a, b) => b.totalGames - a.totalGames)
      .slice(0, 10) // Show top 10 most common opponents
  }, [games])

  const toggleExpand = (opponentName: string) => {
    setExpandedOpponents((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(opponentName)) {
        newSet.delete(opponentName)
      } else {
        newSet.add(opponentName)
      }
      return newSet
    })
  }

  const getScoreBadge = (score: number) => {
    if (score === 1) return <span className="inline-flex items-center justify-center h-6 w-12 rounded-md text-xs font-semibold bg-green-100 text-green-700">Win</span>
    if (score === 0) return <span className="inline-flex items-center justify-center h-6 w-12 rounded-md text-xs font-semibold bg-red-100 text-red-700">Loss</span>
    return <span className="inline-flex items-center justify-center h-6 w-12 rounded-md text-xs font-semibold bg-amber-100 text-amber-700">Draw</span>
  }

  return (
    <Card className="card-hover border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Common {gameType || "Chess"} Opponents</CardTitle>
        </div>
        <CardDescription>
          Top 10 opponents by number of games played
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Opponent</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-center">Games</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-center">W</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-center">L</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-center">D</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opponentStats.map((opponent) => (
                <>
                  <TableRow 
                    key={opponent.opponent_no} 
                    className="table-row-hover cursor-pointer"
                    onClick={() => toggleExpand(opponent.name)}
                  >
                    <TableCell className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpand(opponent.name)
                        }}
                      >
                        {expandedOpponents.has(opponent.name) ? (
                          <ChevronUp className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="sr-only">Toggle game details</span>
                      </Button>
                    </TableCell>
                    <TableCell className="py-3">
                      <Link 
                        href={`/player/${opponent.opponent_no}`} 
                        className="link-primary font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {opponent.name}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3 text-center font-mono-display font-semibold">{opponent.totalGames}</TableCell>
                    <TableCell className="py-3 text-center font-mono-display text-green-600">{opponent.wins}</TableCell>
                    <TableCell className="py-3 text-center font-mono-display text-red-500">{opponent.losses}</TableCell>
                    <TableCell className="py-3 text-center font-mono-display text-amber-600">{opponent.draws}</TableCell>
                  </TableRow>
                  {expandedOpponents.has(opponent.name) && (
                    <TableRow className="bg-secondary/30">
                      <TableCell colSpan={6} className="p-0">
                        <div className="p-4">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs text-muted-foreground">Date</TableHead>
                                <TableHead className="text-xs text-muted-foreground">Result</TableHead>
                                <TableHead className="text-xs text-muted-foreground text-right">Your Rating</TableHead>
                                <TableHead className="text-xs text-muted-foreground text-right">Opp. Rating</TableHead>
                                <TableHead className="text-xs text-muted-foreground">Event</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {opponent.games.map((game, index) => (
                                <TableRow key={index} className="hover:bg-secondary/50">
                                  <TableCell className="py-2 font-mono-display text-sm">{formatDate(game.game_date)}</TableCell>
                                  <TableCell className="py-2">{getScoreBadge(game.score)}</TableCell>
                                  <TableCell className="py-2 text-right font-mono-display text-sm">{game.player_rating || "—"}</TableCell>
                                  <TableCell className="py-2 text-right font-mono-display text-sm text-muted-foreground">{game.opponent_rating || "—"}</TableCell>
                                  <TableCell className="py-2 text-sm text-muted-foreground max-w-[200px] truncate">{game.event_name || "—"}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
