// backend\src\repositories\__tests__\Follow.integration.test.ts
// Version: 1.0.1
// Fixed Prisma relation issues by retrieving user data separately instead of using include

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
  await prisma.follow.deleteMany()
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

describe('Follow Integration Tests', () => {
  let prisma: PrismaClient

  beforeEach(async () => {
    prisma = getTestPrismaClient()
    await cleanupTestData(prisma)
  })

  afterEach(async () => {
    await cleanupTestData(prisma)
    await prisma.$disconnect()
  })

  describe('Follow Creation and Validation', () => {
    it('should create follow relationship successfully', async () => {
      // Create test users
      const follower = await createTestUser(prisma, {
        username: 'follower_user',
        email: 'follower@test.com'
      })

      const followed = await createTestUser(prisma, {
        username: 'followed_user', 
        email: 'followed@test.com'
      })

      // Create follow relationship
      const follow = await prisma.follow.create({
        data: {
          followerId: follower.id,
          followedId: followed.id,
          createdAt: new Date()
        }
      })

      // Verify follow relationship was created
      expect(follow).toBeDefined()
      expect(follow.followerId).toBe(follower.id)
      expect(follow.followedId).toBe(followed.id)

      // Verify relationship exists in database
      const existingFollow = await prisma.follow.findFirst({
        where: {
          followerId: follower.id,
          followedId: followed.id
        }
      })

      expect(existingFollow).toBeDefined()
    })

    it('should prevent duplicate follow relationships', async () => {
      // Create test users
      const follower = await createTestUser(prisma, {
        username: 'duplicate_follower',
        email: 'duplicate.follower@test.com'
      })

      const followed = await createTestUser(prisma, {
        username: 'duplicate_followed',
        email: 'duplicate.followed@test.com'
      })

      // Create initial follow relationship
      await prisma.follow.create({
        data: {
          followerId: follower.id,
          followedId: followed.id,
          createdAt: new Date()
        }
      })

      // Attempt to create duplicate follow relationship should fail
      await expect(
        prisma.follow.create({
          data: {
            followerId: follower.id,
            followedId: followed.id,
            createdAt: new Date()
          }
        })
      ).rejects.toThrow()
    })

    it('should prevent self-following', async () => {
      // Create test user
      const user = await createTestUser(prisma, {
        username: 'self_follow_user',
        email: 'self@test.com'
      })

      // Attempt to create self-follow relationship should fail
      await expect(
        prisma.follow.create({
          data: {
            followerId: user.id,
            followedId: user.id,
            createdAt: new Date()
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Follow Relationship Operations', () => {
    it('should retrieve followers for a user', async () => {
      // Create test users
      const targetUser = await createTestUser(prisma, {
        username: 'target_user',
        email: 'target@test.com'
      })

      const follower1 = await createTestUser(prisma, {
        username: 'follower_1',
        email: 'follower1@test.com'
      })

      const follower2 = await createTestUser(prisma, {
        username: 'follower_2',
        email: 'follower2@test.com'
      })

      // Create follow relationships
      await prisma.follow.create({
        data: {
          followerId: follower1.id,
          followedId: targetUser.id,
          createdAt: new Date()
        }
      })

      await prisma.follow.create({
        data: {
          followerId: follower2.id,
          followedId: targetUser.id,
          createdAt: new Date()
        }
      })

      // Retrieve followers - get user data separately to avoid relation issues
      const followRelations = await prisma.follow.findMany({
        where: {
          followedId: targetUser.id
        }
      })

      // Get follower user details
      const followerIds = followRelations.map(f => f.followerId)
      const followerUsers = await prisma.user.findMany({
        where: {
          id: { in: followerIds }
        }
      })

      expect(followerUsers).toHaveLength(2)
      expect(followerUsers.map(u => u.username)).toContain('follower_1')
      expect(followerUsers.map(u => u.username)).toContain('follower_2')
    })

    it('should retrieve who a user is following', async () => {
      // Create test users
      const followerUser = await createTestUser(prisma, {
        username: 'active_follower',
        email: 'active.follower@test.com'
      })

      const followed1 = await createTestUser(prisma, {
        username: 'followed_1',
        email: 'followed1@test.com'
      })

      const followed2 = await createTestUser(prisma, {
        username: 'followed_2',
        email: 'followed2@test.com'
      })

      // Create follow relationships
      await prisma.follow.create({
        data: {
          followerId: followerUser.id,
          followedId: followed1.id,
          createdAt: new Date()
        }
      })

      await prisma.follow.create({
        data: {
          followerId: followerUser.id,
          followedId: followed2.id,
          createdAt: new Date()
        }
      })

      // Retrieve following list - get user data separately to avoid relation issues
      const followingRelations = await prisma.follow.findMany({
        where: {
          followerId: followerUser.id
        }
      })

      // Get followed user details
      const followedIds = followingRelations.map(f => f.followedId)
      const followedUsers = await prisma.user.findMany({
        where: {
          id: { in: followedIds }
        }
      })

      expect(followedUsers).toHaveLength(2)
      expect(followedUsers.map(u => u.username)).toContain('followed_1')
      expect(followedUsers.map(u => u.username)).toContain('followed_2')
    })

    it('should successfully unfollow a user', async () => {
      // Create test users
      const follower = await createTestUser(prisma, {
        username: 'unfollow_user',
        email: 'unfollow@test.com'
      })

      const followed = await createTestUser(prisma, {
        username: 'to_unfollow',
        email: 'to.unfollow@test.com'
      })

      // Create follow relationship
      await prisma.follow.create({
        data: {
          followerId: follower.id,
          followedId: followed.id,
          createdAt: new Date()
        }
      })

      // Verify follow exists
      const existingFollow = await prisma.follow.findFirst({
        where: {
          followerId: follower.id,
          followedId: followed.id
        }
      })
      expect(existingFollow).toBeDefined()

      // Unfollow (delete relationship)
      await prisma.follow.deleteMany({
        where: {
          followerId: follower.id,
          followedId: followed.id
        }
      })

      // Verify follow no longer exists
      const removedFollow = await prisma.follow.findFirst({
        where: {
          followerId: follower.id,
          followedId: followed.id
        }
      })
      expect(removedFollow).toBeNull()
    })
  })

  describe('Follow Relationship Constraints', () => {
    it('should cascade delete follow relationships when user is deleted', async () => {
      // Create test users
      const userToDelete = await createTestUser(prisma, {
        username: 'delete_me',
        email: 'delete@test.com'
      })

      const otherUser = await createTestUser(prisma, {
        username: 'other_user',
        email: 'other@test.com'
      })

      // Create follow relationships (both as follower and followed)
      await prisma.follow.create({
        data: {
          followerId: userToDelete.id,
          followedId: otherUser.id,
          createdAt: new Date()
        }
      })

      await prisma.follow.create({
        data: {
          followerId: otherUser.id,
          followedId: userToDelete.id,
          createdAt: new Date()
        }
      })

      // Verify follows exist
      const followsBefore = await prisma.follow.findMany({
        where: {
          OR: [
            { followerId: userToDelete.id },
            { followedId: userToDelete.id }
          ]
        }
      })
      expect(followsBefore).toHaveLength(2)

      // Delete user
      await prisma.user.delete({
        where: { id: userToDelete.id }
      })

      // Verify follow relationships were cascade deleted
      const followsAfter = await prisma.follow.findMany({
        where: {
          OR: [
            { followerId: userToDelete.id },
            { followedId: userToDelete.id }
          ]
        }
      })
      expect(followsAfter).toHaveLength(0)
    })

    it('should reject follow relationship with non-existent user', async () => {
      // Create one test user
      const realUser = await createTestUser(prisma, {
        username: 'real_user',
        email: 'real@test.com'
      })

      const fakeUserId = 'non-existent-user-id'

      // Attempt to create follow with non-existent follower should fail
      await expect(
        prisma.follow.create({
          data: {
            followerId: fakeUserId,
            followedId: realUser.id,
            createdAt: new Date()
          }
        })
      ).rejects.toThrow()

      // Attempt to create follow with non-existent followed should fail
      await expect(
        prisma.follow.create({
          data: {
            followerId: realUser.id,
            followedId: fakeUserId,
            createdAt: new Date()
          }
        })
      ).rejects.toThrow()
    })
  })
})

// backend\src\repositories\__tests__\Follow.integration.test.ts
// Version: 1.0.1
// Fixed Prisma relation issues by retrieving user data separately instead of using include