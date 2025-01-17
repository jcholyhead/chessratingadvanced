import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'

interface Game {
  opponent_name: string
  opponent_no: string
  score: number
}

interface CommonOpponentsTableProps {
  games: Game[]
}

interface OpponentStats {
  name: string
  opponent_no: string
  totalGames: number
  wins: number
  losses: number
  draws: number
}

export default function CommonOpponentsTable({ games }: CommonOpponentsTableProps) {
  const opponentStats = useMemo(() => {
    const stats: { [key: string]: OpponentStats } = {}
    games.forEach(game => {
      if (!stats[game.opponent_name]) {
        stats[game.opponent_name] = { 
          name: game.opponent_name, 
          opponent_no: game.opponent_no, 
          totalGames: 0, 
          wins: 0, 
          losses: 0, 
          draws: 0 
        }
      }
      stats[game.opponent_name].totalGames++
      if (game.score === 1) stats[game.opponent_name].wins++
      else if (game.score === 0) stats[game.opponent_name].losses++
      else if (game.score === 5) stats[game.opponent_name].draws++
    })
    return Object.values(stats)
      .sort((a, b) => b.totalGames - a.totalGames)
      .slice(0, 10) // Show top 10 most common opponents
  }, [games])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Common Opponents</CardTitle>
        <CardDescription>Top 10 opponents by number of games played</CardDescription>
      </CardHeader>
      <CardContent>
        <table className="w-full">
          <thead>
            <tr className="text-left">
              <th className="pb-2">Opponent</th>
              <th className="pb-2">Games</th>
              <th className="pb-2">Wins</th>
              <th className="pb-2">Losses</th>
              <th className="pb-2">Draws</th>
            </tr>
          </thead>
          <tbody>
            {opponentStats.map((opponent, index) => (
              <tr key={index} className="border-t">
                <td className="py-2">
                  <Link href={`/?playerCode=${opponent.opponent_no}`} className="text-blue-600 hover:underline">
                    {opponent.name}
                  </Link>
                </td>
                <td className="py-2">{opponent.totalGames}</td>
                <td className="py-2">{opponent.wins}</td>
                <td className="py-2">{opponent.losses}</td>
                <td className="py-2">{opponent.draws}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

