// src/__tests__/helpers/testSetup.ts - v1.1.0
// Test setup helper for integration tests
// Provides database initialization, cleanup, and test data creation utilities
// v1.1.0: Fixed TestUser interface to match Prisma schema (passwordHash vs password)

import { PrismaClient } from '@prisma/client'
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import { 
  initializeTestDatabase, 
  cleanupTestDatabase, 
  disconnectTestDatabase,
  seedTestDatabase,
  resetTestDatabase,
  checkTestDatabaseHealth,
  getTestDatabaseClient
} from '../../config/testDatabase'

// Interface for test user data - matches Prisma User model exactly
interface TestUser {
  id: string
  email: string
  username: string
  displayName: string | null
  bio: string | null
  avatar: string | null
  website: string | null
  passwordHash: string
  isVerified: boolean
  verificationTier: string
  createdAt: Date
  updatedAt: Date
  lastLoginAt: Date | null
  followersCount: number
  followingCount: number
  postsCount: number
  publicKey: string | null
  privateKey: string | null
}

// Interface for test post data - matches Prisma Post model exactly
interface TestPost {
  id: string
  content: string
  userId: string
  status: string
  visibility: string
  scheduledAt: Date | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
  likesCount: number
  repliesCount: number
  repostsCount: number
  mediaUrls: string[]
  activityPubId: string | null
}

// Interface for test setup configuration
interface TestSetupConfig {
  seedData: boolean
  cleanupBetweenTests: boolean
  logDatabaseOperations: boolean
}

// Default test setup configuration
const defaultConfig: TestSetupConfig = {
  seedData: true,
  cleanupBetweenTests: true,
  logDatabaseOperations: process.env['NODE_ENV'] !== 'test'
}

// Global test database client
let testClient: PrismaClient | null = null

// Test data storage
const testData: {
  users: TestUser[]
  posts: TestPost[]
} = {
  users: [],
  posts: []
}

// Initialize test database setup
export const setupTestDatabase = (config: Partial<TestSetupConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config }

  // Setup before all tests
  beforeAll(async () => {
    try {
      console.log('🚀 Initializing test database...')
      
      // Initialize database connection
      testClient = await initializeTestDatabase()
      
      // Check database health
      const isHealthy = await checkTestDatabaseHealth()
      if (!isHealthy) {
        throw new Error('Test database health check failed')
      }

      // Seed initial data if requested
      if (finalConfig.seedData) {
        await seedTestDatabase(testClient)
        await loadTestData()
      }

      console.log('✅ Test database setup completed')
    } catch (error) {
      console.error('❌ Test database setup failed:', error)
      throw error
    }
  })

  // Cleanup after all tests
  afterAll(async () => {
    try {
      console.log('🧹 Cleaning up test database...')
      
      // Clean up all test data
      await cleanupTestDatabase()
      
      // Disconnect from database
      await disconnectTestDatabase()
      
      // Reset client reference
      testClient = null
      
      console.log('✅ Test database cleanup completed')
    } catch (error) {
      console.error('❌ Test database cleanup failed:', error)
    }
  })

  // Setup before each test
  if (finalConfig.cleanupBetweenTests) {
    beforeEach(async () => {
      if (finalConfig.logDatabaseOperations) {
        console.log('🔄 Resetting test database state...')
      }
      
      // Reset database to clean state
      await resetTestDatabase()
      await loadTestData()
    })
  }

  // Cleanup after each test
  afterEach(async () => {
    if (finalConfig.logDatabaseOperations) {
      console.log('🧽 Test completed, state preserved')
    }
  })
}

// Load test data from database into memory
const loadTestData = async (): Promise<void> => {
  if (!testClient) {
    throw new Error('Test database client not initialized')
  }

  try {
    // Load users
    const users = await testClient.user.findMany()
    testData.users = users

    // Load posts
    const posts = await testClient.post.findMany()
    testData.posts = posts

  } catch (error) {
    console.error('❌ Failed to load test data:', error)
    throw error
  }
}

// Get test database client
export const getTestClient = (): PrismaClient => {
  if (!testClient) {
    throw new Error('Test database not initialized. Did you call setupTestDatabase()?')
  }
  return testClient
}

// Create test user
export const createTestUser = async (userData: Partial<{
  username: string
  email: string
  passwordHash: string
  displayName: string
}>): Promise<TestUser> => {
  const client = getTestClient()
  
  const defaultUserData = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    passwordHash: 'hashedtestpassword123',
    displayName: `Test User ${Date.now()}`
  }

  const finalUserData = { ...defaultUserData, ...userData }

  try {
    const user = await client.user.create({
      data: finalUserData
    })

    // Add to test data storage
    testData.users.push(user)
    
    return user
  } catch (error) {
    console.error('❌ Failed to create test user:', error)
    throw error
  }
}

// Create test post
export const createTestPost = async (postData: Partial<{
  content: string
  userId: string
  status: string
}>, authorUsername?: string): Promise<TestPost> => {
  const client = getTestClient()

  let userId = postData.userId

  // If no userId provided but authorUsername is given, find the user
  if (!userId && authorUsername) {
    const user = testData.users.find(u => u.username === authorUsername)
    if (!user) {
      throw new Error(`Test user with username '${authorUsername}' not found`)
    }
    userId = user.id
  }

  // If still no userId, create a user
  if (!userId) {
    const user = await createTestUser({})
    userId = user.id
  }

  const defaultPostData = {
    content: `Test post content ${Date.now()}`,
    userId: userId!,
    status: 'published'
  }

  const finalPostData = { ...defaultPostData, ...postData }

  try {
    const post = await client.post.create({
      data: finalPostData
    })

    // Add to test data storage
    testData.posts.push(post)

    return post
  } catch (error) {
    console.error('❌ Failed to create test post:', error)
    throw error
  }
}

// Create test follow relationship
export const createTestFollow = async (
  followerUsername: string, 
  followedUsername: string
): Promise<{ followerId: string, followedId: string }> => {
  const client = getTestClient()

  // Find users
  const follower = testData.users.find(u => u.username === followerUsername)
  const followed = testData.users.find(u => u.username === followedUsername)

  if (!follower) {
    throw new Error(`Follower user '${followerUsername}' not found`)
  }
  if (!followed) {
    throw new Error(`Followed user '${followedUsername}' not found`)
  }

  try {
    await client.follow.create({
      data: {
        followerId: follower.id,
        followedId: followed.id
      }
    })

    return {
      followerId: follower.id,
      followedId: followed.id
    }
  } catch (error) {
    console.error('❌ Failed to create test follow:', error)
    throw error
  }
}

// Get test data
export const getTestUsers = (): TestUser[] => testData.users
export const getTestPosts = (): TestPost[] => testData.posts

// Find test user by username
export const findTestUser = (username: string): TestUser | undefined => {
  return testData.users.find(user => user.username === username)
}

// Find test user by email
export const findTestUserByEmail = (email: string): TestUser | undefined => {
  return testData.users.find(user => user.email === email)
}

// Clean specific test data
export const cleanTestUsers = async (): Promise<void> => {
  const client = getTestClient()
  await client.user.deleteMany({})
  testData.users = []
}

export const cleanTestPosts = async (): Promise<void> => {
  const client = getTestClient()
  await client.post.deleteMany({})
  testData.posts = []
}

export const cleanTestFollows = async (): Promise<void> => {
  const client = getTestClient()
  await client.follow.deleteMany({})
}

// Utility to wait for database operations
export const waitForDatabase = async (ms: number = 100): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, ms))
}

// Check if user exists in test data
export const userExists = (username: string): boolean => {
  return testData.users.some(user => user.username === username)
}

// Check if post exists in test data
export const postExists = (content: string): boolean => {
  return testData.posts.some(post => post.content.includes(content))
}

// Get database statistics for debugging
export const getTestDatabaseStats = async (): Promise<{
  userCount: number
  postCount: number
  followCount: number
}> => {
  const client = getTestClient()

  const [userCount, postCount, followCount] = await Promise.all([
    client.user.count(),
    client.post.count(),
    client.follow.count()
  ])

  return { userCount, postCount, followCount }
}

// Export test data interface for type safety
export type { TestUser, TestPost, TestSetupConfig }

// src/__tests__/helpers/testSetup.ts - v1.1.0
// Initial version: Comprehensive test setup helper with database management
// v1.1.0: Fixed TestUser interface to match Prisma schema (passwordHash vs password)