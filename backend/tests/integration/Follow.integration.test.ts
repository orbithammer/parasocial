// backend/tests/integration/Follow.integration.test.ts
// Fixed integration tests for Follow functionality with SQLite database

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { FollowRepository } from '../../src/repositories/FollowRepository'
import { execSync } from 'child_process'
import * as fs from 'fs'

describe('Follow Integration Tests', () => {
  let prisma: PrismaClient
  let followRepository: FollowRepository
  let testUser1: any
  let testUser2: any
  let testUser3: any

  beforeAll(async () => {
    // Set up test database with SQLite
    process.env.DATABASE_URL = 'file:./test-follow.db'
    
    // Remove existing test database
    if (fs.existsSync('./test-follow.db')) {
      fs.unlinkSync('./test-follow.db')
    }
    
    // Reset database schema
    try {
      execSync('npx prisma db push --force-reset', { stdio: 'inherit' })
      console.log('✅ Test database schema created')
    } catch (error) {
      console.warn('Database reset failed, continuing with existing database')
    }
  })

  beforeEach(async () => {
    prisma = new PrismaClient()
    await prisma.$connect()
    
    followRepository = new FollowRepository(prisma)

    // Clean up any existing data
    await prisma.follow.deleteMany({})
    await prisma.user.deleteMany({})

    // Create test users with all required fields
    testUser1 = await prisma.user.create({
      data: {
        email: 'user1@example.com',
        username: 'testuser1',
        passwordHash: 'hashedPassword1',
        displayName: 'Test User 1',
        bio: 'Bio for user 1',
        avatar: null,
        isVerified: false,
        verificationTier: 'none',
        website: null
      }
    })

    testUser2 = await prisma.user.create({
      data: {
        email: 'user2@example.com',
        username: 'testuser2',
        passwordHash: 'hashedPassword2',
        displayName: 'Test User 2',
        bio: 'Bio for user 2',
        avatar: null,
        isVerified: false,
        verificationTier: 'none',
        website: null
      }
    })

    testUser3 = await prisma.user.create({
      data: {
        email: 'user3@example.com',
        username: 'testuser3',
        passwordHash: 'hashedPassword3',
        displayName: 'Test User 3',
        bio: 'Bio for user 3',
        avatar: null,
        isVerified: false,
        verificationTier: 'none',
        website: null
      }
    })
  })

  afterEach(async () => {
    // Clean up test data
    try {
      await prisma.follow.deleteMany({})
      await prisma.user.deleteMany({})
      await prisma.$disconnect()
    } catch (error) {
      console.warn('Cleanup error:', error)
    }
  })

  afterAll(async () => {
    // Final cleanup
    try {
      const cleanupPrisma = new PrismaClient()
      await cleanupPrisma.follow.deleteMany({})
      await cleanupPrisma.user.deleteMany({})
      await cleanupPrisma.$disconnect()
    } catch (error) {
      console.warn('Final cleanup error:', error)
    }

    // Clean up test database file
    if (fs.existsSync('./test-follow.db')) {
      fs.unlinkSync('./test-follow.db')
    }
  })

  describe('Follower Lists and Pagination', () => {
    it('should get paginated follower list', async () => {
      // Create multiple follow relationships with proper user references
      const followData1 = {
        followerId: testUser1.id,
        followedId: testUser2.id
      }

      const followData2 = {
        followerId: testUser3.id,
        followedId: testUser2.id
      }

      // Create the follow relationships
      await followRepository.create(followData1)
      await followRepository.create(followData2)

      // Test getting followers for user2 (who should have 2 followers)
      const followers = await followRepository.getFollowers(testUser2.id, {
        page: 1,
        limit: 10
      })

      expect(followers).toBeDefined()
      expect(Array.isArray(followers)).toBe(true)
      expect(followers.length).toBe(2)

      // Fixed: Verify the follower data includes user IDs
      const followerIds = followers.map(f => f.followerId)
      expect(followerIds).toContain(testUser1.id)
      expect(followerIds).toContain(testUser3.id)
    })

    it('should handle pagination correctly', async () => {
      // Create multiple follow relationships
      const followData1 = {
        followerId: testUser1.id,
        followedId: testUser2.id
      }
      const followData2 = {
        followerId: testUser3.id,
        followedId: testUser2.id
      }

      await followRepository.create(followData1)
      await followRepository.create(followData2)

      // Test first page
      const firstPage = await followRepository.getFollowers(testUser2.id, {
        page: 1,
        limit: 1
      })

      expect(firstPage.length).toBe(1)

      // Test second page
      const secondPage = await followRepository.getFollowers(testUser2.id, {
        page: 2,
        limit: 1
      })

      expect(secondPage.length).toBe(1)

      // Verify different followers on different pages
      expect(firstPage[0].followerId).not.toBe(secondPage[0].followerId)
    })

    it('should handle edge cases gracefully', async () => {
      // Create one follow relationship
      await followRepository.create({
        followerId: testUser1.id,
        followedId: testUser2.id
      })

      // Test with page 0 (should default to page 1)
      const zeroPageResult = await followRepository.getFollowers(testUser2.id, {
        page: 0,
        limit: 10
      })

      expect(zeroPageResult).toBeDefined()
      expect(Array.isArray(zeroPageResult)).toBe(true)

      // Test with negative limit (should handle gracefully)
      const negativeLimitResult = await followRepository.getFollowers(testUser2.id, {
        page: 1,
        limit: -1
      })

      expect(negativeLimitResult).toBeDefined()
      expect(Array.isArray(negativeLimitResult)).toBe(true)
    })
  })

  describe('Follow Creation and Validation', () => {
    it('should create follow relationship successfully', async () => {
      const followData = {
        followerId: testUser1.id,
        followedId: testUser2.id
      }

      const result = await followRepository.create(followData)

      expect(result).toBeDefined()
      expect(result.followerId).toBe(testUser1.id)
      expect(result.followedId).toBe(testUser2.id)
      expect(result.createdAt).toBeDefined()
    })

    it('should prevent duplicate follow relationships', async () => {
      const followData = {
        followerId: testUser1.id,
        followedId: testUser2.id
      }

      // Create first follow relationship
      await followRepository.create(followData)

      // Attempt to create duplicate should fail
      await expect(followRepository.create(followData)).rejects.toThrow()
    })

    it('should prevent self-following', async () => {
      const selfFollowData = {
        followerId: testUser1.id,
        followedId: testUser1.id
      }

      // This should either be prevented by the repository or database constraints
      await expect(followRepository.create(selfFollowData)).rejects.toThrow()
    })
  })

  describe('Follow Deletion', () => {
    it('should delete follow relationship successfully', async () => {
      // Create follow relationship
      const followData = {
        followerId: testUser1.id,
        followedId: testUser2.id
      }

      await followRepository.create(followData)

      // Verify it exists
      const beforeDelete = await followRepository.getFollowers(testUser2.id, {
        page: 1,
        limit: 10
      })
      expect(beforeDelete.length).toBe(1)

      // Delete the relationship
      await followRepository.delete(testUser1.id, testUser2.id)

      // Verify it's gone
      const afterDelete = await followRepository.getFollowers(testUser2.id, {
        page: 1,
        limit: 10
      })
      expect(afterDelete.length).toBe(0)
    })

    it('should handle deletion of non-existent relationship gracefully', async () => {
      // Attempt to delete non-existent relationship should not throw
      await expect(followRepository.delete(testUser1.id, testUser2.id)).resolves.not.toThrow()
    })
  })

  describe('Follow Status Checking', () => {
    it('should correctly identify follow status', async () => {
      // Initially no relationship
      const initialStatus = await followRepository.isFollowing(testUser1.id, testUser2.id)
      expect(initialStatus).toBe(false)

      // Create relationship
      await followRepository.create({
        followerId: testUser1.id,
        followedId: testUser2.id
      })

      // Now should be following
      const followingStatus = await followRepository.isFollowing(testUser1.id, testUser2.id)
      expect(followingStatus).toBe(true)

      // Reverse direction should still be false
      const reverseStatus = await followRepository.isFollowing(testUser2.id, testUser1.id)
      expect(reverseStatus).toBe(false)
    })
  })
})