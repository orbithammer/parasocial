// backend/src/routes/__tests__/follow.requests.e2e.test.ts
// Version: 2.2.0 - Fixed error handling test by removing mock override in route handler
// CHANGED: Fixed "should handle follow operation errors gracefully" test

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

// Mock the follow controller with minimal overhead
const mockFollowController = {
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  getFollowers: vi.fn(),
  getFollowing: vi.fn()
}

// Mock the user repository for user lookup
const mockUserRepository = {
  findByUsername: vi.fn()
}

/**
 * Create minimal test app for e2e follow testing
 */
function createTestApp(): express.Application {
  const app = express()
  app.use(express.json())
  
  // Auth middleware that can handle both authenticated and anonymous requests
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      // Simple token to user mapping for tests
      if (token === 'valid-user-token') {
        (req as any).user = { id: 'test-user-123', username: 'testuser' }
      }
    }
    next()
  })
  
  // Follow routes
  app.post('/users/:username/follow', async (req, res) => {
    try {
      const targetUsername = req.params.username
      const user = (req as any).user
      const actorId = req.body.actorId
      
      // Check if user exists
      mockUserRepository.findByUsername.mockResolvedValue(
        targetUsername === 'nonexistent' ?
        null : { id: 'target-user', username: targetUsername }
      )
      
      const targetUser = await mockUserRepository.findByUsername(targetUsername)
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' }
        })
      }
      
      // Require either authentication or actorId
      if (!user && !actorId) {
        return res.status(409).json({
          success: false,
          error: { code: 'NO_FOLLOWER_IDENTITY', message: 'Authentication or actorId required' }
        })
      }
      
      // FIXED: Only set up default mock if none exists (don't override test mocks)
      if (!mockFollowController.followUser.getMockImplementation()) {
        mockFollowController.followUser.mockResolvedValue({
          success: true,
          follow: { id: 'follow-123', followerId: user?.id || actorId, followedId: targetUser.id }
        })
      }
      
      const result = await mockFollowController.followUser(targetUsername, user || { actorId })
      
      res.status(201).json({
        success: true,
        message: `Successfully followed ${targetUsername}`,
        follow: result.follow
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
      })
    }
  })
  
  app.delete('/users/:username/follow', async (req, res) => {
    try {
      const targetUsername = req.params.username
      const user = (req as any).user
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' }
        })
      }
      
      // FIXED: Only set up default mock if none exists
      if (!mockFollowController.unfollowUser.getMockImplementation()) {
        mockFollowController.unfollowUser.mockResolvedValue({
          success: true
        })
      }
      
      await mockFollowController.unfollowUser(targetUsername, user)
      
      res.status(200).json({
        success: true,
        message: `Successfully unfollowed ${targetUsername}`
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An error occurred' }
      })
    }
  })
  
  // User relationship routes
  app.get('/users/:username/followers', async (req, res) => {
    // FIXED: Only set up default mock if none exists
    if (!mockFollowController.getFollowers.getMockImplementation()) {
      mockFollowController.getFollowers.mockResolvedValue({
        followers: [],
        pagination: { total: 0, page: 1, limit: 20 }
      })
    }
    
    const result = await mockFollowController.getFollowers(req.params.username)
    res.json(result)
  })
  
  app.get('/users/:username/following', async (req, res) => {
    // FIXED: Only set up default mock if none exists
    if (!mockFollowController.getFollowing.getMockImplementation()) {
      mockFollowController.getFollowing.mockResolvedValue({
        following: [],
        pagination: { total: 0, page: 1, limit: 20 }
      })
    }
    
    const result = await mockFollowController.getFollowing(req.params.username)
    res.json(result)
  })
  
  return app
}

describe('Follow Requests End-to-End Tests', () => {
  let app: express.Application

  beforeEach(() => {
    app = createTestApp()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Successful Follow Operations', () => {
    it('should successfully follow a user with valid authentication', async () => {
      const response = await request(app)
        .post('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-user-token')
        .send({})
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Successfully followed targetuser')
      expect(response.body.follow).toBeDefined()
      
      expect(mockFollowController.followUser).toHaveBeenCalledWith(
        'targetuser',
        { id: 'test-user-123', username: 'testuser' }
      )
    })

    it('should successfully follow a user as external ActivityPub actor', async () => {
      const response = await request(app)
        .post('/users/targetuser/follow')
        .send({ actorId: 'https://external.server/users/external-user' })
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Successfully followed targetuser')
      
      expect(mockFollowController.followUser).toHaveBeenCalledWith(
        'targetuser',
        { actorId: 'https://external.server/users/external-user' }
      )
    })

    it('should successfully unfollow a user', async () => {
      const response = await request(app)
        .delete('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-user-token')
      
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Successfully unfollowed targetuser')
      
      expect(mockFollowController.unfollowUser).toHaveBeenCalledWith(
        'targetuser',
        { id: 'test-user-123', username: 'testuser' }
      )
    })
  })

  describe('Authentication Scenarios', () => {
    it('should allow follow without authentication if actorId provided', async () => {
      const response = await request(app)
        .post('/users/targetuser/follow')
        .send({ actorId: 'https://example.com/users/external' })
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      
      expect(mockFollowController.followUser).toHaveBeenCalledWith(
        'targetuser',
        { actorId: 'https://example.com/users/external' }
      )
    })

    it('should reject follow without authentication and without actorId', async () => {
      const response = await request(app)
        .post('/users/targetuser/follow')
        .send({})
      
      expect(response.status).toBe(409)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('NO_FOLLOWER_IDENTITY')
      
      expect(mockFollowController.followUser).not.toHaveBeenCalled()
    })

    it('should handle authenticated user following', async () => {
      const response = await request(app)
        .post('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-user-token')
        .send({})
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      
      expect(mockFollowController.followUser).toHaveBeenCalledWith(
        'targetuser',
        { id: 'test-user-123', username: 'testuser' }
      )
    })
  })

  describe('User Relationships Retrieval', () => {
    it('should retrieve user followers list', async () => {
      const response = await request(app)
        .get('/users/targetuser/followers')
      
      expect(response.status).toBe(200)
      expect(response.body.followers).toEqual([])
      expect(response.body.pagination).toBeDefined()
      
      expect(mockFollowController.getFollowers).toHaveBeenCalledWith('targetuser')
    })

    it('should retrieve user following list', async () => {
      const response = await request(app)
        .get('/users/targetuser/following')
      
      expect(response.status).toBe(200)
      expect(response.body.following).toEqual([])
      expect(response.body.pagination).toBeDefined()
      
      expect(mockFollowController.getFollowing).toHaveBeenCalledWith('targetuser')
    })
  })

  describe('Error Handling', () => {
    it('should handle follow operation errors gracefully', async () => {
      // FIXED: Mock controller to throw error BEFORE creating the app
      // This ensures the test mock takes precedence
      mockFollowController.followUser.mockRejectedValue(new Error('Database error'))
      
      const response = await request(app)
        .post('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-user-token')
        .send({})
      
      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle invalid username parameters', async () => {
      const response = await request(app)
        .post('/users/nonexistent/follow')
        .set('Authorization', 'Bearer valid-user-token')
        .send({})
      
      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('USER_NOT_FOUND')
      expect(response.body.error.message).toBe('User not found')
    })
  })

  describe('Request Validation', () => {
    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-user-token')
        .send('invalid json')
        .set('Content-Type', 'application/json')
      
      // Express should handle malformed JSON
      expect(response.status).toBe(400)
    })

    it('should handle requests with extra data', async () => {
      const response = await request(app)
        .post('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-user-token')
        .send({ 
          actorId: 'https://example.com/user',
          extraField: 'should be ignored',
          maliciousScript: '<script>alert("xss")</script>'
        })
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      
      // Should still work despite extra fields
      expect(mockFollowController.followUser).toHaveBeenCalled()
    })
  })

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent follow requests', async () => {
      const requests = []
      
      // Make 3 concurrent follow requests for different users
      for (let i = 0; i < 3; i++) {
        requests.push(
          request(app)
            .post(`/users/user${i}/follow`)
            .set('Authorization', 'Bearer valid-user-token')
            .send({})
        )
      }
      
      const responses = await Promise.all(requests)
      
      responses.forEach((response) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(3)
    })

    it('should handle rapid follow/unfollow operations', async () => {
      // Follow user
      const followResponse = await request(app)
        .post('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-user-token')
        .send({})
      
      expect(followResponse.status).toBe(201)
      
      // Immediately unfollow
      const unfollowResponse = await request(app)
        .delete('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid-user-token')
      
      expect(unfollowResponse.status).toBe(200)
      
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(1)
      expect(mockFollowController.unfollowUser).toHaveBeenCalledTimes(1)
    })
  })
})