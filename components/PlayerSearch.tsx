'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

interface Player {
  full_name: string
  ECF_code: string
  club_name: string
}

export default function PlayerSearch() {
  const [value, setValue] = useState("")
  const [players, setPlayers] = useState<Player[]>([])
  const router = useRouter()

  useEffect(() => {
    if (value.length >= 3) {
      fetch(`/api/player-search?name=${value}`)
        .then(res => res.json())
        .then(data => setPlayers(data.players || []))
    } else {
      setPlayers([])
    }
  }, [value])

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
                    onSelect={() => {
                      setValue(player.full_name)
                      router.push(`/?playerCode=${player.ECF_code}`)
                    }}
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

