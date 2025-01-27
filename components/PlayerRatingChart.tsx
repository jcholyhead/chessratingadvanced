'use client'

import { useState, useMemo,useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

/**
 * Array of preset colors for the chart lines
 */
const PRESET_COLORS = ['#E76E50', '#E76E50', '#E76E50', '#E76E50', '#E76E50'];

/**
 * Represents a single game in the player's history
 */
interface Game {
  game_date: string
  player_rating: number
}

/**
 * Props for the PlayerRatingChart component
 */
interface PlayerRatingChartProps {
  games: Game[]
  gameType: string
  colorIndex: number
  currentRating: number
}

/**
 * PlayerRatingChart Component
 * 
 * This component renders a line chart showing a player's rating changes over time
 * for a specific game type (Standard, Rapid, or Blitz).
 * 
 * @param games - An array of Game objects representing the player's game history
 * @param gameType - The type of chess game (e.g., 'Standard', 'Rapid', 'Blitz')
 * @param colorIndex - Index to select a color from the PRESET_COLORS array
 * @param currentRating - The current Rating of the player, used to ensure consistency on most recent date where data might
 * 
 * @returns A card containing a line chart of the player's rating over time
 */
export default function PlayerRatingChart({ games, gameType, colorIndex, currentRating }: PlayerRatingChartProps) {
  /**
   * Processes the games data for the chart
   * Sorts games by date and formats the data for the Recharts component
   */

  const [chartData, setChartData] = useState<{ date: string; rating: number }[]>([]);

  const filteredGames = games.filter((game) => game.player_rating)
  useEffect(() => {
    setChartData(filteredGames
      .sort((a, b) => new Date(a.game_date).getTime() - new Date(b.game_date).getTime())
      .map(game => ({
        date: new Date(game.game_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        rating: game.player_rating
      })))
  }, [games])

    useEffect(() => {
      if (chartData.length > 0) {
        chartData[chartData.length - 1].rating = currentRating; // Set your desired value here
      }
    }, [currentRating])

  // Calculate the minimum and maximum ratings for the Y-axis domain
  const minRating = Math.min(...filteredGames.map(game => game.player_rating))
  const maxRating = Math.max(...filteredGames.map(game => game.player_rating))

  // Select the chart color based on the provided index
  const chartColor = PRESET_COLORS[colorIndex]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{gameType} Rating Over Time</CardTitle>
        <CardDescription>Chart showing how the player's {gameType.toLowerCase()} rating changes after each game</CardDescription>
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

