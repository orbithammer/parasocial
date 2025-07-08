// backend/src/routes/__tests__/posts.rateLimit.test.ts
// Version: 3.1.0 - Fixed TypeScript Response type conflicts
// Fixed: Resolved supertest Response type conflicts with explicit typing

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import express, { Application } from 'express'
import request, { Test } from 'supertest'

// Type definitions for better type safety
interface AuthenticatedUser {
  id: string
  username: string
  email: string
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
  const mockRequiredAuthMiddleware = (req: any, res: any, next: any) => {
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

  // Mock optional authentication middleware (for reading posts)
  const mockOptionalAuthMiddleware = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const user = mockAuthService.verifyToken(token)
        if (user) {
          req.user = user as AuthenticatedUser
        }
      } catch (error) {
        req.user = undefined
      }
    } else {
      req.user = undefined
    }
    next()
  }

  // Mock rate limiting middleware for post creation
  const mockPostRateLimitMiddleware = (req: any, res: any, next: any) => {
    const now = Date.now()
    const windowStart = now - RATE_LIMIT_CONFIG.windowMs
    
    // Determine rate limit key and limits - use user ID for authenticated users
    const user = req.user as AuthenticatedUser
    const rateLimitKey = user?.id || req.ip || 'anonymous'
    const maxRequests = user ? RATE_LIMIT_CONFIG.max : RATE_LIMIT_CONFIG.maxAnonymous
    
    // Get current rate limit info
    let rateLimitInfo = rateLimitStore.get(rateLimitKey)
    
    if (!rateLimitInfo || rateLimitInfo.reset < windowStart) {
      // Reset rate limit window
      rateLimitInfo = {
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: now + RATE_LIMIT_CONFIG.windowMs,
        used: 1
      }
    } else {
      // Check if limit exceeded
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
      
      // Increment usage
      rateLimitInfo.remaining--
      rateLimitInfo.used++
    }
    
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
    async (req, res) => {
      try {
        const user = req.user as AuthenticatedUser
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
          data: newPost,
          message: 'Post created successfully'
        })

      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'POST_CREATION_ERROR',
            message: 'Failed to create post'
          }
        })
      }
    }
  )

  // Non-rate-limited routes for comparison
  app.get('/posts', mockOptionalAuthMiddleware, async (req, res) => {
    try {
      const { page = 1, limit = 20, filter } = req.query
      const user = req.user as AuthenticatedUser | undefined
      
      const posts = await mockPostService.getPosts({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        filter: filter as string,
        userId: user?.id
      })
      
      res.status(200).json({
        success: true,
        data: posts
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch posts'
        }
      })
    }
  })

  app.get('/posts/:id', mockOptionalAuthMiddleware, async (req, res) => {
    try {
      const { id } = req.params
      const user = req.user as AuthenticatedUser | undefined
      
      const post = await mockPostService.getPost(id, user?.id)
      
      if (!post) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post not found'
          }
        })
      }
      
      res.status(200).json({
        success: true,
        data: post
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Failed to fetch post'
        }
      })
    }
  })

  app.delete('/posts/:id', mockRequiredAuthMiddleware, async (req, res) => {
    try {
      const { id } = req.params
      const user = req.user as AuthenticatedUser
      
      const deletedPost = await mockPostService.deletePost(id, user.id)
      
      res.status(200).json({
        success: true,
        data: deletedPost,
        message: 'Post deleted successfully'
      })
    } catch (error) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'Failed to delete post'
        }
      })
    }
  })
  
  return app
}

describe('Posts Routes Rate Limiting', () => {
  let app: Application

  beforeEach(() => {
    // Clear all mocks and rate limit store before each test
    vi.clearAllMocks()
    rateLimitStore.clear()
    
    // Reset mock implementations
    mockAuthService.verifyToken.mockReturnValue({
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com'
    })
    
    mockPostService.validatePostData.mockReturnValue({
      valid: true,
      errors: []
    })
    
    mockPostService.createPost.mockImplementation((data) => Promise.resolve({
      id: `post_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      content: data.content,
      authorId: data.authorId,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublished: true,
      publishedAt: new Date()
    }))
    
    mockPostService.getPosts.mockResolvedValue({
      posts: [],
      total: 0,
      page: 1,
      limit: 20
    })
    
    mockPostService.getPost.mockResolvedValue({
      id: 'post123',
      content: 'Test post content',
      authorId: 'user123',
      createdAt: new Date(),
      isPublished: true
    })
    
    mockPostService.deletePost.mockResolvedValue({
      id: 'post123',
      deletedAt: new Date()
    })
    
    // Create fresh app for each test
    app = createTestApp()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('POST /posts Rate Limiting (Post Creation)', () => {
    it('should allow post creation within the limit (first 5 posts)', async () => {
      // Act - Make posts within the rate limit
      const postPromises: Promise<SuperTestResponse>[] = Array.from({ length: 5 }, (_, index) =>
        request(app)
          .post('/posts')
          .set('Authorization', 'Bearer valid_token')
          .send({
            content: `This is test post number ${index + 1}`,
            contentWarning: null
          })
      )

      const responses: SuperTestResponse[] = await Promise.all(postPromises)

      // Assert - All posts should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.headers['ratelimit-limit']).toBe('5')
        expect(parseInt(response.headers['ratelimit-remaining'])).toBe(4 - index)
      })
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

      // Act - Create different types of posts
      const responses: SuperTestResponse[] = await Promise.all(
        postVariations.map(postData =>
          request(app)
            .post('/posts')
            .set('Authorization', 'Bearer valid_token')
            .send(postData)
        )
      )

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
    })
  })

  describe('Edge Cases', () => {
    it('should handle posts with maximum content length', async () => {
      // Arrange - Maximum length post content
      const maxLengthContent = 'A'.repeat(2800) // Assuming 2800 char limit

      // Act - Create post with max content
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid_token')
        .send({
          content: maxLengthContent,
          contentWarning: 'Long post warning'
        })

      // Assert - Should succeed and count against rate limit
      expect(response.status).toBe(201)
      expect(response.headers['ratelimit-remaining']).toBe('4')
    })

    it('should handle rapid consecutive post creation within limit', async () => {
      // Act - Make rapid consecutive posts
      const responses: SuperTestResponse[] = []
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/posts')
          .set('Authorization', 'Bearer valid_token')
          .send({
            content: `Rapid post ${i + 1}`,
            contentWarning: null
          })
        responses.push(response)
      }

      // Assert - All should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(parseInt(response.headers['ratelimit-remaining'])).toBe(4 - index)
      })
    })

    it('should handle concurrent post creation attempts', async () => {
      // Act - Make concurrent post requests
      const postPromises: Promise<SuperTestResponse>[] = Array.from({ length: 7 }, (_, index) =>
        request(app)
          .post('/posts')
          .set('Authorization', 'Bearer valid_token')
          .send({
            content: `Concurrent post ${index + 1}`,
            contentWarning: null
          })
      )

      const responses: SuperTestResponse[] = await Promise.all(postPromises)

      // Assert - First 5 should succeed, last 2 should be rate limited
      const successfulPosts = responses.filter(r => r.status === 201)
      const rateLimitedPosts = responses.filter(r => r.status === 429)

      expect(successfulPosts.length).toBe(5)
      expect(rateLimitedPosts.length).toBe(2)
    })

    it('should handle post validation errors without affecting rate limit', async () => {
      // Arrange - Mock validation to fail
      mockPostService.validatePostData.mockReturnValueOnce({
        valid: false,
        errors: [{ field: 'content', message: 'Content is required' }]
      })

      // Act - Make invalid post request
      const invalidResponse = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid_token')
        .send({
          content: '', // Invalid empty content
          contentWarning: null
        })

      // Reset validation to succeed
      mockPostService.validatePostData.mockReturnValue({
        valid: true,
        errors: []
      })

      // Make valid post
      const validResponse = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid_token')
        .send({
          content: 'Valid post content',
          contentWarning: null
        })

      // Assert - Rate limit should still be full after validation error
      expect(invalidResponse.status).toBe(400)
      expect(validResponse.status).toBe(201)
      expect(validResponse.headers['ratelimit-remaining']).toBe('4')
    })

    it('should reset rate limit after time window', async () => {
      // Arrange - Exhaust rate limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/posts')
          .set('Authorization', 'Bearer valid_token')
          .send({
            content: `Rate limit exhaustion post ${i + 1}`,
            contentWarning: null
          })
      }

      // Verify rate limit is exhausted
      const blockedResponse = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid_token')
        .send({
          content: 'Should be blocked',
          contentWarning: null
        })

      expect(blockedResponse.status).toBe(429)

      // Manually reset rate limit window (simulate time passage)
      rateLimitStore.clear()

      // Act - Try post creation after reset
      const afterResetResponse = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer valid_token')
        .send({
          content: 'Post after rate limit reset',
          contentWarning: null
        })

      // Assert - Should succeed after reset
      expect(afterResetResponse.status).toBe(201)
      expect(afterResetResponse.headers['ratelimit-remaining']).toBe('4')
    })
  })
})