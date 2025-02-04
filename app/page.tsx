import { Suspense } from "react"
// import PlayerSearchWrapper from "@/components/PlayerSearchWrapper"
// import ChessResultsTable from "@/components/ChessResultsTable"

export default function Home() {
  return (
    <div className="container mx-auto">
      <h2 className="text-xl font-semibold mb-4">Enhanced Analytics for English Chess Federation Ratings</h2>
      <div className="mb-4">
        <Suspense fallback={<div>Loading player search...</div>}>
        <h1>Under Maintenance Back Soon!</h1>

        </Suspense>
      </div>
      <Suspense fallback={<div>Please search for a player to view their results.</div>}>
      <h1>Under Maintenance Back Soon!</h1>
      </Suspense>
    </div>
  )
}

