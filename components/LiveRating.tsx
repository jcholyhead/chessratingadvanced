import React from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface LiveRatingProps {
  rating: number | null
  gameType: 'Standard' | 'Rapid' | 'Blitz'
  officialRating: number | null
}

export function LiveRating({ rating, gameType, officialRating }: LiveRatingProps) {
  const getRatingColor = () => {
    if (rating === null || officialRating === null) return 'text-gray-500'
    if (rating === officialRating) return 'text-blue-600'
    if (rating < officialRating) return 'text-[#E76E50]'
    return 'text-green-600'
  }

  const getDifference = () => {
    if (rating === null || officialRating === null) return null
    const diff = rating - officialRating
    return diff > 0 ? `+${diff}` : diff
  }

  return (
    <div className="flex items-baseline">
      <span className="text-base font-medium text-gray-700 w-52 inline-flex items-baseline">
        Live {gameType} Rating:
        <sup className="text-xs text-gray-500 ml-1">Beta</sup>
      </span>
      {rating === null ? (
        <span className="text-xl text-gray-500">Not available</span>
      ) : (
        <div className="flex items-center">
          <span className={`text-xl ${getRatingColor()} font-semibold`}>{rating}</span>
          {rating !== officialRating && (
            <>
              <span className="ml-2 text-sm text-gray-600">({getDifference()})</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="ml-2 h-4 w-4 text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      The ECF have received game submissions for this rating period (see your game list below for details). This is an <em>estimate</em> of your next official rating, should no more games be received for rating.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      )}
    </div>
  )
}

