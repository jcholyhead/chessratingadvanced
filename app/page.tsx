import { Suspense } from "react"
import PlayerSearchWrapper from "@/components/PlayerSearchWrapper"
import ChessResultsTable from "@/components/ChessResultsTable"

export default function Home() {
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
          <ChessResultsTable initialPlayerCode={null} />
        </Suspense>
      </div>
    </div>
  )
}
