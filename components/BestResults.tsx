import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { Trophy } from "lucide-react"

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

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-amber-500'
      case 1: return 'text-slate-400'
      case 2: return 'text-amber-700'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <Card className="w-full h-full card-hover border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-lg">Best {gameType} Results</CardTitle>
        </div>
        <CardDescription>Top performances by opponent strength</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold w-8"></TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Opponent</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-right">Rating</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-center">Result</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bestResults.map((game, index) => (
              <TableRow key={index} className="table-row-hover">
                <TableCell className="py-3">
                  <Trophy className={`h-4 w-4 ${getMedalColor(index)}`} />
                </TableCell>
                <TableCell className="py-3">
                  <Link href={`/player/${game.opponent_no}`} className="link-primary font-medium">
                    {game.opponent_name}
                  </Link>
                </TableCell>
                <TableCell className="py-3 text-right font-mono-display font-medium">
                  {game.opponent_rating || '—'}
                </TableCell>
                <TableCell className="py-3 text-center">
                  <span className={`inline-flex items-center justify-center h-7 w-14 rounded-md text-sm font-semibold ${
                    game.score === 1 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {game.score === 1 ? "Win" : "Draw"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
