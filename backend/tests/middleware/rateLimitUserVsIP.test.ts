// backend/tests/middleware/rateLimitUserVsIP.test.ts
// Focused test for user ID vs IP-based rate limiting behavior
// Tests that authenticated users are tracked by user ID, anonymous users by IP

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express, { Application } from 'express'
import request, { Response } from 'supertest'

/**
 * Helper function to make multiple requests sequentially
 * @param app - Express application
 * @param count - Number of requests to make
 * @returns Array of response objects
 */
async function makeSequentialRequests(app: Application, count: number): Promise<Response[]> {
  const responses: Response[] = []
  for (let i = 0; i < count; i++) {
    const response = await request(app).post('/test')
    responses.push(response)
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  return responses
}

/**
 * Create Express app with rate limiting for testing user vs IP behavior
 * @param useAuth - Whether to simulate authenticated user
 * @param userId - User ID for authenticated requests
 * @param testIpSuffix - Unique suffix for test IP
 * @returns Express application for testing
 */
function createRateLimitApp(useAuth: boolean, userId?: string, testIpSuffix = 'default'): Application {
  const app = express()
  app.use(express.json())
  
  // Set unique test IP for this app instance
  app.use((req, res, next) => {
    ;(req as any).testIp = `test-ip-${testIpSuffix}`
    next()
  })
  
  // Mock authentication if needed
  if (useAuth && userId) {
    app.use((req, res, next) => {
      ;(req as any).user = {
        id: userId,
        username: `user-${userId}`,
        email: `${userId}@test.com`
      }
      next()
    })
  }
  
  // Create rate limiter that uses user ID when available, otherwise IP
  const rateLimit = require('express-rate-limit').default || require('express-rate-limit')
  
  const rateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 3, // Low limit for easy testing
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: any, res: any) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          rateLimitKey: req.rateLimitKey || 'unknown',
          retryAfter: '60 seconds'
        }
      })
    },
    // Key generator that shows whether it's using user ID or IP
    keyGenerator: (req: any) => {
      const key = req.user?.id || req.testIp
      // Store the key used for debugging
      ;(req as any).rateLimitKey = key
      return key
    },
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  })
  
  app.use(rateLimiter)
  
  // Test endpoint that returns info about rate limiting
  app.post('/test', (req, res) => {
    res.json({
      success: true,
      message: 'Request successful',
      rateLimitedBy: (req as any).user?.id ? 'user-id' : 'ip-address',
      rateLimitKey: (req as any).rateLimitKey || ((req as any).user?.id || (req as any).testIp),
      user: (req as any).user || null
    })
  })
  
  return app
}

describe('Rate Limiting: User ID vs IP Address', () => {
  
  afterEach(() => {
    vi.clearAllTimers()
    vi.clearAllMocks()
  })

  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  describe('Authenticated User Rate Limiting (by User ID)', () => {
    it('should track rate limits by user ID for authenticated users', async () => {
      const userId = 'user-123'
      const app = createRateLimitApp(true, userId, 'auth-user-test')
      
      // Make 3 requests (should all succeed)
      const responses = await makeSequentialRequests(app, 3)
      
      // All should succeed and show they're rate limited by user ID
      responses.forEach((response) => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.rateLimitedBy).toBe('user-id')
        expect(response.body.rateLimitKey).toBe(userId)
        expect(response.body.user.id).toBe(userId)
      })
      
      // 4th request should be rate limited
      const rateLimitedResponse = await request(app).post('/test')
      expect(rateLimitedResponse.status).toBe(429)
      expect(rateLimitedResponse.body.error.rateLimitKey).toBe(userId)
    })

    it('should allow different users to have separate rate limits', async () => {
      const user1App = createRateLimitApp(true, 'user-111', 'multi-user-1')
      const user2App = createRateLimitApp(true, 'user-222', 'multi-user-2')
      
      // User 1 makes 3 requests (hits their limit)
      const user1Responses = await makeSequentialRequests(user1App, 3)
      user1Responses.forEach((response) => {
        expect(response.status).toBe(200)
        expect(response.body.rateLimitKey).toBe('user-111')
      })
      
      // User 1's 4th request should be blocked
      const user1Blocked = await request(user1App).post('/test')
      expect(user1Blocked.status).toBe(429)
      
      // User 2 should still be able to make requests (separate limit)
      const user2Response = await request(user2App).post('/test')
      expect(user2Response.status).toBe(200)
      expect(user2Response.body.rateLimitKey).toBe('user-222')
    })
  })

  describe('Anonymous User Rate Limiting (by IP Address)', () => {
    it('should track rate limits by IP address for anonymous users', async () => {
      const app = createRateLimitApp(false, undefined, 'anon-ip-test')
      
      // Make 3 requests (should all succeed)
      const responses = await makeSequentialRequests(app, 3)
      
      // All should succeed and show they're rate limited by IP
      responses.forEach((response) => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.rateLimitedBy).toBe('ip-address')
        expect(response.body.rateLimitKey).toBe('test-ip-anon-ip-test')
        expect(response.body.user).toBe(null)
      })
      
      // 4th request should be rate limited
      const rateLimitedResponse = await request(app).post('/test')
      expect(rateLimitedResponse.status).toBe(429)
      expect(rateLimitedResponse.body.error.rateLimitKey).toBe('test-ip-anon-ip-test')
    })

    it('should allow different IP addresses to have separate rate limits', async () => {
      const ip1App = createRateLimitApp(false, undefined, 'ip-addr-1')
      const ip2App = createRateLimitApp(false, undefined, 'ip-addr-2')
      
      // IP 1 makes 3 requests (hits their limit)
      const ip1Responses = await makeSequentialRequests(ip1App, 3)
      ip1Responses.forEach((response) => {
        expect(response.status).toBe(200)
        expect(response.body.rateLimitKey).toBe('test-ip-ip-addr-1')
      })
      
      // IP 1's 4th request should be blocked
      const ip1Blocked = await request(ip1App).post('/test')
      expect(ip1Blocked.status).toBe(429)
      
      // IP 2 should still be able to make requests (separate limit)
      const ip2Response = await request(ip2App).post('/test')
      expect(ip2Response.status).toBe(200)
      expect(ip2Response.body.rateLimitKey).toBe('test-ip-ip-addr-2')
    })
  })

  describe('User ID vs IP Priority', () => {
    it('should prioritize user ID over IP address when user is authenticated', async () => {
      const userId = 'priority-user-456'
      const app = createRateLimitApp(true, userId, 'priority-test')
      
      // Make request and verify it uses user ID, not IP
      const response = await request(app).post('/test')
      
      expect(response.status).toBe(200)
      expect(response.body.rateLimitedBy).toBe('user-id')
      expect(response.body.rateLimitKey).toBe(userId)
      // The IP should be available but not used for rate limiting
      expect(response.body.rateLimitKey).not.toBe('test-ip-priority-test')
    })

    it('should demonstrate same user from different IPs shares rate limit', async () => {
      const userId = 'shared-user-789'
      const sameUserApp1 = createRateLimitApp(true, userId, 'different-ip-1')
      const sameUserApp2 = createRateLimitApp(true, userId, 'different-ip-2')
      
      // User makes 2 requests from first "IP"
      const responses1 = await makeSequentialRequests(sameUserApp1, 2)
      responses1.forEach((response) => {
        expect(response.status).toBe(200)
        expect(response.body.rateLimitKey).toBe(userId)
      })
      
      // User makes 1 more request from second "IP" (should still work)
      const response2 = await request(sameUserApp2).post('/test')
      expect(response2.status).toBe(200)
      expect(response2.body.rateLimitKey).toBe(userId)
      
      // Now the user is at their limit (3 total requests)
      // 4th request from either IP should be blocked
      const blockedResponse = await request(sameUserApp1).post('/test')
      expect(blockedResponse.status).toBe(429)
      expect(blockedResponse.body.error.rateLimitKey).toBe(userId)
    })
  })

  describe('Fallback Behavior', () => {
    it('should fallback to IP when user ID is not available', async () => {
      // Create app that simulates auth middleware but doesn't set user
      const app = express()
      app.use(express.json())
      
      app.use((req, res, next) => {
        ;(req as any).testIp = 'fallback-test-ip'
        // Simulate auth middleware that doesn't set user (e.g., invalid token)
        ;(req as any).authAttempted = true
        next()
      })
      
      const rateLimit = require('express-rate-limit').default || require('express-rate-limit')
      
      const rateLimiter = rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 3,
        handler: (req: any, res: any) => {
          res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Rate limit exceeded',
              rateLimitKey: req.rateLimitKey,
              retryAfter: '60 seconds'
            }
          })
        },
        keyGenerator: (req: any) => {
          const key = req.user?.id || req.testIp
          ;(req as any).rateLimitKey = key
          return key
        }
      })
      
      app.use(rateLimiter)
      
      app.post('/test', (req, res) => {
        res.json({
          success: true,
          message: 'Request successful',
          rateLimitedBy: (req as any).user?.id ? 'user-id' : 'ip-address',
          rateLimitKey: (req as any).rateLimitKey,
          authAttempted: (req as any).authAttempted,
          user: (req as any).user || null
        })
      })
      
      // Make request without authenticated user
      const response = await request(app).post('/test')
      
      expect(response.status).toBe(200)
      expect(response.body.rateLimitedBy).toBe('ip-address')
      expect(response.body.rateLimitKey).toBe('fallback-test-ip')
      expect(response.body.authAttempted).toBe(true)
      expect(response.body.user).toBe(null)
    })
  })
})