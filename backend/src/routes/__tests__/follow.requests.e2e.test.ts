// backend/tests/routes/follow.requests.e2e.test.ts
// End-to-end tests for follow request handling with authentication and error scenarios

import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createUsersRouter } from '../users'

/**
 * Mock authenticated request interface
 */
interface MockAuthenticatedRequest extends express.Request {
  user?: {
    id: string
    username: string
    email: string
  }
}

/**
 * Mock response scenarios for different test cases
 */
const mockResponses = {
  followSuccess: {
    success: true,
    data: {
      id: 'follow-123',
      followerId: 'user-123',
      followedId: 'user-456',
      createdAt: new Date().toISOString()
    }
  },
  unfollowSuccess: {
    success: true,
    message: 'Successfully unfollowed user'
  },
  userNotFound: {
    success: false,
    error: 'User not found',
    code: 'USER_NOT_FOUND'
  },
  alreadyFollowing: {
    success: false,
    error: 'Already following this user',
    code: 'ALREADY_FOLLOWING'
  },
  selfFollowError: {
    success: false,
    error: 'You cannot follow yourself',
    code: 'SELF_FOLLOW_ERROR'
  },
  authRequired: {
    success: false,
    error: 'Authentication required',
    code: 'AUTHENTICATION_REQUIRED'
  },
  blockedUser: {
    success: false,
    error: 'Cannot follow this user',
    code: 'FORBIDDEN'
  },
  validationError: {
    success: false,
    error: 'Invalid username format',
    code: 'VALIDATION_ERROR'
  }
}

describe('Follow Requests End-to-End Tests', () => {
  let app: express.Application
  let mockFollowController: any
  let mockUserController: any
  let mockPostController: any

  /**
   * Set up test environment with realistic controller behavior
   */
  beforeEach(() => {
    app = express()
    app.use(express.json())

    // Create realistic mock controllers that simulate actual behavior
    mockFollowController = {
      followUser: vi.fn(),
      unfollowUser: vi.fn(),
      getUserFollowers: vi.fn(),
      getUserFollowing: vi.fn(),
      getUserFollowStats: vi.fn()
    }

    mockUserController = {
      getUserProfile: vi.fn(),
      blockUser: vi.fn(),
      unblockUser: vi.fn()
    }

    mockPostController = {
      getUserPosts: vi.fn()
    }

    // Create realistic auth middleware
    const mockAuthMiddleware = vi.fn().mockImplementation((req: MockAuthenticatedRequest, res, next) => {
      const authHeader = req.headers.authorization
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json(mockResponses.authRequired)
      }

      const token = authHeader.split(' ')[1]
      
      // Simulate different user scenarios based on token
      if (token === 'valid-token') {
        req.user = { id: 'user-123', username: 'testuser', email: 'test@example.com' }
        next()
      } else if (token === 'blocked-user-token') {
        req.user = { id: 'blocked-user', username: 'blockeduser', email: 'blocked@example.com' }
        next()
      } else {
        return res.status(401).json(mockResponses.authRequired)
      }
    })

    const mockOptionalAuthMiddleware = vi.fn().mockImplementation((req: MockAuthenticatedRequest, res, next) => {
      const authHeader = req.headers.authorization
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        if (token === 'valid-token') {
          req.user = { id: 'user-123', username: 'testuser', email: 'test@example.com' }
        }
      }
      // Always proceed with optional auth
      next()
    })

    // Create and mount router
    const usersRouter = createUsersRouter({
      userController: mockUserController,
      postController: mockPostController,
      followController: mockFollowController,
      authMiddleware: mockAuthMiddleware,
      optionalAuthMiddleware: mockOptionalAuthMiddleware
    })

    app.use('/api/v1/users', usersRouter)
  })

  /**
   * Test successful follow operations
   */
  describe('Successful Follow Operations', () => {
    it('should successfully follow a user with valid authentication', async () => {
      // Mock successful follow
      mockFollowController.followUser.mockImplementation((req, res) => {
        res.status(201).json(mockResponses.followSuccess)
      })

      const response = await request(app)
        .post('/api/v1/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-token')
        .send()

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toBeDefined()
      expect(response.body.data.id).toBe('follow-123')
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(1)
    })

    it('should successfully follow a user as external ActivityPub actor', async () => {
      // Mock external actor follow
      mockFollowController.followUser.mockImplementation((req, res) => {
        const { actorId } = req.body
        if (actorId) {
          res.status(201).json({
            ...mockResponses.followSuccess,
            data: { ...mockResponses.followSuccess.data, actorId }
          })
        } else {
          res.status(400).json(mockResponses.validationError)
        }
      })

      const response = await request(app)
        .post('/api/v1/users/targetuser/follow')
        .send({ actorId: 'https://mastodon.social/users/external' })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.actorId).toBe('https://mastodon.social/users/external')
    })

    it('should successfully unfollow a user', async () => {
      mockFollowController.unfollowUser.mockImplementation((req, res) => {
        res.status(200).json(mockResponses.unfollowSuccess)
      })

      const response = await request(app)
        .delete('/api/v1/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(mockFollowController.unfollowUser).toHaveBeenCalledTimes(1)
    })
  })

  /**
   * Test authentication scenarios
   */
  describe('Authentication Scenarios', () => {
    it('should allow follow without authentication if actorId provided', async () => {
      mockFollowController.followUser.mockImplementation((req, res) => {
        if (req.body.actorId && !req.user) {
          res.status(201).json(mockResponses.followSuccess)
        } else {
          res.status(400).json(mockResponses.validationError)
        }
      })

      const response = await request(app)
        .post('/api/v1/users/targetuser/follow')
        .send({ actorId: 'https://mastodon.social/users/external' })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('should reject follow without authentication and without actorId', async () => {
      mockFollowController.followUser.mockImplementation((req, res) => {
        if (!req.user && !req.body.actorId) {
          res.status(400).json({
            success: false,
            error: 'Either authentication or actorId is required',
            code: 'NO_FOLLOWER_IDENTITY'
          })
        }
      })

      const response = await request(app)
        .post('/api/v1/users/targetuser/follow')
        .send()

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.code).toBe('NO_FOLLOWER_IDENTITY')
    })

    it('should require authentication for unfollow operations', async () => {
      const response = await request(app)
        .delete('/api/v1/users/targetuser/follow')
        .send()

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.code).toBe('AUTHENTICATION_REQUIRED')
    })

    it('should reject invalid authentication tokens', async () => {
      const response = await request(app)
        .delete('/api/v1/users/targetuser/follow')
        .set('Authorization', 'Bearer invalid-token')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.code).toBe('AUTHENTICATION_REQUIRED')
    })
  })

  /**
   * Test error scenarios
   */
  describe('Error Scenarios', () => {
    it('should return 404 when target user not found', async () => {
      mockFollowController.followUser.mockImplementation((req, res) => {
        res.status(404).json(mockResponses.userNotFound)
      })

      const response = await request(app)
        .post('/api/v1/users/nonexistentuser/follow')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.code).toBe('USER_NOT_FOUND')
    })

    it('should return 409 when already following user', async () => {
      mockFollowController.followUser.mockImplementation((req, res) => {
        res.status(409).json(mockResponses.alreadyFollowing)
      })

      const response = await request(app)
        .post('/api/v1/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(409)
      expect(response.body.success).toBe(false)
      expect(response.body.code).toBe('ALREADY_FOLLOWING')
    })

    it('should return 409 when trying to follow yourself', async () => {
      mockFollowController.followUser.mockImplementation((req, res) => {
        res.status(409).json(mockResponses.selfFollowError)
      })

      const response = await request(app)
        .post('/api/v1/users/testuser/follow')  // Same as authenticated user
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(409)
      expect(response.body.success).toBe(false)
      expect(response.body.code).toBe('SELF_FOLLOW_ERROR')
    })

    it('should return 403 when user has blocked the follower', async () => {
      mockFollowController.followUser.mockImplementation((req, res) => {
        res.status(403).json(mockResponses.blockedUser)
      })

      const response = await request(app)
        .post('/api/v1/users/targetuser/follow')
        .set('Authorization', 'Bearer blocked-user-token')

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
      expect(response.body.code).toBe('FORBIDDEN')
    })

    it('should handle malformed username parameters', async () => {
      mockFollowController.followUser.mockImplementation((req, res) => {
        const { username } = req.params
        if (!username || username.includes(' ') || username.length < 3) {
          res.status(400).json(mockResponses.validationError)
        }
      })

      const response = await request(app)
        .post('/api/v1/users/ab/follow')  // Too short username
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.code).toBe('VALIDATION_ERROR')
    })
  })

  /**
   * Test parameter handling
   */
  describe('Parameter Handling', () => {
    it('should pass username parameter correctly to controller', async () => {
      mockFollowController.followUser.mockImplementation((req, res) => {
        expect(req.params.username).toBe('targetuser')
        res.status(201).json(mockResponses.followSuccess)
      })

      await request(app)
        .post('/api/v1/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-token')

      expect(mockFollowController.followUser).toHaveBeenCalledTimes(1)
    })

    it('should pass request body correctly to controller', async () => {
      mockFollowController.followUser.mockImplementation((req, res) => {
        expect(req.body.actorId).toBe('https://example.com/actor')
        expect(req.body.customData).toBe('test-data')
        res.status(201).json(mockResponses.followSuccess)
      })

      await request(app)
        .post('/api/v1/users/targetuser/follow')
        .send({ 
          actorId: 'https://example.com/actor',
          customData: 'test-data'
        })

      expect(mockFollowController.followUser).toHaveBeenCalledTimes(1)
    })

    it('should preserve user information from authentication middleware', async () => {
      mockFollowController.followUser.mockImplementation((req, res) => {
        expect(req.user).toBeDefined()
        expect(req.user.id).toBe('user-123')
        expect(req.user.username).toBe('testuser')
        res.status(201).json(mockResponses.followSuccess)
      })

      await request(app)
        .post('/api/v1/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-token')

      expect(mockFollowController.followUser).toHaveBeenCalledTimes(1)
    })
  })

  /**
   * Test different HTTP methods and endpoints
   */
  describe('HTTP Methods and Endpoints', () => {
    it('should handle GET requests to followers endpoint', async () => {
      mockFollowController.getUserFollowers.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: {
            followers: [
              { id: 'user-123', username: 'follower1' },
              { id: 'user-456', username: 'follower2' }
            ],
            total: 2
          }
        })
      })

      const response = await request(app)
        .get('/api/v1/users/targetuser/followers')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.followers).toHaveLength(2)
      expect(mockFollowController.getUserFollowers).toHaveBeenCalledTimes(1)
    })

    it('should handle GET requests to following endpoint', async () => {
      mockFollowController.getUserFollowing.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: {
            following: [
              { id: 'user-789', username: 'following1' }
            ],
            total: 1
          }
        })
      })

      const response = await request(app)
        .get('/api/v1/users/targetuser/following')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(mockFollowController.getUserFollowing).toHaveBeenCalledTimes(1)
    })

    it('should handle GET requests to stats endpoint', async () => {
      mockFollowController.getUserFollowStats.mockImplementation((req, res) => {
        res.status(200).json({
          success: true,
          data: {
            followersCount: 150,
            followingCount: 75,
            username: 'targetuser'
          }
        })
      })

      const response = await request(app)
        .get('/api/v1/users/targetuser/stats')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.followersCount).toBe(150)
      expect(mockFollowController.getUserFollowStats).toHaveBeenCalledTimes(1)
    })
  })

  /**
   * Test edge cases and special scenarios
   */
  describe('Edge Cases', () => {
    it('should handle very long usernames', async () => {
      const longUsername = 'a'.repeat(100)
      
      mockFollowController.followUser.mockImplementation((req, res) => {
        if (req.params.username.length > 50) {
          res.status(400).json(mockResponses.validationError)
        }
      })

      const response = await request(app)
        .post(`/api/v1/users/${longUsername}/follow`)
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('should handle special characters in usernames', async () => {
      mockFollowController.followUser.mockImplementation((req, res) => {
        const { username } = req.params
        if (/[^a-zA-Z0-9_-]/.test(username)) {
          res.status(400).json(mockResponses.validationError)
        } else {
          res.status(201).json(mockResponses.followSuccess)
        }
      })

      const response = await request(app)
        .post('/api/v1/users/user@domain.com/follow')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
    })

    it('should handle concurrent follow requests gracefully', async () => {
      mockFollowController.followUser.mockImplementation((req, res) => {
        // Simulate database constraint error for duplicate follows
        res.status(409).json(mockResponses.alreadyFollowing)
      })

      // Send multiple concurrent requests
      const requests = Array(3).fill(null).map(() =>
        request(app)
          .post('/api/v1/users/targetuser/follow')
          .set('Authorization', 'Bearer valid-token')
      )

      const responses = await Promise.all(requests)

      // All should return 409 (already following)
      responses.forEach(response => {
        expect(response.status).toBe(409)
        expect(response.body.code).toBe('ALREADY_FOLLOWING')
      })
    })
  })
})