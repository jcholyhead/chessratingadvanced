import { getPlayersCollection, PlayerDocument, GameRecord } from './mongodb'
import { playerSyncService } from './player-sync'

/**
 * Player data service for MongoDB operations
 */
export class PlayerDataService {
  
  /**
   * Get player data from MongoDB with synchronous sync
   * Handles both full ECF codes (e.g., "304459C") and numeric-only codes (e.g., "304459")
   */
  async getPlayerData(playerId: string, performSync: boolean = true): Promise<PlayerDocument | null> {
    try {
      const collection = await getPlayersCollection()
      
      // First, try to find the player - handle numeric-only codes
      let player = await collection.findOne({ ECF_code: playerId })
      
      // If not found and the ID is numeric only, try to find by prefix match
      if (!player && /^[0-9]+$/.test(playerId)) {
        // Look for ECF code that starts with the numeric part followed by a letter
        player = await collection.findOne({ 
          ECF_code: { $regex: `^${playerId}[A-Z]$`, $options: 'i' } 
        })
        
        if (player) {
          console.log(`Resolved numeric code ${playerId} to full ECF code ${player.ECF_code}`)
          playerId = player.ECF_code // Use the full code for sync
        }
      }
      
      // If sync is requested and we found or will create the player, perform sync
      if (performSync && (player || /^[0-9]+[A-Z]?$/i.test(playerId))) {
        console.log(`Performing synchronous sync for player ${playerId}`)
        const syncPerformed = await playerSyncService.syncPlayerIfNeeded(playerId)
        console.log(`Sync result for ${playerId}: ${syncPerformed ? 'Updated' : 'No new games'}`)
        
        // Re-fetch player data after sync (in case it was created)
        if (!player) {
          player = await collection.findOne({ ECF_code: playerId })
          // Also check for newly created player with the numeric prefix
          if (!player && /^[0-9]+$/.test(playerId)) {
            player = await collection.findOne({ 
              ECF_code: { $regex: `^${playerId}[A-Z]$`, $options: 'i' } 
            })
          }
        } else {
          // Refresh the data after sync
          player = await collection.findOne({ ECF_code: player.ECF_code })
        }
      }
      
      return player
    } catch (error) {
      console.error(`Failed to get player data for ${playerId}:`, error)
      return null
    }
  }

  /**
   * Search for players by name or ECF code
   */
  async searchPlayers(query: string, limit: number = 20): Promise<PlayerDocument[]> {
    try {
      const collection = await getPlayersCollection()
      
      // Create search conditions
      const searchConditions = []
      
      // If query looks like ECF code (numbers with optional letter)
      if (/^[0-9]+[A-Z]?$/i.test(query)) {
        searchConditions.push({ ECF_code: { $regex: `^${query}`, $options: 'i' } })
      }
      
      // Always search by name (case insensitive)
      searchConditions.push({ 
        $or: [
          { full_name: { $regex: query, $options: 'i' } },
          { 'name.first': { $regex: query, $options: 'i' } },
          { 'name.last': { $regex: query, $options: 'i' } }
        ]
      })

      const players = await collection
        .find(
          { $or: searchConditions },
          { 
            projection: {
              ECF_code: 1,
              full_name: 1,
              name: 1,
              category: 1,
              club_name: 1,
              club_code: 1,
              clubs: 1,
              official_ratings: 1,
              date_last_game: 1,
              total_games_count: 1,
              last_ecf_sync_date: 1
            }
          }
        )
        .limit(limit)
        .toArray()

      return players
    } catch (error) {
      console.error(`Failed to search players with query "${query}":`, error)
      return []
    }
  }

  /**
   * Get player games by type
   */
  async getPlayerGames(playerId: string, gameType: 'Standard' | 'Rapid' | 'Blitz'): Promise<GameRecord[]> {
    try {
      const collection = await getPlayersCollection()
      const player = await collection.findOne(
        { ECF_code: playerId },
        { projection: { [`games.${gameType}`]: 1 } }
      )

      return player?.games?.[gameType] || []
    } catch (error) {
      console.error(`Failed to get ${gameType} games for player ${playerId}:`, error)
      return []
    }
  }

  /**
   * Get all games for a player
   */
  async getAllPlayerGames(playerId: string): Promise<{
    Standard: GameRecord[]
    Rapid: GameRecord[]
    Blitz: GameRecord[]
  }> {
    try {
      const collection = await getPlayersCollection()
      const player = await collection.findOne(
        { ECF_code: playerId },
        { projection: { games: 1 } }
      )

      return {
        Standard: player?.games?.Standard || [],
        Rapid: player?.games?.Rapid || [],
        Blitz: player?.games?.Blitz || []
      }
    } catch (error) {
      console.error(`Failed to get all games for player ${playerId}:`, error)
      return {
        Standard: [],
        Rapid: [],
        Blitz: []
      }
    }
  }

  /**
   * Get player statistics
   */
  async getPlayerStats(playerId: string): Promise<{
    totalGames: number
    gamesByType: { Standard: number; Rapid: number; Blitz: number }
    lastGameDate: string | null
    winRate: number
    averageOpponentRating: number
  } | null> {
    try {
      const games = await this.getAllPlayerGames(playerId)
      
      const allGames = [
        ...games.Standard,
        ...games.Rapid,
        ...games.Blitz
      ]

      if (allGames.length === 0) {
        return null
      }

      // Calculate statistics
      const totalGames = allGames.length
      const wins = allGames.filter(game => game.score === '1' || game.score === 1).length
      const winRate = (wins / totalGames) * 100

      const opponentRatings = allGames
        .map(game => Number(game.opponent_rating))
        .filter(rating => !isNaN(rating) && rating > 0)
      
      const averageOpponentRating = opponentRatings.length > 0
        ? opponentRatings.reduce((sum, rating) => sum + rating, 0) / opponentRatings.length
        : 0

      // Find most recent game date
      const gameDates = allGames
        .map(game => game.game_date)
        .filter(date => date)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

      const lastGameDate = gameDates.length > 0 ? gameDates[0] : null

      return {
        totalGames,
        gamesByType: {
          Standard: games.Standard.length,
          Rapid: games.Rapid.length,
          Blitz: games.Blitz.length
        },
        lastGameDate,
        winRate: Math.round(winRate * 100) / 100,
        averageOpponentRating: Math.round(averageOpponentRating)
      }
    } catch (error) {
      console.error(`Failed to get player stats for ${playerId}:`, error)
      return null
    }
  }

  /**
   * Check if player exists in MongoDB
   */
  async playerExists(playerId: string): Promise<boolean> {
    try {
      const collection = await getPlayersCollection()
      const count = await collection.countDocuments({ ECF_code: playerId })
      return count > 0
    } catch (error) {
      console.error(`Failed to check if player ${playerId} exists:`, error)
      return false
    }
  }

  /**
   * Get recently synced players
   */
  async getRecentlySyncedPlayers(limit: number = 10): Promise<PlayerDocument[]> {
    try {
      const collection = await getPlayersCollection()
      return await collection
        .find(
          { last_ecf_sync_date: { $exists: true } },
          {
            projection: {
              ECF_code: 1,
              full_name: 1,
              last_ecf_sync_date: 1,
              total_games_count: 1,
              'ratings.Standard': 1
            }
          }
        )
        .sort({ last_ecf_sync_date: -1 })
        .limit(limit)
        .toArray()
    } catch (error) {
      console.error('Failed to get recently synced players:', error)
      return []
    }
  }

  /**
   * Get players that need sync (haven't been synced in 24+ hours)
   */
  async getPlayersNeedingSync(limit: number = 50): Promise<PlayerDocument[]> {
    try {
      const collection = await getPlayersCollection()
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      return await collection
        .find(
          {
            $or: [
              { last_ecf_sync_date: { $exists: false } },
              { last_ecf_sync_date: { $lt: twentyFourHoursAgo } }
            ],
            sync_in_progress: { $ne: true }
          },
          {
            projection: {
              ECF_code: 1,
              full_name: 1,
              last_ecf_sync_date: 1,
              sync_error_count: 1
            }
          }
        )
        .sort({ last_ecf_sync_date: 1 }) // Oldest first
        .limit(limit)
        .toArray()
    } catch (error) {
      console.error('Failed to get players needing sync:', error)
      return []
    }
  }
}

// Export singleton instance
export const playerDataService = new PlayerDataService() 