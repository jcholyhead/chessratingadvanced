import { Suspense } from 'react'
import ChessResultsTable from '@/components/ChessResultsTable'
import PlayerSearch from '@/components/PlayerSearch'

export default function Home() {
  return (
    <div className="container mx-auto px-4">
      <h2 className="text-xl font-semibold mb-4">Enhanced Analytics for English Chess Federation Ratings</h2>
      <div className="mb-4">
        <PlayerSearch />
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <ChessResultsTable />
      </Suspense>
    </div>
  )
}

