"use client"

import { useParams } from "next/navigation"
import PlayerSearch from "./PlayerSearch"

export default function PlayerSearchWrapper() {
  const params = useParams()
  const playerCode = params.playerCode as string | undefined

  return <PlayerSearch initialPlayerCode={playerCode || null} />
}

