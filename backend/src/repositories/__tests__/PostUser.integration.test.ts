// backend\src\repositories\__tests__\PostUser.integration.test.ts
// Version: 1.0.4
// Fixed author relation - using author.connect to properly associate posts with users

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
      const existingPost = await prisma.post.findFirst({
        where: {
          id: post.id
        }
      })

      expect(existingPost).toBeDefined()
      expect(existingPost?.content).toBe('This is a test post content')
    })

    it('should enforce foreign key constraint for invalid user', async () => {
      const nonExistentUserId = 'non-existent-user-id'

      // Attempt to create post with non-existent user should fail
      await expect(
        createTestPost(prisma, nonExistentUserId, {
          content: 'This post should fail to create'
        })
      ).rejects.toThrow()
    })

    it('should cascade delete posts when user is deleted', async () => {
      // Create test user
      const user = await createTestUser(prisma, {
        username: 'user_to_delete',
        email: 'delete.user@test.com'
      })

      // Create multiple posts for user
      await createTestPost(prisma, user.id, {
        content: 'First post'
      })

      await createTestPost(prisma, user.id, {
        content: 'Second post'
      })

      // Verify posts exist
      const postsBefore = await prisma.post.findMany()
      expect(postsBefore).toHaveLength(2)

      // Delete user
      await prisma.user.delete({
        where: { id: user.id }
      })

      // Verify posts were cascade deleted
      const postsAfter = await prisma.post.findMany()
      expect(postsAfter).toHaveLength(0)
    })
  })

  describe('Post Creation Workflows', () => {
    it('should create post with content', async () => {
      // Create test user
      const user = await createTestUser(prisma, {
        username: 'content_creator',
        email: 'creator@test.com'
      })

      // Create post for user
      const post = await createTestPost(prisma, user.id, {
        content: 'This is a test post with content'
      })

      // Verify post properties
      expect(post.content).toBe('This is a test post with content')
      expect(post.createdAt).toBeInstanceOf(Date)
      expect(post.updatedAt).toBeInstanceOf(Date)

      // Verify we can retrieve posts
      const posts = await prisma.post.findMany({
        where: {
          content: 'This is a test post with content'
        }
      })

      expect(posts).toHaveLength(1)
      expect(posts[0].content).toBe('This is a test post with content')
    })

    it('should create multiple posts', async () => {
      // Create test user
      const user = await createTestUser(prisma, {
        username: 'multi_poster',
        email: 'multi@test.com'
      })

      // Create multiple posts for user
      await createTestPost(prisma, user.id, {
        content: 'First post content'
      })

      await createTestPost(prisma, user.id, {
        content: 'Second post content'
      })

      await createTestPost(prisma, user.id, {
        content: 'Third post content'
      })

      // Verify all posts were created
      const allPosts = await prisma.post.findMany()
      expect(allPosts).toHaveLength(3)

      const postContents = allPosts.map(p => p.content)
      expect(postContents).toContain('First post content')
      expect(postContents).toContain('Second post content')
      expect(postContents).toContain('Third post content')
    })

    it('should handle posts with different content lengths', async () => {
      // Create test user
      const user = await createTestUser(prisma, {
        username: 'length_tester',
        email: 'length@test.com'
      })

      const shortContent = 'Short'
      const longContent = 'This is a much longer post content that contains more text to test how the database handles various content lengths and ensures that posts can store different amounts of text without issues.'

      // Create posts with different content lengths
      const shortPost = await createTestPost(prisma, user.id, {
        content: shortContent
      })

      const longPost = await createTestPost(prisma, user.id, {
        content: longContent
      })

      // Verify both posts were created successfully
      expect(shortPost.content).toBe(shortContent)
      expect(longPost.content).toBe(longContent)

      // Verify they exist in database
      const posts = await prisma.post.findMany()
      expect(posts).toHaveLength(2)
    })
  })
})

// backend\src\repositories\__tests__\PostUser.integration.test.ts
// Version: 1.0.4
// Fixed author relation - using author.connect to properly associate posts with users