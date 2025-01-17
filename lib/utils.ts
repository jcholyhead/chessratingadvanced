import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function calculatePerformanceRating(games: { opponent_rating: number; score: number }[]): number {
  const recentGames = games.slice(0, 10);
  const rc = recentGames.reduce((sum, game) => sum + game.opponent_rating, 0) / recentGames.length;
  const totalScore = recentGames.reduce((sum, game) => sum + (game.score === 5 ? 0.5 : game.score), 0);
  const p = totalScore / recentGames.length;
  const dp = 800 * p - 400;
  return Math.round(rc + dp);
}

