// backend/tests/integration/PostUser.integration.test.ts
// Fixed PostUser integration test that uses existing database setup

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { PostRepository } from '../PostRepository'
import { Post, PostSchemas } from '../../models/Post'
import { User, UserSchemas } from '../../models/User'

describe('Post-User Integration Tests', () => {
  let prisma: PrismaClient
  let postRepository: PostRepository
  let testUser: any
  let testUser2: any

  beforeEach(async () => {
    // Use the existing DATABASE_URL from your environment
    // Don't override it - just use whatever is already configured
    prisma = new PrismaClient()
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Initialize repository
    postRepository = new PostRepository(prisma)

    // Clean up any existing test data
    await prisma.post.deleteMany({
      where: {
        content: { contains: 'INTEGRATION_TEST:' }
      }
    })
    
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'postuser-integration-test@' }
      }
    })

    // Create test users with unique identifiers
    testUser = await prisma.user.create({
      data: {
        email: 'user1-postuser-integration-test@example.com',
        username: `testuser1_postuser_${Date.now()}`,
        displayName: 'Test User 1',
        passwordHash: 'hashedpassword1',
        bio: 'Integration test user 1',
        avatar: null,
        website: null,
        isVerified: true,
        verificationTier: 'email'
      }
    })

    testUser2 = await prisma.user.create({
      data: {
        email: 'user2-postuser-integration-test@example.com',
        username: `testuser2_postuser_${Date.now()}`,
        displayName: 'Test User 2',
        passwordHash: 'hashedpassword2',
        bio: 'Integration test user 2',
        avatar: null,
        website: null,
        isVerified: false,
        verificationTier: 'none'
      }
    })

    console.log(`✅ Created test users: ${testUser.id}, ${testUser2.id}`)
  })

  afterEach(async () => {
    // Clean up test data after each test
    try {
      await prisma.post.deleteMany({
        where: {
          authorId: { in: [testUser?.id, testUser2?.id] }
        }
      })
      
      await prisma.user.deleteMany({
        where: {
          id: { in: [testUser?.id, testUser2?.id] }
        }
      })
    } catch (error) {
      console.warn('Cleanup error:', error)
    } finally {
      await prisma.$disconnect()
    }
  })

  describe('User-Post Relationship', () => {
    it('should create post associated with existing user', async () => {
      // Verify user exists before creating post
      expect(testUser.id).toBeDefined()
      expect(testUser.username).toBeDefined()

      const postData = {
        content: 'INTEGRATION_TEST: First post by test user',
        authorId: testUser.id
      }

      console.log(`🔄 Creating post for user: ${testUser.id}`)

      try {
        const createdPost = await postRepository.create(postData)

        // Verify the post was created successfully
        expect(createdPost).toBeDefined()
        expect(createdPost.id).toBeDefined()
        expect(createdPost.authorId).toBe(testUser.id)
        expect(createdPost.content).toBe('INTEGRATION_TEST: First post by test user')

        // Verify the author relationship was included
        expect(createdPost.author).toBeDefined()
        expect(createdPost.author.id).toBe(testUser.id)
        expect(createdPost.author.username).toBe(testUser.username)
        expect(createdPost.author.displayName).toBe('Test User 1')
        expect(createdPost.author.isVerified).toBe(true)
        expect(createdPost.author.verificationTier).toBe('email')

        // Verify default values
        expect(createdPost.isPublished).toBe(true)
        expect(createdPost.publishedAt).toBeInstanceOf(Date)
        expect(createdPost.createdAt).toBeInstanceOf(Date)

        console.log(`✅ Post created successfully: ${createdPost.id}`)

        // Verify the post exists in the database
        const foundPost = await postRepository.findById(createdPost.id)
        expect(foundPost).toBeDefined()
        expect(foundPost!.id).toBe(createdPost.id)
        expect(foundPost!.authorId).toBe(testUser.id)

      } catch (error) {
        console.error('❌ Post creation failed:', error)
        
        // Log database state for debugging
        const userCount = await prisma.user.count()
        const postCount = await prisma.post.count()
        console.log(`Database state: ${userCount} users, ${postCount} posts`)
        
        throw error
      }
    })

    it('should enforce foreign key constraint for invalid user', async () => {
      const postData = {
        content: 'INTEGRATION_TEST: Post by nonexistent user',
        authorId: 'nonexistent-user-id'
      }

      // Attempt to create post with invalid user ID should fail
      await expect(postRepository.create(postData)).rejects.toThrow()
    })

    it('should cascade delete posts when user is deleted', async () => {
      // Create a post
      const post = await postRepository.create({
        content: 'INTEGRATION_TEST: Post to be deleted with user',
        authorId: testUser.id
      })

      expect(post.id).toBeDefined()

      // Delete the user (should cascade delete posts)
      await prisma.user.delete({
        where: { id: testUser.id }
      })

      // Verify post was deleted
      const deletedPost = await postRepository.findById(post.id)
      expect(deletedPost).toBeNull()
    })
  })

  describe('Post Creation Workflows', () => {
    it('should create published post with proper user attribution', async () => {
      const postData = {
        content: 'INTEGRATION_TEST: Published post content',
        contentWarning: 'Test content warning',
        authorId: testUser.id
      }

      const createdPost = await postRepository.create(postData)

      expect(createdPost.isPublished).toBe(true)
      expect(createdPost.publishedAt).toBeInstanceOf(Date)
      expect(createdPost.author.username).toBe(testUser.username)
      expect(createdPost.author.isVerified).toBe(true)
      expect(createdPost.author.verificationTier).toBe('email')
      expect(createdPost.contentWarning).toBe('Test content warning')
    })

    it('should create draft post for user', async () => {
      const postData = {
        content: 'INTEGRATION_TEST: Draft post content',
        authorId: testUser2.id,
        isPublished: false
      }

      const createdPost = await postRepository.create(postData)

      expect(createdPost.isPublished).toBe(false)
      expect(createdPost.publishedAt).toBeNull()
      expect(createdPost.author.username).toBe(testUser2.username)
      expect(createdPost.author.isVerified).toBe(false)
    })

    it('should create scheduled post with user relationship', async () => {
      const futureDate = new Date(Date.now() + 3600000) // 1 hour from now
      const postData = {
        content: 'INTEGRATION_TEST: Scheduled post content',
        authorId: testUser.id,
        isScheduled: true,
        scheduledFor: futureDate,
        isPublished: false
      }

      const createdPost = await postRepository.create(postData)

      expect(createdPost.isScheduled).toBe(true)
      expect(createdPost.scheduledFor).toEqual(futureDate)
      expect(createdPost.isPublished).toBe(false)
      expect(createdPost.author.id).toBe(testUser.id)
    })
  })
})