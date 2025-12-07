'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const FAVOURITE_STORAGE_KEY = 'favouritePlayerCode'

interface FavouriteButtonProps {
  playerCode: string
  playerName: string | null
}

export function FavouriteButton({ playerCode, playerName }: FavouriteButtonProps) {
  const [isFavourite, setIsFavourite] = useState(false)

  useEffect(() => {
    // Check if this player is the current favourite
    const savedFavourite = localStorage.getItem(FAVOURITE_STORAGE_KEY)
    setIsFavourite(savedFavourite === playerCode)
  }, [playerCode])

  const toggleFavourite = () => {
    if (isFavourite) {
      // Remove favourite
      localStorage.removeItem(FAVOURITE_STORAGE_KEY)
      setIsFavourite(false)
    } else {
      // Set as favourite
      localStorage.setItem(FAVOURITE_STORAGE_KEY, playerCode)
      setIsFavourite(true)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleFavourite}
            className="ml-1 p-1.5 rounded-lg hover:bg-secondary transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring interactive"
            aria-label={isFavourite ? "Remove from favourites" : "Add to favourites"}
          >
            <Star
              className={`h-5 w-5 transition-all duration-200 ${
                isFavourite 
                  ? 'fill-amber-400 text-amber-400 scale-110' 
                  : 'text-muted-foreground/40 hover:text-amber-400'
              }`}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <p className="text-sm">
            {isFavourite 
              ? `${playerName || 'This player'} is your favourite. Click to remove.`
              : "Set as your default player profile"
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Get the favourite player code from localStorage
 * Returns null if no favourite is set or if running on server
 */
export function getFavouritePlayerCode(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem(FAVOURITE_STORAGE_KEY)
}

