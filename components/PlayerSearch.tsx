"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Search, User } from "lucide-react"

interface Player {
  full_name: string
  ECF_code: string
  club_name?: string
  clubs?: Array<{
    club_code: string
    club_name: string
  }>
}

interface PlayerSearchProps {
  initialPlayerCode: string | null
}

export default function PlayerSearch({ initialPlayerCode }: PlayerSearchProps) {
  const [value, setValue] = useState("")
  const [players, setPlayers] = useState<Player[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const router = useRouter()

  const fetchPlayers = useCallback(async (searchValue: string) => {
    if (searchValue.length >= 3) {
      try {
        const res = await fetch(`/api/player-search?name=${searchValue}`)
        const data = await res.json()
        setPlayers(data.players || [])
      } catch (error) {
        console.error("Error fetching players:", error)
        setPlayers([])
      }
    } else {
      setPlayers([])
    }
  }, [])

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchPlayers(value)
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [value, fetchPlayers])

  useEffect(() => {
    setValue("")
    setPlayers([])
  }, [initialPlayerCode])

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const [aSurname, aForename] = a.full_name.split(",").map((s) => s.trim())
      const [bSurname, bForename] = b.full_name.split(",").map((s) => s.trim())
      if (aSurname === bSurname) {
        return aForename.localeCompare(bForename)
      }
      return aSurname.localeCompare(bSurname)
    })
  }, [players])

  const handleSelect = useCallback(
    (playerCode: string) => {
      setValue("")
      setPlayers([])
      setIsFocused(false)
      router.push(`/player/${playerCode}`)
    },
    [router],
  )

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search by name or ECF code..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          className="w-full pl-10 h-12 bg-card border-0 shadow-sm text-base placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/20 transition-shadow"
        />
      </div>
      {sortedPlayers.length > 0 && isFocused && (
        <div className="absolute z-50 w-full mt-2 bg-card rounded-xl shadow-lg border overflow-hidden animate-fade-in">
          <Command>
            <CommandList className="max-h-80">
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                No players found
              </CommandEmpty>
              <CommandGroup>
                {sortedPlayers.map((player) => {
                  // Get club name - use club_name if available, otherwise use first club from clubs array
                  const clubName = player.club_name || 
                    (player.clubs && player.clubs.length > 0 ? player.clubs[0].club_name : '')
                  
                  return (
                    <CommandItem 
                      key={player.ECF_code} 
                      onSelect={() => handleSelect(player.ECF_code)}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-secondary/70 transition-colors"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground">{player.full_name}</div>
                        {clubName && (
                          <div className="text-sm text-muted-foreground truncate">{clubName}</div>
                        )}
                      </div>
                      <span className="text-xs font-mono-display text-muted-foreground bg-secondary px-2 py-1 rounded">
                        {player.ECF_code}
                      </span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}
