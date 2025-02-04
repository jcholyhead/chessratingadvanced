import { Suspense } from "react"
import PlayerSearchWrapper from "@/components/PlayerSearchWrapper"
import ChessResultsTable from "@/components/ChessResultsTable"

export default function Home() {
  return (
    <div className="container mx-auto">
      <h1>Under Maintenance, we'll be back as soon as possible</h1>
      {/* <h2 className="text-xl font-semibold mb-4">Enhanced Analytics for English Chess Federation Ratings</h2>
      <div className="mb-4">
        <Suspense fallback={<div>Loading player search...</div>}>
          <PlayerSearchWrapper />
        </Suspense>
      </div>
      <Suspense fallback={<div>Please search for a player to view their results.</div>}>
        <ChessResultsTable initialPlayerCode={null} />
      </Suspense> */}
    </div>
  )
}

