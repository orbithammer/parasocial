// backend/src/__tests__/helpers/databaseSetup.ts
// Version: 2.1.0
// Fixed Prisma query syntax and restored testEnvironment.ts usage

import { PrismaClient } from '@prisma/client'
import { 
  getTestEnvironmentConfig,
  validateTestEnvironment, 
  setupTestEnvironmentVariables
} from '../../config/testEnvironment'

/**
 * Interface for database setup options
 * Allows customization of test database behavior
 */
interface DatabaseSetupOptions {
  skipValidation?: boolean
  enableLogging?: boolean
  connectionTimeout?: number
  maxRetries?: number
}

/**
 * Interface for test database instance management
 * Provides consistent database setup across integration tests
 */
interface TestDatabaseInstance {
  prisma: PrismaClient
  isConnected: boolean
  connectionUrl: string
  cleanup: () => Promise<void>
}

/**
 * Global test database instance to prevent multiple connections
 * Singleton pattern for shared database instance across tests
 */
let globalTestDatabase: TestDatabaseInstance | null = null

/**
 * Creates and configures a PrismaClient for integration tests
 * Uses the testDatabase configuration to ensure proper PostgreSQL credentials
 * @param options Configuration options for database setup
 * @returns Configured PrismaClient instance with proper test database URL
 */
export async function createTestDatabaseClient(
  options: DatabaseSetupOptions = {}
): Promise<PrismaClient> {
  // Set up environment variables with proper test configuration
  setupTestEnvironmentVariables()
  
  // Validate test environment unless explicitly skipped
  if (!options.skipValidation) {
    try {
      await validateTestEnvironment()
    } catch (error) {
      console.error('❌ Test environment validation failed:', error instanceof Error ? error.message : 'Unknown error')
      console.error('💡 Ensure your test database is running and accessible')
      throw error
    }
  }
  
  // Get the validated test environment configuration
  const config = getTestEnvironmentConfig()
  
  // Create PrismaClient with test-specific configuration
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: config.database.url
      }
    },
    log: options.enableLogging ? ['query', 'info', 'warn', 'error'] : ['error']
  })
  
  console.log(`🔗 Connecting to test database: ${config.database.host}:${config.database.port}/${config.database.database}`)
  console.log(`👤 Using credentials: ${config.database.username}`)
  
  // Attempt connection with retry logic
  const maxRetries = options.maxRetries || 3
  const timeout = options.connectionTimeout || config.database.connectionTimeout
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Set a connection timeout
      const connectionPromise = prisma.$connect()
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), timeout)
      })
      
      await Promise.race([connectionPromise, timeoutPromise])
      
      // Test the connection with a simple query
      await prisma.$queryRaw`SELECT 1 as connection_test`
      
      console.log(`✅ Test database connected successfully (attempt ${attempt})`)
      return prisma
      
    } catch (error) {
      console.error(`❌ Connection attempt ${attempt} failed:`, error instanceof Error ? error.message : 'Unknown error')
      
      if (attempt === maxRetries) {
        // Final attempt failed - provide detailed troubleshooting
        console.error('')
        console.error('🚨 All connection attempts failed!')
        console.error('🔧 Troubleshooting checklist:')
        console.error('   • Ensure PostgreSQL is running')
        console.error('   • Check database exists and user has permissions')
        console.error('   • Verify connection string format')
        console.error('')
        console.error(`🌐 Configuration being used:`)
        console.error(`   URL: ${config.database.url}`)
        console.error(`   Host: ${config.database.host}:${config.database.port}`)
        console.error(`   Database: ${config.database.database}`)
        console.error(`   Username: ${config.database.username}`)
        console.error('')
        
        await prisma.$disconnect()
        throw new Error(`Failed to connect to test database after ${maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }
  
  throw new Error('Unexpected connection flow - should not reach here')
}

/**
 * Sets up a shared test database instance for integration tests
 * Provides a singleton database connection to prevent resource conflicts
 * @param options Configuration options for database setup
 * @returns Promise resolving to configured test database instance
 */
export async function setupTestDatabase(
  options: DatabaseSetupOptions = {}
): Promise<TestDatabaseInstance> {
  // Return existing instance if already set up
  if (globalTestDatabase && globalTestDatabase.isConnected) {
    console.log('♻️  Reusing existing test database connection')
    return globalTestDatabase
  }
  
  console.log('🚀 Setting up test database...')
  
  try {
    const prisma = await createTestDatabaseClient(options)
    const config = getTestEnvironmentConfig()
    
    // Create cleanup function
    const cleanup = async (): Promise<void> => {
      console.log('🧹 Cleaning up test database connection...')
      try {
        await prisma.$disconnect()
        console.log('✅ Test database disconnected')
      } catch (error) {
        console.error('⚠️  Error during database cleanup:', error instanceof Error ? error.message : 'Unknown error')
        // Don't throw - cleanup errors shouldn't fail tests
      }
    }
    
    // Create and cache the test database instance
    globalTestDatabase = {
      prisma,
      isConnected: true,
      connectionUrl: config.database.url,
      cleanup
    }
    
    console.log('✅ Test database setup complete')
    return globalTestDatabase
    
  } catch (error) {
    console.error('❌ Failed to setup test database:', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

/**
 * Cleans up test data from the database
 * Removes data created during tests to maintain clean state
 * @param prisma PrismaClient instance
 * @param testIdentifier Unique identifier for test data cleanup
 */
export async function cleanupTestData(
  prisma: PrismaClient,
  testIdentifier: string
): Promise<void> {
  console.log('🧹 Cleaning up test data...')
  
  try {
    // Clean up test data in reverse dependency order
    // This prevents foreign key constraint violations
    
    // Get test user IDs first
    const testUsers = await prisma.user.findMany({
      where: { email: { contains: testIdentifier } },
      select: { id: true }
    })
    const testUserIds = testUsers.map(user => user.id)
    
    // Clean up follows first (references users)
    // Note: Schema uses followerId and followingId
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: { in: testUserIds } },
          { followingId: { in: testUserIds } }
        ]
      }
    })
    
    // Clean up posts (references users)
    await prisma.post.deleteMany({
      where: {
        OR: [
          { content: { contains: 'INTEGRATION_TEST' } },
          { author: { email: { contains: testIdentifier } } }
        ]
      }
    })
    
    // Clean up users last
    await prisma.user.deleteMany({
      where: {
        email: { contains: testIdentifier }
      }
    })
    
    console.log('✅ Test cleanup completed')
    
  } catch (error) {
    console.error('⚠️  Error during test data cleanup:', error instanceof Error ? error.message : 'Unknown error')
    // Don't throw - cleanup errors shouldn't fail tests
  }
}

/**
 * Tears down the test database connection
 * Should be called in test cleanup to prevent connection leaks
 */
export async function teardownTestDatabase(): Promise<void> {
  if (globalTestDatabase) {
    await globalTestDatabase.cleanup()
    globalTestDatabase = null
  }
}

/**
 * Helper function for integration tests to get a configured database client
 * Simplifies test setup by handling all configuration automatically
 * @param enableLogging Whether to enable SQL query logging for debugging
 * @returns Promise resolving to configured PrismaClient
 */
export async function getTestPrismaClient(enableLogging = false): Promise<PrismaClient> {
  const testDb = await setupTestDatabase({ enableLogging })
  return testDb.prisma
}

/**
 * Creates a test user for integration testing
 * Provides a standardized way to create test users with unique identifiers
 * @param prisma PrismaClient instance
 * @param userNumber Unique number to append to user data
 * @param customData Optional custom data to override defaults
 * @returns Promise resolving to created user
 */
export async function createTestUser(
  prisma: PrismaClient,
  userNumber: number,
  customData: Partial<any> = {}
): Promise<any> {
  const timestamp = Date.now()
  const userData = {
    email: `test-user${userNumber}-${timestamp}@integration-test.example.com`,
    username: `testuser${userNumber}_${timestamp}`,
    displayName: `Test User ${userNumber}`,
    passwordHash: `hashedpassword${userNumber}`,
    bio: `Integration test user ${userNumber}`,
    avatar: null,
    website: null,
    isVerified: false,
    verificationTier: 'none',
    ...customData
  }
  
  return await prisma.user.create({ data: userData })
}

/**
 * Creates a test post for integration testing
 * Provides a standardized way to create test posts with unique identifiers
 * @param prisma PrismaClient instance
 * @param authorId ID of the user who created the post
 * @param postNumber Unique number to append to post data
 * @param customData Optional custom data to override defaults
 * @returns Promise resolving to created post
 */
export async function createTestPost(
  prisma: PrismaClient,
  authorId: string,
  postNumber: number,
  customData: Partial<any> = {}
): Promise<any> {
  const timestamp = Date.now()
  const postData = {
    content: `INTEGRATION_TEST: Test post ${postNumber} - ${timestamp}`,
    authorId,
    status: 'published',
    visibility: 'public',
    mediaAttachments: [],
    ...customData
  }
  
  return await prisma.post.create({ data: postData })
}

// Export types for use in tests
export type { DatabaseSetupOptions, TestDatabaseInstance }

// backend/src/__tests__/helpers/databaseSetup.ts
// Version: 2.0.0
// Fixed to use testDatabase.ts configuration instead of non-existent testEnvironment.ts