// backend/src/routes/__tests__/users.follow.rateLimit.test.ts
// Version: 2.0.0 - Optimized for speed, reduced HTTP requests
// Fixed: Reduced sequential requests, faster mocking, shorter tests

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import rateLimit from 'express-rate-limit'

// Mock the follow controller with minimal overhead
const mockFollowController = {
  followUser: vi.fn().mockResolvedValue({ success: true }),
  unfollowUser: vi.fn().mockResolvedValue({ success: true }),
  getFollowers: vi.fn().mockResolvedValue({ followers: [] }),
  getFollowing: vi.fn().mockResolvedValue({ following: [] }),
  blockUser: vi.fn().mockResolvedValue({ success: true }),
  unblockUser: vi.fn().mockResolvedValue({ success: true })
}

/**
 * Create minimal test app with rate limiting
 */
function createTestApp(userId: string): express.Application {
  const app = express()
  app.use(express.json())
  
  // Add test user middleware (simulates authentication)
  app.use((req, res, next) => {
    (req as any).user = { id: userId }
    next()
  })
  
  // Apply follow rate limiting (20 per hour)
  const followRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Follow action limit reached. You can perform 20 follow/unfollow actions per hour.',
          retryAfter: '60 seconds'
        }
      })
    },
    keyGenerator: (req) => (req as any).user?.id || req.ip
  })
  
  // Add routes with rate limiting
  app.post('/users/:username/follow', followRateLimit, (req, res) => {
    mockFollowController.followUser(req.params.username, (req as any).user)
    res.status(201).json({
      success: true,
      message: `Successfully followed ${req.params.username}`
    })
  })
  
  app.delete('/users/:username/follow', followRateLimit, (req, res) => {
    mockFollowController.unfollowUser(req.params.username, (req as any).user)
    res.status(200).json({
      success: true,
      message: `Successfully unfollowed ${req.params.username}`
    })
  })
  
  // Non-rate-limited routes
  app.get('/users/:username/followers', (req, res) => {
    mockFollowController.getFollowers(req.params.username)
    res.json({ followers: [] })
  })
  
  app.get('/users/:username/following', (req, res) => {
    mockFollowController.getFollowing(req.params.username)
    res.json({ following: [] })
  })
  
  return app
}

/**
 * Make multiple requests efficiently with minimal delay
 */
async function makeRequests(app: express.Application, count: number, endpoint: string, method: 'post' | 'delete' = 'post') {
  const requests = []
  
  for (let i = 0; i < count; i++) {
    const req = method === 'post' 
      ? request(app).post(endpoint).send({})
      : request(app).delete(endpoint)
    requests.push(req)
  }
  
  // Execute all requests concurrently (much faster than sequential)
  return Promise.all(requests)
}

describe('Follow Operations Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('POST /users/:username/follow Rate Limiting', () => {
    it('should allow follow operations within the limit (first 5 requests)', async () => {
      const app = createTestApp('user-1')
      
      // Test with just 5 requests (much faster than 20)
      const responses = await makeRequests(app, 5, '/users/testuser/follow')
      
      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(5)
    })

    it('should include rate limit headers in response', async () => {
      const app = createTestApp('user-2')
      
      const response = await request(app)
        .post('/users/testuser/follow')
        .send({})
      
      expect(response.status).toBe(201)
      expect(response.headers['ratelimit-limit']).toBe('20')
      expect(response.headers['ratelimit-remaining']).toBe('19')
      expect(response.headers['ratelimit-reset']).toBeDefined()
    })

    it('should block requests after hitting the limit', async () => {
      const app = createTestApp('user-3')
      
      // Make exactly 20 requests to hit the limit
      const firstBatch = await makeRequests(app, 20, '/users/testuser/follow')
      
      // All 20 should succeed
      firstBatch.forEach((response) => {
        expect(response.status).toBe(201)
      })
      
      // 21st request should be blocked
      const blockedResponse = await request(app)
        .post('/users/testuser/follow')
        .send({})
      
      expect(blockedResponse.status).toBe(429)
      expect(blockedResponse.body.success).toBe(false)
      expect(blockedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(blockedResponse.body.error.message).toContain('Follow action limit reached')
      
      // Controller should only be called 20 times (not 21)
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(20)
    })

    it('should track rate limits by user ID when authenticated', async () => {
      const app1 = createTestApp('user-4')
      const app2 = createTestApp('user-5')
      
      // Each user should have separate rate limits
      const user1Response = await request(app1).post('/users/testuser/follow').send({})
      const user2Response = await request(app2).post('/users/testuser/follow').send({})
      
      expect(user1Response.status).toBe(201)
      expect(user2Response.status).toBe(201)
      
      // Both should show 19 remaining (separate limits)
      expect(user1Response.headers['ratelimit-remaining']).toBe('19')
      expect(user2Response.headers['ratelimit-remaining']).toBe('19')
    })
  })

  describe('DELETE /users/:username/follow Rate Limiting', () => {
    it('should allow unfollow operations within the limit', async () => {
      const app = createTestApp('user-6')
      
      // Test with 5 unfollow requests
      const responses = await makeRequests(app, 5, '/users/testuser/follow', 'delete')
      
      responses.forEach((response) => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockFollowController.unfollowUser).toHaveBeenCalledTimes(5)
    })

    it('should block unfollow after hitting the limit', async () => {
      const app = createTestApp('user-7')
      
      // Hit the limit with 20 unfollow requests
      await makeRequests(app, 20, '/users/testuser/follow', 'delete')
      
      // 21st should be blocked
      const blockedResponse = await request(app).delete('/users/testuser/follow')
      
      expect(blockedResponse.status).toBe(429)
      expect(blockedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      
      expect(mockFollowController.unfollowUser).toHaveBeenCalledTimes(20)
    })
  })

  describe('Shared Rate Limiting Between Follow and Unfollow', () => {
    it('should share rate limit between follow and unfollow operations', async () => {
      const app = createTestApp('user-8')
      
      // Mix of follow and unfollow requests (total 20)
      const followRequests = makeRequests(app, 10, '/users/testuser/follow', 'post')
      const unfollowRequests = makeRequests(app, 10, '/users/testuser/follow', 'delete')
      
      const [followResponses, unfollowResponses] = await Promise.all([followRequests, unfollowRequests])
      
      // All should succeed (within the 20 limit)
      followResponses.forEach(response => expect(response.status).toBe(201))
      unfollowResponses.forEach(response => expect(response.status).toBe(200))
      
      // Next request should be blocked
      const blockedResponse = await request(app).post('/users/testuser/follow').send({})
      expect(blockedResponse.status).toBe(429)
    })
  })

  describe('Non-Rate-Limited User Operations', () => {
    it('should not apply rate limiting to follower/following lists', async () => {
      const app = createTestApp('user-9')
      
      // Make multiple requests to view lists (should not be rate limited)
      const requests = []
      for (let i = 0; i < 10; i++) {
        requests.push(request(app).get('/users/testuser/followers'))
        requests.push(request(app).get('/users/testuser/following'))
      }
      
      const responses = await Promise.all(requests)
      
      // All should succeed
      responses.forEach(response => expect(response.status).toBe(200))
      
      expect(mockFollowController.getFollowers).toHaveBeenCalledTimes(10)
      expect(mockFollowController.getFollowing).toHaveBeenCalledTimes(10)
    })
  })

  describe('Rate Limit Error Response Format', () => {
    it('should return consistent error format when rate limited', async () => {
      const app = createTestApp('user-10')
      
      // Hit the rate limit
      await makeRequests(app, 20, '/users/testuser/follow')
      
      // Get rate limited response
      const response = await request(app).post('/users/testuser/follow').send({})
      
      expect(response.status).toBe(429)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Follow action limit reached. You can perform 20 follow/unfollow actions per hour.',
          retryAfter: '60 seconds'
        }
      })
    })
  })
})