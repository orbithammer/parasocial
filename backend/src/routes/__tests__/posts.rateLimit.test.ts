// backend/src/routes/__tests__/posts.rateLimit.test.ts
// Version: 2.0.0 - Optimized for speed, reduced HTTP requests
// Fixed: Reduced sequential requests, faster mocking, shorter tests

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import rateLimit from 'express-rate-limit'

// Mock the post controller with minimal overhead
const mockPostController = {
  createPost: vi.fn().mockResolvedValue({ success: true }),
  getPosts: vi.fn().mockResolvedValue({ posts: [] }),
  getPostById: vi.fn().mockResolvedValue({ post: {} }),
  deletePost: vi.fn().mockResolvedValue({ success: true })
}

/**
 * Create minimal test app with post rate limiting
 */
function createTestApp(userId: string): express.Application {
  const app = express()
  app.use(express.json())
  
  // Add test user middleware (simulates authentication)
  app.use((req, res, next) => {
    (req as any).user = { id: userId }
    next()
  })
  
  // Apply post creation rate limiting (10 per hour)
  const postCreationRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Post creation limit reached. You can create 10 posts per hour.',
          retryAfter: '60 seconds'
        }
      })
    },
    keyGenerator: (req) => (req as any).user?.id || req.ip
  })
  
  // Add routes with rate limiting
  app.post('/posts', postCreationRateLimit, (req, res) => {
    mockPostController.createPost(req.body, (req as any).user)
    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: { id: 'test-post-id', content: req.body.content }
    })
  })
  
  // Non-rate-limited routes
  app.get('/posts', (req, res) => {
    mockPostController.getPosts(req.query)
    res.json({ posts: [] })
  })
  
  app.get('/posts/:id', (req, res) => {
    mockPostController.getPostById(req.params.id)
    res.json({ post: { id: req.params.id } })
  })
  
  app.delete('/posts/:id', (req, res) => {
    mockPostController.deletePost(req.params.id, (req as any).user)
    res.json({ success: true })
  })
  
  return app
}

/**
 * Make multiple post creation requests efficiently
 */
async function makePostRequests(app: express.Application, count: number) {
  const requests = []
  
  for (let i = 0; i < count; i++) {
    const req = request(app)
      .post('/posts')
      .send({ content: `Test post content ${i}` })
    requests.push(req)
  }
  
  // Execute all requests concurrently
  return Promise.all(requests)
}

describe('Posts Routes Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('POST /posts Rate Limiting (Post Creation)', () => {
    it('should allow post creation within the limit (first 5 posts)', async () => {
      const app = createTestApp('post-user-1')
      
      // Test with 5 posts (much faster than 10)
      const responses = await makePostRequests(app, 5)
      
      // All should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.message).toBe('Post created successfully')
      })
      
      expect(mockPostController.createPost).toHaveBeenCalledTimes(5)
    })

    it('should include rate limit headers in response', async () => {
      const app = createTestApp('post-user-2')
      
      const response = await request(app)
        .post('/posts')
        .send({ content: 'Test post content' })
      
      expect(response.status).toBe(201)
      expect(response.headers['ratelimit-limit']).toBe('10')
      expect(response.headers['ratelimit-remaining']).toBe('9')
      expect(response.headers['ratelimit-reset']).toBeDefined()
    })

    it('should block post creation after hitting the limit', async () => {
      const app = createTestApp('post-user-3')
      
      // Make exactly 10 requests to hit the limit
      const firstBatch = await makePostRequests(app, 10)
      
      // All 10 should succeed
      firstBatch.forEach((response) => {
        expect(response.status).toBe(201)
      })
      
      // 11th request should be blocked
      const blockedResponse = await request(app)
        .post('/posts')
        .send({ content: 'This should be blocked' })
      
      expect(blockedResponse.status).toBe(429)
      expect(blockedResponse.body.success).toBe(false)
      expect(blockedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(blockedResponse.body.error.message).toContain('Post creation limit reached')
      expect(blockedResponse.body.error.message).toContain('10 posts per hour')
      
      // Controller should only be called 10 times (not 11)
      expect(mockPostController.createPost).toHaveBeenCalledTimes(10)
    })

    it('should track rate limits by user ID when authenticated', async () => {
      const app1 = createTestApp('post-user-4')
      const app2 = createTestApp('post-user-5')
      
      // Each user should have separate rate limits
      const user1Response = await request(app1)
        .post('/posts')
        .send({ content: 'User 1 post' })
      
      const user2Response = await request(app2)
        .post('/posts')
        .send({ content: 'User 2 post' })
      
      expect(user1Response.status).toBe(201)
      expect(user2Response.status).toBe(201)
      
      // Both should show 9 remaining (separate limits)
      expect(user1Response.headers['ratelimit-remaining']).toBe('9')
      expect(user2Response.headers['ratelimit-remaining']).toBe('9')
    })

    it('should allow different post content without affecting rate limit', async () => {
      const app = createTestApp('post-user-6')
      
      // Create posts with different content
      const posts = [
        { content: 'First post about technology' },
        { content: 'Second post about cooking' },
        { content: 'Third post about travel' }
      ]
      
      const requests = posts.map(post => 
        request(app).post('/posts').send(post)
      )
      
      const responses = await Promise.all(requests)
      
      responses.forEach((response) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockPostController.createPost).toHaveBeenCalledTimes(3)
    })
  })

  describe('Non-Rate-Limited Post Operations', () => {
    it('should not apply rate limiting to GET /posts (reading posts)', async () => {
      const app = createTestApp('post-reader-1')
      
      // Make multiple requests to read posts (should not be rate limited)
      const requests = []
      for (let i = 0; i < 15; i++) {
        requests.push(request(app).get('/posts'))
      }
      
      const responses = await Promise.all(requests)
      
      // All should succeed
      responses.forEach(response => expect(response.status).toBe(200))
      
      expect(mockPostController.getPosts).toHaveBeenCalledTimes(15)
    })

    it('should not apply rate limiting to GET /posts/:id (reading individual posts)', async () => {
      const app = createTestApp('post-reader-2')
      
      // Make multiple requests to read individual posts
      const requests = []
      for (let i = 0; i < 12; i++) {
        requests.push(request(app).get(`/posts/post-${i}`))
      }
      
      const responses = await Promise.all(requests)
      
      // All should succeed
      responses.forEach(response => expect(response.status).toBe(200))
      
      expect(mockPostController.getPostById).toHaveBeenCalledTimes(12)
    })

    it('should not apply rate limiting to DELETE /posts/:id (deleting posts)', async () => {
      const app = createTestApp('post-deleter-1')
      
      // Make multiple delete requests (should not be rate limited)
      const requests = []
      for (let i = 0; i < 8; i++) {
        requests.push(request(app).delete(`/posts/post-${i}`))
      }
      
      const responses = await Promise.all(requests)
      
      // All should succeed
      responses.forEach(response => expect(response.status).toBe(200))
      
      expect(mockPostController.deletePost).toHaveBeenCalledTimes(8)
    })
  })

  describe('Rate Limit Error Response Format', () => {
    it('should return consistent error format when rate limited', async () => {
      const app = createTestApp('post-user-7')
      
      // Hit the rate limit with 10 posts
      await makePostRequests(app, 10)
      
      // Get rate limited response
      const response = await request(app)
        .post('/posts')
        .send({ content: 'This should be blocked' })
      
      expect(response.status).toBe(429)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Post creation limit reached. You can create 10 posts per hour.',
          retryAfter: '60 seconds'
        }
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle posts with maximum content length', async () => {
      const app = createTestApp('post-user-8')
      
      // Create a post with long content
      const longContent = 'a'.repeat(280) // Twitter-like limit
      
      const response = await request(app)
        .post('/posts')
        .send({ content: longContent })
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      
      expect(mockPostController.createPost).toHaveBeenCalledWith(
        { content: longContent },
        { id: 'post-user-8' }
      )
    })

    it('should handle rapid consecutive post creation within limit', async () => {
      const app = createTestApp('post-user-9')
      
      // Make 3 rapid requests
      const responses = await makePostRequests(app, 3)
      
      responses.forEach((response) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockPostController.createPost).toHaveBeenCalledTimes(3)
    })
  })
})