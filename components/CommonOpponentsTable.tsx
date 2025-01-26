import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Common {gameType || "Chess"} Opponents</CardTitle>
        <CardDescription>
          Top 10 opponents by number of {gameType ? `${gameType.toLowerCase()} ` : ""}games played
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]"></TableHead>
              <TableHead>Opponent</TableHead>
              <TableHead>Games</TableHead>
              <TableHead>Wins</TableHead>
              <TableHead>Losses</TableHead>
              <TableHead>Draws</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {opponentStats.map((opponent) => (
              <>
                <TableRow key={opponent.opponent_no} className="hover:bg-muted/50 cursor-pointer">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => toggleExpand(opponent.name)}
                    >
                      {expandedOpponents.has(opponent.name) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      <span className="sr-only">Toggle game details</span>
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/player/${opponent.opponent_no}`} className="text-blue-600 hover:underline">
                      {opponent.name}
                    </Link>
                  </TableCell>
                  <TableCell>{opponent.totalGames}</TableCell>
                  <TableCell>{opponent.wins}</TableCell>
                  <TableCell>{opponent.losses}</TableCell>
                  <TableCell>{opponent.draws}</TableCell>
                </TableRow>
                {expandedOpponents.has(opponent.name) && (
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Player Rating</TableHead>
                            <TableHead>Opponent Rating</TableHead>
                            <TableHead>Event</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {opponent.games.map((game, index) => (
                            <TableRow key={index}>
                              <TableCell>{formatDate(game.game_date)}</TableCell>
                              <TableCell>{game.score === 1 ? "Win" : game.score === 0 ? "Loss" : "Draw"}</TableCell>
                              <TableCell>{game.player_rating || "N/A"}</TableCell>
                              <TableCell>{game.opponent_rating || "N/A"}</TableCell>
                              <TableCell>{game.event_name || "N/A"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

