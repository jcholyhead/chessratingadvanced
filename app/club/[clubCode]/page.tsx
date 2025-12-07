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
      return <ChevronsUpDown className="h-3.5 w-3.5 ml-1 text-muted-foreground/50" />
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="h-3.5 w-3.5 ml-1 text-primary" />
      : <ChevronDown className="h-3.5 w-3.5 ml-1 text-primary" />
  }

  const SortableHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <th 
      className={`py-3 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground select-none transition-colors ${className}`}
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
      <div className="container mx-auto max-w-6xl py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-secondary rounded-lg w-1/3"></div>
          <div className="h-4 bg-secondary rounded-lg w-1/4"></div>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="space-y-0">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-14 border-b bg-secondary/30 last:border-0"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-6xl py-8">
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 mb-6 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Link>
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12">
            <div className="text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 mb-4">
                <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!clubData) {
    return null
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 animate-fade-in">
      <Link 
        href="/" 
        className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 mb-6 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to search
      </Link>
      
      <Card className="border-0 shadow-sm card-hover">
        <CardHeader className="border-b bg-secondary/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-2xl font-bold">{clubData.club_name}</CardTitle>
              {clubData.assoc_name && (
                <p className="text-muted-foreground mt-1">{clubData.assoc_name}</p>
              )}
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-semibold text-sm">
                {clubData.total_players} {clubData.total_players === 1 ? 'player' : 'players'}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {clubData.players.length === 0 ? (
            <div className="text-muted-foreground text-center py-12">
              <svg className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>No players found for this club</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-secondary/50">
                    <SortableHeader field="name" className="text-left">Name</SortableHeader>
                    <SortableHeader field="standard" className="text-center">Standard</SortableHeader>
                    <SortableHeader field="rapid" className="text-center">Rapid</SortableHeader>
                    <SortableHeader field="blitz" className="text-center">Blitz</SortableHeader>
                    <SortableHeader field="lastGame" className="text-center">Last Game</SortableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedPlayers.map((player) => (
                    <tr 
                      key={player.ECF_code} 
                      className="table-row-hover"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/player/${player.ECF_code}`}
                          className="link-primary font-medium"
                        >
                          {player.full_name}
                        </Link>
                        <span className="text-muted-foreground text-xs ml-2 font-mono-display">
                          {player.ECF_code}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        {player.ratings.standard && player.ratings.standard > 0 ? (
                          <span className="font-semibold font-mono-display">{player.ratings.standard}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {player.ratings.rapid && player.ratings.rapid > 0 ? (
                          <span className="font-semibold font-mono-display">{player.ratings.rapid}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {player.ratings.blitz && player.ratings.blitz > 0 ? (
                          <span className="font-semibold font-mono-display">{player.ratings.blitz}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td className="text-center py-3 px-4 text-muted-foreground text-sm font-mono-display">
                        {player.date_last_game || <span className="text-muted-foreground/50">—</span>}
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
