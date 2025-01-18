'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

/**
 * Represents a player in the ECF database
 */
interface Player {
  full_name: string
  ECF_code: string
  club_name: string
}

/**
 * Props for the PlayerSearch component
 */
interface PlayerSearchProps {
  initialPlayerCode: string | null
}

/**
 * PlayerSearch Component
 * 
 * This component provides a search functionality for ECF-rated players.
 * It includes an autocomplete feature that shows matching players as the user types.
 * 
 * @param initialPlayerCode - The initial player code to populate the search (if any)
 * 
 * @returns A search input with autocomplete functionality for finding chess players
 */
export default function PlayerSearch({ initialPlayerCode }: PlayerSearchProps) {
  const [value, setValue] = useState("")
  const [players, setPlayers] = useState<Player[]>([])
  const router = useRouter()

  /**
   * Fetches players based on the search value
   * @param searchValue - The string to search for in player names
   */
  const fetchPlayers = useCallback(async (searchValue: string) => {
    if (searchValue.length >= 3) {
      try {
        const res = await fetch(`/api/player-search?name=${searchValue}`)
        const data = await res.json()
        setPlayers(data.players || [])
      } catch (error) {
        console.error('Error fetching players:', error)
        setPlayers([])
      }
    } else {
      setPlayers([])
    }
  }, [])

  // Debounce the search input to reduce API calls
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchPlayers(value)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [value, fetchPlayers])

  // Reset the search when the initial player code changes
  useEffect(() => {
    setValue("")
    setPlayers([])
  }, [initialPlayerCode])

  /**
   * Sorts players by surname, then forename
   */
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const [aSurname, aForename] = a.full_name.split(',').map(s => s.trim())
      const [bSurname, bForename] = b.full_name.split(',').map(s => s.trim())
      if (aSurname === bSurname) {
        return aForename.localeCompare(bForename)
      }
      return aSurname.localeCompare(bSurname)
    })
  }, [players])

  /**
   * Handles the selection of a player from the search results
   * @param playerCode - The ECF code of the selected player
   */
  const handleSelect = useCallback((playerCode: string) => {
    setValue("")
    setPlayers([])
    router.push(`/?playerCode=${playerCode}`)
  }, [router])

  return (
    <div className="relative">
      <Input
        placeholder="Search for a player..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full"
      />
      {sortedPlayers.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
          <Command>
            <CommandList>
              <CommandEmpty>No players found.</CommandEmpty>
              <CommandGroup>
                {sortedPlayers.map((player) => (
                  <CommandItem
                    key={player.ECF_code}
                    onSelect={() => handleSelect(player.ECF_code)}
                  >
                    <span>{player.full_name}</span>
                    <span className="ml-2 text-sm text-muted-foreground">({player.club_name})</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}

