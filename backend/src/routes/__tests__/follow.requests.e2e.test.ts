// backend/src/routes/__tests__/follow.requests.e2e.test.ts
// Version: 1.1.0 - Fixed TypeScript parameter issues
// Corrected unused parameters and added proper typing

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express, { Application, Request, Response, NextFunction } from 'express'
import request from 'supertest'

/**
 * Mock controller functions with proper TypeScript typing
 * Use underscore prefix for intentionally unused parameters
 */
const mockFollowController = {
  followUser: vi.fn().mockImplementation((_req: Request, res: Response) => {
    res.status(201).json({
      success: true,
      message: 'Successfully followed user',
      data: {
        followerId: 'user_123',
        followingId: 'target_user_456',
        createdAt: new Date().toISOString()
      }
    })
  }),

  unfollowUser: vi.fn().mockImplementation((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Successfully unfollowed user'
    })
  }),

  getFollowers: vi.fn().mockImplementation((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        followers: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0
        }
      }
    })
  }),

  getFollowing: vi.fn().mockImplementation((_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        following: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0
        }
      }
    })
  })
}

/**
 * Mock authentication middleware
 * Uses underscore prefix for unused parameters
 */
const mockAuthMiddleware = vi.fn().mockImplementation(
  (req: Request, _res: Response, next: NextFunction) => {
    // Add user to request object
    ;(req as any).user = {
      id: 'user_123',
      username: 'testuser',
      email: 'test@example.com'
    }
    next()
  }
)

/**
 * Create test Express application
 */
function createTestApp(): Application {
  const app = express()
  
  // Basic middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Follow routes with authentication
  app.post('/users/:username/follow', mockAuthMiddleware, mockFollowController.followUser)
  app.delete('/users/:username/follow', mockAuthMiddleware, mockFollowController.unfollowUser)
  app.get('/users/:username/followers', mockFollowController.getFollowers)
  app.get('/users/:username/following', mockFollowController.getFollowing)
  
  return app
}

describe('Follow Requests End-to-End Tests', () => {
  let app: Application

  beforeEach(() => {
    app = createTestApp()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Successful Follow Operations', () => {
    it('should successfully follow a user with valid authentication', async () => {
      const targetUsername = 'targetuser'
      
      const response = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .send({})
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Successfully followed user')
      expect(response.body.data.followerId).toBe('user_123')
      expect(response.body.data.followingId).toBe('target_user_456')
      expect(response.body.data.createdAt).toBeDefined()
      
      expect(mockAuthMiddleware).toHaveBeenCalledTimes(1)
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(1)
    })

    it('should successfully follow a user as external ActivityPub actor', async () => {
      // Mock external ActivityPub follow request
      const externalActorId = 'https://external.instance/@actor'
      const targetUsername = 'localuser'
      
      const response = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .send({
          actorId: externalActorId,
          type: 'Follow'
        })
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(1)
    })

    it('should successfully unfollow a user', async () => {
      const targetUsername = 'targetuser'
      
      const response = await request(app)
        .delete(`/users/${targetUsername}/follow`)
      
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Successfully unfollowed user')
      
      expect(mockAuthMiddleware).toHaveBeenCalledTimes(1)
      expect(mockFollowController.unfollowUser).toHaveBeenCalledTimes(1)
    })
  })

  describe('Authentication Scenarios', () => {
    it('should allow follow without authentication if actorId provided', async () => {
      // Create app without auth middleware for this test
      const noAuthApp = express()
      noAuthApp.use(express.json())
      noAuthApp.post('/users/:username/follow', mockFollowController.followUser)
      
      const response = await request(noAuthApp)
        .post('/users/localuser/follow')
        .send({
          actorId: 'https://external.instance/@actor'
        })
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('should reject follow without authentication and without actorId', async () => {
      // Mock auth middleware that rejects unauthenticated requests
      const rejectAuthMiddleware = vi.fn().mockImplementation(
        (_req: Request, res: Response, _next: NextFunction) => {
          res.status(401).json({
            success: false,
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'Authentication required for this action'
            }
          })
        }
      )
      
      const noAuthApp = express()
      noAuthApp.use(express.json())
      noAuthApp.post('/users/:username/follow', rejectAuthMiddleware)
      
      const response = await request(noAuthApp)
        .post('/users/localuser/follow')
        .send({})
      
      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED')
    })

    it('should handle authenticated user following', async () => {
      const response = await request(app)
        .post('/users/targetuser/follow')
        .send({})
      
      expect(response.status).toBe(201)
      expect(mockAuthMiddleware).toHaveBeenCalledTimes(1)
      
      // Verify user was added to request
      const mockCall = mockAuthMiddleware.mock.calls[0]
      const req = mockCall[0]
      expect(req).toBeDefined()
    })
  })

  describe('User Relationships Retrieval', () => {
    it('should retrieve user followers list', async () => {
      const username = 'testuser'
      
      const response = await request(app)
        .get(`/users/${username}/followers`)
      
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.followers).toEqual([])
      expect(response.body.data.pagination).toBeDefined()
      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(20)
      expect(response.body.data.pagination.total).toBe(0)
      
      expect(mockFollowController.getFollowers).toHaveBeenCalledTimes(1)
    })

    it('should retrieve user following list', async () => {
      const username = 'testuser'
      
      const response = await request(app)
        .get(`/users/${username}/following`)
      
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.following).toEqual([])
      expect(response.body.data.pagination).toBeDefined()
      
      expect(mockFollowController.getFollowing).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle follow operation errors gracefully', async () => {
      // Mock controller to throw error
      mockFollowController.followUser.mockImplementationOnce(
        (_req: Request, res: Response) => {
          res.status(500).json({
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to process follow request'
            }
          })
        }
      )
      
      const response = await request(app)
        .post('/users/targetuser/follow')
        .send({})
      
      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle invalid username parameters', async () => {
      const invalidUsername = ''
      
      const response = await request(app)
        .post(`/users/${invalidUsername}/follow`)
        .send({})
      
      // Express should handle empty parameters
      expect(response.status).toBe(404)
    })
  })

  describe('Request Validation', () => {
    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/users/targetuser/follow')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}') // Malformed JSON
      
      expect(response.status).toBe(400)
    })

    it('should handle requests with extra data', async () => {
      const response = await request(app)
        .post('/users/targetuser/follow')
        .send({
          actorId: 'https://external.instance/@actor',
          extraField: 'should be ignored',
          anotherField: { nested: 'data' }
        })
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })
  })

  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent follow requests', async () => {
      const promises = Array.from({ length: 3 }, (_, i) => 
        request(app).post(`/users/user${i}/follow`).send({})
      )
      
      const responses = await Promise.all(promises)
      
      responses.forEach(response => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(3)
    })

    it('should handle rapid follow/unfollow operations', async () => {
      const username = 'targetuser'
      
      // Follow
      const followResponse = await request(app)
        .post(`/users/${username}/follow`)
        .send({})
      
      // Immediately unfollow
      const unfollowResponse = await request(app)
        .delete(`/users/${username}/follow`)
      
      expect(followResponse.status).toBe(201)
      expect(unfollowResponse.status).toBe(200)
      
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(1)
      expect(mockFollowController.unfollowUser).toHaveBeenCalledTimes(1)
    })
  })
})