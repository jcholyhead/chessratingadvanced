import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges multiple class names into a single string, resolving Tailwind CSS conflicts.
 * 
 * This function combines the functionality of clsx (for conditional class names)
 * and tailwind-merge (for resolving Tailwind CSS conflicts).
 * 
 * @param inputs - Any number of class names or conditional class objects
 * @returns A string of merged class names with Tailwind conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date string into a localized date format (DD/MM/YYYY).
 * 
 * @param dateString - A valid date string
 * @returns A formatted date string in the format DD/MM/YYYY
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Calculates the performance rating for a set of chess games.
 * 
 * The performance rating is calculated based on the average rating of opponents
 * and the player's score against those opponents.
 * 
 * @param games - An array of game objects, each containing opponent_rating and score
 * @returns The calculated performance rating as a number
 * 
 * @example
 * const games = [
 *   { opponent_rating: 1800, score: 1 },
 *   { opponent_rating: 2000, score: 0.5 },
 *   { opponent_rating: 1900, score: 0 }
 * ];
 * const performanceRating = calculatePerformanceRating(games);
 */
export function calculatePerformanceRating(games: { opponent_rating: number; score: number }[]): number {
  //console.log('Calculating Performance Rating for games:', games);

  const gameCount = games.length;
  if (gameCount === 0) return 0;

  // Calculate average opponent rating
  const rc = games.reduce((sum, game) => sum + game.opponent_rating, 0) / gameCount;
  //console.log('Average opponent rating (rc):', rc);

  // Calculate total score (0.5 for draws)
  const totalScore = games.reduce((sum, game) => sum + (game.score === 5 ? 0.5 : game.score), 0);
  //console.log('Total score:', totalScore);

  // Calculate performance (percentage score)
  const p = totalScore / gameCount;
  //console.log('Performance (p):', p);

  // Calculate rating difference based on performance
  const dp = Math.round(800 * p - 400);
  //console.log('Rating difference (dp):', dp);

  // Calculate final performance rating
  const performanceRating = Math.round(rc + dp);
  //console.log('Final Performance Rating:', performanceRating);

  return performanceRating;
}

