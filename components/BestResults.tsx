import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"

interface Game {
  opponent_name: string
  opponent_no: string
  opponent_rating: number
  score: number
}

interface BestResultsProps {
  games: Game[]
  gameType: string
}

export function BestResults({ games, gameType }: BestResultsProps) {
  const calculateComparisonScore = (game: Game) => {
    if (game.score === 1) return game.opponent_rating + 400 // Win
    if (game.score === 5) return game.opponent_rating // Draw
    return 0 // Loss (not considered)
  }

  const bestResults = games
    .filter((game) => game.score === 1 || game.score === 5) // Only consider wins and draws
    .sort((a, b) => calculateComparisonScore(b) - calculateComparisonScore(a))
    .slice(0, 3)

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Best {gameType} Results</CardTitle>
        <CardDescription>Top 3 results based on opponent rating and game outcome</CardDescription>
      </CardHeader>
      <CardContent className="h-[calc(100%-4rem)] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opponent</TableHead>
              <TableHead>Opponent Rating</TableHead>
              <TableHead>Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bestResults.map((game, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Link href={`/player/${game.opponent_no}`} className="text-blue-600 hover:underline">
                    {game.opponent_name}
                  </Link>
                </TableCell>
                <TableCell>{game.opponent_rating}</TableCell>
                <TableCell>{game.score === 1 ? "Win" : "Draw"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

