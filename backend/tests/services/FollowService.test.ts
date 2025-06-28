// backend/tests/services/FollowService.test.ts
// Unit tests for FollowService with mocked repositories
// Tests business logic, validation, and error handling without database dependencies

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FollowService } from '../../src/services/FollowService'

/**
 * Mock FollowRepository with all required methods
 */
const mockFollowRepository = {
  create: vi.fn(),
  findByFollowerAndFollowed: vi.fn(),
  deleteByFollowerAndFollowed: vi.fn(),
  findFollowersByUserId: vi.fn(),
  findFollowingByUserId: vi.fn(),
  getFollowStats: vi.fn(),
  isFollowing: vi.fn(),
  bulkCheckFollowing: vi.fn(),
  findRecentFollowers: vi.fn()
}

/**
 * Mock UserRepository with required methods
 */
const mockUserRepository = {
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByUsername: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}

describe('FollowService Unit Tests', () => {
  let followService: FollowService

  // Test data fixtures
  const testUserId = 'user_123'
  const testFollowerId = 'follower_456'
  const testActorId = 'https://mastodon.social/users/testuser'

  const mockUser = {
    id: testUserId,
    username: 'testuser',
    displayName: 'Test User',
    email: 'test@example.com',
    isActive: true,
    isVerified: true
  }

  const mockInactiveUser = {
    ...mockUser,
    id: 'inactive_user',
    isActive: false
  }

  const mockFollowRelationship = {
    id: 'follow_123',
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

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Create fresh service instance with mocked dependencies
    followService = new FollowService(
      mockFollowRepository as any,
      mockUserRepository as any
    )
  })

  /**
   * Test follow user functionality
   */
  describe('followUser()', () => {
    it('should successfully create follow relationship', async () => {
      // Setup mocks
      mockUserRepository.findById.mockResolvedValueOnce(mockUser)
      mockFollowRepository.findByFollowerAndFollowed.mockResolvedValueOnce(null)
      mockFollowRepository.create.mockResolvedValueOnce(mockFollowRelationship)

      const followData = {
        followerId: testFollowerId,
        followedId: testUserId
      }

      // Execute the method under test
      const result = await followService.followUser(followData)

      // Verify success result
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockFollowRelationship)
      expect(result.error).toBeUndefined()

      // Verify repository calls
      expect(mockUserRepository.findById).toHaveBeenCalledWith(testUserId)
      expect(mockFollowRepository.findByFollowerAndFollowed).toHaveBeenCalledWith(testFollowerId, testUserId)
      expect(mockFollowRepository.create).toHaveBeenCalledWith({
        followerId: testFollowerId,
        followedId: testUserId,
        actorId: undefined
      })
    })

    it('should create ActivityPub federated follow relationship', async () => {
      // Setup mocks for federated follow
      mockUserRepository.findById.mockResolvedValueOnce(mockUser)
      mockFollowRepository.findByFollowerAndFollowed.mockResolvedValueOnce(null)
      mockFollowRepository.create.mockResolvedValueOnce({
        ...mockFollowRelationship,
        actorId: testActorId
      })

      const followData = {
        followerId: testFollowerId,
        followedId: testUserId,
        actorId: testActorId
      }

      // Execute the method under test
      const result = await followService.followUser(followData)

      // Verify success and ActivityPub data
      expect(result.success).toBe(true)
      expect(mockFollowRepository.create).toHaveBeenCalledWith({
        followerId: testFollowerId,
        followedId: testUserId,
        actorId: testActorId
      })
    })

    it('should reject self-follow attempts', async () => {
      const selfFollowData = {
        followerId: testUserId,
        followedId: testUserId
      }

      // Execute the method under test
      const result = await followService.followUser(selfFollowData)

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('Users cannot follow themselves')
      expect(result.code).toBe('SELF_FOLLOW_ERROR')

      // Verify no repository calls were made
      expect(mockUserRepository.findById).not.toHaveBeenCalled()
      expect(mockFollowRepository.create).not.toHaveBeenCalled()
    })

    it('should reject follow when user not found', async () => {
      // Setup mock to return null (user not found)
      mockUserRepository.findById.mockResolvedValueOnce(null)

      const followData = {
        followerId: testFollowerId,
        followedId: 'nonexistent_user'
      }

      // Execute the method under test
      const result = await followService.followUser(followData)

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('User to follow not found')
      expect(result.code).toBe('USER_NOT_FOUND')

      // Verify follow creation was not attempted
      expect(mockFollowRepository.create).not.toHaveBeenCalled()
    })

    it('should reject follow when user is inactive', async () => {
      // Setup mock to return inactive user
      mockUserRepository.findById.mockResolvedValueOnce(mockInactiveUser)

      const followData = {
        followerId: testFollowerId,
        followedId: 'inactive_user'
      }

      // Execute the method under test
      const result = await followService.followUser(followData)

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot follow inactive user')
      expect(result.code).toBe('USER_INACTIVE')

      // Verify follow creation was not attempted
      expect(mockFollowRepository.create).not.toHaveBeenCalled()
    })

    it('should reject follow when already following', async () => {
      // Setup mocks for existing follow
      mockUserRepository.findById.mockResolvedValueOnce(mockUser)
      mockFollowRepository.findByFollowerAndFollowed.mockResolvedValueOnce(mockFollowRelationship)

      const followData = {
        followerId: testFollowerId,
        followedId: testUserId
      }

      // Execute the method under test
      const result = await followService.followUser(followData)

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('Already following this user')
      expect(result.code).toBe('ALREADY_FOLLOWING')

      // Verify create was not called
      expect(mockFollowRepository.create).not.toHaveBeenCalled()
    })

    it('should reject invalid ActivityPub actor ID', async () => {
      // Setup mocks to pass the earlier validation steps
      mockUserRepository.findById.mockResolvedValueOnce(mockUser)
      mockFollowRepository.findByFollowerAndFollowed.mockResolvedValueOnce(null)

      const followData = {
        followerId: testFollowerId,
        followedId: testUserId,
        actorId: 'http://insecure.example.com/user' // HTTP instead of HTTPS
      }

      // Execute the method under test
      const result = await followService.followUser(followData)

      // Verify rejection due to invalid actor
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid ActivityPub actor ID format')
      expect(result.code).toBe('INVALID_ACTOR_ID')

      // Verify that we got far enough to check the user but not create the follow
      expect(mockUserRepository.findById).toHaveBeenCalledWith(testUserId)
      expect(mockFollowRepository.findByFollowerAndFollowed).toHaveBeenCalledWith(testFollowerId, testUserId)
      expect(mockFollowRepository.create).not.toHaveBeenCalled()
    })

    it('should handle validation errors for invalid input', async () => {
      const invalidFollowData = {
        followerId: '', // Empty follower ID
        followedId: testUserId
      }

      // Execute the method under test
      const result = await followService.followUser(invalidFollowData)

      // Verify validation error
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid follow request data')
      expect(result.code).toBe('VALIDATION_ERROR')
    })
  })

  /**
   * Test unfollow user functionality
   */
  describe('unfollowUser()', () => {
    it('should successfully remove follow relationship', async () => {
      // Setup mocks
      mockFollowRepository.findByFollowerAndFollowed.mockResolvedValueOnce(mockFollowRelationship)
      mockFollowRepository.deleteByFollowerAndFollowed.mockResolvedValueOnce(mockFollowRelationship)

      const unfollowData = {
        followerId: testFollowerId,
        followedId: testUserId
      }

      // Execute the method under test
      const result = await followService.unfollowUser(unfollowData)

      // Verify success
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockFollowRelationship)

      // Verify repository calls
      expect(mockFollowRepository.findByFollowerAndFollowed).toHaveBeenCalledWith(testFollowerId, testUserId)
      expect(mockFollowRepository.deleteByFollowerAndFollowed).toHaveBeenCalledWith(testFollowerId, testUserId)
    })

    it('should reject unfollow when not following', async () => {
      // Setup mock to return null (no follow relationship)
      mockFollowRepository.findByFollowerAndFollowed.mockResolvedValueOnce(null)

      const unfollowData = {
        followerId: testFollowerId,
        followedId: testUserId
      }

      // Execute the method under test
      const result = await followService.unfollowUser(unfollowData)

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('Follow relationship does not exist')
      expect(result.code).toBe('NOT_FOLLOWING')

      // Verify delete was not attempted
      expect(mockFollowRepository.deleteByFollowerAndFollowed).not.toHaveBeenCalled()
    })

    it('should handle validation errors for invalid input', async () => {
      const invalidUnfollowData = {
        followerId: testFollowerId,
        followedId: '' // Empty followed ID
      }

      // Execute the method under test
      const result = await followService.unfollowUser(invalidUnfollowData)

      // Verify validation error
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid unfollow request data')
      expect(result.code).toBe('VALIDATION_ERROR')
    })
  })

  /**
   * Test followers retrieval functionality
   */
  describe('getFollowers()', () => {
    const mockFollowersResult = {
      followers: [mockFollowRelationship],
      totalCount: 1,
      hasMore: false
    }

    it('should successfully get followers with default pagination', async () => {
      // Setup mocks
      mockUserRepository.findById.mockResolvedValueOnce(mockUser)
      mockFollowRepository.findFollowersByUserId.mockResolvedValueOnce(mockFollowersResult)

      // Execute the method under test
      const result = await followService.getFollowers(testUserId)

      // Verify success
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockFollowersResult)

      // Verify repository calls
      expect(mockUserRepository.findById).toHaveBeenCalledWith(testUserId)
      expect(mockFollowRepository.findFollowersByUserId).toHaveBeenCalledWith(testUserId, {})
    })

    it('should handle custom pagination options', async () => {
      // Setup mocks
      mockUserRepository.findById.mockResolvedValueOnce(mockUser)
      mockFollowRepository.findFollowersByUserId.mockResolvedValueOnce(mockFollowersResult)

      const paginationOptions = { offset: 10, limit: 5 }

      // Execute the method under test
      const result = await followService.getFollowers(testUserId, paginationOptions)

      // Verify pagination was passed through
      expect(mockFollowRepository.findFollowersByUserId).toHaveBeenCalledWith(testUserId, paginationOptions)
    })

    it('should reject when user not found', async () => {
      // Setup mock to return null
      mockUserRepository.findById.mockResolvedValueOnce(null)

      // Execute the method under test
      const result = await followService.getFollowers('nonexistent_user')

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })

    it('should handle invalid pagination options', async () => {
      const invalidPagination = { offset: -1, limit: 0 }

      // Execute the method under test
      const result = await followService.getFollowers(testUserId, invalidPagination)

      // Verify validation error
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid pagination options')
      expect(result.code).toBe('VALIDATION_ERROR')
    })

    it('should reject invalid user ID', async () => {
      // Execute with invalid user ID
      const result = await followService.getFollowers('')

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('Valid user ID is required')
      expect(result.code).toBe('INVALID_USER_ID')
    })
  })

  /**
   * Test follow statistics functionality
   */
  describe('getFollowStats()', () => {
    const mockStats = {
      followerCount: 150,
      followingCount: 25
    }

    it('should successfully get follow statistics', async () => {
      // Setup mocks
      mockUserRepository.findById.mockResolvedValueOnce(mockUser)
      mockFollowRepository.getFollowStats.mockResolvedValueOnce(mockStats)

      // Execute the method under test
      const result = await followService.getFollowStats(testUserId)

      // Verify success
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockStats)

      // Verify repository calls
      expect(mockUserRepository.findById).toHaveBeenCalledWith(testUserId)
      expect(mockFollowRepository.getFollowStats).toHaveBeenCalledWith(testUserId)
    })

    it('should reject when user not found', async () => {
      // Setup mock to return null
      mockUserRepository.findById.mockResolvedValueOnce(null)

      // Execute the method under test
      const result = await followService.getFollowStats('nonexistent_user')

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
      expect(result.code).toBe('USER_NOT_FOUND')
    })

    it('should reject invalid user ID', async () => {
      // Execute with invalid user ID
      const result = await followService.getFollowStats('')

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('Valid user ID is required')
      expect(result.code).toBe('INVALID_USER_ID')
    })
  })

  /**
   * Test follow status checking functionality
   */
  describe('checkFollowStatus()', () => {
    it('should successfully check follow status when following', async () => {
      // Setup mock to return true
      mockFollowRepository.isFollowing.mockResolvedValueOnce(true)

      // Execute the method under test
      const result = await followService.checkFollowStatus(testFollowerId, testUserId)

      // Verify success
      expect(result.success).toBe(true)
      expect(result.data).toBe(true)

      // Verify repository call
      expect(mockFollowRepository.isFollowing).toHaveBeenCalledWith(testFollowerId, testUserId)
    })

    it('should successfully check follow status when not following', async () => {
      // Setup mock to return false
      mockFollowRepository.isFollowing.mockResolvedValueOnce(false)

      // Execute the method under test
      const result = await followService.checkFollowStatus(testFollowerId, testUserId)

      // Verify success
      expect(result.success).toBe(true)
      expect(result.data).toBe(false)
    })

    it('should reject invalid parameters', async () => {
      // Execute with invalid parameters
      const result = await followService.checkFollowStatus('', testUserId)

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('Valid follower and followed user IDs are required')
      expect(result.code).toBe('INVALID_PARAMETERS')
    })
  })

  /**
   * Test bulk follow checking functionality
   */
  describe('bulkCheckFollowing()', () => {
    const userIds = ['user1', 'user2', 'user3']
    const mockBulkResult = {
      user1: true,
      user2: false,
      user3: true
    }

    it('should successfully perform bulk follow check', async () => {
      // Setup mock
      mockFollowRepository.bulkCheckFollowing.mockResolvedValueOnce(mockBulkResult)

      // Execute the method under test
      const result = await followService.bulkCheckFollowing(testFollowerId, userIds)

      // Verify success
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockBulkResult)

      // Verify repository call
      expect(mockFollowRepository.bulkCheckFollowing).toHaveBeenCalledWith(testFollowerId, userIds)
    })

    it('should reject when too many users requested', async () => {
      // Create array with more than 100 users
      const tooManyUsers = Array(101).fill('user').map((_, i) => `user${i}`)

      // Execute the method under test
      const result = await followService.bulkCheckFollowing(testFollowerId, tooManyUsers)

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot check more than 100 users at once')
      expect(result.code).toBe('TOO_MANY_USERS')
    })

    it('should reject invalid follower ID', async () => {
      // Execute with invalid follower ID
      const result = await followService.bulkCheckFollowing('', userIds)

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('Valid follower ID is required')
      expect(result.code).toBe('INVALID_FOLLOWER_ID')
    })

    it('should reject non-array user IDs', async () => {
      // Execute with non-array user IDs
      const result = await followService.bulkCheckFollowing(testFollowerId, 'not-an-array' as any)

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('User IDs must be an array')
      expect(result.code).toBe('INVALID_USER_IDS')
    })

    it('should reject invalid user IDs in array', async () => {
      const invalidUserIds = ['user1', '', 'user3'] // Empty string in middle

      // Execute the method under test
      const result = await followService.bulkCheckFollowing(testFollowerId, invalidUserIds)

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('All user IDs must be valid strings')
      expect(result.code).toBe('INVALID_USER_IDS')
    })
  })

  /**
   * Test recent followers functionality
   */
  describe('getRecentFollowers()', () => {
    const mockRecentFollowers = [mockFollowRelationship]

    it('should successfully get recent followers with default limit', async () => {
      // Setup mock
      mockFollowRepository.findRecentFollowers.mockResolvedValueOnce(mockRecentFollowers)

      // Execute the method under test
      const result = await followService.getRecentFollowers(testUserId)

      // Verify success
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockRecentFollowers)

      // Verify repository call with default limit
      expect(mockFollowRepository.findRecentFollowers).toHaveBeenCalledWith(testUserId, 10)
    })

    it('should handle custom limit within bounds', async () => {
      // Setup mock
      mockFollowRepository.findRecentFollowers.mockResolvedValueOnce(mockRecentFollowers)

      // Execute with custom limit
      const result = await followService.getRecentFollowers(testUserId, 25)

      // Verify custom limit was used
      expect(mockFollowRepository.findRecentFollowers).toHaveBeenCalledWith(testUserId, 25)
    })

    it('should constrain limit to maximum of 50', async () => {
      // Setup mock
      mockFollowRepository.findRecentFollowers.mockResolvedValueOnce(mockRecentFollowers)

      // Execute with limit over 50
      const result = await followService.getRecentFollowers(testUserId, 100)

      // Verify limit was capped at 50
      expect(mockFollowRepository.findRecentFollowers).toHaveBeenCalledWith(testUserId, 50)
    })

    it('should constrain limit to minimum of 1', async () => {
      // Setup mock
      mockFollowRepository.findRecentFollowers.mockResolvedValueOnce(mockRecentFollowers)

      // Execute with negative limit
      const result = await followService.getRecentFollowers(testUserId, -5)

      // Verify limit was set to minimum of 1
      expect(mockFollowRepository.findRecentFollowers).toHaveBeenCalledWith(testUserId, 1)
    })

    it('should reject invalid user ID', async () => {
      // Execute with invalid user ID
      const result = await followService.getRecentFollowers('')

      // Verify rejection
      expect(result.success).toBe(false)
      expect(result.error).toBe('Valid user ID is required')
      expect(result.code).toBe('INVALID_USER_ID')
    })
  })

  /**
   * Test error handling for repository failures
   */
  describe('Error Handling', () => {
    it('should handle repository errors in followUser', async () => {
      // Setup mock to throw error
      mockUserRepository.findById.mockRejectedValueOnce(new Error('Database error'))

      const followData = {
        followerId: testFollowerId,
        followedId: testUserId
      }

      // Execute the method under test
      const result = await followService.followUser(followData)

      // Verify error handling
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create follow relationship')
      expect(result.code).toBe('INTERNAL_ERROR')
    })

    it('should handle repository errors in getFollowStats', async () => {
      // Setup mock to throw error
      mockUserRepository.findById.mockResolvedValueOnce(mockUser)
      mockFollowRepository.getFollowStats.mockRejectedValueOnce(new Error('Database error'))

      // Execute the method under test
      const result = await followService.getFollowStats(testUserId)

      // Verify error handling
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to retrieve follow statistics')
      expect(result.code).toBe('INTERNAL_ERROR')
    })
  })
})