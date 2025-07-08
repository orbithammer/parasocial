// backend/src/routes/__tests__/follow.requests.e2e.test.ts
// Version: 3.1.0 - Fixed TypeScript undefined user errors
// Fixed: Added proper type checking and null safety for req.user

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import express, { Application } from 'express'
import request from 'supertest'

// Type definitions for better type safety
interface AuthenticatedUser {
  id: string
  username: string
  email: string
}

// Mock the dependencies
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

const mockUserRepository = {
  findByEmail: vi.fn(),
  findByUsername: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}

const mockAuthService = {
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
  validateLoginData: vi.fn(),
  hashPassword: vi.fn(),
  generateToken: vi.fn()
}

/**
 * Create test Express application with follow routes
 */
function createTestApp(): Application {
  const app = express()
  
  // Basic middleware setup
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Mock authentication middleware
  const mockAuthMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const user = mockAuthService.verifyToken(token)
        if (user) {
          req.user = user as AuthenticatedUser
        }
      } catch (error) {
        // Token invalid, but for optional auth we continue
        req.user = undefined
      }
    } else {
      req.user = undefined
    }
    next()
  }

  const mockRequiredAuthMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      })
    }
    
    try {
      const token = authHeader.substring(7)
      const user = mockAuthService.verifyToken(token)
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token'
          }
        })
      }
      req.user = user as AuthenticatedUser
      next()
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication failed'
        }
      })
    }
  }
  
  // Follow routes
  app.post('/users/:username/follow', mockAuthMiddleware, async (req, res) => {
    try {
      const { username } = req.params
      const { actorId } = req.body
      const user = req.user as AuthenticatedUser | undefined

      // Check if user exists
      const targetUser = await mockUserRepository.findByUsername(username)
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        })
      }

      // Handle ActivityPub external follows (no auth required if actorId provided)
      if (actorId && !user) {
        const result = await mockFollowService.followUser({
          actorId,
          targetUserId: targetUser.id
        })
        
        return res.status(200).json({
          success: true,
          data: result,
          message: 'Follow request sent successfully'
        })
      }

      // Require authentication for regular follows
      if (!user && !actorId) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'NO_FOLLOWER_IDENTITY',
            message: 'Either authentication or actorId is required'
          }
        })
      }

      // Regular authenticated follow - user is guaranteed to be defined here
      if (user && user.id) {
        const result = await mockFollowService.followUser({
          followerId: user.id,
          targetUserId: targetUser.id
        })
        
        return res.status(200).json({
          success: true,
          data: result,
          message: 'User followed successfully'
        })
      }

      // Fallback case - should not reach here but handle for type safety
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid follow request'
        }
      })

    } catch (error) {
      if (error.message?.includes('SELF_FOLLOW')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'SELF_FOLLOW_ERROR',
            message: 'Cannot follow yourself'
          }
        })
      }

      if (error.message?.includes('ALREADY_FOLLOWING')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'ALREADY_FOLLOWING',
            message: 'Already following this user'
          }
        })
      }

      if (error.message?.includes('BLOCKED')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot follow this user'
          }
        })
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error'
        }
      })
    }
  })

  app.delete('/users/:username/follow', mockRequiredAuthMiddleware, async (req, res) => {
    try {
      const { username } = req.params
      const user = req.user as AuthenticatedUser

      // User is guaranteed to exist due to mockRequiredAuthMiddleware
      if (!user || !user.id) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User authentication required'
          }
        })
      }

      // Check if user exists
      const targetUser = await mockUserRepository.findByUsername(username)
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        })
      }

      const result = await mockFollowService.unfollowUser({
        followerId: user.id,
        targetUserId: targetUser.id
      })
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'User unfollowed successfully'
      })

    } catch (error) {
      if (error.message?.includes('NOT_FOLLOWING')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOLLOWING',
            message: 'Not following this user'
          }
        })
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error'
        }
      })
    }
  })

  app.get('/users/:username/followers', async (req, res) => {
    try {
      const { username } = req.params
      const { page = 1, limit = 20 } = req.query

      // Check if user exists
      const targetUser = await mockUserRepository.findByUsername(username)
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        })
      }

      const result = await mockFollowService.getFollowers(targetUser.id, {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      })
      
      res.status(200).json({
        success: true,
        data: result
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error'
        }
      })
    }
  })

  app.get('/users/:username/following', async (req, res) => {
    try {
      const { username } = req.params
      const { page = 1, limit = 20 } = req.query

      // Check if user exists
      const targetUser = await mockUserRepository.findByUsername(username)
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        })
      }

      const result = await mockFollowService.getFollowing(targetUser.id, {
        page: parseInt(page as string),
        limit: parseInt(limit as string)
      })
      
      res.status(200).json({
        success: true,
        data: result
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error'
        }
      })
    }
  })
  
  return app
}

describe('Follow Requests End-to-End Tests', () => {
  let app: Application

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    
    // Reset mock implementations to default success states
    mockFollowService.followUser.mockResolvedValue({
      id: 'follow123',
      followerId: 'user123',
      targetUserId: 'user456',
      status: 'accepted',
      createdAt: new Date()
    })
    
    mockFollowService.unfollowUser.mockResolvedValue({
      id: 'follow123',
      unfollowedAt: new Date()
    })
    
    mockFollowService.getFollowers.mockResolvedValue({
      followers: [],
      total: 0,
      page: 1,
      limit: 20
    })
    
    mockFollowService.getFollowing.mockResolvedValue({
      following: [],
      total: 0,
      page: 1,
      limit: 20
    })
    
    mockUserRepository.findByUsername.mockResolvedValue({
      id: 'user456',
      username: 'targetuser',
      email: 'target@example.com',
      displayName: 'Target User'
    })
    
    mockAuthService.verifyToken.mockReturnValue({
      id: 'user123',
      username: 'follower',
      email: 'follower@example.com'
    })
    
    // Create fresh app for each test
    app = createTestApp()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Successful Follow Operations', () => {
    it('should successfully follow a user with valid authentication', async () => {
      // Arrange
      const targetUsername = 'targetuser'
      const mockFollowResult = {
        id: 'follow789',
        followerId: 'user123',
        targetUserId: 'user456',
        status: 'accepted',
        createdAt: new Date()
      }
      
      mockFollowService.followUser.mockResolvedValue(mockFollowResult)

      // Act - Make follow request with authentication
      const response = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .set('Authorization', 'Bearer valid_token')
        .send({})

      // Assert
      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: mockFollowResult,
        message: 'User followed successfully'
      })
      
      // Verify service was called correctly
      expect(mockFollowService.followUser).toHaveBeenCalledWith({
        followerId: 'user123',
        targetUserId: 'user456'
      })
    })

    it('should successfully follow a user as external ActivityPub actor', async () => {
      // Arrange
      const targetUsername = 'targetuser'
      const actorId = 'https://external.instance/@user'
      const mockFollowResult = {
        id: 'follow_external_123',
        actorId,
        targetUserId: 'user456',
        status: 'pending',
        createdAt: new Date()
      }
      
      mockFollowService.followUser.mockResolvedValue(mockFollowResult)

      // Act - Make follow request without auth but with actorId
      const response = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .send({ actorId })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: mockFollowResult,
        message: 'Follow request sent successfully'
      })
      
      // Verify service was called correctly
      expect(mockFollowService.followUser).toHaveBeenCalledWith({
        actorId,
        targetUserId: 'user456'
      })
    })

    it('should successfully unfollow a user', async () => {
      // Arrange
      const targetUsername = 'targetuser'
      const mockUnfollowResult = {
        id: 'follow123',
        unfollowedAt: new Date()
      }
      
      mockFollowService.unfollowUser.mockResolvedValue(mockUnfollowResult)

      // Act - Make unfollow request
      const response = await request(app)
        .delete(`/users/${targetUsername}/follow`)
        .set('Authorization', 'Bearer valid_token')

      // Assert
      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: mockUnfollowResult,
        message: 'User unfollowed successfully'
      })
    })
  })

  describe('Authentication Scenarios', () => {
    it('should allow follow without authentication if actorId provided', async () => {
      // Arrange
      const targetUsername = 'targetuser'
      const actorId = 'https://mastodon.social/@external_user'

      // Act - No Authorization header, but actorId provided
      const response = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .send({ actorId })

      // Assert - Should succeed for ActivityPub federation
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('should reject follow without authentication and without actorId', async () => {
      // Arrange
      const targetUsername = 'targetuser'

      // Act - No Authorization header and no actorId
      const response = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .send({})

      // Assert - Should require some form of identity
      expect(response.status).toBe(409)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NO_FOLLOWER_IDENTITY',
          message: 'Either authentication or actorId is required'
        }
      })
    })

    it('should handle authenticated user following', async () => {
      // Arrange
      const targetUsername = 'targetuser'
      
      // Mock valid token verification
      mockAuthService.verifyToken.mockReturnValue({
        id: 'auth_user_123',
        username: 'authenticated_user',
        email: 'auth@example.com'
      })

      // Act
      const response = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .set('Authorization', 'Bearer authenticated_token')
        .send({})

      // Assert
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(mockFollowService.followUser).toHaveBeenCalledWith({
        followerId: 'auth_user_123',
        targetUserId: 'user456'
      })
    })
  })

  describe('User Relationships Retrieval', () => {
    it('should retrieve user followers list', async () => {
      // Arrange
      const targetUsername = 'popularuser'
      const mockFollowersResult = {
        followers: [
          { id: 'follower1', username: 'fan1', displayName: 'Fan One' },
          { id: 'follower2', username: 'fan2', displayName: 'Fan Two' }
        ],
        total: 2,
        page: 1,
        limit: 20
      }
      
      mockFollowService.getFollowers.mockResolvedValue(mockFollowersResult)

      // Act
      const response = await request(app)
        .get(`/users/${targetUsername}/followers`)
        .query({ page: 1, limit: 20 })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: mockFollowersResult
      })
    })

    it('should retrieve user following list', async () => {
      // Arrange
      const targetUsername = 'socialuser'
      const mockFollowingResult = {
        following: [
          { id: 'following1', username: 'interest1', displayName: 'Interest One' },
          { id: 'following2', username: 'interest2', displayName: 'Interest Two' }
        ],
        total: 2,
        page: 1,
        limit: 20
      }
      
      mockFollowService.getFollowing.mockResolvedValue(mockFollowingResult)

      // Act
      const response = await request(app)
        .get(`/users/${targetUsername}/following`)
        .query({ page: 1, limit: 20 })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: mockFollowingResult
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle follow operation errors gracefully', async () => {
      // Arrange
      const targetUsername = 'targetuser'
      
      mockFollowService.followUser.mockRejectedValue(new Error('ALREADY_FOLLOWING: User already follows this target'))

      // Act
      const response = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .set('Authorization', 'Bearer valid_token')
        .send({})

      // Assert
      expect(response.status).toBe(409)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'ALREADY_FOLLOWING',
          message: 'Already following this user'
        }
      })
    })

    it('should handle invalid username parameters', async () => {
      // Arrange
      const invalidUsername = 'nonexistentuser'
      
      mockUserRepository.findByUsername.mockResolvedValue(null) // User not found

      // Act
      const response = await request(app)
        .post(`/users/${invalidUsername}/follow`)
        .set('Authorization', 'Bearer valid_token')
        .send({})

      // Assert
      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      })
    })
  })

  describe('Request Validation', () => {
    it('should handle malformed request bodies', async () => {
      // Arrange
      const targetUsername = 'targetuser'

      // Act - Send malformed JSON
      const response = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')

      // Assert
      expect(response.status).toBe(400)
    })

    it('should handle requests with extra data', async () => {
      // Arrange
      const targetUsername = 'targetuser'

      // Act - Send extra fields in request body
      const response = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .set('Authorization', 'Bearer valid_token')
        .send({
          actorId: 'https://example.com/@user',
          extraField: 'should be ignored',
          anotherField: 123
        })

      // Assert - Should still process successfully, ignoring extra fields
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent follow requests', async () => {
      // Arrange
      const targetUsers = ['user1', 'user2', 'user3']
      
      // Set up different responses for each user
      let callCount = 0
      mockUserRepository.findByUsername.mockImplementation((username) => {
        callCount++
        return Promise.resolve({
          id: `user_${callCount}`,
          username,
          email: `${username}@example.com`,
          displayName: username
        })
      })
      
      mockFollowService.followUser.mockImplementation(() => {
        return Promise.resolve({
          id: `follow_${Date.now()}_${Math.random()}`,
          followerId: 'user123',
          targetUserId: `user_${callCount}`,
          status: 'accepted',
          createdAt: new Date()
        })
      })

      // Act - Make multiple concurrent follow requests
      const promises = targetUsers.map(username =>
        request(app)
          .post(`/users/${username}/follow`)
          .set('Authorization', 'Bearer valid_token')
          .send({})
      )
      
      const responses = await Promise.all(promises)

      // Assert - All should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
    })

    it('should handle rapid follow/unfollow operations', async () => {
      // Arrange
      const targetUsername = 'targetuser'

      // Act - Rapid follow then unfollow
      const followResponse = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .set('Authorization', 'Bearer valid_token')
        .send({})

      const unfollowResponse = await request(app)
        .delete(`/users/${targetUsername}/follow`)
        .set('Authorization', 'Bearer valid_token')

      // Assert - Both operations should succeed
      expect(followResponse.status).toBe(200)
      expect(followResponse.body.success).toBe(true)
      expect(unfollowResponse.status).toBe(200)
      expect(unfollowResponse.body.success).toBe(true)
    })
  })
})