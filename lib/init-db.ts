#!/usr/bin/env tsx

import { initializeIndexes, checkMongoHealth, closeConnection } from './mongodb'

/**
 * Database initialization script
 * Run this to set up MongoDB indexes and verify connection
 */
async function initializeDatabase() {
  console.log('🚀 Starting database initialization...')
  
  try {
    // Check MongoDB connection
    console.log('📡 Checking MongoDB connection...')
    const isHealthy = await checkMongoHealth()
    
    if (!isHealthy) {
      throw new Error('MongoDB connection failed')
    }
    console.log('✅ MongoDB connection successful')
    
    // Initialize indexes
    console.log('📊 Creating database indexes...')
    await initializeIndexes()
    console.log('✅ Database indexes created successfully')
    
    console.log('🎉 Database initialization completed successfully!')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  } finally {
    // Close connection
    await closeConnection()
  }
}

// Run initialization if this script is executed directly
if (require.main === module) {
  initializeDatabase()
}

export { initializeDatabase } 