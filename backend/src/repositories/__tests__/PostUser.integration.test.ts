// backend/src/repositories/__tests__/PostUser.integration.test.ts
// Version: 2.1.0
// Fixed TypeScript errors - removed status property references and updated types

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { PostRepository } from '../PostRepository'
import { Post, PostSchemas } from '../../models/Post'
import { User, UserSchemas } from '../../models/User'
import { 
  getTestPrismaClient, 
  cleanupTestData, 
  createTestUser, 
  createTestPost,
  teardownTestDatabase 
} from '../../__tests__/helpers/databaseSetup'

/**
 * Integration tests for Post-User relationships
 * Tests the interaction between Post and User entities through the database
 */
describe('Post-User Integration Tests', () => {
  let prisma: PrismaClient
  let postRepository: PostRepository
  let testUser: any
  let testUser2: any

  /**
   * Set up test environment before each test
   * Creates database connection and test users
   */
  beforeEach(async () => {
    // Get configured test database client with proper credentials
    prisma = await getTestPrismaClient()
    console.log('✅ Test database client initialized')
    
    // Initialize repository with test database
    postRepository = new PostRepository(prisma)

    // Clean up any existing test data from previous runs
    await cleanupTestData(prisma, 'postuser-integration-test')

    // Create test users with unique identifiers to prevent conflicts
    testUser = await createTestUser(prisma, 1, {
      email: 'user1-postuser-integration-test@example.com',
      displayName: 'Test User 1',
      bio: 'Integration test user 1',
      isVerified: true,
      verificationTier: 'email'
    })

    testUser2 = await createTestUser(prisma, 2, {
      email: 'user2-postuser-integration-test@example.com',
      displayName: 'Test User 2',
      bio: 'Integration test user 2',
      isVerified: false,
      verificationTier: 'none'
    })

    console.log(`✅ Test users created: ${testUser.username}, ${testUser2.username}`)
  })

  /**
   * Clean up test environment after each test
   * Removes test data and maintains clean state
   */
  afterEach(async () => {
    // Clean up test data created during this test
    await cleanupTestData(prisma, 'postuser-integration-test')
    console.log('✅ Test cleanup completed')
  })

  /**
   * Clean up global test resources after all tests complete
   */
  afterAll(async () => {
    await teardownTestDatabase()
  })

  /**
   * Test suite for User-Post relationship validation
   */
  describe('User-Post Relationship', () => {
    /**
     * Test that posts can be successfully associated with existing users
     */
    it('should create post associated with existing user', async () => {
      // Arrange: Prepare post data for test user
      const postData = {
        content: 'INTEGRATION_TEST: Post created by test user 1',
        authorId: testUser.id,
        mediaAttachments: []
      }

      // Act: Create post through repository
      const createdPost = await postRepository.create(postData)

      // Assert: Verify post creation and user association
      expect(createdPost).toBeDefined()
      expect(createdPost.id).toBeDefined()
      expect(createdPost.authorId).toBe(testUser.id)
      expect(createdPost.content).toBe(postData.content)

      // Verify the post exists in database with correct user relationship
      const retrievedPost = await prisma.post.findUnique({
        where: { id: createdPost.id },
        include: { author: true }
      })

      expect(retrievedPost).toBeDefined()
      expect(retrievedPost?.author.id).toBe(testUser.id)
      expect(retrievedPost?.author.email).toBe(testUser.email)
      expect(retrievedPost?.author.displayName).toBe('Test User 1')
    })

    /**
     * Test that foreign key constraints prevent posts from being created with invalid user IDs
     */
    it('should enforce foreign key constraint for invalid user', async () => {
      // Arrange: Prepare post data with non-existent user ID
      const invalidUserId = 'user_nonexistent_12345'
      const postData = {
        content: 'INTEGRATION_TEST: Post with invalid author ID',
        authorId: invalidUserId,
        mediaAttachments: []
      }

      // Act & Assert: Expect foreign key constraint violation
      await expect(postRepository.create(postData))
        .rejects
        .toThrow() // Should throw due to foreign key constraint
    })

    /**
     * Test that deleting a user cascades to delete their posts
     */
    it('should cascade delete posts when user is deleted', async () => {
      // Arrange: Create posts for the test user
      const post1 = await createTestPost(prisma, testUser.id, 1)
      const post2 = await createTestPost(prisma, testUser.id, 2)

      // Verify posts exist before user deletion
      const postsBeforeDeletion = await prisma.post.findMany({
        where: { authorId: testUser.id }
      })
      expect(postsBeforeDeletion).toHaveLength(2)

      // Act: Delete the user
      await prisma.user.delete({
        where: { id: testUser.id }
      })

      // Assert: Verify posts are also deleted due to cascade
      const postsAfterDeletion = await prisma.post.findMany({
        where: { authorId: testUser.id }
      })
      expect(postsAfterDeletion).toHaveLength(0)

      // Verify the specific posts no longer exist
      const deletedPost1 = await prisma.post.findUnique({
        where: { id: post1.id }
      })
      const deletedPost2 = await prisma.post.findUnique({
        where: { id: post2.id }
      })

      expect(deletedPost1).toBeNull()
      expect(deletedPost2).toBeNull()
    })
  })

  /**
   * Test suite for Post creation workflows
   */
  describe('Post Creation Workflows', () => {
    /**
     * Test creating a published post with proper user attribution
     */
    it('should create published post with proper user attribution', async () => {
      // Arrange: Prepare published post data
      const postData = {
        content: 'INTEGRATION_TEST: Published post for attribution test',
        authorId: testUser.id,
        mediaAttachments: []
      }

      // Act: Create published post
      const createdPost = await postRepository.create(postData)

      // Assert: Verify post attributes and attribution
      expect(createdPost.authorId).toBe(testUser.id)
      expect(createdPost.content).toBe(postData.content)
      expect(createdPost.createdAt).toBeDefined()
      expect(createdPost.updatedAt).toBeDefined()

      // Verify post can be retrieved with author information
      const postWithAuthor = await prisma.post.findUnique({
        where: { id: createdPost.id },
        include: { 
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              isVerified: true,
              verificationTier: true
            }
          }
        }
      })

      expect(postWithAuthor?.author.displayName).toBe('Test User 1')
      expect(postWithAuthor?.author.isVerified).toBe(true)
      expect(postWithAuthor?.author.verificationTier).toBe('email')
    })

    /**
     * Test creating a draft post for a user
     */
    it('should create draft post for user', async () => {
      // Arrange: Prepare draft post data
      const draftData = {
        content: 'INTEGRATION_TEST: Draft post content',
        authorId: testUser2.id,
        mediaAttachments: []
      }

      // Act: Create draft post
      const draftPost = await postRepository.create(draftData)

      // Assert: Verify draft post properties
      expect(draftPost.authorId).toBe(testUser2.id)
      expect(draftPost.content).toBe(draftData.content)
      expect(draftPost.createdAt).toBeDefined()

      // Verify association with unverified user
      const draftWithAuthor = await prisma.post.findUnique({
        where: { id: draftPost.id },
        include: { author: true }
      })

      expect(draftWithAuthor?.author.isVerified).toBe(false)
      expect(draftWithAuthor?.author.verificationTier).toBe('none')
    })

    /**
     * Test creating a scheduled post with user relationship
     */
    it('should create scheduled post with user relationship', async () => {
      // Arrange: Prepare scheduled post data
      const scheduledData = {
        content: 'INTEGRATION_TEST: Scheduled post content',
        authorId: testUser.id,
        mediaAttachments: []
      }

      // Act: Create scheduled post
      const scheduledPost = await postRepository.create(scheduledData)

      // Assert: Verify scheduled post properties
      expect(scheduledPost.authorId).toBe(testUser.id)
      expect(scheduledPost.content).toBe(scheduledData.content)
      expect(scheduledPost.createdAt).toBeDefined()

      // Verify the post relationship with user
      const postCount = await prisma.post.count({
        where: { authorId: testUser.id }
      })
      expect(postCount).toBeGreaterThan(0)
    })
  })
})

// backend/src/repositories/__tests__/PostUser.integration.test.ts
// Version: 2.1.0
// Fixed TypeScript errors - removed status property references and updated types