// backend/tests/unit/repositories/FollowRepository.test.ts
// Unit tests for FollowRepository with mocked Prisma client
// Tests all follow/unfollow functionality without requiring database connection

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FollowRepository } from '../../src/repositories/FollowRepository'
'../src/repositories/FollowRepository'

/**
 * Mock Prisma client with all required follow operations
 * Using vi.fn() to create trackable mock functions for assertions
 */
const mockPrismaClient = {
  follow: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn()
  }
}

describe('FollowRepository Unit Tests', () => {
  let followRepository: FollowRepository

  // Test data fixtures for consistent testing
  const testUserId = 'user_123'
  const testFollowerId = 'follower_456'
  const testActorId = 'https://mastodon.social/users/testuser'
  const testFollowId = 'follow_789'

  const mockFollowData = {
    id: testFollowId,
    followerId: testFollowerId,
    followedId: testUserId,
    actorId: null,
    isAccepted: true,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    followed: {
      id: testUserId,
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
      isVerified: true
    }
  }

  const mockFollowDataWithActor = {
    ...mockFollowData,
    id: 'follow_actor_123',
    followerId: testFollowerId,
    actorId: testActorId
  }

  beforeEach(() => {
    // Reset all mocks before each test to ensure clean state
    vi.clearAllMocks()
    
    // Create fresh repository instance with mocked client
    followRepository = new FollowRepository(mockPrismaClient as any)
  })

  /**
   * Test follow relationship creation functionality
   */
  describe('create()', () => {
    it('should create follow relationship with local user ID', async () => {
      // Setup mock return value
      mockPrismaClient.follow.create.mockResolvedValueOnce(mockFollowData)

      const followData = {
        followerId: testFollowerId,
        followedId: testUserId
      }

      // Execute the method under test
      const result = await followRepository.create(followData)

      // Verify Prisma create was called with correct parameters
      expect(mockPrismaClient.follow.create).toHaveBeenCalledWith({
        data: {
          followerId: testFollowerId,
          followedId: testUserId,
          actorId: null,
          isAccepted: true
        },
        include: {
          followed: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true
            }
          }
        }
      })

      // Verify correct result returned
      expect(result).toEqual(mockFollowData)
    })

    it('should create follow relationship with ActivityPub actor ID', async () => {
      // Setup mock return value for federated follow
      mockPrismaClient.follow.create.mockResolvedValueOnce(mockFollowDataWithActor)

      const followData = {
        followerId: testFollowerId,
        followedId: testUserId,
        actorId: testActorId
      }

      // Execute the method under test
      const result = await followRepository.create(followData)

      // Verify actorId was properly included
      expect(mockPrismaClient.follow.create).toHaveBeenCalledWith({
        data: {
          followerId: testFollowerId,
          followedId: testUserId,
          actorId: testActorId,
          isAccepted: true
        },
        include: {
          followed: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true
            }
          }
        }
      })

      expect(result).toEqual(mockFollowDataWithActor)
    })

    it('should handle Prisma creation errors', async () => {
      // Setup mock to throw error
      const error = new Error('Database connection failed')
      mockPrismaClient.follow.create.mockRejectedValueOnce(error)

      const followData = {
        followerId: testFollowerId,
        followedId: testUserId
      }

      // Verify error is properly propagated
      await expect(followRepository.create(followData)).rejects.toThrow('Database connection failed')
    })
  })

  /**
   * Test finding follow relationships by follower and followed user
   */
  describe('findByFollowerAndFollowed()', () => {
    it('should find follow relationship by local user IDs', async () => {
      // Setup mock return value
      mockPrismaClient.follow.findFirst.mockResolvedValueOnce(mockFollowData)

      // Execute the method under test
      const result = await followRepository.findByFollowerAndFollowed(testFollowerId, testUserId)

      // Verify correct query parameters for local follow
      expect(mockPrismaClient.follow.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              followerId: testFollowerId,
              followedId: testUserId
            },
            {
              actorId: testFollowerId,
              followedId: testUserId
            }
          ]
        },
        include: {
          followed: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true
            }
          }
        }
      })

      expect(result).toEqual(mockFollowData)
    })

    it('should find follow relationship by ActivityPub actor ID', async () => {
      // Setup mock return value for federated follow search
      mockPrismaClient.follow.findFirst.mockResolvedValueOnce(mockFollowDataWithActor)

      // Search using actor ID as follower ID
      const result = await followRepository.findByFollowerAndFollowed(testActorId, testUserId)

      // Verify OR query handles both local and federated IDs
      expect(mockPrismaClient.follow.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              followerId: testActorId,
              followedId: testUserId
            },
            {
              actorId: testActorId,
              followedId: testUserId
            }
          ]
        },
        include: {
          followed: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true
            }
          }
        }
      })

      expect(result).toEqual(mockFollowDataWithActor)
    })

    it('should return null when follow relationship not found', async () => {
      // Setup mock to return null
      mockPrismaClient.follow.findFirst.mockResolvedValueOnce(null)

      // Execute the method under test
      const result = await followRepository.findByFollowerAndFollowed('nonexistent', testUserId)

      expect(result).toBeNull()
    })
  })

  /**
   * Test unfollow functionality by deleting follow relationships
   */
  describe('deleteByFollowerAndFollowed()', () => {
    it('should delete existing follow relationship', async () => {
      // Setup mocks for find-then-delete operation
      mockPrismaClient.follow.findFirst.mockResolvedValueOnce(mockFollowData)
      mockPrismaClient.follow.delete.mockResolvedValueOnce(mockFollowData)

      // Execute the method under test
      const result = await followRepository.deleteByFollowerAndFollowed(testFollowerId, testUserId)

      // Verify find operation was called first
      expect(mockPrismaClient.follow.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              followerId: testFollowerId,
              followedId: testUserId
            },
            {
              actorId: testFollowerId,
              followedId: testUserId
            }
          ]
        },
        include: {
          followed: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true
            }
          }
        }
      })

      // Verify delete operation was called with correct ID
      expect(mockPrismaClient.follow.delete).toHaveBeenCalledWith({
        where: {
          id: testFollowId
        },
        include: {
          followed: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true
            }
          }
        }
      })

      expect(result).toEqual(mockFollowData)
    })

    it('should return null when trying to delete non-existent follow relationship', async () => {
      // Setup mock to return null (relationship not found)
      mockPrismaClient.follow.findFirst.mockResolvedValueOnce(null)

      // Execute the method under test
      const result = await followRepository.deleteByFollowerAndFollowed('nonexistent', testUserId)

      // Verify find was called but delete was not
      expect(mockPrismaClient.follow.findFirst).toHaveBeenCalled()
      expect(mockPrismaClient.follow.delete).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })

  /**
   * Test follower list retrieval with pagination
   */
  describe('findFollowersByUserId()', () => {
    const mockFollowers = [mockFollowData, mockFollowDataWithActor]
    const mockTotalCount = 25

    it('should get followers with default pagination', async () => {
      // Setup mocks for findMany and count operations
      mockPrismaClient.follow.findMany.mockResolvedValueOnce(mockFollowers)
      mockPrismaClient.follow.count.mockResolvedValueOnce(mockTotalCount)

      // Execute the method under test
      const result = await followRepository.findFollowersByUserId(testUserId)

      // Verify correct query for followers
      expect(mockPrismaClient.follow.findMany).toHaveBeenCalledWith({
        where: {
          followedId: testUserId,
          isAccepted: true
        },
        select: {
          id: true,
          followerId: true,
          actorId: true,
          createdAt: true,
          followed: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: 0, // Default offset
        take: 20 // Default limit
      })

      // Verify count query for pagination
      expect(mockPrismaClient.follow.count).toHaveBeenCalledWith({
        where: {
          followedId: testUserId,
          isAccepted: true
        }
      })

      // Verify result structure
      expect(result).toEqual({
        followers: mockFollowers,
        totalCount: mockTotalCount,
        hasMore: true // 0 + 20 < 25
      })
    })

    it('should handle custom pagination options', async () => {
      mockPrismaClient.follow.findMany.mockResolvedValueOnce([])
      mockPrismaClient.follow.count.mockResolvedValueOnce(15)

      const options = { offset: 10, limit: 5 }

      // Execute with custom pagination
      const result = await followRepository.findFollowersByUserId(testUserId, options)

      // Verify custom pagination parameters were used
      expect(mockPrismaClient.follow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 5
        })
      )

      // Verify hasMore calculation
      expect(result.hasMore).toBe(false) // 10 + 5 >= 15
    })
  })

  /**
   * Test follow statistics calculation
   */
  describe('getFollowStats()', () => {
    it('should calculate follower and following counts', async () => {
      const followerCount = 150
      const followingCount = 25

      // Setup mocks for both count operations
      mockPrismaClient.follow.count
        .mockResolvedValueOnce(followerCount)  // First call for followers
        .mockResolvedValueOnce(followingCount) // Second call for following

      // Execute the method under test
      const result = await followRepository.getFollowStats(testUserId)

      // Verify follower count query
      expect(mockPrismaClient.follow.count).toHaveBeenNthCalledWith(1, {
        where: {
          followedId: testUserId,
          isAccepted: true
        }
      })

      // Verify following count query (handles both local and ActivityPub)
      expect(mockPrismaClient.follow.count).toHaveBeenNthCalledWith(2, {
        where: {
          OR: [
            { followerId: testUserId },
            { actorId: testUserId }
          ],
          isAccepted: true
        }
      })

      // Verify result structure
      expect(result).toEqual({
        followerCount,
        followingCount
      })
    })
  })

  /**
   * Test follow status checking
   */
  describe('isFollowing()', () => {
    it('should return true when follow relationship exists', async () => {
      // Setup mock to return existing follow
      mockPrismaClient.follow.findFirst.mockResolvedValueOnce(mockFollowData)

      // Execute the method under test
      const result = await followRepository.isFollowing(testFollowerId, testUserId)

      expect(result).toBe(true)
    })

    it('should return false when follow relationship does not exist', async () => {
      // Setup mock to return null
      mockPrismaClient.follow.findFirst.mockResolvedValueOnce(null)

      // Execute the method under test
      const result = await followRepository.isFollowing('nonexistent', testUserId)

      expect(result).toBe(false)
    })

    it('should return false when follow is not accepted', async () => {
      // Setup mock to return unaccepted follow
      const unacceptedFollow = { ...mockFollowData, isAccepted: false }
      mockPrismaClient.follow.findFirst.mockResolvedValueOnce(unacceptedFollow)

      // Execute the method under test
      const result = await followRepository.isFollowing(testFollowerId, testUserId)

      expect(result).toBe(false)
    })
  })

  /**
   * Test bulk follow status checking for efficient UI updates
   */
  describe('bulkCheckFollowing()', () => {
    it('should return follow status map for multiple users', async () => {
      const userIds = ['user1', 'user2', 'user3']
      const mockFollows = [
        { followedId: 'user1' },
        { followedId: 'user3' }
      ]

      // Setup mock to return some follows
      mockPrismaClient.follow.findMany.mockResolvedValueOnce(mockFollows)

      // Execute the method under test
      const result = await followRepository.bulkCheckFollowing(testFollowerId, userIds)

      // Verify query parameters
      expect(mockPrismaClient.follow.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { followerId: testFollowerId },
            { actorId: testFollowerId }
          ],
          followedId: { in: userIds },
          isAccepted: true
        },
        select: {
          followedId: true
        }
      })

      // Verify result map structure
      expect(result).toEqual({
        user1: true,  // Following
        user2: false, // Not following
        user3: true   // Following
      })
    })

    it('should handle empty user ID array', async () => {
      mockPrismaClient.follow.findMany.mockResolvedValueOnce([])

      // Execute with empty array
      const result = await followRepository.bulkCheckFollowing(testFollowerId, [])

      expect(result).toEqual({})
    })
  })

  /**
   * Test recent followers retrieval for notifications
   */
  describe('findRecentFollowers()', () => {
    it('should get recent followers with default limit', async () => {
      const recentFollowers = [mockFollowData]
      mockPrismaClient.follow.findMany.mockResolvedValueOnce(recentFollowers)

      // Execute the method under test
      const result = await followRepository.findRecentFollowers(testUserId)

      // Verify query with default limit
      expect(mockPrismaClient.follow.findMany).toHaveBeenCalledWith({
        where: {
          followedId: testUserId,
          isAccepted: true
        },
        select: {
          id: true,
          followerId: true,
          actorId: true,
          createdAt: true,
          followed: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10 // Default limit
      })

      expect(result).toEqual(recentFollowers)
    })

    it('should handle custom limit', async () => {
      mockPrismaClient.follow.findMany.mockResolvedValueOnce([])

      // Execute with custom limit
      await followRepository.findRecentFollowers(testUserId, 5)

      // Verify custom limit was used
      expect(mockPrismaClient.follow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5
        })
      )
    })
  })
})