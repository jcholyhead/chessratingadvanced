import { playerDataService } from '../lib/player-data'
import { closeConnection } from '../lib/mongodb'

async function examinePlayerData() {
  console.log('🔍 Examining Player Data Structure...\n')

  try {
    // Get a player and examine their full data structure
    const players = await playerDataService.searchPlayers('Smith', 1)
    
    if (players.length > 0) {
      const player = players[0]
      console.log(`📋 Examining player: ${player.full_name} (${player.ECF_code})`)
      console.log('Raw player data:')
      console.log(JSON.stringify(player, null, 2))
    } else {
      console.log('❌ No players found')
    }

  } catch (error) {
    console.error('💥 Failed to examine player data:', error)
  } finally {
    await closeConnection()
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  examinePlayerData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

export { examinePlayerData } 