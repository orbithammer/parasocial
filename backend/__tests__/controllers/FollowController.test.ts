// backend/tests/controllers/FollowController.test.ts
// Unit tests for FollowController with mocked dependencies
// Tests HTTP request/response handling and proper error mapping

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FollowController } from '../../src/controllers/FollowController'

/**
 * Mock FollowService with all required methods
 */
const mockFollowService = {
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  getFollowers: vi.fn(),
  getFollowing: vi.fn(),
  getFollowStats: vi.fn(),
  checkFollowStatus: vi.fn(),
  bulkCheckFollowing: vi.fn(),
  getRecentFollowers: vi.fn()
}

/**
 * Mock UserRepository with required methods
 */
const mockUserRepository = {
  findByUsername: vi.fn(),
  findById: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn()
}

/**
 * Mock Express request and response objects
 */
const createMockRequest = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  headers: {},
  user: undefined,
  ...overrides
})

const createMockResponse = () => {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis()
  }
  return res
}

describe('FollowController Unit Tests', () => {
  let followController: FollowController
  let mockReq: any
  let mockRes: any

  // Test data fixtures
  const testUsername = 'testuser'
  const testUserId = 'user_123'
  const testFollowerId = 'follower_456'
  const testActorId = 'https://mastodon.social/users/external'

  const mockUser = {
    id: testUserId,
    username: testUsername,
    displayName: 'Test User',
    email: 'test@example.com',
    isActive: true,
    isVerified: true
  }

  const mockAuthenticatedUser = {
    id: testFollowerId,
    username: 'follower',
    email: 'follower@example.com'
  }

  const mockFollowRelationship = {
    id: 'follow_123',
    followerId: testFollowerId,
    followedId: testUserId,
    actorId: null,
    isAccepted: true,
    createdAt: new Date(),
    followed: {
      id: testUserId,
      username: testUsername,
      displayName: 'Test User',
      avatar: null,
      isVerified: true
    }
  }

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Create fresh controller instance
    followController = new FollowController(
      mockFollowService as any,
      mockUserRepository as any
    )

    // Create fresh mock request and response
    mockReq = createMockRequest()
    mockRes = createMockResponse()
  })

  /**
   * Test followUser() endpoint - POST /users/:username/follow
   */
  describe('followUser()', () => {
    beforeEach(() => {
      mockReq.params = { username: testUsername }
      mockUserRepository.findByUsername.mockResolvedValue(mockUser)
    })

    it('should successfully follow user with authenticated request', async () => {
      // Setup authenticated request
      mockReq.user = mockAuthenticatedUser
      mockFollowService.followUser.mockResolvedValueOnce({
        success: true,
        data: mockFollowRelationship
      })

      // Execute the method under test
      await followController.followUser(mockReq, mockRes)

      // Verify repository and service calls
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(testUsername)
      expect(mockFollowService.followUser).toHaveBeenCalledWith({
        followerId: testFollowerId,
        followedId: testUserId,
        actorId: null
      })

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          follow: mockFollowRelationship,
          message: `Successfully started following ${testUsername}`
        }
      })
    })

    it('should successfully handle ActivityPub external follow', async () => {
      // Setup external follow request (no auth, but has actorId)
      mockReq.body = { actorId: testActorId }
      mockFollowService.followUser.mockResolvedValueOnce({
        success: true,
        data: { ...mockFollowRelationship, actorId: testActorId }
      })

      // Execute the method under test
      await followController.followUser(mockReq, mockRes)

      // Verify service was called with external actor
      expect(mockFollowService.followUser).toHaveBeenCalledWith({
        followerId: testActorId,
        followedId: testUserId,
        actorId: testActorId
      })

      // Verify success response
      expect(mockRes.status).toHaveBeenCalledWith(201)
    })

    it('should reject when username is missing', async () => {
      // Setup request with no username
      mockReq.params = {}

      // Execute the method under test
      await followController.followUser(mockReq, mockRes)

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username is required',
        code: 'MISSING_USERNAME'
      })

      // Verify no service calls were made
      expect(mockUserRepository.findByUsername).not.toHaveBeenCalled()
      expect(mockFollowService.followUser).not.toHaveBeenCalled()
    })

    it('should reject when user to follow not found', async () => {
      // Setup user not found
      mockUserRepository.findByUsername.mockResolvedValueOnce(null)
      mockReq.user = mockAuthenticatedUser

      // Execute the method under test
      await followController.followUser(mockReq, mockRes)

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      // Verify no follow service call was made
      expect(mockFollowService.followUser).not.toHaveBeenCalled()
    })

    it('should reject when no follower identity provided', async () => {
      // Setup request with no auth and no actorId
      // mockReq.user is undefined and mockReq.body is empty

      // Execute the method under test
      await followController.followUser(mockReq, mockRes)

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(409)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Either authentication or actorId is required',
        code: 'NO_FOLLOWER_IDENTITY'
      })
    })

    it('should handle service errors correctly', async () => {
      // Setup service to return error
      mockReq.user = mockAuthenticatedUser
      mockFollowService.followUser.mockResolvedValueOnce({
        success: false,
        error: 'Already following this user',
        code: 'ALREADY_FOLLOWING'
      })

      // Execute the method under test
      await followController.followUser(mockReq, mockRes)

      // Verify error response with correct status code mapping
      expect(mockRes.status).toHaveBeenCalledWith(409) // Conflict for ALREADY_FOLLOWING
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Already following this user',
        code: 'ALREADY_FOLLOWING'
      })
    })

    it('should handle unexpected exceptions', async () => {
      // Setup service to throw exception
      mockReq.user = mockAuthenticatedUser
      mockUserRepository.findByUsername.mockRejectedValueOnce(new Error('Database error'))

      // Execute the method under test
      await followController.followUser(mockReq, mockRes)

      // Verify error response
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to follow user',
        message: 'Database error'
      })
    })
  })

  /**
   * Test unfollowUser() endpoint - DELETE /users/:username/follow
   */
  describe('unfollowUser()', () => {
    beforeEach(() => {
      mockReq.params = { username: testUsername }
      mockReq.user = mockAuthenticatedUser
      mockUserRepository.findByUsername.mockResolvedValue(mockUser)
    })

    it('should successfully unfollow user', async () => {
      // Setup service success response
      mockFollowService.unfollowUser.mockResolvedValueOnce({
        success: true,
        data: mockFollowRelationship
      })

      // Execute the method under test
      await followController.unfollowUser(mockReq, mockRes)

      // Verify repository and service calls
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith(testUsername)
      expect(mockFollowService.unfollowUser).toHaveBeenCalledWith({
        followerId: testFollowerId,
        followedId: testUserId
      })

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: `Successfully unfollowed ${testUsername}`
        }
      })
    })

    it('should reject when authentication is missing', async () => {
      // Setup request with no authentication
      mockReq.user = undefined

      // Execute the method under test
      await followController.unfollowUser(mockReq, mockRes)

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      })

      // Verify no service calls were made
      expect(mockFollowService.unfollowUser).not.toHaveBeenCalled()
    })

    it('should handle service error for not following', async () => {
      // Setup service to return not following error
      mockFollowService.unfollowUser.mockResolvedValueOnce({
        success: false,
        error: 'Follow relationship does not exist',
        code: 'NOT_FOLLOWING'
      })

      // Execute the method under test
      await followController.unfollowUser(mockReq, mockRes)

      // Verify error response
      expect(mockRes.status).toHaveBeenCalledWith(404) // Fixed: Changed from 409 to 404 for NOT_FOLLOWING
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Follow relationship does not exist',
        code: 'NOT_FOLLOWING'
      })
    })
  })

  /**
   * Test getUserFollowers() endpoint - GET /users/:username/followers
   */
  describe('getUserFollowers()', () => {
    beforeEach(() => {
      mockReq.params = { username: testUsername }
      mockUserRepository.findByUsername.mockResolvedValue(mockUser)
    })

    it('should successfully get followers with default pagination', async () => {
      const mockFollowersResult = {
        followers: [mockFollowRelationship],
        totalCount: 1,
        hasMore: false
      }

      // Setup service success response
      mockFollowService.getFollowers.mockResolvedValueOnce({
        success: true,
        data: mockFollowersResult
      })

      // Execute the method under test
      await followController.getUserFollowers(mockReq, mockRes)

      // Verify service call
      expect(mockFollowService.getFollowers).toHaveBeenCalledWith(testUserId, {})

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockFollowersResult
      })
    })

    it('should handle custom pagination parameters', async () => {
      // Setup request with pagination query params
      mockReq.query = { offset: '10', limit: '5' }

      mockFollowService.getFollowers.mockResolvedValueOnce({
        success: true,
        data: { followers: [], totalCount: 0, hasMore: false }
      })

      // Execute the method under test
      await followController.getUserFollowers(mockReq, mockRes)

      // Verify pagination was parsed correctly
      expect(mockFollowService.getFollowers).toHaveBeenCalledWith(testUserId, {
        offset: 10,
        limit: 5
      })
    })

    it('should ignore invalid pagination parameters', async () => {
      // Setup request with invalid pagination
      mockReq.query = { offset: 'invalid', limit: '-5' }

      mockFollowService.getFollowers.mockResolvedValueOnce({
        success: true,
        data: { followers: [], totalCount: 0, hasMore: false }
      })

      // Execute the method under test
      await followController.getUserFollowers(mockReq, mockRes)

      // Verify invalid params were ignored
      expect(mockFollowService.getFollowers).toHaveBeenCalledWith(testUserId, {})
    })
  })

  /**
   * Test getUserFollowStats() endpoint - GET /users/:username/stats
   */
  describe('getUserFollowStats()', () => {
    beforeEach(() => {
      mockReq.params = { username: testUsername }
      mockUserRepository.findByUsername.mockResolvedValue(mockUser)
    })

    it('should successfully get follow statistics', async () => {
      const mockStats = {
        followerCount: 150,
        followingCount: 25
      }

      // Setup service success response
      mockFollowService.getFollowStats.mockResolvedValueOnce({
        success: true,
        data: mockStats
      })

      // Execute the method under test
      await followController.getUserFollowStats(mockReq, mockRes)

      // Verify service call
      expect(mockFollowService.getFollowStats).toHaveBeenCalledWith(testUserId)

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      })
    })
  })

  /**
   * Test checkFollowStatus() endpoint - GET /users/:username/following/:targetUsername
   */
  describe('checkFollowStatus()', () => {
    const targetUsername = 'targetuser'
    const targetUserId = 'target_789'
    const mockTargetUser = {
      id: targetUserId,
      username: targetUsername,
      displayName: 'Target User'
    }

    beforeEach(() => {
      mockReq.params = { username: testUsername, targetUsername }
    })

    it('should successfully check follow status when following', async () => {
      // Setup mocks
      mockUserRepository.findByUsername
        .mockResolvedValueOnce(mockUser) // First call for follower
        .mockResolvedValueOnce(mockTargetUser) // Second call for target

      mockFollowService.checkFollowStatus.mockResolvedValueOnce({
        success: true,
        data: true
      })

      // Execute the method under test
      await followController.checkFollowStatus(mockReq, mockRes)

      // Verify service call
      expect(mockFollowService.checkFollowStatus).toHaveBeenCalledWith(testUserId, targetUserId)

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          isFollowing: true,
          follower: testUsername,
          followed: targetUsername
        }
      })
    })

    it('should handle missing target username', async () => {
      // Setup request missing target username
      mockReq.params = { username: testUsername }

      // Execute the method under test
      await followController.checkFollowStatus(mockReq, mockRes)

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Target username is required',
        code: 'MISSING_TARGET_USERNAME'
      })
    })

    it('should handle follower user not found', async () => {
      // Setup follower user not found
      mockUserRepository.findByUsername.mockResolvedValueOnce(null)

      // Execute the method under test
      await followController.checkFollowStatus(mockReq, mockRes)

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Follower user not found',
        code: 'FOLLOWER_NOT_FOUND'
      })
    })
  })

  /**
   * Test bulkCheckFollowing() endpoint - POST /users/:username/following/check
   */
  describe('bulkCheckFollowing()', () => {
    beforeEach(() => {
      mockReq.params = { username: testUsername }
      mockUserRepository.findByUsername.mockResolvedValue(mockUser)
    })

    it('should successfully perform bulk follow check', async () => {
      const usernames = ['user1', 'user2', 'user3']
      const userIds = ['id1', 'id2', 'id3']
      const mockBulkResult = {
        id1: true,
        id2: false,
        id3: true
      }

      // Setup request
      mockReq.body = { usernames }

      // Setup user repository to return users for each username
      mockUserRepository.findByUsername
        .mockResolvedValueOnce(mockUser) // Follower user
        .mockResolvedValueOnce({ id: 'id1', username: 'user1' })
        .mockResolvedValueOnce({ id: 'id2', username: 'user2' })
        .mockResolvedValueOnce({ id: 'id3', username: 'user3' })

      mockFollowService.bulkCheckFollowing.mockResolvedValueOnce({
        success: true,
        data: mockBulkResult
      })

      // Execute the method under test
      await followController.bulkCheckFollowing(mockReq, mockRes)

      // Verify service call
      expect(mockFollowService.bulkCheckFollowing).toHaveBeenCalledWith(testUserId, userIds)

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockBulkResult
      })
    })

    it('should reject invalid usernames format', async () => {
      // Setup request with non-array usernames
      mockReq.body = { usernames: 'not-an-array' }

      // Execute the method under test
      await followController.bulkCheckFollowing(mockReq, mockRes)

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Usernames must be an array',
        code: 'INVALID_USERNAMES_FORMAT'
      })
    })
  })

  /**
   * Test getRecentFollowers() endpoint - GET /users/:username/followers/recent
   */
  describe('getRecentFollowers()', () => {
    beforeEach(() => {
      mockReq.params = { username: testUsername }
      mockReq.user = mockAuthenticatedUser
      // Mock user with same ID as authenticated user for authorization
      mockUserRepository.findByUsername.mockResolvedValue({
        ...mockUser,
        id: testFollowerId // Same as authenticated user
      })
    })

    it('should successfully get recent followers for own account', async () => {
      const mockRecentFollowers = [mockFollowRelationship]

      mockFollowService.getRecentFollowers.mockResolvedValueOnce({
        success: true,
        data: mockRecentFollowers
      })

      // Execute the method under test
      await followController.getRecentFollowers(mockReq, mockRes)

      // Verify service call with default limit
      expect(mockFollowService.getRecentFollowers).toHaveBeenCalledWith(testFollowerId, 10)

      // Verify response
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecentFollowers
      })
    })

    it('should handle custom limit parameter', async () => {
      // Setup request with custom limit
      mockReq.query = { limit: '25' }

      mockFollowService.getRecentFollowers.mockResolvedValueOnce({
        success: true,
        data: []
      })

      // Execute the method under test
      await followController.getRecentFollowers(mockReq, mockRes)

      // Verify custom limit was used
      expect(mockFollowService.getRecentFollowers).toHaveBeenCalledWith(testFollowerId, 25)
    })

    it('should reject when trying to view others recent followers', async () => {
      // Setup user with different ID than authenticated user
      mockUserRepository.findByUsername.mockResolvedValueOnce({
        ...mockUser,
        id: 'different_user_id'
      })

      // Execute the method under test
      await followController.getRecentFollowers(mockReq, mockRes)

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Can only view your own recent followers',
        code: 'FORBIDDEN'
      })
    })

    it('should reject when not authenticated', async () => {
      // Setup request with no authentication
      mockReq.user = undefined

      // Execute the method under test
      await followController.getRecentFollowers(mockReq, mockRes)

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      })
    })
  })

  /**
   * Test error code to status code mapping
   */
  describe('Error Code Mapping', () => {
    beforeEach(() => {
      mockReq.params = { username: testUsername }
      mockReq.user = mockAuthenticatedUser
      mockUserRepository.findByUsername.mockResolvedValue(mockUser)
    })

    it('should map validation errors to 400 status', async () => {
      mockFollowService.followUser.mockResolvedValueOnce({
        success: false,
        error: 'Invalid input',
        code: 'VALIDATION_ERROR'
      })

      await followController.followUser(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should map authentication errors to 401 status', async () => {
      mockFollowService.followUser.mockResolvedValueOnce({
        success: false,
        error: 'Auth required',
        code: 'AUTHENTICATION_REQUIRED'
      })

      await followController.followUser(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(401)
    })

    it('should map forbidden errors to 403 status', async () => {
      mockFollowService.followUser.mockResolvedValueOnce({
        success: false,
        error: 'Forbidden',
        code: 'FORBIDDEN'
      })

      await followController.followUser(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(403)
    })

    it('should map not found errors to 404 status', async () => {
      mockFollowService.followUser.mockResolvedValueOnce({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })

      await followController.followUser(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(404)
    })

    it('should map business rule conflicts to 409 status', async () => {
      mockFollowService.followUser.mockResolvedValueOnce({
        success: false,
        error: 'Self follow error',
        code: 'SELF_FOLLOW_ERROR'
      })

      await followController.followUser(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(409)
    })

    it('should map unknown errors to 500 status', async () => {
      mockFollowService.followUser.mockResolvedValueOnce({
        success: false,
        error: 'Unknown error',
        code: 'UNKNOWN_ERROR'
      })

      await followController.followUser(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(500)
    })
  })
})