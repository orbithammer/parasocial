// backend/tests/integration/Follow.integration.test.ts
// Simple fix that uses your existing database setup

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { FollowRepository } from '../../src/repositories/FollowRepository'

describe('Follow Integration Tests', () => {
  let prisma: PrismaClient
  let followRepository: FollowRepository
  let testUser1: any
  let testUser2: any
  let testUser3: any

  beforeEach(async () => {
    // Use the existing DATABASE_URL from your environment
    // Don't override it - just use whatever is already configured
    prisma = new PrismaClient()
    
    await prisma.$connect()
    console.log('✅ Database connected')
    
    followRepository = new FollowRepository(prisma)

    // Clean up any existing test data
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: { startsWith: 'test_' } },
          { followedId: { startsWith: 'test_' } }
        ]
      }
    })
    
    await prisma.user.deleteMany({
      where: {
        email: { contains: 'test-follow@' }
      }
    })

    // Create test users with unique identifiers
    testUser1 = await prisma.user.create({
      data: {
        email: 'user1-test-follow@example.com',
        username: `testuser1_${Date.now()}`,
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
        email: 'user2-test-follow@example.com',
        username: `testuser2_${Date.now()}`,
        passwordHash: 'hashedPassword2',
        displayName: 'Test User 2',
        bio: 'Bio for user 2',
        avatar: null,
        isVerified: true,
        verificationTier: 'email',
        website: null
      }
    })

    testUser3 = await prisma.user.create({
      data: {
        email: 'user3-test-follow@example.com',
        username: `testuser3_${Date.now()}`,
        passwordHash: 'hashedPassword3',
        displayName: 'Test User 3',
        bio: 'Bio for user 3',
        avatar: null,
        isVerified: false,
        verificationTier: 'none',
        website: null
      }
    })

    console.log(`✅ Created test users: ${testUser1.id}, ${testUser2.id}, ${testUser3.id}`)
  })

  afterEach(async () => {
    // Clean up test data after each test
    try {
      await prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: { in: [testUser1?.id, testUser2?.id, testUser3?.id] } },
            { followedId: { in: [testUser1?.id, testUser2?.id, testUser3?.id] } }
          ]
        }
      })
      
      await prisma.user.deleteMany({
        where: {
          id: { in: [testUser1?.id, testUser2?.id, testUser3?.id] }
        }
      })
    } catch (error) {
      console.warn('Cleanup error:', error)
    } finally {
      await prisma.$disconnect()
    }
  })

  describe('Follow Creation and Validation', () => {
    it('should create follow relationship successfully', async () => {
      expect(testUser1.id).toBeDefined()
      expect(testUser2.id).toBeDefined()

      const followData = {
        followerId: testUser1.id,
        followedId: testUser2.id
      }

      console.log(`🔄 Creating follow: ${followData.followerId} -> ${followData.followedId}`)

      const result = await followRepository.create(followData)

      // Verify the follow relationship was created successfully
      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.followerId).toBe(testUser1.id)
      expect(result.followedId).toBe(testUser2.id)
      expect(result.createdAt).toBeDefined()
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.isAccepted).toBe(true)

      // Verify the included followed user data
      expect(result.followed).toBeDefined()
      expect(result.followed.id).toBe(testUser2.id)
      expect(result.followed.username).toBe(testUser2.username)
      expect(result.followed.displayName).toBe('Test User 2')
      expect(result.followed.isVerified).toBe(true)

      console.log(`✅ Follow relationship created successfully: ${result.id}`)

      // Verify the relationship exists in the database
      const foundFollow = await followRepository.findByFollowerAndFollowed(
        testUser1.id, 
        testUser2.id
      )
      expect(foundFollow).toBeDefined()
      expect(foundFollow!.id).toBe(result.id)
    })

    it('should prevent duplicate follow relationships', async () => {
      const followData = {
        followerId: testUser1.id,
        followedId: testUser2.id
      }

      // Create first follow relationship
      const firstFollow = await followRepository.create(followData)
      expect(firstFollow).toBeDefined()

      // Attempt to create duplicate should fail
      await expect(followRepository.create(followData)).rejects.toThrow()
    })

    it('should prevent self-following', async () => {
      const selfFollowData = {
        followerId: testUser1.id,
        followedId: testUser1.id
      }

      // This should be prevented by the repository validation
      await expect(followRepository.create(selfFollowData)).rejects.toThrow(
        'Users cannot follow themselves'
      )
    })
  })
})