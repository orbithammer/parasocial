// backend/tests/integration/Follow.integration.test.ts
// Complete integration tests for Follow model with User model and real database operations

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { FollowRepository } from '../../src/repositories/FollowRepository'

// Use test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
    }
  }
})

describe('Follow Integration Tests', () => {
  let followRepository: FollowRepository
  let testCreator1: any
  let testCreator2: any
  let testCreator3: any

  beforeAll(async () => {
    // Initialize repository
    followRepository = new FollowRepository(prisma)
    
    // Clean up any existing test data
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followed: { email: { contains: 'follow-integration-test' } } },
          { followerId: { contains: 'test-follower' } },
          { actorId: { contains: 'integration-test' } }
        ]
      }
    })
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'follow-integration-test' }
      }
    })
  })

  beforeEach(async () => {
    // Create fresh test users for each test to avoid foreign key constraint violations
    testCreator1 = await prisma.user.create({
      data: {
        email: 'creator1-follow-integration-test@example.com',
        username: 'testcreator1_follow',
        displayName: 'Test Creator 1',
        passwordHash: 'hashedpassword1',
        bio: 'Test creator 1 for follow integration tests',
        avatar: 'https://example.com/avatar1.jpg',
        isVerified: true,
        verificationTier: 'email'
      }
    })

    testCreator2 = await prisma.user.create({
      data: {
        email: 'creator2-follow-integration-test@example.com',
        username: 'testcreator2_follow',
        displayName: 'Test Creator 2',
        passwordHash: 'hashedpassword2',
        bio: 'Test creator 2 for follow integration tests',
        avatar: 'https://example.com/avatar2.jpg',
        isVerified: false,
        verificationTier: 'none'
      }
    })

    testCreator3 = await prisma.user.create({
      data: {
        email: 'creator3-follow-integration-test@example.com',
        username: 'testcreator3_follow',
        displayName: 'Test Creator 3',
        passwordHash: 'hashedpassword3',
        bio: 'Test creator 3 for follow integration tests',
        avatar: 'https://example.com/avatar3.jpg',
        isVerified: true,
        verificationTier: 'notable'
      }
    })
  })

  afterEach(async () => {
    // Clean up follows first (foreign key constraints require this order)
    await prisma.follow.deleteMany({
      where: {
        followedId: { in: [testCreator1.id, testCreator2.id, testCreator3.id] }
      }
    })
    
    // Then clean up users
    await prisma.user.deleteMany({
      where: {
        id: { in: [testCreator1.id, testCreator2.id, testCreator3.id] }
      }
    })
  })

  afterAll(async () => {
    // Final cleanup and close database connection
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followed: { email: { contains: 'follow-integration-test' } } },
          { followerId: { contains: 'test-follower' } },
          { actorId: { contains: 'integration-test' } }
        ]
      }
    })
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'follow-integration-test' }
      }
    })
    await prisma.$disconnect()
  })

  /**
   * Test basic follow relationship creation and retrieval
   */
  describe('Follow Relationship Creation', () => {
    it('should create local user follow relationship', async () => {
      const followData = {
        followerId: 'test-follower-local-123',
        followedId: testCreator1.id
      }

      // Create follow relationship
      const createdFollow = await followRepository.create(followData)

      // Verify follow was created with correct data
      expect(createdFollow.followerId).toBe('test-follower-local-123')
      expect(createdFollow.followedId).toBe(testCreator1.id)
      expect(createdFollow.actorId).toBeNull()
      expect(createdFollow.isAccepted).toBe(true)
      expect(createdFollow.id).toBeDefined()
      expect(createdFollow.createdAt).toBeInstanceOf(Date)

      // Verify included user data
      expect(createdFollow.followed.id).toBe(testCreator1.id)
      expect(createdFollow.followed.username).toBe('testcreator1_follow')
      expect(createdFollow.followed.displayName).toBe('Test Creator 1')
      expect(createdFollow.followed.isVerified).toBe(true)
      expect(createdFollow.followed.avatar).toBe('https://example.com/avatar1.jpg')
    })

    it('should create ActivityPub federated follow relationship', async () => {
      const followData = {
        followerId: 'test-follower-fed-456',
        followedId: testCreator2.id,
        actorId: 'https://mastodon.social/users/integration-test-user'
      }

      // Create federated follow relationship
      const createdFollow = await followRepository.create(followData)

      // Verify federated follow was created correctly
      expect(createdFollow.followerId).toBe('test-follower-fed-456')
      expect(createdFollow.followedId).toBe(testCreator2.id)
      expect(createdFollow.actorId).toBe('https://mastodon.social/users/integration-test-user')
      expect(createdFollow.isAccepted).toBe(true)

      // Verify included user data for unverified user
      expect(createdFollow.followed.id).toBe(testCreator2.id)
      expect(createdFollow.followed.username).toBe('testcreator2_follow')
      expect(createdFollow.followed.isVerified).toBe(false)
    })

    it('should enforce foreign key constraint for invalid user', async () => {
      const invalidFollowData = {
        followerId: 'test-follower-invalid',
        followedId: 'nonexistent-user-id'
      }

      // Attempt to create follow with invalid user ID should fail
      await expect(followRepository.create(invalidFollowData)).rejects.toThrow()
    })

    it('should prevent duplicate follow relationships', async () => {
      const followData = {
        followerId: 'duplicate-test-follower',
        followedId: testCreator1.id
      }

      // Create first follow relationship
      await followRepository.create(followData)

      // Attempt to create duplicate should fail due to unique constraint
      await expect(followRepository.create(followData)).rejects.toThrow()
    })
  })

  /**
   * Test finding and checking follow relationships
   */
  describe('Follow Relationship Retrieval', () => {
    beforeEach(async () => {
      // Create test follow relationships for retrieval tests
      await followRepository.create({
        followerId: 'local-follower-1',
        followedId: testCreator1.id
      })
      
      await followRepository.create({
        followerId: 'local-follower-2', 
        followedId: testCreator1.id,
        actorId: 'https://pleroma.example.com/users/integration-test'
      })
    })

    it('should find follow relationship by local follower ID', async () => {
      const found = await followRepository.findByFollowerAndFollowed('local-follower-1', testCreator1.id)

      expect(found).not.toBeNull()
      expect(found!.followerId).toBe('local-follower-1')
      expect(found!.followedId).toBe(testCreator1.id)
      expect(found!.followed.username).toBe('testcreator1_follow')
    })

    it('should find follow relationship by ActivityPub actor ID', async () => {
      const found = await followRepository.findByFollowerAndFollowed(
        'https://pleroma.example.com/users/integration-test',
        testCreator1.id
      )

      expect(found).not.toBeNull()
      expect(found!.actorId).toBe('https://pleroma.example.com/users/integration-test')
      expect(found!.followedId).toBe(testCreator1.id)
    })

    it('should return null for non-existent follow relationship', async () => {
      const found = await followRepository.findByFollowerAndFollowed('nonexistent-follower', testCreator1.id)

      expect(found).toBeNull()
    })

    it('should check follow status correctly', async () => {
      // Check existing follow
      const isFollowing = await followRepository.isFollowing('local-follower-1', testCreator1.id)
      expect(isFollowing).toBe(true)

      // Check non-existent follow
      const isNotFollowing = await followRepository.isFollowing('random-user', testCreator1.id)
      expect(isNotFollowing).toBe(false)
    })
  })

  /**
   * Test unfollow functionality
   */
  describe('Unfollow Functionality', () => {
    beforeEach(async () => {
      // Create follow relationships for deletion tests
      await followRepository.create({
        followerId: 'follower-to-delete',
        followedId: testCreator1.id
      })
    })

    it('should successfully delete existing follow relationship', async () => {
      // Verify follow exists before deletion
      const beforeDelete = await followRepository.isFollowing('follower-to-delete', testCreator1.id)
      expect(beforeDelete).toBe(true)

      // Delete the follow relationship
      const deleted = await followRepository.deleteByFollowerAndFollowed('follower-to-delete', testCreator1.id)

      // Verify deletion was successful
      expect(deleted).not.toBeNull()
      expect(deleted!.followerId).toBe('follower-to-delete')
      expect(deleted!.followedId).toBe(testCreator1.id)

      // Verify follow no longer exists
      const afterDelete = await followRepository.isFollowing('follower-to-delete', testCreator1.id)
      expect(afterDelete).toBe(false)
    })

    it('should return null when attempting to delete non-existent follow', async () => {
      const deleted = await followRepository.deleteByFollowerAndFollowed('nonexistent-follower', testCreator1.id)

      expect(deleted).toBeNull()
    })

    it('should delete federated follow relationship by actor ID', async () => {
      // Create federated follow
      await followRepository.create({
        followerId: 'fed-follower-to-delete',
        followedId: testCreator2.id,
        actorId: 'https://mastodon.example.com/users/test-delete'
      })

      // Delete by actor ID
      const deleted = await followRepository.deleteByFollowerAndFollowed(
        'https://mastodon.example.com/users/test-delete', 
        testCreator2.id
      )

      expect(deleted).not.toBeNull()
      expect(deleted!.actorId).toBe('https://mastodon.example.com/users/test-delete')
    })
  })

  /**
   * Test follower lists and pagination
   */
  describe('Follower Lists and Pagination', () => {
    beforeEach(async () => {
      // Create multiple followers for pagination testing
      const followers = [
        { followerId: 'follower-1', followedId: testCreator1.id },
        { followerId: 'follower-2', followedId: testCreator1.id },
        { followerId: 'follower-3', followedId: testCreator1.id },
        { followerId: 'follower-4', followedId: testCreator1.id },
        { followerId: 'follower-5', followedId: testCreator1.id, actorId: 'https://mastodon.example.com/user1' },
        { followerId: 'follower-6', followedId: testCreator1.id, actorId: 'https://pleroma.example.com/user2' }
      ]

      for (const followerData of followers) {
        await followRepository.create(followerData)
      }
    })

    it('should get paginated follower list', async () => {
      const result = await followRepository.findFollowersByUserId(testCreator1.id, { limit: 3, offset: 0 })

      expect(result.followers).toHaveLength(3)
      expect(result.totalCount).toBe(6)
      expect(result.hasMore).toBe(true) // 0 + 3 < 6, so there are more
    })

    it('should get second page of followers', async () => {
      const result = await followRepository.findFollowersByUserId(testCreator1.id, { limit: 3, offset: 3 })

      expect(result.followers).toHaveLength(3)
      expect(result.totalCount).toBe(6)
      expect(result.hasMore).toBe(false) // 3 + 3 >= 6, so no more
    })

    it('should return all followers when no pagination specified', async () => {
      const result = await followRepository.findFollowersByUserId(testCreator1.id)

      expect(result.followers).toHaveLength(6)
      expect(result.totalCount).toBe(6)
    })

    it('should return empty list for user with no followers', async () => {
      const result = await followRepository.findFollowersByUserId(testCreator3.id)

      expect(result.followers).toHaveLength(0)
      expect(result.totalCount).toBe(0)
    })

    it('should include both local and federated followers', async () => {
      const result = await followRepository.findFollowersByUserId(testCreator1.id)

      const localFollowers = result.followers.filter(f => !f.actorId)
      const federatedFollowers = result.followers.filter(f => f.actorId)

      expect(localFollowers).toHaveLength(4)
      expect(federatedFollowers).toHaveLength(2)
    })
  })

  /**
 * Test recent followers functionality
 * Creates dedicated test user to avoid foreign key constraint violations
 * from other test sections that may delete shared test users
 */
describe('Recent Followers', () => {
  // Dedicated test user for this test section only
  let recentFollowersTestUser: any

  beforeEach(async () => {
    // Create a dedicated test user specifically for recent followers tests
    // This prevents foreign key constraint violations when other tests delete shared users
    recentFollowersTestUser = await prisma.user.create({
      data: {
        email: 'recent-followers-test@example.com',
        username: 'recentfollowerstestuser',
        displayName: 'Recent Followers Test User',
        passwordHash: 'hashedpassword-recent',
        bio: 'Dedicated user for recent followers integration tests',
        avatar: 'https://example.com/recent-followers-avatar.jpg',
        isVerified: true,
        verificationTier: 'email'
      }
    })

    // Create followers with slight delays to ensure different timestamps
    // Using the dedicated test user to avoid foreign key constraint violations
    await followRepository.create({ 
      followerId: 'recent-1', 
      followedId: recentFollowersTestUser.id 
    })
    
    // Small delay to ensure different timestamps for ordering tests
    await new Promise(resolve => setTimeout(resolve, 10))
    
    await followRepository.create({ 
      followerId: 'recent-2', 
      followedId: recentFollowersTestUser.id 
    })
    
    // Small delay to ensure different timestamps for ordering tests
    await new Promise(resolve => setTimeout(resolve, 10))
    
    await followRepository.create({ 
      followerId: 'recent-3', 
      followedId: recentFollowersTestUser.id 
    })
  })

  afterEach(async () => {
    // Clean up follows first due to foreign key constraints
    // Delete all follows for our dedicated test user
    await prisma.follow.deleteMany({
      where: {
        followedId: recentFollowersTestUser.id
      }
    })
    
    // Then delete the dedicated test user
    await prisma.user.delete({
      where: {
        id: recentFollowersTestUser.id
      }
    })
  })

  it('should get recent followers in correct order', async () => {
    // Test that recent followers are returned in descending chronological order
    const recentFollowers = await followRepository.findRecentFollowers(recentFollowersTestUser.id, 5)

    expect(recentFollowers).toHaveLength(3)

    // Verify ordering - most recent follower should be first
    expect(recentFollowers[0].followerId).toBe('recent-3') // Most recent
    expect(recentFollowers[1].followerId).toBe('recent-2') // Middle
    expect(recentFollowers[2].followerId).toBe('recent-1') // Oldest

    // Verify timestamps are in descending order (newest first)
    expect(recentFollowers[0].createdAt.getTime()).toBeGreaterThanOrEqual(
      recentFollowers[1].createdAt.getTime()
    )
    expect(recentFollowers[1].createdAt.getTime()).toBeGreaterThanOrEqual(
      recentFollowers[2].createdAt.getTime()
    )
  })

  it('should respect custom limit', async () => {
    // Test that the limit parameter correctly restricts the number of results
    const limitedFollowers = await followRepository.findRecentFollowers(recentFollowersTestUser.id, 2)

    expect(limitedFollowers).toHaveLength(2)
    
    // Should return the 2 most recent followers
    expect(limitedFollowers[0].followerId).toBe('recent-3') // Most recent
    expect(limitedFollowers[1].followerId).toBe('recent-2') // Second most recent
  })

  it('should return empty array for user with no followers', async () => {
    // Create another test user with no followers to test empty result
    const userWithNoFollowers = await prisma.user.create({
      data: {
        email: 'no-followers-test@example.com',
        username: 'nofollowerstestuser',
        displayName: 'No Followers Test User',
        passwordHash: 'hashedpassword-no-followers',
        bio: 'User with no followers for testing',
        isVerified: false,
        verificationTier: 'none'
      }
    })

    try {
      // Test that a user with no followers returns empty array
      const recentFollowers = await followRepository.findRecentFollowers(userWithNoFollowers.id, 5)

      expect(recentFollowers).toHaveLength(0)
    } finally {
      // Clean up the temporary test user
      await prisma.user.delete({
        where: {
          id: userWithNoFollowers.id
        }
      })
    }
  })
})

  /**
   * Test follow statistics
   */
  describe('Follow Statistics', () => {
    beforeEach(async () => {
      // Create followers for testCreator1
      await followRepository.create({ followerId: 'stats-follower-1', followedId: testCreator1.id })
      await followRepository.create({ followerId: 'stats-follower-2', followedId: testCreator1.id })
      await followRepository.create({ followerId: 'stats-follower-3', followedId: testCreator1.id })

      // Create followers for testCreator2
      await followRepository.create({ followerId: 'stats-follower-4', followedId: testCreator2.id })
    })

    it('should return correct follower count', async () => {
      const stats1 = await followRepository.getFollowStats(testCreator1.id)
      const stats2 = await followRepository.getFollowStats(testCreator2.id)
      const stats3 = await followRepository.getFollowStats(testCreator3.id)

      expect(stats1.followerCount).toBe(3)
      expect(stats2.followerCount).toBe(1)
      expect(stats3.followerCount).toBe(0)
    })
  })

  /**
   * Test cascade deletion when users are deleted
   */
  describe('Cascade Deletion', () => {
    it('should cascade delete follows when followed user is deleted', async () => {
      // Create follow relationships
      await followRepository.create({ 
        followerId: 'cascade-test-1', 
        followedId: testCreator1.id 
      })
      await followRepository.create({ 
        followerId: 'cascade-test-2', 
        followedId: testCreator1.id 
      })

      // Verify follows exist before deletion
      const beforeDelete = await followRepository.findFollowersByUserId(testCreator1.id)
      expect(beforeDelete.totalCount).toBe(2)

      // Delete the user (should cascade delete follows due to onDelete: Cascade in schema)
      await prisma.user.delete({ where: { id: testCreator1.id } })

      // Verify follows were cascade deleted
      const remainingFollows = await prisma.follow.findMany({
        where: { followedId: testCreator1.id }
      })
      expect(remainingFollows).toHaveLength(0)

      // Also verify using count for robustness
      const followCount = await prisma.follow.count({
        where: { followedId: testCreator1.id }
      })
      expect(followCount).toBe(0)
    })

    it('should not affect other users follows when one user is deleted', async () => {
      // Create follows for multiple users
      await followRepository.create({ 
        followerId: 'multi-test-1', 
        followedId: testCreator1.id 
      })
      await followRepository.create({ 
        followerId: 'multi-test-2', 
        followedId: testCreator2.id 
      })
      await followRepository.create({ 
        followerId: 'multi-test-3', 
        followedId: testCreator3.id 
      })

      // Delete one user
      await prisma.user.delete({ where: { id: testCreator1.id } })

      // Verify other users still have their follows
      const creator2Follows = await prisma.follow.count({
        where: { followedId: testCreator2.id }
      })
      const creator3Follows = await prisma.follow.count({
        where: { followedId: testCreator3.id }
      })

      expect(creator2Follows).toBe(1)
      expect(creator3Follows).toBe(1)

      // Verify deleted user has no follows
      const deletedUserFollows = await prisma.follow.count({
        where: { followedId: testCreator1.id }
      })
      expect(deletedUserFollows).toBe(0)
    })
  })

  /**
   * Test edge cases and error handling
   */
  describe('Edge Cases and Error Handling', () => {
    it('should handle very long follower IDs', async () => {
      const longFollowerId = 'a'.repeat(255) // Max length
      
      const followData = {
        followerId: longFollowerId,
        followedId: testCreator1.id
      }

      const createdFollow = await followRepository.create(followData)
      expect(createdFollow.followerId).toBe(longFollowerId)
    })

    it('should handle ActivityPub actor URLs properly', async () => {
      const actorId = 'https://very-long-domain-name.example.com/users/very-long-username-that-tests-limits'
      
      const followData = {
        followerId: 'test-long-actor',
        followedId: testCreator1.id,
        actorId: actorId
      }

      const createdFollow = await followRepository.create(followData)
      expect(createdFollow.actorId).toBe(actorId)
    })

    it('should handle null actorId gracefully', async () => {
      const followData = {
        followerId: 'test-null-actor',
        followedId: testCreator1.id,
        actorId: null
      }

      const createdFollow = await followRepository.create(followData)
      expect(createdFollow.actorId).toBeNull()
    })
  })
})