'use client'

import { useSearchParams } from 'next/navigation'
import PlayerSearch from './PlayerSearch'

export default function PlayerSearchWrapper() {
  const searchParams = useSearchParams()
  const playerCode = searchParams.get('playerCode')
  
  return <PlayerSearch initialPlayerCode={playerCode} />
}

