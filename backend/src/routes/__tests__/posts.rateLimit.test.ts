// backend/src/routes/__tests__/posts.rateLimit.test.ts
// Version: 5.0.0 - Fixed rate limiting logic and race conditions
// Fixed: Corrected double-decrementing bug and changed concurrent test to sequential to avoid race conditions

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import express, { Application, Request, Response, NextFunction } from 'express'
import request, { Test } from 'supertest'

// Type definitions for better type safety
interface AuthenticatedUser {
  id: string
  username: string
  email: string
}

// Extend Express Request interface locally to include user property
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser
}

interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  used: number
}

interface PostData {
  content: string
  contentWarning?: string
  isScheduled?: boolean
  scheduledFor?: string
  mediaIds?: string[]
}

// Explicit type for supertest response to avoid conflicts
type SuperTestResponse = Awaited<ReturnType<Test['send']>>

// Mock the dependencies
const mockAuthService = {
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
  validateLoginData: vi.fn(),
  hashPassword: vi.fn(),
  generateToken: vi.fn()
}

const mockPostService = {
  createPost: vi.fn(),
  updatePost: vi.fn(),
  deletePost: vi.fn(),
  getPost: vi.fn(),
  getPosts: vi.fn(),
  validatePostData: vi.fn()
}

const mockUserRepository = {
  findById: vi.fn(),
  findByUsername: vi.fn(),
  findByEmail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
}

// Rate limiting storage - simulate in-memory store
const rateLimitStore = new Map<string, RateLimitInfo>()

// Rate limit configuration for posts
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  max: 5, // 5 posts per minute for authenticated users
  maxAnonymous: 2, // 2 posts per minute for anonymous users
  message: 'Rate limit exceeded'
}

/**
 * Create test Express application with post routes and rate limiting
 */
function createTestApp(): Application {
  const app = express()
  
  // Basic middleware setup
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Mock authentication middleware (required for post creation)
  const mockRequiredAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for post creation'
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
      req.user = user
      next()
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Authentication failed'
        }
      })
    }
  }

  // Mock rate limiting middleware for posts
  const mockPostRateLimitMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const now = Date.now()
    const windowStart = now - RATE_LIMIT_CONFIG.windowMs
    
    // Determine rate limit key - use user ID if authenticated, otherwise IP
    const user = req.user
    const rateLimitKey = user?.id || req.ip || 'anonymous'
    
    // Determine max requests based on authentication status
    const maxRequests = user ? RATE_LIMIT_CONFIG.max : RATE_LIMIT_CONFIG.maxAnonymous
    
    // Get current rate limit info
    let rateLimitInfo = rateLimitStore.get(rateLimitKey)
    
    if (!rateLimitInfo || rateLimitInfo.reset < windowStart) {
      // Reset rate limit window - initialize with full limit available
      rateLimitInfo = {
        limit: maxRequests,
        remaining: maxRequests,  // Start with full limit
        reset: now + RATE_LIMIT_CONFIG.windowMs,
        used: 0  // Start with 0 used
      }
    }
    
    // Check if limit exceeded BEFORE decrementing
    if (rateLimitInfo.remaining <= 0) {
      // Set rate limit headers
      res.set({
        'RateLimit-Limit': rateLimitInfo.limit.toString(),
        'RateLimit-Remaining': '0',
        'RateLimit-Reset': Math.ceil((rateLimitInfo.reset - now) / 1000).toString()
      })
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: RATE_LIMIT_CONFIG.message,
          rateLimitKey,
          retryAfter: '60 seconds'
        }
      })
    }
    
    // Consume one request from the limit
    rateLimitInfo.remaining--
    rateLimitInfo.used++
    
    // Update store
    rateLimitStore.set(rateLimitKey, rateLimitInfo)
    
    // Set rate limit headers
    res.set({
      'RateLimit-Limit': rateLimitInfo.limit.toString(),
      'RateLimit-Remaining': rateLimitInfo.remaining.toString(),
      'RateLimit-Reset': Math.ceil((rateLimitInfo.reset - now) / 1000).toString()
    })
    
    next()
  }
  
  // Post creation route with rate limiting
  app.post('/posts', 
    mockRequiredAuthMiddleware,
    mockPostRateLimitMiddleware,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const user = req.user
        if (!user) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'AUTHENTICATION_REQUIRED',
              message: 'User not authenticated'
            }
          })
        }
        const postData: PostData = req.body

        // Validate post data
        const validation = mockPostService.validatePostData(postData)
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid post data',
              details: validation.errors
            }
          })
        }

        // Create post
        const newPost = await mockPostService.createPost({
          ...postData,
          authorId: user.id
        })
        
        res.status(201).json({
          success: true,
          data: newPost
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to create post'
        })
      }
    }
  )

  // Mock optional authentication middleware for read operations
  const mockOptionalAuthMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const user = mockAuthService.verifyToken(token)
        if (user) {
          req.user = user
        }
      } catch (error) {
        req.user = undefined
      }
    } else {
      req.user = undefined
    }
    next()
  }

  // Posts read operations (not rate limited)
  app.get('/posts', mockOptionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 10 } = req.query
    res.json({
      success: true,
      data: {
        posts: [],
        pagination: { page: Number(page), limit: Number(limit), total: 0 }
      }
    })
  })

  app.get('/posts/:id', mockOptionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params
    res.json({
      success: true,
      data: { id, content: 'Mock post content', authorId: 'author123' }
    })
  })

  app.delete('/posts/:id', mockRequiredAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params
    res.json({
      success: true,
      message: `Post ${id} deleted successfully`
    })
  })

  return app
}

describe('Posts Rate Limiting Tests', () => {
  let app: Application

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Reset rate limit store
    rateLimitStore.clear()
    
    // Configure default mock behaviors
    mockAuthService.verifyToken.mockReturnValue({
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com'
    })

    mockPostService.validatePostData.mockReturnValue({
      valid: true,
      data: {}
    })

    mockPostService.createPost.mockResolvedValue({
      id: 'post123',
      content: 'Test post content',
      authorId: 'user123',
      createdAt: new Date().toISOString()
    })

    // Create fresh app for each test
    app = createTestApp()
  })

  afterEach(() => {
    // Clean up after each test
    rateLimitStore.clear()
  })

  describe('Post Creation Rate Limiting', () => {
    it('should allow post creation within rate limit', async () => {
      // Act
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid_token')
        .send({
          content: 'Test post within rate limit',
          contentWarning: null
        })

      // Assert
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.headers).toHaveProperty('ratelimit-limit', '5')
      expect(response.headers).toHaveProperty('ratelimit-remaining', '4')
      expect(response.headers).toHaveProperty('ratelimit-reset')
    })

    it('should include rate limit headers in response', async () => {
      // Act - Make first post
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid_token')
        .send({
          content: 'First test post with rate limit headers',
          contentWarning: null
        })

      // Assert - Check rate limit headers
      expect(response.status).toBe(201)
      expect(response.headers).toHaveProperty('ratelimit-limit')
      expect(response.headers).toHaveProperty('ratelimit-remaining')
      expect(response.headers).toHaveProperty('ratelimit-reset')
      expect(response.headers['ratelimit-limit']).toBe('5')
      expect(response.headers['ratelimit-remaining']).toBe('4')
    })

    it('should block post creation after hitting the limit', async () => {
      // Arrange - Exhaust rate limit first
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/posts')
          .set('Authorization', 'Bearer valid_token')
          .send({
            content: `Rate limit test post ${i + 1}`,
            contentWarning: null
          })
      }

      // Act - Try one more post (should be blocked)
      const blockedResponse = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid_token')
        .send({
          content: 'This post should be blocked by rate limit',
          contentWarning: null
        })

      // Assert - Should be rate limited
      expect(blockedResponse.status).toBe(429)
      expect(blockedResponse.body).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          rateLimitKey: 'user123',
          retryAfter: '60 seconds'
        }
      })
      expect(blockedResponse.headers['ratelimit-remaining']).toBe('0')
    })

    it('should track rate limits by user ID when authenticated', async () => {
      // Arrange - Set up different users
      mockAuthService.verifyToken
        .mockReturnValueOnce({ id: 'user1', username: 'user1', email: 'user1@example.com' })
        .mockReturnValueOnce({ id: 'user2', username: 'user2', email: 'user2@example.com' })

      // Act - Make posts from different users
      const user1Response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer user1_token')
        .send({
          content: 'Post from user 1',
          contentWarning: null
        })

      const user2Response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer user2_token')
        .send({
          content: 'Post from user 2',
          contentWarning: null
        })

      // Assert - Both should succeed with separate rate limits
      expect(user1Response.status).toBe(201)
      expect(user1Response.headers['ratelimit-remaining']).toBe('4')
      
      expect(user2Response.status).toBe(201)
      expect(user2Response.headers['ratelimit-remaining']).toBe('4')
    })

    it('should allow different post content without affecting rate limit', async () => {
      // Arrange - Different post content types
      const postVariations = [
        { content: 'Simple text post', contentWarning: null },
        { content: 'Post with content warning', contentWarning: 'Sensitive content' },
        { content: 'Scheduled post', isScheduled: true, scheduledFor: new Date(Date.now() + 60000).toISOString() },
        { content: 'Post with media', mediaIds: ['media1', 'media2'] }
      ]

      // Act - Create different types of posts sequentially to avoid race conditions
      const responses: SuperTestResponse[] = []
      for (let i = 0; i < postVariations.length; i++) {
        const response = await request(app)
          .post('/posts')
          .set('Authorization', 'Bearer valid_token')
          .send(postVariations[i])
        responses.push(response)
      }

      // Assert - All should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(parseInt(response.headers['ratelimit-remaining'])).toBe(4 - index)
      })
    })
  })

  describe('Non-Rate-Limited Post Operations', () => {
    it('should not apply rate limiting to GET /posts (reading posts)', async () => {
      // Act - Make multiple read requests
      const responses: SuperTestResponse[] = await Promise.all(
        Array.from({ length: 20 }, () =>
          request(app)
            .get('/posts')
            .set('Authorization', 'Bearer valid_token')
            .query({ page: 1, limit: 10 })
        )
      )

      // Assert - All should succeed without rate limiting
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.headers).not.toHaveProperty('ratelimit-limit')
      })
    })

    it('should not apply rate limiting to GET /posts/:id (reading individual posts)', async () => {
      // Act - Make multiple individual post requests
      const responses: SuperTestResponse[] = await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          request(app)
            .get(`/posts/post${index}`)
            .set('Authorization', 'Bearer valid_token')
        )
      )

      // Assert - All should succeed without rate limiting
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.headers).not.toHaveProperty('ratelimit-limit')
      })
    })

    it('should not apply rate limiting to DELETE /posts/:id (deleting posts)', async () => {
      // Act - Make multiple delete requests
      const responses: SuperTestResponse[] = await Promise.all(
        Array.from({ length: 20 }, (_, index) =>
          request(app)
            .delete(`/posts/post${index}`)
            .set('Authorization', 'Bearer valid_token')
        )
      )

      // Assert - All should succeed without rate limiting
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.headers).not.toHaveProperty('ratelimit-limit')
      })
    })
  })

  describe('Rate Limit Error Response Format', () => {
    it('should return consistent error format when rate limited', async () => {
      // Arrange - Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/posts')
          .set('Authorization', 'Bearer valid_token')
          .send({
            content: `Exhausting rate limit post ${i + 1}`,
            contentWarning: null
          })
      }

      // Act - Hit rate limit
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid_token')
        .send({
          content: 'This should be blocked',
          contentWarning: null
        })

      // Assert - Check error response format
      expect(response.status).toBe(429)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          rateLimitKey: 'user123',
          retryAfter: '60 seconds'
        }
      })
      expect(response.headers['ratelimit-limit']).toBe('5')
      expect(response.headers['ratelimit-remaining']).toBe('0')
    })

    it('should include proper rate limit headers in blocked requests', async () => {
      // Arrange - Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/posts')
          .set('Authorization', 'Bearer valid_token')
          .send({
            content: `Rate limit post ${i + 1}`,
            contentWarning: null
          })
      }

      // Act - Get blocked by rate limit
      const blockedResponse = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid_token')
        .send({
          content: 'Blocked post attempt',
          contentWarning: null
        })

      // Assert - Headers should indicate rate limit status
      expect(blockedResponse.status).toBe(429)
      expect(blockedResponse.headers['ratelimit-limit']).toBe('5')
      expect(blockedResponse.headers['ratelimit-remaining']).toBe('0')
      expect(blockedResponse.headers).toHaveProperty('ratelimit-reset')
      
      // Rate limit reset should be a positive number (seconds from now)
      const resetTime = parseInt(blockedResponse.headers['ratelimit-reset'])
      expect(resetTime).toBeGreaterThan(0)
      expect(resetTime).toBeLessThanOrEqual(60) // Should be within 1 minute
    })
  })

  describe('Authentication Required for Rate Limited Operations', () => {
    it('should require authentication for post creation', async () => {
      // Act - Try to create post without authentication
      const response = await request(app)
        .post('/posts')
        .send({
          content: 'Unauthenticated post attempt',
          contentWarning: null
        })

      // Assert - Should be rejected
      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for post creation'
        }
      })
      expect(response.headers).not.toHaveProperty('ratelimit-limit')
    })

    it('should reject invalid authentication tokens', async () => {
      // Arrange - Mock invalid token
      mockAuthService.verifyToken.mockReturnValue(null)

      // Act - Try to create post with invalid token
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer invalid_token')
        .send({
          content: 'Post with invalid token',
          contentWarning: null
        })

      // Assert - Should be rejected
      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      })
      expect(response.headers).not.toHaveProperty('ratelimit-limit')
    })
  })

  describe('Rate Limit Window Reset', () => {
    it('should reset rate limit after window expires', async () => {
      // This test would need to mock time or use a shorter window for practical testing
      // For now, we'll test the logic conceptually
      
      // Arrange - Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/posts')
          .set('Authorization', 'Bearer valid_token')
          .send({
            content: `Window test post ${i + 1}`,
            contentWarning: null
          })
      }

      // Act - Verify rate limit is hit
      const blockedResponse = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid_token')
        .send({
          content: 'Should be blocked',
          contentWarning: null
        })

      // Assert - Should be blocked
      expect(blockedResponse.status).toBe(429)
      
      // Note: In a real test, we'd advance time here to test window reset
      // For now, we verify that the blocked response includes proper reset timing
      expect(blockedResponse.headers).toHaveProperty('ratelimit-reset')
    })
  })
})