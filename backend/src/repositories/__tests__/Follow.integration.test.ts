// backend/src/repositories/__tests__/Follow.integration.test.ts
// Version: 2.1.0
// Fixed TypeScript errors - removed invalid include properties for Follow model

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { FollowRepository } from '../FollowRepository'
import { 
  getTestPrismaClient, 
  cleanupTestData, 
  createTestUser,
  teardownTestDatabase 
} from '../../__tests__/helpers/databaseSetup'

/**
 * Integration tests for Follow functionality
 * Tests the creation and validation of follow relationships in the database
 */
describe('Follow Integration Tests', () => {
  let prisma: PrismaClient
  let followRepository: FollowRepository
  let testUser1: any
  let testUser2: any
  let testUser3: any

  /**
   * Set up test environment before each test
   * Creates database connection and test users
   */
  beforeEach(async () => {
    // Get configured test database client with proper credentials
    prisma = await getTestPrismaClient()
    console.log('✅ Test database client initialized')
    
    // Initialize repository with test database
    followRepository = new FollowRepository(prisma)

    // Clean up any existing test data from previous runs
    await cleanupTestData(prisma, 'test-follow')

    // Create test users with unique identifiers to prevent conflicts
    testUser1 = await createTestUser(prisma, 1, {
      email: 'user1-test-follow@example.com',
      displayName: 'Test User 1',
      bio: 'Bio for user 1',
      isVerified: false,
      verificationTier: 'none'
    })

    testUser2 = await createTestUser(prisma, 2, {
      email: 'user2-test-follow@example.com',
      displayName: 'Test User 2',
      bio: 'Bio for user 2',
      isVerified: true,
      verificationTier: 'email'
    })

    testUser3 = await createTestUser(prisma, 3, {
      email: 'user3-test-follow@example.com',
      displayName: 'Test User 3',
      bio: 'Bio for user 3',
      isVerified: false,
      verificationTier: 'none'
    })

    console.log(`✅ Test users created: ${testUser1.username}, ${testUser2.username}, ${testUser3.username}`)
  })

  /**
   * Clean up test environment after each test
   * Removes test data and maintains clean state
   */
  afterEach(async () => {
    // Clean up test data created during this test
    await cleanupTestData(prisma, 'test-follow')
    console.log('✅ Test cleanup completed')
  })

  /**
   * Clean up global test resources after all tests complete
   */
  afterAll(async () => {
    await teardownTestDatabase()
  })

  /**
   * Test suite for Follow creation and validation
   */
  describe('Follow Creation and Validation', () => {
    /**
     * Test that a follow relationship can be successfully created
     */
    it('should create follow relationship successfully', async () => {
      // Arrange: Prepare follow data
      const followData = {
        followerId: testUser1.id,
        followedId: testUser2.id
      }

      // Act: Create follow relationship through repository
      const followRelationship = await followRepository.create(followData)

      // Assert: Verify follow relationship creation
      expect(followRelationship).toBeDefined()
      expect(followRelationship.id).toBeDefined()
      expect(followRelationship.followerId).toBe(testUser1.id)
      expect(followRelationship.followedId).toBe(testUser2.id)
      expect(followRelationship.createdAt).toBeDefined()

      // Verify the relationship exists in database
      const retrievedFollow = await prisma.follow.findUnique({
        where: { id: followRelationship.id }
      })

      expect(retrievedFollow).toBeDefined()
      expect(retrievedFollow?.followerId).toBe(testUser1.id)
      expect(retrievedFollow?.followedId).toBe(testUser2.id)

      // Verify follower count increases
      const followerCount = await prisma.follow.count({
        where: { followedId: testUser2.id }
      })
      expect(followerCount).toBe(1)

      // Verify following count increases
      const followingCount = await prisma.follow.count({
        where: { followerId: testUser1.id }
      })
      expect(followingCount).toBe(1)
    })

    /**
     * Test that duplicate follow relationships are prevented
     */
    it('should prevent duplicate follow relationships', async () => {
      // Arrange: Create initial follow relationship
      const followData = {
        followerId: testUser1.id,
        followedId: testUser2.id
      }

      const firstFollow = await followRepository.create(followData)
      expect(firstFollow).toBeDefined()

      // Act & Assert: Attempt to create duplicate follow relationship
      await expect(followRepository.create(followData))
        .rejects
        .toThrow() // Should throw due to unique constraint violation

      // Verify only one follow relationship exists
      const followCount = await prisma.follow.count({
        where: {
          followerId: testUser1.id,
          followedId: testUser2.id
        }
      })
      expect(followCount).toBe(1)
    })

    /**
     * Test that self-following is prevented
     */
    it('should prevent self-following', async () => {
      // Arrange: Prepare self-follow data
      const selfFollowData = {
        followerId: testUser1.id,
        followedId: testUser1.id // Same user trying to follow themselves
      }

      // Act & Assert: Expect self-follow to be rejected
      await expect(followRepository.create(selfFollowData))
        .rejects
        .toThrow() // Should throw due to business logic constraint

      // Verify no self-follow relationship was created
      const selfFollowCount = await prisma.follow.count({
        where: {
          followerId: testUser1.id,
          followedId: testUser1.id
        }
      })
      expect(selfFollowCount).toBe(0)
    })
  })

  /**
   * Test suite for follow relationship queries and operations
   */
  describe('Follow Relationship Operations', () => {
    /**
     * Test retrieving followers for a user
     */
    it('should retrieve followers for a user', async () => {
      // Arrange: Create multiple follow relationships targeting testUser2
      await followRepository.create({
        followerId: testUser1.id,
        followedId: testUser2.id
      })

      await followRepository.create({
        followerId: testUser3.id,
        followedId: testUser2.id
      })

      // Act: Get followers for testUser2
      const followers = await prisma.follow.findMany({
        where: { followedId: testUser2.id }
      })

      // Assert: Verify correct followers are returned
      expect(followers).toHaveLength(2)
      
      const followerIds = followers.map(f => f.followerId)
      expect(followerIds).toContain(testUser1.id)
      expect(followerIds).toContain(testUser3.id)
    })

    /**
     * Test retrieving who a user is following
     */
    it('should retrieve who a user is following', async () => {
      // Arrange: Create multiple follow relationships from testUser1
      await followRepository.create({
        followerId: testUser1.id,
        followedId: testUser2.id
      })

      await followRepository.create({
        followerId: testUser1.id,
        followedId: testUser3.id
      })

      // Act: Get who testUser1 is following
      const following = await prisma.follow.findMany({
        where: { followerId: testUser1.id }
      })

      // Assert: Verify correct following relationships are returned
      expect(following).toHaveLength(2)
      
      const followedIds = following.map(f => f.followedId)
      expect(followedIds).toContain(testUser2.id)
      expect(followedIds).toContain(testUser3.id)
    })

    /**
     * Test unfollowing a user
     */
    it('should successfully unfollow a user', async () => {
      // Arrange: Create a follow relationship
      const followRelationship = await followRepository.create({
        followerId: testUser1.id,
        followedId: testUser2.id
      })

      // Verify relationship was created
      const initialFollowCount = await prisma.follow.count({
        where: {
          followerId: testUser1.id,
          followedId: testUser2.id
        }
      })
      expect(initialFollowCount).toBe(1)

      // Act: Delete the follow relationship (unfollow)
      await prisma.follow.delete({
        where: { id: followRelationship.id }
      })

      // Assert: Verify relationship was removed
      const finalFollowCount = await prisma.follow.count({
        where: {
          followerId: testUser1.id,
          followedId: testUser2.id
        }
      })
      expect(finalFollowCount).toBe(0)

      // Verify the specific relationship no longer exists
      const deletedFollow = await prisma.follow.findUnique({
        where: { id: followRelationship.id }
      })
      expect(deletedFollow).toBeNull()
    })
  })

  /**
   * Test suite for follow relationship constraints and edge cases
   */
  describe('Follow Relationship Constraints', () => {
    /**
     * Test cascading delete when user is deleted
     */
    it('should cascade delete follow relationships when user is deleted', async () => {
      // Arrange: Create follow relationships involving testUser1
      await followRepository.create({
        followerId: testUser1.id,
        followedId: testUser2.id
      })

      await followRepository.create({
        followerId: testUser3.id,
        followedId: testUser1.id
      })

      // Verify relationships exist
      const initialFollowCount = await prisma.follow.count({
        where: {
          OR: [
            { followerId: testUser1.id },
            { followedId: testUser1.id }
          ]
        }
      })
      expect(initialFollowCount).toBe(2)

      // Act: Delete testUser1
      await prisma.user.delete({
        where: { id: testUser1.id }
      })

      // Assert: Verify follow relationships involving testUser1 are deleted
      const finalFollowCount = await prisma.follow.count({
        where: {
          OR: [
            { followerId: testUser1.id },
            { followedId: testUser1.id }
          ]
        }
      })
      expect(finalFollowCount).toBe(0)

      // Verify other relationships are unaffected
      const otherFollowsCount = await prisma.follow.count()
      expect(otherFollowsCount).toBe(0) // Should be 0 since we only had relationships with testUser1
    })

    /**
     * Test follow relationship with non-existent user
     */
    it('should reject follow relationship with non-existent user', async () => {
      // Arrange: Prepare follow data with non-existent user ID
      const invalidFollowData = {
        followerId: testUser1.id,
        followedId: 'user_nonexistent_12345'
      }

      // Act & Assert: Expect foreign key constraint violation
      await expect(followRepository.create(invalidFollowData))
        .rejects
        .toThrow() // Should throw due to foreign key constraint

      // Verify no follow relationship was created
      const followCount = await prisma.follow.count({
        where: { followerId: testUser1.id }
      })
      expect(followCount).toBe(0)
    })
  })
})

// backend/src/repositories/__tests__/Follow.integration.test.ts
// Version: 2.1.0
// Fixed TypeScript errors - removed invalid include properties for Follow model