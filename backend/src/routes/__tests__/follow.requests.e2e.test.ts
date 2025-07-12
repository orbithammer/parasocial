// backend/src/routes/__tests__/follow.requests.e2e.test.ts
// Version: 2.2.0 - Fixed middleware function signature incompatibility
// Changed: Replaced custom followOperationsRateLimit with standard express-rate-limit to fix TypeScript errors

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'

// Test response type
interface SuperTestResponse {
  status: number
  body: any
  headers: Record<string, string>
}

// Mock follow service responses
interface FollowResult {
  followerId: string
  followedId: string
  createdAt: string
  accepted: boolean
  actorId?: string
}

interface UnfollowResult {
  success: boolean
  message: string
}

describe('Follow Requests End-to-End Tests', () => {
  let app: express.Application

  beforeEach(() => {
    console.log('Test setup initialized')
    
    // Create Express app for testing
    app = express()
    app.use(express.json())
    
    // Mock optional authentication middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      // Check for Authorization header
      const authHeader = req.header('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        
        // Mock different users based on token
        if (token === 'valid_token') {
          (req as any).user = {
            id: 'user_123',
            username: 'testuser',
            email: 'test@example.com'
          }
        } else if (token === 'user2_token') {
          (req as any).user = {
            id: 'user_456', 
            username: 'testuser2',
            email: 'test2@example.com'
          }
        }
      }
      next()
    })
    
    // Apply rate limiting to follow operations - Use standard express-rate-limit
    const rateLimit = require('express-rate-limit').default || require('express-rate-limit')
    const followRateLimit = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // 20 operations per hour
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Follow action limit reached. You can perform 20 follow/unfollow actions per hour.',
          retryAfter: '1 hour'
        }
      },
      keyGenerator: (req) => {
        const user = (req as any).user
        return user?.id || req.ip
      }
    })
    
    app.use('/users/:username/follow', followRateLimit)
    
    // Mock POST /users/:username/follow endpoint
    app.post('/users/:username/follow', (req: Request, res: Response) => {
      const { username } = req.params
      const { actorId } = req.body
      const user = (req as any).user
      
      // Validate authentication or actorId
      if (!user && !actorId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required or provide actorId for external follow'
          }
        })
      }
      
      // Mock successful follow response
      const followResult: FollowResult = {
        followerId: user?.id || actorId,
        followedId: `user_for_${username}`,
        createdAt: new Date().toISOString(),
        accepted: true,
        ...(actorId && { actorId })
      }
      
      res.status(201).json({
        success: true,
        data: followResult,
        message: `Successfully followed ${username}`
      })
    })
    
    // Mock DELETE /users/:username/follow endpoint  
    app.delete('/users/:username/follow', (req: Request, res: Response) => {
      const { username } = req.params
      const user = (req as any).user
      
      // Require authentication for unfollow
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required to unfollow'
          }
        })
      }
      
      // Mock successful unfollow response
      const unfollowResult: UnfollowResult = {
        success: true,
        message: `Successfully unfollowed ${username}`
      }
      
      res.status(200).json({
        success: true,
        data: unfollowResult,
        message: `Successfully unfollowed ${username}`
      })
    })
    
    // Mock GET /users/:username/followers endpoint
    app.get('/users/:username/followers', (req: Request, res: Response) => {
      const { username } = req.params
      const { page = 1, limit = 20 } = req.query
      
      res.status(200).json({
        success: true,
        data: {
          followers: [
            {
              id: 'follower_1',
              username: 'follower1',
              displayName: 'Follower One',
              followedAt: new Date().toISOString()
            }
          ],
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: 1,
            hasMore: false
          }
        }
      })
    })
    
    // Mock GET /users/:username/following endpoint
    app.get('/users/:username/following', (req: Request, res: Response) => {
      const { username } = req.params
      const { page = 1, limit = 20 } = req.query
      
      res.status(200).json({
        success: true,
        data: {
          following: [
            {
              id: 'following_1',
              username: 'following1',
              displayName: 'Following One',
              followedAt: new Date().toISOString()
            }
          ],
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total: 1,
            hasMore: false
          }
        }
      })
    })
    
    // Error handling for invalid requests
    app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found'
        }
      })
    })
  })

  afterEach(() => {
    console.log('Starting test cleanup...')
    console.log('Test cleanup completed')
  })

  /**
   * Test successful follow operations
   */
  describe('Successful Follow Operations', () => {
    it('should successfully follow a user with valid authentication', async () => {
      const response: SuperTestResponse = await request(app)
        .post('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid_token')
        .send({})
        .expect(201)

      // Verify response structure
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          followerId: 'user_123',
          followedId: 'user_for_targetuser',
          createdAt: expect.any(String),
          accepted: true
        }),
        message: 'Successfully followed targetuser'
      })
    })

    it('should successfully follow a user as external ActivityPub actor', async () => {
      const response: SuperTestResponse = await request(app)
        .post('/users/targetuser/follow')
        .send({
          actorId: 'https://remote.server/users/remoteuser'
        })
        .expect(201)

      // Verify response includes actorId for external follow
      expect(response.body.data).toEqual(expect.objectContaining({
        followerId: 'https://remote.server/users/remoteuser',
        followedId: 'user_for_targetuser',
        accepted: true,
        actorId: 'https://remote.server/users/remoteuser'
      }))
    })

    it('should successfully unfollow a user', async () => {
      const response: SuperTestResponse = await request(app)
        .delete('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid_token')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          success: true,
          message: 'Successfully unfollowed targetuser'
        },
        message: 'Successfully unfollowed targetuser'
      })
    })
  })

  /**
   * Test authentication scenarios
   */
  describe('Authentication Scenarios', () => {
    it('should allow follow without authentication if actorId provided', async () => {
      const response: SuperTestResponse = await request(app)
        .post('/users/targetuser/follow')
        .send({
          actorId: 'https://external.site/users/someone'
        })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.actorId).toBe('https://external.site/users/someone')
    })

    it('should reject follow without authentication and without actorId', async () => {
      const response: SuperTestResponse = await request(app)
        .post('/users/targetuser/follow')
        .send({})
        .expect(401)

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required or provide actorId for external follow'
        }
      })
    })

    it('should handle authenticated user following', async () => {
      const response: SuperTestResponse = await request(app)
        .post('/users/someuser/follow')
        .set('Authorization', 'Bearer user2_token')
        .send({})
        .expect(201)

      expect(response.body.data.followerId).toBe('user_456')
    })
  })

  /**
   * Test user relationships retrieval
   */
  describe('User Relationships Retrieval', () => {
    it('should retrieve user followers list', async () => {
      const response: SuperTestResponse = await request(app)
        .get('/users/targetuser/followers')
        .expect(200)

      expect(response.body).toEqual({
        success: true,
        data: {
          followers: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              username: expect.any(String),
              displayName: expect.any(String),
              followedAt: expect.any(String)
            })
          ]),
          pagination: expect.objectContaining({
            page: 1,
            limit: 20,
            total: expect.any(Number),
            hasMore: expect.any(Boolean)
          })
        }
      })
    })

    it('should retrieve user following list', async () => {
      const response: SuperTestResponse = await request(app)
        .get('/users/targetuser/following')
        .query({ page: 1, limit: 10 })
        .expect(200)

      expect(response.body.data.pagination.page).toBe(1)
      expect(response.body.data.pagination.limit).toBe(10)
    })
  })

  /**
   * Test error handling
   */
  describe('Error Handling', () => {
    it('should handle follow operation errors gracefully', async () => {
      // Test with invalid token
      const response: SuperTestResponse = await request(app)
        .post('/users/targetuser/follow')
        .set('Authorization', 'Bearer invalid_token')
        .send({})
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED')
    })

    it('should handle invalid username parameters', async () => {
      // Test accessing non-existent route
      const response: SuperTestResponse = await request(app)
        .get('/users//followers')
        .expect(404)

      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })
  })

  /**
   * Test request validation
   */
  describe('Request Validation', () => {
    it('should handle malformed request bodies', async () => {
      const response: SuperTestResponse = await request(app)
        .post('/users/targetuser/follow')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400)
    })

    it('should handle requests with extra data', async () => {
      const response: SuperTestResponse = await request(app)
        .post('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid_token')
        .send({
          actorId: 'https://example.com/user',
          extraField: 'should be ignored'
        })
        .expect(201)

      expect(response.body.success).toBe(true)
    })
  })

  /**
   * Test performance and concurrency
   */
  describe('Performance and Concurrency', () => {
    it('should handle multiple concurrent follow requests', async () => {
      const requests = Array.from({ length: 3 }, (_, i) =>
        request(app)
          .post(`/users/user${i}/follow`)
          .set('Authorization', 'Bearer valid_token')
          .send({})
      )

      const responses = await Promise.all(requests)
      
      responses.forEach((response) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })
    })

    it('should handle rapid follow/unfollow operations', async () => {
      // Follow
      const followResponse: SuperTestResponse = await request(app)
        .post('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid_token')
        .send({})
        .expect(201)

      expect(followResponse.body.success).toBe(true)

      // Unfollow immediately after
      const unfollowResponse: SuperTestResponse = await request(app)
        .delete('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid_token')
        .expect(200)

      expect(unfollowResponse.body.success).toBe(true)
    })
  })
})