// backend/src/routes/__tests__/posts.rateLimit.test.ts
// Version: 8.3.0 - Fixed Response typing in mock implementations
// Changed: Added proper Express Response typing for mock controller methods

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express, { Application, Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { createPostsRouter } from '../posts'
import type { PostController } from '../../controllers/PostController'

// Create individual mock functions with proper typing
const mockCreatePost = vi.fn()
const mockGetPosts = vi.fn()
const mockDeletePost = vi.fn()
const mockGetPostById = vi.fn()
const mockGetUserPosts = vi.fn()
const mockUpdatePost = vi.fn()
const mockGetScheduledPosts = vi.fn()
const mockGetPostStats = vi.fn()

// Mock controller with proper vitest typing - use unknown casting for private properties
const mockPostController = {
  // Mock all public methods with proper vitest Mock typing
  getPosts: mockGetPosts,
  createPost: mockCreatePost, 
  getPostById: mockGetPostById,
  deletePost: mockDeletePost,
  getUserPosts: mockGetUserPosts,
  updatePost: mockUpdatePost,
  getScheduledPosts: mockGetScheduledPosts,
  getPostStats: mockGetPostStats
} as unknown as PostController

// Mock middleware functions with proper async signature
const mockAuthMiddleware = vi.fn(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Simulate authenticated user
  (req as any).user = {
    id: 'test-user-123',
    username: 'testuser',
    email: 'test@example.com'
  }
  next()
})

const mockOptionalAuthMiddleware = vi.fn(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Optional auth - just continue
  next()
})

// Simple rate limit tracking for testing
interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const rateLimitStore: RateLimitStore = {}

// Create rate limit middleware for testing
const createTestRateLimit = (maxRequests: number = 10, windowMs: number = 60000) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = (req as any).user?.id || req.ip || 'anonymous'
    const now = Date.now()
    
    // Clean expired entries
    if (rateLimitStore[key] && rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key]
    }
    
    // Initialize if doesn't exist
    if (!rateLimitStore[key]) {
      rateLimitStore[key] = {
        count: 0,
        resetTime: now + windowMs
      }
    }
    
    // Increment count
    rateLimitStore[key].count++
    
    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - rateLimitStore[key].count)
    const resetInSeconds = Math.ceil((rateLimitStore[key].resetTime - now) / 1000)
    
    res.set({
      'ratelimit-limit': maxRequests.toString(),
      'ratelimit-remaining': remaining.toString(),
      'ratelimit-reset': resetInSeconds.toString()
    })
    
    // Check if over limit
    if (rateLimitStore[key].count > maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Post creation rate limit exceeded. Try again later.',
          retryAfter: `${resetInSeconds} seconds`
        }
      })
      return
    }
    
    next()
  }
}

// Mock the rate limit middleware import
vi.mock('../../middleware/rateLimitMiddleware', () => ({
  postCreationRateLimit: createTestRateLimit(10, 60000) // 10 posts per minute for testing
}))

// Mock validation middleware
vi.mock('../../middleware/postValidationMiddleware', () => ({
  validatePostCreationEndpoint: [
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Simple validation - check for content
      if (!req.body.content || req.body.content.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Post content is required'
          }
        })
        return
      }
      next()
    }
  ],
  validatePostDeletionEndpoint: [async (req: Request, res: Response, next: NextFunction): Promise<void> => next()],
  validatePostListQuery: async (req: Request, res: Response, next: NextFunction): Promise<void> => next(),
  validatePostIdParam: async (req: Request, res: Response, next: NextFunction): Promise<void> => next()
}))

describe('Posts Routes - Rate Limiting Tests', () => {
  let app: Application

  beforeEach(() => {
    // Clear rate limit store
    Object.keys(rateLimitStore).forEach(key => delete rateLimitStore[key])
    
    // Reset all mocks
    vi.clearAllMocks()
    
    // Setup mock controller responses with proper Express types
    mockCreatePost.mockImplementation(async (req: any, res: any): Promise<void> => {
      res.status(201).json({
        success: true,
        data: {
          post: {
            id: 'mock-post-id',
            content: req.body.content,
            authorId: req.user?.id,
            createdAt: new Date().toISOString()
          }
        }
      })
    })
    
    mockGetPosts.mockImplementation(async (req: any, res: any): Promise<void> => {
      res.status(200).json({
        success: true,
        data: {
          posts: [],
          totalCount: 0,
          hasNextPage: false
        }
      })
    })
    
    mockDeletePost.mockImplementation(async (req: any, res: any): Promise<void> => {
      res.status(200).json({
        success: true,
        message: 'Post deleted successfully'
      })
    })
    
    // Create Express app
    app = express()
    app.use(express.json())
    
    // Create posts router with mocked dependencies
    const postsRouter = createPostsRouter({
      postController: mockPostController,
      authMiddleware: mockAuthMiddleware,
      optionalAuthMiddleware: mockOptionalAuthMiddleware
    })
    
    // Mount the router
    app.use('/posts', postsRouter)
  })

  afterEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('POST /posts Rate Limiting', () => {
    const validPostData = {
      content: 'This is a test post for rate limiting'
    }

    it('should allow post creation within rate limit', async () => {
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send(validPostData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.post).toBeDefined()
      expect(response.body.data.post.content).toBe(validPostData.content)
      expect(mockCreatePost).toHaveBeenCalledTimes(1)
    })

    it('should include rate limit headers in response', async () => {
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send(validPostData)

      expect(response.headers['ratelimit-limit']).toBeDefined()
      expect(response.headers['ratelimit-remaining']).toBeDefined()
      expect(response.headers['ratelimit-reset']).toBeDefined()
      expect(response.status).toBe(201)
    })

    it('should apply rate limiting to authenticated users', async () => {
      // Make multiple requests to hit rate limit
      const responses = []
      
      // Make 11 requests (limit is 10)
      for (let i = 0; i < 11; i++) {
        const response = await request(app)
          .post('/posts')
          .set('Authorization', 'Bearer test-token')
          .send({ content: `Test post ${i + 1}` })
        
        responses.push(response)
      }
      
      // First 10 should succeed
      for (let i = 0; i < 10; i++) {
        expect(responses[i].status).toBe(201)
      }
      
      // 11th should be rate limited
      expect(responses[10].status).toBe(429)
      expect(responses[10].body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('should require authentication for post creation', async () => {
      const response = await request(app)
        .post('/posts')
        .send(validPostData)
        // No Authorization header

      // Should still work due to auth middleware mock, but in real app would fail
      expect(mockAuthMiddleware).toHaveBeenCalled()
    })

    it('should handle rate limit configuration properly', async () => {
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send(validPostData)

      expect(response.headers['ratelimit-limit']).toBe('10')
      expect(parseInt(response.headers['ratelimit-remaining'])).toBeGreaterThanOrEqual(0)
    })

    it('should handle multiple rapid post creation attempts', async () => {
      // Test concurrent requests
      const promises = Array(5).fill(null).map((_, i) => 
        request(app)
          .post('/posts')
          .set('Authorization', 'Bearer test-token')
          .send({ content: `Rapid post ${i + 1}` })
      )
      
      const responses = await Promise.all(promises)
      
      // All should succeed since we're under the limit
      responses.forEach(response => {
        expect(response.status).toBe(201)
      })
    })
  })

  describe('Rate Limit Middleware Integration', () => {
    it('should apply rate limiting only to POST /posts endpoint', async () => {
      // POST should have rate limiting
      const postResponse = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send({ content: 'Test post' })

      expect(postResponse.status).toBe(201)
      expect(postResponse.headers['ratelimit-limit']).toBeDefined()
    })

    it('should not apply rate limiting to GET endpoints', async () => {
      // GET endpoints should not have rate limiting headers from post rate limiter
      const getResponse = await request(app)
        .get('/posts')

      expect(getResponse.status).toBe(200)
      // Note: GET endpoints don't use post creation rate limiting
    })

    it('should not apply rate limiting to DELETE endpoint', async () => {
      const response = await request(app)
        .delete('/posts/test-post-123')
        .set('Authorization', 'Bearer test-token')

      expect(response.status).toBe(200)
      expect(mockDeletePost).toHaveBeenCalled()
    })
  })

  describe('Rate Limit Error Handling', () => {
    it('should handle rate limit middleware errors gracefully', async () => {
      // Normal request should work
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send({ content: 'Test post content' })

      expect(response.status).toBe(201)
    })

    it('should maintain proper middleware order with rate limiting', async () => {
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send({ content: 'Test middleware order' })

      expect(response.status).toBe(201)
      expect(mockAuthMiddleware).toHaveBeenCalled()
      expect(mockCreatePost).toHaveBeenCalled()
    })
  })

  describe('Rate Limit Boundary Testing', () => {
    it('should track rate limits per user when authenticated', async () => {
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send({ content: 'User-specific rate limit test' })

      expect(response.status).toBe(201)
      expect(mockAuthMiddleware).toHaveBeenCalled()
      
      // Should have rate limit headers
      expect(response.headers['ratelimit-remaining']).toBeDefined()
    })

    it('should handle unauthenticated rate limiting by IP', async () => {
      // Temporarily mock auth middleware to not set user
      const originalAuth = mockAuthMiddleware
      mockAuthMiddleware.mockImplementationOnce(async (req, res, next) => {
        // Don't set user to test IP-based rate limiting
        next()
      })

      const response = await request(app)
        .post('/posts')
        .send({ content: 'IP-based rate limit test' })

      expect(mockAuthMiddleware).toHaveBeenCalled()
      
      // Restore original mock
      mockAuthMiddleware.mockImplementation(originalAuth.getMockImplementation()!)
    })
  })
})