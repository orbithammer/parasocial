// src/routes/__tests__/users.follow.rateLimit.test.ts
// Version: 2.1.0 - Fixed TypeScript Response type conflicts
// Changed: Replaced forEach with for...of loops to avoid type inference issues

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express, { Application } from 'express'
import request from 'supertest'

// Mock AuthService for authentication middleware
const mockAuthService = {
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn()
}

// Mock FollowController for follow operations
const mockFollowController = {
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  getUserFollowers: vi.fn(),
  getUserFollowing: vi.fn(),
  getUserFollowStats: vi.fn()
}

// Mock UserController for user operations
const mockUserController = {
  getUserByUsername: vi.fn()
}

describe('Follow Operations Rate Limiting', () => {
  let app: Application

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Create Express app with follow rate limiting
    app = express()
    app.use(express.json())
    
    // Mock authentication middleware
    app.use((req, res, next) => {
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7)
          const decoded = mockAuthService.verifyToken(token)
          ;(req as any).user = decoded
        } catch (error) {
          // Authentication failed, but continue for optional auth
        }
      }
      next()
    })

    // Apply follow rate limiting middleware
    const rateLimit = require('express-rate-limit').default || require('express-rate-limit')
    
    const followRateLimit = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour window
      max: 20, // Maximum 20 follow operations per hour
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Follow action limit reached. You can perform 20 follow/unfollow actions per hour.',
          retryAfter: '60 seconds'
        }
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Use user ID if authenticated, otherwise IP
      keyGenerator: (req) => {
        const authenticatedUser = (req as any).user
        return authenticatedUser?.id || req.ip || 'unknown'
      }
    })

    // Set up follow routes with rate limiting
    app.post('/users/:username/follow', followRateLimit, (req, res) => {
      mockFollowController.followUser(req, res)
      res.status(200).json({
        success: true,
        message: 'Successfully followed user',
        user: (req as any).user || null
      })
    })

    app.delete('/users/:username/follow', followRateLimit, (req, res) => {
      mockFollowController.unfollowUser(req, res)
      res.status(200).json({
        success: true,
        message: 'Successfully unfollowed user',
        user: (req as any).user || null
      })
    })

    // Set up test user authentication
    mockAuthService.verifyToken.mockReturnValue({
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Follow Operation Rate Limiting (20 per hour)', () => {
    it('should allow follow operations within the limit (first 5 operations)', async () => {
      // Act - Make 5 follow requests
      const responses: any[] = []
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post(`/users/testuser${i}/follow`)
          .set('Authorization', 'Bearer valid_token')
        responses.push(response)
      }

      // Assert - All should succeed
      for (const response of responses) {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.message).toBe('Successfully followed user')
      }
    })

    it('should include rate limit headers in response', async () => {
      // Act - Make first follow request
      const response = await request(app)
        .post('/users/targetuser/follow')
        .set('Authorization', 'Bearer valid_token')

      // Assert - Check rate limit headers
      expect(response.status).toBe(200)
      expect(response.headers).toHaveProperty('ratelimit-limit')
      expect(response.headers).toHaveProperty('ratelimit-remaining')
      expect(response.headers).toHaveProperty('ratelimit-reset')
      expect(response.headers['ratelimit-limit']).toBe('20')
      expect(response.headers['ratelimit-remaining']).toBe('19')
    })

    it('should block follow operations after hitting the limit', async () => {
      // Arrange - Exhaust rate limit first (20 operations)
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post(`/users/user${i}/follow`)
          .set('Authorization', 'Bearer valid_token')
      }

      // Act - Try one more follow operation (should be blocked)
      const blockedResponse = await request(app)
        .post('/users/finaluser/follow')
        .set('Authorization', 'Bearer valid_token')

      // Assert - Should be rate limited
      expect(blockedResponse.status).toBe(429)
      expect(blockedResponse.body).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Follow action limit reached. You can perform 20 follow/unfollow actions per hour.',
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

      // Act - Make follow requests from different users
      const user1Response = await request(app)
        .post('/users/target1/follow')
        .set('Authorization', 'Bearer token1')

      const user2Response = await request(app)
        .post('/users/target2/follow')
        .set('Authorization', 'Bearer token2')

      // Assert - Different users should have separate rate limits
      expect(user1Response.status).toBe(200)
      expect(user1Response.headers['ratelimit-remaining']).toBe('19')
      
      expect(user2Response.status).toBe(200)
      expect(user2Response.headers['ratelimit-remaining']).toBe('19')
    })

    it('should use IP address for rate limiting when not authenticated', async () => {
      // Note: Follow operations typically require authentication, but testing fallback behavior
      
      // Act - Make multiple unauthenticated requests (should all count towards same IP limit)
      const responses: any[] = []
      
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post(`/users/target${i}/follow`)
          // No Authorization header
        responses.push(response)
      }

      // Assert - All should share the same IP-based rate limit
      for (let index = 0; index < responses.length; index++) {
        const response = responses[index]
        expect(response.status).toBe(200)
        expect(parseInt(response.headers['ratelimit-remaining'])).toBe(19 - index)
      }
    })
  })

  describe('Mixed Follow Operations', () => {
    it('should share rate limit between follow and unfollow operations', async () => {
      // Act - Mix follow and unfollow requests
      const followResponse = await request(app)
        .post('/users/target1/follow')
        .set('Authorization', 'Bearer valid_token')

      const unfollowResponse = await request(app)
        .delete('/users/target2/follow')
        .set('Authorization', 'Bearer valid_token')

      const anotherFollowResponse = await request(app)
        .post('/users/target3/follow')
        .set('Authorization', 'Bearer valid_token')

      // Assert - All should count towards the same rate limit
      expect(followResponse.status).toBe(200)
      expect(followResponse.headers['ratelimit-remaining']).toBe('19')
      
      expect(unfollowResponse.status).toBe(200)
      expect(unfollowResponse.headers['ratelimit-remaining']).toBe('18')
      
      expect(anotherFollowResponse.status).toBe(200)
      expect(anotherFollowResponse.headers['ratelimit-remaining']).toBe('17')
    })

    it('should handle follow operation failures within rate limit', async () => {
      // Act - Make requests that might fail (e.g., following non-existent user)
      const followResponse = await request(app)
        .post('/users/nonexistentuser/follow')
        .set('Authorization', 'Bearer valid_token')

      const validFollowResponse = await request(app)
        .post('/users/validuser/follow')
        .set('Authorization', 'Bearer valid_token')

      // Assert - Both should count against rate limit, regardless of success/failure
      expect(followResponse.status).toBe(200) // Mocked to succeed
      expect(followResponse.headers['ratelimit-remaining']).toBe('19')
      
      expect(validFollowResponse.status).toBe(200)
      expect(validFollowResponse.headers['ratelimit-remaining']).toBe('18')
    })
  })

  describe('Rate Limit Error Response Format', () => {
    it('should return consistent error format for follow rate limits', async () => {
      // Arrange - Hit the rate limit
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post(`/users/setup${i}/follow`)
          .set('Authorization', 'Bearer valid_token')
      }

      // Act - Make request that should be rate limited
      const response = await request(app)
        .post('/users/blocked/follow')
        .set('Authorization', 'Bearer valid_token')

      // Assert - Check error response format matches expected structure
      expect(response.status).toBe(429)
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Follow action limit reached. You can perform 20 follow/unfollow actions per hour.',
          retryAfter: '60 seconds'
        }
      })
      
      // Check rate limit headers
      expect(response.headers['ratelimit-limit']).toBe('20')
      expect(response.headers['ratelimit-remaining']).toBe('0')
      expect(response.headers['ratelimit-reset']).toBeDefined()
    })

    it('should include retry after information', async () => {
      // Arrange - Hit the rate limit
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post(`/users/test${i}/follow`)
          .set('Authorization', 'Bearer valid_token')
      }

      // Act - Make request that should be rate limited
      const response = await request(app)
        .delete('/users/blocked/follow')
        .set('Authorization', 'Bearer valid_token')

      // Assert - Check retry after information
      expect(response.status).toBe(429)
      expect(response.body.error.retryAfter).toBe('60 seconds')
      
      // Rate limit reset header should indicate when limit resets
      const resetTime = parseInt(response.headers['ratelimit-reset'])
      expect(resetTime).toBeGreaterThan(0)
      expect(resetTime).toBeLessThanOrEqual(3600) // Should be within 1 hour (3600 seconds)
    })
  })

  describe('Rate Limit Configuration', () => {
    it('should have correct follow operation rate limit values', async () => {
      // Act - Make request to check rate limit configuration
      const response = await request(app)
        .post('/users/configtest/follow')
        .set('Authorization', 'Bearer valid_token')

      // Assert - Verify rate limit configuration matches expected values for follow operations
      expect(response.headers['ratelimit-limit']).toBe('20')
      expect(response.headers['ratelimit-remaining']).toBe('19')
      
      // Verify window is 1 hour (3600 seconds)
      const resetTime = parseInt(response.headers['ratelimit-reset'])
      expect(resetTime).toBeLessThanOrEqual(3600)
      expect(resetTime).toBeGreaterThan(0)
    })
  })
})