import { MongoClient, Db, Collection } from 'mongodb'

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const DATABASE_NAME = process.env.MONGODB_DB || 'chess_ratings_analytics'

// Global variables for connection pooling
let client: MongoClient | null = null
let db: Db | null = null

/**
 * Get MongoDB client with connection pooling
 * Reuses existing connection if available
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2,  // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // How long to try to connect before timing out
      socketTimeoutMS: 45000, // How long to wait for a response from the server
    })
    
    await client.connect()
    console.log('Connected to MongoDB')
  }
  
  return client
}

/**
 * Get MongoDB database instance
 * Reuses existing connection if available
 */
export async function getDatabase(): Promise<Db> {
  if (!db) {
    const mongoClient = await getMongoClient()
    db = mongoClient.db(DATABASE_NAME)
  }
  
  return db
}

/**
 * Get the players collection with proper typing
 */
export async function getPlayersCollection(): Promise<Collection<PlayerDocument>> {
  const database = await getDatabase()
  return database.collection<PlayerDocument>('players')
}

/**
 * Close MongoDB connection
 * Should be called when the application shuts down
 */
export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
    console.log('MongoDB connection closed')
  }
}

/**
 * Enhanced Player Document interface with sync tracking fields
 */
export interface PlayerDocument {
  _id?: string
  ECF_code: string
  FIDE_no?: string
  category: string
  club_code?: string
  club_name?: string
  clubs?: Array<{
    club_code: string
    club_name: string
  }>
  date_last_game?: string
  due_date?: string
  flag?: string
  full_name: string
  games: {
    Standard?: GameRecord[]
    Rapid?: GameRecord[]
    Blitz?: GameRecord[]
  }
  gender?: string
  max_processing_time_daily?: string
  member_no?: string
  nation?: string
  nation2?: string
  official_ratings: {
    Standard?: {
      rating: number
      category: string
    }
    Rapid?: {
      rating: number
      category: string
    }
    Blitz?: {
      rating: number
      category: string
    }
  }
  processing_time?: string
  success?: boolean
  title?: string
  total_processing_time_today?: string
  rating_history?: {
    standard?: Record<string, { rating: number; category: string }>
    rapid?: Record<string, { rating: number; category: string }>
    blitz?: Record<string, { rating: number; category: string }>
    standard_online?: Record<string, { rating: number; category: string }>
    rapid_online?: Record<string, { rating: number; category: string }>
    blitz_online?: Record<string, { rating: number; category: string }>
  }
  
  // New sync tracking fields
  last_ecf_sync_date?: Date
  sync_in_progress?: boolean
  sync_error_count?: number
  last_sync_error?: string
  total_games_count?: number
}

/**
 * Game Record interface
 */
export interface GameRecord {
  game_date: string
  colour: string
  score: number | string
  opponent_name: string
  opponent_no: number
  opponent_rating: number | string
  increment: number | string
  player_rating: number | string
  club_code: string
  event_code: string
  org_name: string | null
  event_name: string
  section_title: string
}

/**
 * Initialize database indexes for optimal performance
 * Should be called during application startup
 */
export async function initializeIndexes(): Promise<void> {
  try {
    const collection = await getPlayersCollection()
    
    // Create indexes for performance
    await Promise.all([
      // Text search for player names
      collection.createIndex(
        { full_name: 'text' },
        { 
          name: 'full_name_text',
          background: true 
        }
      ),
      
      // Fast lookups by ECF code (unique)
      collection.createIndex(
        { ECF_code: 1 },
        { 
          name: 'ecf_code_unique',
          unique: true,
          background: true 
        }
      ),
      
      // Club-based queries
      collection.createIndex(
        { club_code: 1, club_name: 1 },
        { 
          name: 'club_queries',
          background: true 
        }
      ),
      
      // Sync management indexes
      collection.createIndex(
        { last_ecf_sync_date: 1 },
        { 
          name: 'sync_date_tracking',
          background: true 
        }
      ),
      
      collection.createIndex(
        { sync_in_progress: 1 },
        { 
          name: 'sync_status_tracking',
          background: true 
        }
      ),
      
      // Game date indexes for sorting recent games
      collection.createIndex(
        { 'games.Standard.game_date': 1 },
        { 
          name: 'standard_games_date',
          background: true,
          sparse: true 
        }
      ),
      
      collection.createIndex(
        { 'games.Rapid.game_date': 1 },
        { 
          name: 'rapid_games_date',
          background: true,
          sparse: true 
        }
      ),
      
      collection.createIndex(
        { 'games.Blitz.game_date': 1 },
        { 
          name: 'blitz_games_date',
          background: true,
          sparse: true 
        }
      ),
      
      // Date of last game for freshness queries
      collection.createIndex(
        { date_last_game: 1 },
        { 
          name: 'last_game_date',
          background: true 
        }
      )
    ])
    
    console.log('MongoDB indexes created successfully')
  } catch (error) {
    console.error('Error creating MongoDB indexes:', error)
    throw error
  }
}

/**
 * Health check for MongoDB connection
 */
export async function checkMongoHealth(): Promise<boolean> {
  try {
    const database = await getDatabase()
    await database.admin().ping()
    return true
  } catch (error) {
    console.error('MongoDB health check failed:', error)
    return false
  }
} 