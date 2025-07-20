// backend/src/repositories/__tests__/PostUser.integration.test.ts.fix
// Version: 1.0.5
// Fixed environment variable setup - Force DATABASE_URL before importing Prisma

// Force set environment variables BEFORE any imports
process.env['DATABASE_URL'] = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial_test'
process.env['TEST_DATABASE_URL'] = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial_test'
process.env['NODE_ENV'] = 'test'

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

/**
 * Test Prisma client instance for integration testing
 * Provides isolated database operations for tests
 */
function getTestPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
      }
    }
  })
}

/**
 * Clean up test data from database
 * Removes all test-related records to ensure test isolation
 */
async function cleanupTestData(prisma: PrismaClient): Promise<void> {
  // Delete in order to respect foreign key constraints
  await prisma.post.deleteMany()
  await prisma.user.deleteMany()
}

/**
 * Create test user helper function
 * @param prisma - Prisma client instance
 * @param userData - Partial user data for creation
 * @returns Created user object
 */
async function createTestUser(
  prisma: PrismaClient, 
  userData: { username: string; email: string; displayName?: string }
) {
  return await prisma.user.create({
    data: {
      id: `test-${userData.username}-${Date.now()}`,
      username: userData.username,
      email: userData.email,
      displayName: userData.displayName || userData.username,
      passwordHash: 'test-hash',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })
}

/**
 * Create test post helper function
 * @param prisma - Prisma client instance
 * @param userId - ID of the user creating the post
 * @param postData - Partial post data for creation
 * @returns Created post object
 */
async function createTestPost(
  prisma: PrismaClient,
  userId: string,
  postData: { 
    content: string
  }
) {
  return await prisma.post.create({
    data: {
      id: `test-post-${Date.now()}`,
      content: postData.content,
      author: {
        connect: { id: userId }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })
}

describe('Post-User Integration Tests', () => {
  let prisma: PrismaClient

  beforeEach(async () => {
    console.log('🔍 Test Environment Check:')
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`)
    console.log(`TEST_DATABASE_URL: ${process.env.TEST_DATABASE_URL}`)
    
    prisma = getTestPrismaClient()
    await cleanupTestData(prisma)
  })

  afterEach(async () => {
    await cleanupTestData(prisma)
    await prisma.$disconnect()
  })

  describe('User-Post Relationship', () => {
    it('should create post associated with existing user', async () => {
      // Create test user
      const user = await createTestUser(prisma, {
        username: 'post_author',
        email: 'author@test.com'
      })

      // Create post for user
      const post = await createTestPost(prisma, user.id, {
        content: 'This is a test post content'
      })

      // Verify post was created
      expect(post).toBeDefined()
      expect(post.content).toBe('This is a test post content')

      // Verify post exists in database
      const existingPost = await prisma.post.findUnique({
        where: { id: post.id }
      })
      
      expect(existingPost).toBeDefined()
      expect(existingPost?.authorId).toBe(user.id)
    })

    it('should enforce foreign key constraint for invalid user', async () => {
      // Attempt to create post with non-existent user ID
      await expect(
        createTestPost(prisma, 'non-existent-user-id', {
          content: 'This should fail'
        })
      ).rejects.toThrow()
    })

    it('should cascade delete posts when user is deleted', async () => {
      // Create user and post
      const user = await createTestUser(prisma, {
        username: 'delete_test_user',
        email: 'delete@test.com'
      })

      const post = await createTestPost(prisma, user.id, {
        content: 'Post to be deleted with user'
      })

      // Verify post exists
      let existingPost = await prisma.post.findUnique({
        where: { id: post.id }
      })
      expect(existingPost).toBeDefined()

      // Delete user (should cascade delete posts)
      await prisma.user.delete({
        where: { id: user.id }
      })

      // Verify post was deleted
      existingPost = await prisma.post.findUnique({
        where: { id: post.id }
      })
      expect(existingPost).toBeNull()
    })
  })

  describe('Post Creation Workflows', () => {
    it('should create post with content', async () => {
      // Create user
      const user = await createTestUser(prisma, {
        username: 'content_creator',
        email: 'creator@test.com'
      })

      // Create post
      const post = await createTestPost(prisma, user.id, {
        content: 'Amazing content here!'
      })

      // Verify post properties
      expect(post.content).toBe('Amazing content here!')
      expect(post.authorId).toBe(user.id)
      expect(post.isPublished).toBe(true)
      expect(post.createdAt).toBeInstanceOf(Date)
    })

    it('should create multiple posts', async () => {
      // Create user
      const user = await createTestUser(prisma, {
        username: 'multi_poster',
        email: 'multi@test.com'
      })

      // Create multiple posts
      const post1 = await createTestPost(prisma, user.id, {
        content: 'First post'
      })

      const post2 = await createTestPost(prisma, user.id, {
        content: 'Second post'
      })

      // Verify both posts exist
      const userPosts = await prisma.post.findMany({
        where: { authorId: user.id },
        orderBy: { createdAt: 'asc' }
      })

      expect(userPosts).toHaveLength(2)
      expect(userPosts[0].content).toBe('First post')
      expect(userPosts[1].content).toBe('Second post')
    })

    it('should handle posts with different content lengths', async () => {
      // Create user
      const user = await createTestUser(prisma, {
        username: 'length_tester',
        email: 'length@test.com'
      })

      // Test short content
      const shortPost = await createTestPost(prisma, user.id, {
        content: 'Hi!'
      })

      // Test long content
      const longContent = 'A'.repeat(500) // 500 character string
      const longPost = await createTestPost(prisma, user.id, {
        content: longContent
      })

      // Verify both posts were created successfully
      expect(shortPost.content).toBe('Hi!')
      expect(longPost.content).toBe(longContent)
      expect(longPost.content.length).toBe(500)
    })
  })
})

// backend/src/repositories/__tests__/PostUser.integration.test.ts.fix