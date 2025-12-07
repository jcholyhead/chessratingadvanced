import React from 'react'
import { HelpCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
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
    if (rating === null || officialRating === null) return 'text-muted-foreground'
    if (rating === officialRating) return 'text-primary'
    if (rating < officialRating) return 'text-orange-500'
    return 'text-green-600'
  }

  const getDifference = () => {
    if (rating === null || officialRating === null) return null
    return rating - officialRating
  }

  const getDifferenceIcon = () => {
    const diff = getDifference()
    if (diff === null || diff === 0) return <Minus className="h-3 w-3" />
    if (diff > 0) return <TrendingUp className="h-3 w-3" />
    return <TrendingDown className="h-3 w-3" />
  }

  const getDifferenceColor = () => {
    const diff = getDifference()
    if (diff === null || diff === 0) return 'bg-secondary text-muted-foreground'
    if (diff > 0) return 'bg-green-100 text-green-700'
    return 'bg-orange-100 text-orange-700'
  }

  if (rating === null) {
    return null
  }

  const diff = getDifference()

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground w-40 inline-flex items-center gap-1">
        Live Estimate
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold uppercase tracking-wide">Beta</span>
      </span>
      <div className="flex items-center gap-2">
        <span className={`text-2xl font-bold font-mono-display ${getRatingColor()}`}>{rating}</span>
        {diff !== null && diff !== 0 && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getDifferenceColor()}`}>
            {getDifferenceIcon()}
            {diff > 0 ? `+${diff}` : diff}
          </span>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <HelpCircle className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                Games have been submitted for this rating period. This estimates your next official rating, assuming no more games are received.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
