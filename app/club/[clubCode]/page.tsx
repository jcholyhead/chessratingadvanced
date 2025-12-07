'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

interface Player {
  ECF_code: string
  full_name: string
  category: string
  date_last_game: string | null
  ratings: {
    standard: number | null
    rapid: number | null
    blitz: number | null
  }
  primary_rating: number | null
}

interface ClubData {
  club_code: string
  club_name: string
  assoc_name: string | null
  players: Player[]
  total_players: number
  success: boolean
}

type SortField = 'name' | 'standard' | 'rapid' | 'blitz' | 'lastGame'
type SortDirection = 'asc' | 'desc'

export default function ClubPage({ params }: { params: { clubCode: string } }) {
  const [clubData, setClubData] = useState<ClubData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('standard')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  useEffect(() => {
    const fetchClubData = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/club-players?clubCode=${params.clubCode}`)
        const data = await response.json()
        
        if (!response.ok || !data.success) {
          setError(data.error || 'Failed to load club data')
          return
        }
        
        setClubData(data)
      } catch (err) {
        setError('Failed to fetch club data')
        console.error('Error fetching club data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchClubData()
  }, [params.clubCode])

  // Sort players based on current sort settings
  const sortedPlayers = useMemo(() => {
    if (!clubData?.players) return []
    
    // Helper to check if a rating is valid (positive number)
    const isValidRating = (rating: number | null): rating is number => {
      return rating !== null && rating > 0
    }
    
    return [...clubData.players].sort((a, b) => {
      // For rating columns, always put unrated players at the bottom
      const getRatingValue = (field: 'standard' | 'rapid' | 'blitz', player: Player) => {
        return player.ratings[field]
      }
      
      switch (sortField) {
        case 'name':
          const nameComparison = a.full_name.localeCompare(b.full_name)
          return sortDirection === 'desc' ? -nameComparison : nameComparison
          
        case 'standard':
        case 'rapid':
        case 'blitz': {
          const ratingA = getRatingValue(sortField, a)
          const ratingB = getRatingValue(sortField, b)
          const validA = isValidRating(ratingA)
          const validB = isValidRating(ratingB)
          
          // Both unrated - sort by name
          if (!validA && !validB) {
            return a.full_name.localeCompare(b.full_name)
          }
          // Only A is unrated - A goes to bottom
          if (!validA) return 1
          // Only B is unrated - B goes to bottom
          if (!validB) return -1
          // Both have ratings - sort by rating
          const ratingComparison = ratingA - ratingB
          return sortDirection === 'desc' ? -ratingComparison : ratingComparison
        }
          
        case 'lastGame': {
          const dateA = a.date_last_game ? new Date(a.date_last_game).getTime() : 0
          const dateB = b.date_last_game ? new Date(b.date_last_game).getTime() : 0
          
          // Both have no date - sort by name
          if (dateA === 0 && dateB === 0) {
            return a.full_name.localeCompare(b.full_name)
          }
          // Only A has no date - A goes to bottom
          if (dateA === 0) return 1
          // Only B has no date - B goes to bottom
          if (dateB === 0) return -1
          // Both have dates - sort by date
          const dateComparison = dateA - dateB
          return sortDirection === 'desc' ? -dateComparison : dateComparison
        }
          
        default:
          return 0
      }
    })
  }, [clubData?.players, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // New field, default to descending for ratings, ascending for name
      setSortField(field)
      setSortDirection(field === 'name' ? 'asc' : 'desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-4 w-4 ml-1 text-gray-400" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 ml-1" />
      : <ChevronDown className="h-4 w-4 ml-1" />
  }

  const SortableHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th 
      className={`py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center ${className.includes('text-center') ? 'justify-center' : ''}`}>
        {children}
        <SortIcon field={field} />
      </div>
    </th>
  )

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Link 
          href="/" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to search
        </Link>
        <Card>
          <CardContent className="py-8">
            <p className="text-red-500 text-center">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!clubData) {
    return null
  }

  return (
    <div className="container mx-auto py-8">
      <Link 
        href="/" 
        className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to search
      </Link>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{clubData.club_name}</CardTitle>
          {clubData.assoc_name && (
            <p className="text-gray-600">{clubData.assoc_name}</p>
          )}
          <p className="text-sm text-gray-500">
            {clubData.total_players} {clubData.total_players === 1 ? 'player' : 'players'}
          </p>
        </CardHeader>
        <CardContent>
          {clubData.players.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No players found for this club.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <SortableHeader field="name" className="text-left">Name</SortableHeader>
                    <SortableHeader field="standard" className="text-center">Standard</SortableHeader>
                    <SortableHeader field="rapid" className="text-center">Rapid</SortableHeader>
                    <SortableHeader field="blitz" className="text-center">Blitz</SortableHeader>
                    <SortableHeader field="lastGame" className="text-center">Last Game</SortableHeader>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.map((player, index) => (
                    <tr 
                      key={player.ECF_code} 
                      className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/player/${player.ECF_code}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {player.full_name}
                        </Link>
                        <span className="text-gray-400 text-sm ml-2">
                          ({player.ECF_code})
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        {player.ratings.standard && player.ratings.standard > 0 ? (
                          <span className="font-semibold">{player.ratings.standard}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unrated</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {player.ratings.rapid && player.ratings.rapid > 0 ? (
                          <span className="font-semibold">{player.ratings.rapid}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unrated</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {player.ratings.blitz && player.ratings.blitz > 0 ? (
                          <span className="font-semibold">{player.ratings.blitz}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unrated</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4 text-gray-600 text-sm">
                        {player.date_last_game || <span className="text-gray-400 italic">Never</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
