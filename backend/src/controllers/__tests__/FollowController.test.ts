// backend/src/controllers/__tests__/FollowController.test.ts
// Version: 1.1 - Fixed import path and added proper cleanup
// Changes: Fixed import to use '../FollowController' and added afterEach cleanup

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FollowController } from '../FollowController'

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
   * Clean up after each test to prevent memory leaks
   */
  afterEach(() => {
    // Clear all mocks to prevent state leakage between tests
    vi.clearAllMocks()
    
    // Reset mock implementations
    if (mockFollowService) {
      Object.keys(mockFollowService).forEach(key => {
        if (vi.isMockFunction(mockFollowService[key])) {
          mockFollowService[key].mockReset()
        }
      })
    }
    
    if (mockUserRepository) {
      Object.keys(mockUserRepository).forEach(key => {
        if (vi.isMockFunction(mockUserRepository[key])) {
          mockUserRepository[key].mockReset()
        }
      })
    }

    // Clear response mocks
    if (mockRes.status && vi.isMockFunction(mockRes.status)) {
      mockRes.status.mockReset()
    }
    if (mockRes.json && vi.isMockFunction(mockRes.json)) {
      mockRes.json.mockReset()
    }
    if (mockRes.send && vi.isMockFunction(mockRes.send)) {
      mockRes.send.mockReset()
    }

    // Clear references to prevent memory leaks
    followController = null as any
    mockReq = null
    mockRes = null
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

      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          follow: mockFollowRelationship
        }
      })

      // Verify service was called with correct parameters
      expect(mockFollowService.followUser).toHaveBeenCalledWith({
        followerId: testFollowerId,
        followedId: testUserId,
        actorId: null
      })
    })

    it('should successfully handle ActivityPub external follow', async () => {
      // Setup ActivityPub follow (no authentication required)
      mockReq.body = { actorId: testActorId }
      const externalFollow = { ...mockFollowRelationship, actorId: testActorId }
      mockFollowService.followUser.mockResolvedValueOnce({
        success: true,
        data: externalFollow
      })

      // Execute the method under test
      await followController.followUser(mockReq, mockRes)

      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          follow: externalFollow
        }
      })

      // Verify service was called with correct parameters
      expect(mockFollowService.followUser).toHaveBeenCalledWith({
        followerId: null,
        followedId: testUserId,
        actorId: testActorId
      })
    })

    it('should reject when username is missing', async () => {
      // Setup request with missing username
      mockReq.params = {}

      // Execute the method under test
      await followController.followUser(mockReq, mockRes)

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username is required',
        code: 'VALIDATION_ERROR'
      })

      // Verify no repository call was made
      expect(mockUserRepository.findByUsername).not.toHaveBeenCalled()
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
      // Setup successful unfollow
      mockFollowService.unfollowUser.mockResolvedValueOnce({
        success: true,
        data: {
          message: `Successfully unfollowed ${testUsername}`
        }
      })

      // Execute the method under test
      await followController.unfollowUser(mockReq, mockRes)

      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: `Successfully unfollowed ${testUsername}`
        }
      })

      // Verify service was called with correct parameters
      expect(mockFollowService.unfollowUser).toHaveBeenCalledWith({
        followerId: testFollowerId,
        followedId: testUserId
      })
    })

    it('should reject when authentication is missing', async () => {
      // Setup request without authentication
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

      // Verify no service call was made
      expect(mockFollowService.unfollowUser).not.toHaveBeenCalled()
    })

    it('should handle service error for not following', async () => {
      // Setup service to return not following error
      mockFollowService.unfollowUser.mockResolvedValueOnce({
        success: false,
        error: 'Not following this user',
        code: 'NOT_FOLLOWING'
      })

      // Execute the method under test
      await followController.unfollowUser(mockReq, mockRes)

      // Verify error response
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not following this user',
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
      // Setup followers data
      const followersData = {
        followers: [mockFollowRelationship],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          hasNext: false
        }
      }

      mockFollowService.getFollowers.mockResolvedValueOnce({
        success: true,
        data: followersData
      })

      // Execute the method under test
      await followController.getUserFollowers(mockReq, mockRes)

      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: followersData
      })

      // Verify service was called with correct parameters
      expect(mockFollowService.getFollowers).toHaveBeenCalledWith(testUserId, {
        page: 1,
        limit: 20
      })
    })

    it('should handle custom pagination parameters', async () => {
      // Setup custom pagination
      mockReq.query = { page: '2', limit: '10' }

      const followersData = {
        followers: [],
        pagination: {
          total: 0,
          page: 2,
          limit: 10,
          hasNext: false
        }
      }

      mockFollowService.getFollowers.mockResolvedValueOnce({
        success: true,
        data: followersData
      })

      // Execute the method under test
      await followController.getUserFollowers(mockReq, mockRes)

      // Verify service was called with correct pagination
      expect(mockFollowService.getFollowers).toHaveBeenCalledWith(testUserId, {
        page: 2,
        limit: 10
      })
    })

    it('should ignore invalid pagination parameters', async () => {
      // Setup invalid pagination
      mockReq.query = { page: 'invalid', limit: '-5' }

      mockFollowService.getFollowers.mockResolvedValueOnce({
        success: true,
        data: {
          followers: [],
          pagination: { total: 0, page: 1, limit: 20, hasNext: false }
        }
      })

      // Execute the method under test
      await followController.getUserFollowers(mockReq, mockRes)

      // Verify default pagination was used
      expect(mockFollowService.getFollowers).toHaveBeenCalledWith(testUserId, {
        page: 1,
        limit: 20
      })
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
      // Setup stats data
      const statsData = {
        followersCount: 42,
        followingCount: 15,
        username: testUsername
      }

      mockFollowService.getFollowStats.mockResolvedValueOnce({
        success: true,
        data: statsData
      })

      // Execute the method under test
      await followController.getUserFollowStats(mockReq, mockRes)

      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: statsData
      })

      // Verify service was called with correct user ID
      expect(mockFollowService.getFollowStats).toHaveBeenCalledWith(testUserId)
    })
  })

  /**
   * Test checkFollowStatus() endpoint - GET /users/:username/follow-status
   */
  describe('checkFollowStatus()', () => {
    beforeEach(() => {
      mockReq.params = { username: testUsername }
      mockReq.user = mockAuthenticatedUser
      mockUserRepository.findByUsername.mockResolvedValue(mockUser)
    })

    it('should successfully check follow status when following', async () => {
      // Setup follow status
      const statusData = {
        isFollowing: true,
        followedAt: new Date().toISOString()
      }

      mockFollowService.checkFollowStatus.mockResolvedValueOnce({
        success: true,
        data: statusData
      })

      // Execute the method under test
      await followController.checkFollowStatus(mockReq, mockRes)

      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: statusData
      })

      // Verify service was called with correct parameters
      expect(mockFollowService.checkFollowStatus).toHaveBeenCalledWith({
        followerId: testFollowerId,
        followedId: testUserId
      })
    })

    it('should handle missing target username', async () => {
      // Setup request with missing username
      mockReq.params = {}

      // Execute the method under test
      await followController.checkFollowStatus(mockReq, mockRes)

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username is required',
        code: 'VALIDATION_ERROR'
      })
    })

    it('should handle follower user not found', async () => {
      // Setup request without authentication
      mockReq.user = undefined

      // Execute the method under test
      await followController.checkFollowStatus(mockReq, mockRes)

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
   * Test bulkCheckFollowing() endpoint - POST /users/bulk-check-following
   */
  describe('bulkCheckFollowing()', () => {
    beforeEach(() => {
      mockReq.user = mockAuthenticatedUser
    })

    it('should successfully perform bulk follow check', async () => {
      // Setup bulk check data
      const userIds = ['user1', 'user2', 'user3']
      mockReq.body = { userIds }

      const bulkData = {
        following: {
          user1: true,
          user2: false,
          user3: true
        }
      }

      mockFollowService.bulkCheckFollowing.mockResolvedValueOnce({
        success: true,
        data: bulkData
      })

      // Execute the method under test
      await followController.bulkCheckFollowing(mockReq, mockRes)

      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: bulkData
      })

      // Verify service was called with correct parameters
      expect(mockFollowService.bulkCheckFollowing).toHaveBeenCalledWith({
        followerId: testFollowerId,
        userIds
      })
    })

    it('should reject invalid usernames format', async () => {
      // Setup invalid usernames (not an array)
      mockReq.body = { userIds: 'not-an-array' }

      // Execute the method under test
      await followController.bulkCheckFollowing(mockReq, mockRes)

      // Verify rejection
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'userIds must be an array',
        code: 'VALIDATION_ERROR'
      })

      // Verify no service call was made
      expect(mockFollowService.bulkCheckFollowing).not.toHaveBeenCalled()
    })
  })

  /**
   * Test getRecentFollowers() endpoint - GET /users/recent-followers
   */
  describe('getRecentFollowers()', () => {
    beforeEach(() => {
      mockReq.user = mockAuthenticatedUser
    })

    it('should successfully get recent followers for own account', async () => {
      // Setup recent followers data
      const recentData = {
        followers: [mockFollowRelationship],
        total: 1
      }

      mockFollowService.getRecentFollowers.mockResolvedValueOnce({
        success: true,
        data: recentData
      })

      // Execute the method under test
      await followController.getRecentFollowers(mockReq, mockRes)

      // Verify the response
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: recentData
      })

      // Verify service was called with correct parameters
      expect(mockFollowService.getRecentFollowers).toHaveBeenCalledWith({
        userId: testFollowerId,
        limit: 10
      })
    })

    it('should handle custom limit parameter', async () => {
      // Setup custom limit
      mockReq.query = { limit: '5' }

      mockFollowService.getRecentFollowers.mockResolvedValueOnce({
        success: true,
        data: { followers: [], total: 0 }
      })

      // Execute the method under test
      await followController.getRecentFollowers(mockReq, mockRes)

      // Verify service was called with correct limit
      expect(mockFollowService.getRecentFollowers).toHaveBeenCalledWith({
        userId: testFollowerId,
        limit: 5
      })
    })

    it('should reject when trying to view others recent followers', async () => {
      // Setup request for another user's recent followers
      mockReq.params = { username: 'other-user' }

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
      // Setup request without authentication
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
   * Test error code mapping functionality
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
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      })

      await followController.followUser(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(401)
    })

    it('should map forbidden errors to 403 status', async () => {
      mockFollowService.followUser.mockResolvedValueOnce({
        success: false,
        error: 'Access denied',
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
        error: 'Already following',
        code: 'ALREADY_FOLLOWING'
      })

      await followController.followUser(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(409)
    })

    it('should map unknown errors to 500 status', async () => {
      mockFollowService.followUser.mockResolvedValueOnce({
        success: false,
        error: 'Something went wrong',
        code: 'UNKNOWN_ERROR'
      })

      await followController.followUser(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(500)
    })
  })
})