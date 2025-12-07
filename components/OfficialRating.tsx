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
    return <div>Loading official rating...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  if (rating === null) {
    return <div className="text-red-500">Official rating not available</div>
  }

  return (
    <div className="flex items-baseline">
      <span className="text-base font-medium text-gray-700 w-52">Official {gameType} Rating:</span>
      <div className="flex items-center">
        <span className={`text-xl ${isProvisional ? "text-gray-600" : "text-blue-600 font-semibold"}`}>
          {rating}
        </span>
        {isProvisional && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="ml-2 h-4 w-4 text-gray-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>This is a provisional rating</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}

