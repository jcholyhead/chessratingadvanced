'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

const PRESET_COLORS = ['#E76E50', '#E76E50', '#E76E50', '#E76E50', '#E76E50'];

interface Game {
  game_date: string
  player_rating: number
}

interface PlayerRatingChartProps {
  games: Game[]
  gameType: string
  colorIndex: number
}

export default function PlayerRatingChart({ games, gameType, colorIndex }: PlayerRatingChartProps) {
  const chartData = useMemo(() => {
    return games
      .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
      .map(game => ({
        date: new Date(game.game_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        rating: game.player_rating
      }))
  }, [games])

  const minRating = Math.min(...games.map(game => game.player_rating))
  const maxRating = Math.max(...games.map(game => game.player_rating))

  const chartColor = PRESET_COLORS[colorIndex]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{gameType} Rating Over Time</CardTitle>
        <CardDescription>Chart showing how the player&apos;s {gameType.toLowerCase()} rating changes after each game</CardDescription>
      </CardHeader>
      <CardContent className="w-full">
        <ChartContainer
          config={{
            rating: {
              label: "Rating",
              color: chartColor,
            },
          }}
          className="h-[400px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
                tickFormatter={(value) => value.split('/')[1] + '/' + value.split('/')[2]}
              />
              <YAxis 
                domain={[minRating, maxRating]} 
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="rating" 
                stroke={chartColor}
                strokeWidth={2} 
                dot={false} 
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

