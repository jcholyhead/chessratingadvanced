import ChessResultsTable from '@/components/ChessResultsTable'
import PlayerSearch from '@/components/PlayerSearch'

export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Chess Results Dashboard</h1>
      <div className="mb-4">
        <PlayerSearch />
      </div>
      <ChessResultsTable />
    </div>
  )
}

