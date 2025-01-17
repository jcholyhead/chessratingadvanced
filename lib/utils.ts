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
  console.log('Calculating Performance Rating for games:', games);

  const gameCount = games.length;
  if (gameCount === 0) return 0;

  const rc = games.reduce((sum, game) => sum + game.opponent_rating, 0) / gameCount;
  console.log('Average opponent rating (rc):', rc);

  const totalScore = games.reduce((sum, game) => sum + (game.score === 5 ? 0.5 : game.score), 0);
  console.log('Total score:', totalScore);

  const p = totalScore / gameCount;
  console.log('Performance (p):', p);

  const dp = Math.round(800 * p - 400);
  console.log('Rating difference (dp):', dp);

  const performanceRating = Math.round(rc + dp);
  console.log('Final Performance Rating:', performanceRating);

  return performanceRating;
}

