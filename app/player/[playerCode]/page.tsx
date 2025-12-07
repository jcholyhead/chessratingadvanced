import { Suspense } from "react"
import { redirect } from "next/navigation"
import PlayerSearchWrapper from "@/components/PlayerSearchWrapper"
import ChessResultsTable from "@/components/ChessResultsTable"
import { getPlayersCollection } from "@/lib/mongodb"

async function resolvePlayerCode(code: string): Promise<string | null> {
  // If code already has a letter, return as-is
  if (/[A-Z]$/i.test(code)) {
    return code
  }
  
  // If numeric-only, try to find the full code
  if (/^[0-9]+$/.test(code)) {
    try {
      const collection = await getPlayersCollection()
      const player = await collection.findOne(
        { ECF_code: { $regex: `^${code}[A-Z]$`, $options: 'i' } },
        { projection: { ECF_code: 1 } }
      )
      if (player) {
        return player.ECF_code
      }
    } catch (error) {
      console.error('Error resolving player code:', error)
    }
  }
  
  return null
}

export default async function PlayerPage({ params }: { params: { playerCode: string } }) {
  // Check if we need to redirect to the canonical URL
  const fullCode = await resolvePlayerCode(params.playerCode)
  
  if (fullCode && fullCode !== params.playerCode) {
    // Redirect to the canonical URL with the full ECF code
    redirect(`/player/${fullCode}`)
  }
  
  return (
    <div className="container mx-auto max-w-7xl">
      <header className="mb-8 animate-slide-up">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">
          Chess Rating Analytics
        </h1>
        <p className="text-lg text-muted-foreground">
          Enhanced analytics for English Chess Federation ratings
        </p>
      </header>
      
      <div className="mb-8 animate-slide-up stagger-1">
        <Suspense fallback={
          <div className="h-12 bg-secondary/50 rounded-lg animate-pulse" />
        }>
          <PlayerSearchWrapper />
        </Suspense>
      </div>
      
      <div className="animate-slide-up stagger-2">
        <Suspense fallback={
          <div className="space-y-4">
            <div className="h-64 bg-secondary/50 rounded-xl animate-pulse" />
            <div className="h-96 bg-secondary/50 rounded-xl animate-pulse" />
          </div>
        }>
          <ChessResultsTable initialPlayerCode={params.playerCode} />
        </Suspense>
      </div>
    </div>
  )
}
