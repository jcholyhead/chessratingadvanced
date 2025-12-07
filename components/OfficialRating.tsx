'use client'

import { useState, useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface OfficialRatingProps {
  playerCode: string
  gameType: 'Standard' | 'Rapid' | 'Blitz'
  setOfficialRating: (rating: number | null) => void
}

export function OfficialRating({ playerCode, gameType, setOfficialRating }: OfficialRatingProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [isProvisional, setIsProvisional] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRating = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/official-rating?playerCode=${playerCode}&gameType=${gameType}`)
        if (!response.ok) {
          setRating(null)
        }
        const data = await response.json()
        if (data.success) {
          // Handle both old ECF API format (revised_rating) and new MongoDB format (rating)
          const ratingValue = data.rating ?? data.revised_rating ?? null
          const categoryValue = data.rating_category ?? data.revised_category ?? ''
          setRating(ratingValue)
          setOfficialRating(ratingValue)
          setIsProvisional(categoryValue === 'P')
        } else {
          setRating(null)
        }
      } catch (error) {
        console.error('Error fetching official rating:', error)
        setError('Failed to load official rating')
        setRating(null)
        setOfficialRating(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRating()
  }, [playerCode, gameType, setOfficialRating])

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground w-40">Official Rating</span>
        <div className="h-8 w-20 bg-secondary rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground w-40">Official Rating</span>
        <span className="text-sm text-destructive">Unable to load</span>
      </div>
    )
  }

  if (rating === null) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground w-40">Official Rating</span>
        <span className="text-sm text-muted-foreground italic">Not rated</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground w-40">Official {gameType}</span>
      <div className="flex items-center gap-2">
        <span className={`text-2xl font-bold font-mono-display ${isProvisional ? "text-muted-foreground" : "text-primary"}`}>
          {rating}
        </span>
        {isProvisional && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                  Provisional
                  <HelpCircle className="h-3 w-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>This rating is based on fewer than 30 games</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}
