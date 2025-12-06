import { getPlayersCollection, PlayerDocument, GameRecord } from './mongodb'
import { notifyPlayerSyncStarted, notifyPlayerSyncComplete, notifyPlayerSyncError } from './realtime'

/**
 * Game type mapping for ECF API
 */
const GAME_TYPE_MAP = {
  'Standard': 'S',
  'Rapid': 'R',
  'Blitz': 'B'
} as const

type GameType = keyof typeof GAME_TYPE_MAP

/**
 * ECF API response interfaces
 */
interface ECFGameResponse {
  games: GameRecord[]  // Games are returned directly as an array, not nested by type
  total_games?: number
  success?: boolean
  processing_time?: string
  total_processing_time_today?: string
  max_processing_time_daily?: string
}

/**
 * Player sync service for ECF API → MongoDB synchronization
 */
export class PlayerSyncService {
  private readonly ECF_BASE_URL = 'https://rating.englishchess.org.uk/v2/new/api.php'
  private readonly SYNC_COOLDOWN_HOURS = 24
  private readonly INITIAL_GAME_LIMIT = 100
  private readonly EXTENDED_GAME_LIMIT = 1000
  private readonly MAX_GAME_LIMIT = 2000

  /**
   * Check if player needs sync based on last sync date
   */
  private needsSync(player: PlayerDocument): boolean {
    if (!player.last_ecf_sync_date) {
      return true // Never synced before
    }

    const now = new Date()
    const lastSync = new Date(player.last_ecf_sync_date)
    const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

    return hoursSinceSync >= this.SYNC_COOLDOWN_HOURS
  }

  /**
   * Mark player sync as started
   */
  private async markSyncStarted(playerId: string): Promise<void> {
    try {
      const collection = await getPlayersCollection()
      await collection.updateOne(
        { ECF_code: playerId },
        { 
          $set: { 
            sync_in_progress: true
          },
          $unset: {
            last_sync_error: 1
          }
        }
      )
    } catch (error) {
      console.error('Failed to mark sync as started:', error)
    }
  }

  /**
   * Mark player sync as completed
   */
  private async markSyncCompleted(playerId: string, newGamesAdded: number = 0): Promise<void> {
    try {
      const collection = await getPlayersCollection()
      await collection.updateOne(
        { ECF_code: playerId },
        { 
          $set: { 
            sync_in_progress: false,
            last_ecf_sync_date: new Date(),
            sync_error_count: 0
          },
          $unset: {
            last_sync_error: 1
          },
          $inc: {
            total_games_count: newGamesAdded
          }
        }
      )
    } catch (error) {
      console.error('Failed to mark sync as completed:', error)
    }
  }

  /**
   * Mark player sync as failed
   */
  private async markSyncFailed(playerId: string, error: string): Promise<void> {
    try {
      const collection = await getPlayersCollection()
      await collection.updateOne(
        { ECF_code: playerId },
        { 
          $set: { 
            sync_in_progress: false,
            last_sync_error: error 
          },
          $inc: {
            sync_error_count: 1
          }
        }
      )
    } catch (error) {
      console.error('Failed to mark sync as failed:', error)
    }
  }

  /**
   * Fetch games from ECF API with limit
   */
  private async fetchECFGames(playerId: string, gameType: GameType, limit: number): Promise<GameRecord[]> {
    const gameTypeCode = GAME_TYPE_MAP[gameType]
    const url = `${this.ECF_BASE_URL}?v2/games/${gameTypeCode}/player/${playerId}/limit/${limit}`

    try {
      console.log(`Fetching ${limit} ${gameType} games for player ${playerId}`)
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ChessRatingAnalytics/1.0',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      if (!response.ok) {
        throw new Error(`ECF API responded with status ${response.status}`)
      }

      const data: ECFGameResponse = await response.json()
      
      if (!data.success) {
        throw new Error('ECF API returned success: false')
      }

      // ECF API returns games directly as an array, not nested by game type
      return data.games || []
    } catch (error) {
      console.error(`Failed to fetch ${gameType} games for player ${playerId}:`, error)
      throw error
    }
  }

  /**
   * Check if a game is a duplicate using stable identity fields only.
   * 
   * We intentionally EXCLUDE from comparison:
   * - opponent_rating: Changes when ECF recalculates ratings
   * - player_rating: Changes when ECF recalculates ratings  
   * - opponent_name: Could change (marriage, name corrections)
   * 
   * The core identity of a game is: date + opponent + event + colour + score
   */
  private isDuplicateGame(newGame: GameRecord, existingGames: GameRecord[]): boolean {
    return existingGames.some(existing => 
      existing.game_date === newGame.game_date &&
      existing.colour?.toLowerCase() === newGame.colour?.toLowerCase() &&
      existing.opponent_no === newGame.opponent_no &&
      existing.event_code === newGame.event_code &&
      String(existing.score) === String(newGame.score)
    )
  }

  /**
   * Find new games that don't exist in MongoDB
   */
  private findNewGames(ecfGames: GameRecord[], mongoGames: GameRecord[]): GameRecord[] {
    return ecfGames.filter(ecfGame => !this.isDuplicateGame(ecfGame, mongoGames))
  }

  /**
   * Sync games for a specific game type
   */
  private async syncGameType(playerId: string, gameType: GameType, existingGames: GameRecord[]): Promise<GameRecord[]> {
    let newGames: GameRecord[] = []

    try {
      // Try with initial limit first
      console.log(`Fetching first ${this.INITIAL_GAME_LIMIT} ${gameType} games for player ${playerId}`)
      const initialGames = await this.fetchECFGames(playerId, gameType, this.INITIAL_GAME_LIMIT)
      newGames = this.findNewGames(initialGames, existingGames)
      
      console.log(`Found ${newGames.length} new games in first ${this.INITIAL_GAME_LIMIT}`)

      // If we found no new games, try with extended limit to catch any missing games
      if (newGames.length === 0) {
        console.log(`No new games in first ${this.INITIAL_GAME_LIMIT}, trying ${this.EXTENDED_GAME_LIMIT}`)
        const extendedGames = await this.fetchECFGames(playerId, gameType, this.EXTENDED_GAME_LIMIT)
        newGames = this.findNewGames(extendedGames, existingGames)
        
        console.log(`Found ${newGames.length} new games in first ${this.EXTENDED_GAME_LIMIT}`)
        
        // If still no new games and we got the full limit, try maximum limit
        if (newGames.length === 0 && extendedGames.length === this.EXTENDED_GAME_LIMIT) {
          console.log(`No new games in first ${this.EXTENDED_GAME_LIMIT}, trying maximum ${this.MAX_GAME_LIMIT}`)
          const maxGames = await this.fetchECFGames(playerId, gameType, this.MAX_GAME_LIMIT)
          newGames = this.findNewGames(maxGames, existingGames)
          
          console.log(`Found ${newGames.length} new games in first ${this.MAX_GAME_LIMIT}`)
        }
      }

      if (newGames.length > 0) {
        console.log(`Will add ${newGames.length} new ${gameType} games for player ${playerId}`)
        // Sort new games by date (most recent first) to ensure proper date_last_game
        newGames.sort((a, b) => new Date(b.game_date).getTime() - new Date(a.game_date).getTime())
      } else {
        console.log(`No new ${gameType} games found for player ${playerId}`)
      }

      return newGames
    } catch (error) {
      console.error(`Failed to sync ${gameType} games for player ${playerId}:`, error)
      return []
    }
  }

  /**
   * Add new games to MongoDB player document
   */
  private async addGamesToMongo(playerId: string, gameType: GameType, newGames: GameRecord[]): Promise<void> {
    if (newGames.length === 0) return

    try {
      const collection = await getPlayersCollection()
      const updateField = `games.${gameType}`
      
      await collection.updateOne(
        { ECF_code: playerId },
        { 
          $push: { 
            [updateField]: { $each: newGames }
          },
          $set: {
            date_last_game: newGames[0]?.game_date || new Date().toISOString().split('T')[0]
          }
        }
      )

      console.log(`Added ${newGames.length} new ${gameType} games for player ${playerId}`)
    } catch (error) {
      console.error(`Failed to add ${gameType} games to MongoDB:`, error)
      throw error
    }
  }

  /**
   * Main sync function - check if player needs sync and perform if necessary
   */
  async syncPlayerIfNeeded(playerId: string): Promise<boolean> {
    try {
      const collection = await getPlayersCollection()
      const player = await collection.findOne({ ECF_code: playerId })

      if (!player) {
        console.log(`Player ${playerId} not found in MongoDB - skipping sync`)
        return false
      }

      // Check if sync is needed
      if (!this.needsSync(player)) {
        console.log(`Player ${playerId} was synced recently - skipping`)
        return false
      }

      // Check if sync is already in progress
      if (player.sync_in_progress) {
        console.log(`Player ${playerId} sync already in progress - skipping`)
        return false
      }

      console.log(`Starting sync for player ${playerId}`)
      
      // Mark sync as started
      await this.markSyncStarted(playerId)
      notifyPlayerSyncStarted(playerId)

      let totalNewGames = 0
      const gameTypes: GameType[] = ['Standard', 'Rapid', 'Blitz']

      // Sync each game type
      for (const gameType of gameTypes) {
        try {
          const existingGames = player.games[gameType] || []
          const newGames = await this.syncGameType(playerId, gameType, existingGames)
          
          if (newGames.length > 0) {
            await this.addGamesToMongo(playerId, gameType, newGames)
            totalNewGames += newGames.length
            
            // Notify real-time clients
            notifyPlayerSyncComplete(playerId, newGames.length, gameType, newGames)
          }
        } catch (error) {
          console.error(`Failed to sync ${gameType} games:`, error)
          // Continue with other game types
        }
      }

      // Mark sync as completed
      await this.markSyncCompleted(playerId, totalNewGames)
      
      console.log(`Sync completed for player ${playerId} - added ${totalNewGames} new games`)
      return totalNewGames > 0

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`Player sync failed for ${playerId}:`, error)
      
      await this.markSyncFailed(playerId, errorMessage)
      notifyPlayerSyncError(playerId, errorMessage)
      
      return false
    }
  }

  /**
   * Force sync for a player (ignores cooldown)
   */
  async forceSyncPlayer(playerId: string): Promise<boolean> {
    try {
      const collection = await getPlayersCollection()
      
      // Reset sync date to force sync
      await collection.updateOne(
        { ECF_code: playerId },
        { 
          $unset: { last_ecf_sync_date: 1 },
          $set: { sync_in_progress: false }
        }
      )

      return await this.syncPlayerIfNeeded(playerId)
    } catch (error) {
      console.error(`Force sync failed for player ${playerId}:`, error)
      return false
    }
  }
}

// Export singleton instance
export const playerSyncService = new PlayerSyncService() 