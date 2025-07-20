// src/config/testDatabase.ts - v1.0.0
// Test database configuration for integration tests
// Provides in-memory database setup for testing without external dependencies

import { PrismaClient } from '@prisma/client'

// Interface for test database configuration
interface TestDatabaseConfig {
  client: PrismaClient | null
  isConnected: boolean
  connectionString: string
}

// Test database configuration object
const testDbConfig: TestDatabaseConfig = {
  client: null,
  isConnected: false,
  connectionString: process.env.TEST_DATABASE_URL || 'file:./test.db'
}

// Initialize test database client
export const initializeTestDatabase = async (): Promise<PrismaClient> => {
  try {
    // Create new Prisma client for testing
    const client = new PrismaClient({
      datasources: {
        db: {
          url: testDbConfig.connectionString
        }
      },
      log: process.env.NODE_ENV === 'test' ? [] : ['error']
    })

    // Connect to database
    await client.$connect()
    
    testDbConfig.client = client
    testDbConfig.isConnected = true
    
    console.log('✅ Test database connected successfully')
    return client
    
  } catch (error) {
    console.error('❌ Test database connection failed:', error)
    throw new Error(`Failed to initialize test database: ${error}`)
  }
}

// Clean up test database
export const cleanupTestDatabase = async (): Promise<void> => {
  if (testDbConfig.client && testDbConfig.isConnected) {
    try {
      // Clean up all tables in reverse dependency order
      await testDbConfig.client.follow.deleteMany({})
      await testDbConfig.client.block.deleteMany({})
      await testDbConfig.client.report.deleteMany({})
      await testDbConfig.client.post.deleteMany({})
      await testDbConfig.client.user.deleteMany({})
      
      console.log('🧹 Test database cleaned up')
    } catch (error) {
      console.error('❌ Test database cleanup failed:', error)
    }
  }
}

// Disconnect from test database
export const disconnectTestDatabase = async (): Promise<void> => {
  if (testDbConfig.client && testDbConfig.isConnected) {
    try {
      await testDbConfig.client.$disconnect()
      testDbConfig.client = null
      testDbConfig.isConnected = false
      console.log('🔌 Test database disconnected')
    } catch (error) {
      console.error('❌ Test database disconnect failed:', error)
    }
  }
}

// Get current test database client
export const getTestDatabaseClient = (): PrismaClient => {
  if (!testDbConfig.client || !testDbConfig.isConnected) {
    throw new Error('Test database not initialized. Call initializeTestDatabase() first.')
  }
  return testDbConfig.client
}

// Check if test database is connected
export const isTestDatabaseConnected = (): boolean => {
  return testDbConfig.isConnected && testDbConfig.client !== null
}

// Create test database with sample data
export const seedTestDatabase = async (client: PrismaClient): Promise<void> => {
  try {
    // Create test users
    const testUser1 = await client.user.create({
      data: {
        username: 'testuser1',
        email: 'test1@example.com',
        passwordHash: 'hashedpassword123',
        displayName: 'Test User 1'
      }
    })

    const testUser2 = await client.user.create({
      data: {
        username: 'testuser2', 
        email: 'test2@example.com',
        passwordHash: 'hashedpassword456',
        displayName: 'Test User 2'
      }
    })

    // Create test posts
    await client.post.create({
      data: {
        content: 'Test post content',
        userId: testUser1.id,
        status: 'published'
      }
    })

    console.log('🌱 Test database seeded with sample data')
  } catch (error) {
    console.error('❌ Test database seeding failed:', error)
    throw error
  }
}

// Reset test database to clean state
export const resetTestDatabase = async (): Promise<void> => {
  await cleanupTestDatabase()
  
  if (testDbConfig.client) {
    await seedTestDatabase(testDbConfig.client)
  }
}

// Test database health check
export const checkTestDatabaseHealth = async (): Promise<boolean> => {
  if (!testDbConfig.client) {
    return false
  }

  try {
    await testDbConfig.client.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error('❌ Test database health check failed:', error)
    return false
  }
}

// Export configuration for use in tests
export default testDbConfig

// src/config/testDatabase.ts - v1.0.0
// Initial version: Test database configuration with connection management