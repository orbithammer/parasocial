// backend/src/routes/__tests__/posts.rateLimit.test.ts
// Version: 1.1.0 - Colocated test for post creation rate limiting
// Tests rate limiting on post creation to prevent spam while allowing legitimate use

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express, { Application } from 'express'
import request from 'supertest'
import { createPostsRouter } from '../posts'

/**
 * Mock PostController for testing
 * Simulates successful post operations
 * Only includes public methods, not private properties
 */
const mockPostController = {
  // Method implementations (only public interface)
  getPosts: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      data: {
        posts: [
          {
            id: 'post_123',
            content: 'Test post content',
            authorId: 'user_123',
            isPublished: true,
            createdAt: new Date().toISOString()
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalPosts: 1,
          hasNext: false,
          hasPrev: false
        }
      }
    })
  }),

  createPost: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(201).json({
      success: true,
      data: {
        id: `post_${Date.now()}`,
        content: req.body.content,
        contentWarning: req.body.contentWarning || null,
        authorId: req.user?.id || 'user_123',
        isPublished: true,
        createdAt: new Date().toISOString(),
        publishedAt: new Date().toISOString()
      }
    })
  }),

  getPostById: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      data: {
        id: req.params.id,
        content: 'Test post content',
        authorId: 'user_123',
        isPublished: true,
        createdAt: new Date().toISOString()
      }
    })
  }),

  deletePost: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    })
  }),

  getUserPosts: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      data: {
        posts: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalPosts: 0,
          hasNext: false,
          hasPrev: false
        }
      }
    })
  })
} as any // Type assertion to bypass strict interface checking

/**
 * Mock auth middleware for testing
 * Simulates authenticated user with different IDs for testing user-based rate limiting
 */
const createMockAuthMiddleware = (userId: string = 'user_123') => {
  return vi.fn().mockImplementation(async (req: any, res: any, next: any) => {
    req.user = {
      id: userId,
      email: `${userId}@example.com`,
      username: `user_${userId}`
    }
    next()
  })
}

/**
 * Mock optional auth middleware for testing
 * Allows requests without authentication
 */
const mockOptionalAuthMiddleware = vi.fn().mockImplementation(async (req: any, res: any, next: any) => {
  // Sometimes add user, sometimes don't (for testing optional auth)
  if (req.headers.authorization) {
    req.user = {
      id: 'user_123',
      email: 'test@example.com',
      username: 'testuser'
    }
  }
  next()
})

/**
 * Create test Express application with posts routes
 * @param userId - User ID for authenticated requests (for testing user-based rate limiting)
 */
function createTestApp(userId: string = 'user_123'): Application {
  const app = express()
  
  // Basic middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Mount posts routes with rate limiting
  app.use('/posts', createPostsRouter({
    postController: mockPostController,
    authMiddleware: createMockAuthMiddleware(userId),
    optionalAuthMiddleware: mockOptionalAuthMiddleware
  }))
  
  return app
}

/**
 * Helper function to make sequential requests to avoid race conditions
 * @param app - Express application
 * @param endpoint - API endpoint to test
 * @param data - Request body data
 * @param count - Number of requests to make
 * @returns Array of response objects
 */
async function makeSequentialRequests(
  app: Application, 
  endpoint: string, 
  data: any, 
  count: number
): Promise<request.Response[]> {
  const responses: request.Response[] = []
  
  for (let i = 0; i < count; i++) {
    const response = await request(app)
      .post(endpoint)
      .send(data)
    
    responses.push(response)
    
    // Small delay to ensure requests are processed sequentially
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  return responses
}

describe('Posts Routes Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('POST /posts Rate Limiting (Post Creation)', () => {
    const postData = {
      content: 'This is a test post content',
      contentWarning: null
    }

    it('should allow post creation within the limit (10 per hour)', async () => {
      const app = createTestApp('user_test_1')
      const responses = await makeSequentialRequests(app, '/posts', postData, 10)
      
      // All 10 requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data.content).toBe(postData.content)
        expect(mockPostController.createPost).toHaveBeenNthCalledWith(index + 1, expect.any(Object), expect.any(Object))
      })
      
      expect(mockPostController.createPost).toHaveBeenCalledTimes(10)
    })

    it('should block 11th post creation with rate limit error', async () => {
      const app = createTestApp('user_test_2')
      const responses = await makeSequentialRequests(app, '/posts', postData, 11)
      
      // First 10 should succeed
      for (let i = 0; i < 10; i++) {
        expect(responses[i].status).toBe(201)
        expect(responses[i].body.success).toBe(true)
      }
      
      // 11th request should be rate limited
      expect(responses[10].status).toBe(429)
      expect(responses[10].body.success).toBe(false)
      expect(responses[10].body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(responses[10].body.error.message).toContain('Post creation limit reached')
      expect(responses[10].body.error.message).toContain('10 posts per hour')
      
      // Controller should only be called 10 times
      expect(mockPostController.createPost).toHaveBeenCalledTimes(10)
    })

    it('should include rate limit headers in response', async () => {
      const app = createTestApp('user_test_3')
      const response = await request(app)
        .post('/posts')
        .send(postData)
      
      expect(response.headers['ratelimit-limit']).toBeDefined()
      expect(response.headers['ratelimit-remaining']).toBeDefined()
      expect(response.headers['ratelimit-reset']).toBeDefined()
      
      // Should start with 9 remaining (10 total - 1 used)
      expect(response.headers['ratelimit-remaining']).toBe('9')
      expect(response.headers['ratelimit-limit']).toBe('10')
    })

    it('should track rate limits by user ID when authenticated', async () => {
      const user1App = createTestApp('user_rate_limit_1')
      const user2App = createTestApp('user_rate_limit_2')
      
      // User 1 makes 10 posts (hits limit)
      const user1Responses = await makeSequentialRequests(user1App, '/posts', postData, 11)
      
      // User 1's 11th post should be rate limited
      expect(user1Responses[10].status).toBe(429)
      
      // User 2 should still be able to post (separate rate limit)
      const user2Response = await request(user2App)
        .post('/posts')
        .send(postData)
      
      expect(user2Response.status).toBe(201)
      expect(user2Response.body.success).toBe(true)
    })

    it('should allow different post content without affecting rate limit', async () => {
      const app = createTestApp('user_test_4')
      const variations = [
        { content: 'First post content' },
        { content: 'Second post with different content' },
        { content: 'Third post', contentWarning: 'Contains mild language' },
        { content: 'Fourth post with emoji 🚀' }
      ]
      
      // Make posts with different content
      for (const postVariation of variations) {
        const response = await request(app)
          .post('/posts')
          .send(postVariation)
        
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data.content).toBe(postVariation.content)
      }
      
      expect(mockPostController.createPost).toHaveBeenCalledTimes(4)
    })
  })

  describe('Non-Rate-Limited Post Operations', () => {
    it('should not apply rate limiting to GET /posts (reading posts)', async () => {
      const app = createTestApp('user_test_5')
      
      // Make many GET requests - should not be rate limited
      const responses = []
      for (let i = 0; i < 20; i++) {
        const response = await request(app).get('/posts')
        responses.push(response)
      }
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockPostController.getPosts).toHaveBeenCalledTimes(20)
    })

    it('should not apply rate limiting to GET /posts/:id (reading individual posts)', async () => {
      const app = createTestApp('user_test_6')
      
      // Make many GET requests for individual posts
      const responses = []
      for (let i = 0; i < 15; i++) {
        const response = await request(app).get(`/posts/post_${i}`)
        responses.push(response)
      }
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockPostController.getPostById).toHaveBeenCalledTimes(15)
    })

    it('should not apply rate limiting to DELETE /posts/:id (deleting posts)', async () => {
      const app = createTestApp('user_test_7')
      
      // Make many DELETE requests - should not be rate limited
      const responses = []
      for (let i = 0; i < 12; i++) {
        const response = await request(app).delete(`/posts/post_${i}`)
        responses.push(response)
      }
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockPostController.deletePost).toHaveBeenCalledTimes(12)
    })
  })

  describe('Rate Limit Error Response Format', () => {
    it('should return consistent error format when rate limited', async () => {
      const app = createTestApp('user_test_8')
      const postData = { content: 'Test post for rate limit check' }
      
      // Hit the rate limit (make 10 posts)
      await makeSequentialRequests(app, '/posts', postData, 10)
      
      // Make one more request to trigger rate limit
      const response = await request(app)
        .post('/posts')
        .send(postData)
      
      expect(response.status).toBe(429)
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: expect.stringContaining('Post creation limit reached'),
          retryAfter: '60 seconds'
        }
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle posts with maximum content length', async () => {
      const app = createTestApp('user_test_9')
      const longContent = 'A'.repeat(2000) // Assuming 2000 char limit
      
      const response = await request(app)
        .post('/posts')
        .send({ content: longContent })
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.content).toBe(longContent)
    })

    it('should handle rapid consecutive post creation within limit', async () => {
      const app = createTestApp('user_test_10')
      const postData = { content: 'Rapid fire post' }
      
      // Make 3 posts as quickly as possible
      const promises = []
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .post('/posts')
            .send({ ...postData, content: `${postData.content} ${i}` })
        )
      }
      
      const responses = await Promise.all(promises)
      
      responses.forEach(response => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })
    })
  })
})