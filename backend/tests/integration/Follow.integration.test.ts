// backend/tests/integration/Follow.integration.test.ts
// Integration tests for Follow functionality with real database operations
// Tests FollowRepository methods against actual PostgreSQL database

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { FollowRepository } from '../../src/repositories/FollowRepository'

// Use test database with proper connection URL
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
    // Initialize repository with real Prisma client
    followRepository = new FollowRepository(prisma)
    
    // Clean up any existing test data before starting
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
    // Create test creator users for each test
    testCreator1 = await prisma.user.create({
      data: {
        email: 'creator1-follow-integration-test@example.com',
        username: 'testcreator1_follow',
        displayName: 'Test Creator 1',
        passwordHash: 'hashedpassword1',
        bio: 'Integration test creator user 1',
        isVerified: true,
        verificationTier: 'email',
        avatar: 'https://example.com/avatar1.jpg'
      }
    })

    testCreator2 = await prisma.user.create({
      data: {
        email: 'creator2-follow-integration-test@example.com',
        username: 'testcreator2_follow',
        displayName: 'Test Creator 2', 
        passwordHash: 'hashedpassword2',
        bio: 'Integration test creator user 2',
        isVerified: false,
        avatar: 'https://example.com/avatar2.jpg'
      }
    })

    testCreator3 = await prisma.user.create({
      data: {
        email: 'creator3-follow-integration-test@example.com',
        username: 'testcreator3_follow',
        displayName: 'Test Creator 3',
        passwordHash: 'hashedpassword3',
        bio: 'Integration test creator user 3',
        isVerified: true,
        verificationTier: 'notable'
      }
    })
  })

  afterEach(async () => {
    // Clean up test data after each test
    await prisma.follow.deleteMany({
      where: {
        followedId: { in: [testCreator1.id, testCreator2.id, testCreator3.id] }
      }
    })
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

      // Create all follow relationships
      for (const followerData of followers) {
        await followRepository.create(followerData)
      }

      // Add some followers for other creators
      await followRepository.create({
        followerId: 'other-follower-1',
        followedId: testCreator2.id
      })
    })

    it('should get followers with default pagination', async () => {
      const result = await followRepository.findFollowersByUserId(testCreator1.id)

      // Verify pagination results
      expect(result.followers).toHaveLength(6) // All 6 followers fit in default limit of 20
      expect(result.totalCount).toBe(6)
      expect(result.hasMore).toBe(false) // 0 + 20 >= 6

      // Verify followers are sorted by creation date (most recent first)
      expect(result.followers[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        result.followers[5].createdAt.getTime()
      )

      // Verify follower data structure
      const firstFollower = result.followers[0]
      expect(firstFollower.id).toBeDefined()
      expect(firstFollower.followerId).toBeDefined()
      expect(firstFollower.createdAt).toBeInstanceOf(Date)
      expect(firstFollower.followed.id).toBe(testCreator1.id)
      expect(firstFollower.followed.username).toBe('testcreator1_follow')
    })

    it('should handle custom pagination correctly', async () => {
      // Test pagination with offset and limit
      const page1 = await followRepository.findFollowersByUserId(testCreator1.id, { offset: 0, limit: 3 })
      expect(page1.followers).toHaveLength(3)
      expect(page1.totalCount).toBe(6)
      expect(page1.hasMore).toBe(true) // 0 + 3 < 6

      const page2 = await followRepository.findFollowersByUserId(testCreator1.id, { offset: 3, limit: 3 })
      expect(page2.followers).toHaveLength(3)
      expect(page2.totalCount).toBe(6)
      expect(page2.hasMore).toBe(false) // 3 + 3 >= 6

      // Verify no overlap between pages
      const page1Ids = page1.followers.map(f => f.id)
      const page2Ids = page2.followers.map(f => f.id)
      const intersection = page1Ids.filter(id => page2Ids.includes(id))
      expect(intersection).toHaveLength(0)
    })

    it('should only return followers for specified user', async () => {
      const creator1Followers = await followRepository.findFollowersByUserId(testCreator1.id)
      const creator2Followers = await followRepository.findFollowersByUserId(testCreator2.id)

      expect(creator1Followers.totalCount).toBe(6)
      expect(creator2Followers.totalCount).toBe(1)

      // Verify all returned followers are for the correct user
      creator1Followers.followers.forEach(follow => {
        expect(follow.followed.id).toBe(testCreator1.id)
      })

      creator2Followers.followers.forEach(follow => {
        expect(follow.followed.id).toBe(testCreator2.id)
      })
    })
  })

  /**
   * Test follow statistics calculations
   */
  describe('Follow Statistics', () => {
    beforeEach(async () => {
      // Create varied follow relationships for statistics testing
      // testCreator1: 3 followers
      await followRepository.create({ followerId: 'stats-follower-1', followedId: testCreator1.id })
      await followRepository.create({ followerId: 'stats-follower-2', followedId: testCreator1.id })
      await followRepository.create({ followerId: 'stats-follower-3', followedId: testCreator1.id })

      // testCreator2: 1 follower  
      await followRepository.create({ followerId: 'stats-follower-4', followedId: testCreator2.id })

      // testCreator3: 0 followers (but following others - not typical for ParaSocial but testing completeness)
      await followRepository.create({ followerId: testCreator3.id, followedId: testCreator1.id })
    })

    it('should calculate correct follower and following counts', async () => {
      // Test creator with multiple followers
      const creator1Stats = await followRepository.getFollowStats(testCreator1.id)
      expect(creator1Stats.followerCount).toBe(4) // 3 direct + 1 from testCreator3
      expect(creator1Stats.followingCount).toBe(0) // ParaSocial creators typically don't follow others

      // Test creator with one follower
      const creator2Stats = await followRepository.getFollowStats(testCreator2.id)
      expect(creator2Stats.followerCount).toBe(1)
      expect(creator2Stats.followingCount).toBe(0)

      // Test creator with no followers but following someone
      const creator3Stats = await followRepository.getFollowStats(testCreator3.id)
      expect(creator3Stats.followerCount).toBe(0)
      expect(creator3Stats.followingCount).toBe(1) // Following testCreator1
    })

    it('should handle users with no relationships', async () => {
      // Create a user with no follow relationships
      const isolatedUser = await prisma.user.create({
        data: {
          email: 'isolated-follow-integration-test@example.com',
          username: 'isolated_user',
          displayName: 'Isolated User',
          passwordHash: 'password'
        }
      })

      const stats = await followRepository.getFollowStats(isolatedUser.id)
      expect(stats.followerCount).toBe(0)
      expect(stats.followingCount).toBe(0)

      // Cleanup
      await prisma.user.delete({ where: { id: isolatedUser.id } })
    })
  })

  /**
   * Test bulk operations for efficient UI updates
   */
  describe('Bulk Operations', () => {
    beforeEach(async () => {
      // Create follow relationships for bulk testing
      await followRepository.create({ followerId: 'bulk-follower', followedId: testCreator1.id })
      await followRepository.create({ followerId: 'bulk-follower', followedId: testCreator3.id })
      // Intentionally not following testCreator2
    })

    it('should check follow status for multiple users efficiently', async () => {
      const userIds = [testCreator1.id, testCreator2.id, testCreator3.id]
      const followMap = await followRepository.bulkCheckFollowing('bulk-follower', userIds)

      expect(followMap[testCreator1.id]).toBe(true)  // Following
      expect(followMap[testCreator2.id]).toBe(false) // Not following
      expect(followMap[testCreator3.id]).toBe(true)  // Following

      // Verify all requested users are included in result
      expect(Object.keys(followMap)).toHaveLength(3)
      expect(followMap).toHaveProperty(testCreator1.id)
      expect(followMap).toHaveProperty(testCreator2.id)
      expect(followMap).toHaveProperty(testCreator3.id)
    })

    it('should handle empty user list', async () => {
      const followMap = await followRepository.bulkCheckFollowing('bulk-follower', [])
      expect(followMap).toEqual({})
    })

    it('should handle bulk check with no follows', async () => {
      const userIds = [testCreator1.id, testCreator2.id]
      const followMap = await followRepository.bulkCheckFollowing('non-follower', userIds)

      expect(followMap[testCreator1.id]).toBe(false)
      expect(followMap[testCreator2.id]).toBe(false)
    })
  })

  /**
   * Test recent followers functionality for notifications
   */
  describe('Recent Followers', () => {
    beforeEach(async () => {
      // Create followers with slight time delays to test ordering
      await followRepository.create({ followerId: 'recent-1', followedId: testCreator1.id })
      
      // Add small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))
      
      await followRepository.create({ followerId: 'recent-2', followedId: testCreator1.id })
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      await followRepository.create({ followerId: 'recent-3', followedId: testCreator1.id })
    })

    it('should get recent followers in correct order', async () => {
      const recentFollowers = await followRepository.findRecentFollowers(testCreator1.id, 5)

      expect(recentFollowers).toHaveLength(3)

      // Verify ordering (most recent first)
      expect(recentFollowers[0].followerId).toBe('recent-3') // Most recent
      expect(recentFollowers[1].followerId).toBe('recent-2') // Middle
      expect(recentFollowers[2].followerId).toBe('recent-1') // Oldest

      // Verify timestamps are in descending order
      expect(recentFollowers[0].createdAt.getTime()).toBeGreaterThanOrEqual(
        recentFollowers[1].createdAt.getTime()
      )
      expect(recentFollowers[1].createdAt.getTime()).toBeGreaterThanOrEqual(
        recentFollowers[2].createdAt.getTime()
      )
    })

    it('should respect custom limit', async () => {
      const limitedFollowers = await followRepository.findRecentFollowers(testCreator1.id, 2)

      expect(limitedFollowers).toHaveLength(2)
      expect(limitedFollowers[0].followerId).toBe('recent-3') // Most recent
      expect(limitedFollowers[1].followerId).toBe('recent-2') // Second most recent
    })
  })

  /**
   * Test cascade deletion when users are deleted
   */
  describe('Cascade Deletion', () => {
    it('should cascade delete follows when followed user is deleted', async () => {
      // Create follow relationships
      await followRepository.create({ followerId: 'cascade-test-1', followedId: testCreator1.id })
      await followRepository.create({ followerId: 'cascade-test-2', followedId: testCreator1.id })

      // Verify follows exist
      const beforeDelete = await followRepository.findFollowersByUserId(testCreator1.id)
      expect(beforeDelete.totalCount).toBe(2)

      // Delete the user (should cascade delete follows)
      await prisma.user.delete({ where: { id: testCreator1.id } })

      // Verify follows were cascade deleted by checking with another creator
      const afterDelete = await followRepository.findFollowersByUserId(testCreator2.id)
      // testCreator2 should still exist and have no unexpected follows
      expect(afterDelete.totalCount).toBe(0)

      // Check that the specific follows are gone by searching the entire follow table
      const remainingFollows = await prisma.follow.findMany({
        where: { followedId: testCreator1.id }
      })
      expect(remainingFollows).toHaveLength(0)
    })
  })
})