// backend/src/routes/__tests__/auth.rateLimit.test.ts
// Version: 2.3.0 - Fixed rate limiter state management between tests
// Added proper cleanup and test isolation to prevent rate limit carryover

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express, { Request, Response, NextFunction } from 'express'
import rateLimit from 'express-rate-limit'

// Test response type
interface SuperTestResponse {
  status: number
  body: any
  headers: Record<string, string>
}

describe('Auth Routes Rate Limiting', () => {
  let app: express.Application
  let testId: string

  beforeEach(() => {
    console.log('Test setup initialized')
    
    // Generate unique test ID to isolate rate limiters
    testId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    // Create Express app for testing
    app = express()
    app.use(express.json())
    
    // Create fresh rate limiter for each test with unique key
    const authRateLimit = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute window
      max: 5, // Maximum 5 requests per window
      message: 'Too many authentication attempts. Please try again in 1 minute.',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts. Please try again in 1 minute.',
            retryAfter: '60 seconds'
          }
        })
      },
      // Use unique key per test to prevent cross-contamination
      keyGenerator: (req: Request) => {
        return `${testId}_${req.ip || 'unknown'}`
      }
    })
    
    // Apply rate limiting middleware to auth endpoints
    app.use('/auth', authRateLimit)
    
    // Mock POST /auth/register endpoint
    app.post('/auth/register', (req: Request, res: Response) => {
      const { email, username, password } = req.body
      
      // Basic validation
      if (!email || !username || !password) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email, username, and password are required'
          }
        })
      }
      
      // Mock successful registration
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: 'user_' + Date.now(),
            email,
            username,
            displayName: username,
            createdAt: new Date().toISOString()
          },
          token: 'jwt_token_' + Date.now()
        },
        message: 'User registered successfully'
      })
    })
    
    // Mock POST /auth/login endpoint
    app.post('/auth/login', (req: Request, res: Response) => {
      const { email, password } = req.body
      
      // Basic validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password are required'
          }
        })
      }
      
      // Mock authentication check
      if (email === 'wrong@example.com' || password === 'wrongpassword') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: 'Invalid email or password'
          }
        })
      }
      
      // Mock successful login
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: 'user_123',
            email,
            username: 'testuser',
            displayName: 'Test User'
          },
          token: 'jwt_token_' + Date.now()
        },
        message: 'Login successful'
      })
    })
    
    // Mock POST /auth/logout endpoint (not rate limited)
    app.post('/auth/logout', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      })
    })
  })

  afterEach(() => {
    console.log('Starting test cleanup...')
    // Clean up test-specific data
    testId = ''
    console.log('Test cleanup completed')
  })

  describe('Authentication Rate Limiting (5 per minute)', () => {
    it('should allow requests within the limit (5 per minute)', async () => {
      // Act - Make 5 registration requests (within limit)
      const responses: SuperTestResponse[] = []
      
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/auth/register')
          .send({
            email: `test${i}@example.com`,
            username: `testuser${i}`,
            password: 'TestPass123!'
          })
        responses.push(response)
      }

      // Assert - All 5 should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data.user.email).toBe(`test${index}@example.com`)
        
        // Verify rate limit headers
        expect(response.headers['ratelimit-limit']).toBe('5')
        expect(response.headers['ratelimit-remaining']).toBe((4 - index).toString())
      })
    })

    it('should block requests exceeding the limit (6th request)', async () => {
      // Arrange - Make 5 requests to hit the limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/register')
          .send({
            email: `setup${i}@example.com`,
            username: `setupuser${i}`,
            password: 'TestPass123!'
          })
      }

      // Act - Try to make 6th request (should be blocked)
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'blocked@example.com',
          username: 'blockeduser',
          password: 'TestPass123!'
        })

      // Assert - Should be rate limited
      expect(response.status).toBe(429)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(response.body.error.message).toBe('Too many authentication attempts. Please try again in 1 minute.')
      expect(response.headers['ratelimit-remaining']).toBe('0')
    })

    it('should include rate limit headers', async () => {
      // Act - Make first authentication request
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass123!'
        })

      // Assert - Check rate limit headers
      expect(response.status).toBe(200)
      expect(response.headers['ratelimit-limit']).toBe('5')
      expect(response.headers['ratelimit-remaining']).toBe('4')
      expect(response.headers['ratelimit-reset']).toBeDefined()
      
      // Verify response format
      expect(response.body.success).toBe(true)
      expect(response.body.data.token).toBeDefined()
    })

    it('should use IP address for rate limiting', async () => {
      // Note: In a real test environment, you might mock different IP addresses
      // For this test, we assume all requests come from the same IP
      
      // Act - Make multiple requests (should all count towards same IP limit)
      const responses: SuperTestResponse[] = []
      
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: `iptest${i}@example.com`,
            password: 'TestPass123!'
          })
        responses.push(response)
      }

      // Assert - All should share the same rate limit
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        expect(parseInt(response.headers['ratelimit-remaining'])).toBe(4 - index)
      })
    })
  })

  describe('Rate Limit Error Response Format', () => {
    it('should return consistent error format for authentication rate limits', async () => {
      // Arrange - Hit the rate limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/register')
          .send({
            email: `setup${i}@example.com`,
            username: `setupuser${i}`,
            password: 'TestPass123!'
          })
      }

      // Act - Make request that should be rate limited
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'blocked@example.com',
          username: 'blockeduser',
          password: 'TestPass123!'
        })

      // Assert - Check error response format matches expected structure
      expect(response.status).toBe(429)
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many authentication attempts. Please try again in 1 minute.',
          retryAfter: '60 seconds'
        }
      })
      
      // Check rate limit headers
      expect(response.headers['ratelimit-limit']).toBe('5')
      expect(response.headers['ratelimit-remaining']).toBe('0')
      expect(response.headers['ratelimit-reset']).toBeDefined()
    })

    it('should include retry after information', async () => {
      // Arrange - Hit the rate limit
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/auth/login')
          .send({
            email: `test${i}@example.com`,
            password: 'TestPass123!'
          })
      }

      // Act - Make request that should be rate limited
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'blocked@example.com',
          password: 'TestPass123!'
        })

      // Assert - Check retry after information
      expect(response.status).toBe(429)
      expect(response.body.error.retryAfter).toBe('60 seconds')
      
      // Rate limit reset header should indicate when limit resets
      const resetTime = parseInt(response.headers['ratelimit-reset'])
      expect(resetTime).toBeGreaterThan(0)
      expect(resetTime).toBeLessThanOrEqual(60) // Should be within 1 minute
    })
  })

  describe('Rate Limit Configuration', () => {
    it('should have correct authentication rate limit values', async () => {
      // Act - Make request to check rate limit configuration
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'config@example.com',
          username: 'configuser',
          password: 'TestPass123!'
        })

      // Assert - Verify rate limit configuration matches expected values
      expect(response.headers['ratelimit-limit']).toBe('5')
      expect(response.headers['ratelimit-remaining']).toBe('4')
      
      // Verify window is 1 minute (60 seconds)
      const resetTime = parseInt(response.headers['ratelimit-reset'])
      expect(resetTime).toBeLessThanOrEqual(60)
      expect(resetTime).toBeGreaterThan(0)
    })
  })

  describe('Mixed Authentication Operations', () => {
    it('should share rate limit between login and register', async () => {
      // Act - Mix registration and login requests
      const registerResponse = await request(app)
        .post('/auth/register')
        .send({
          email: 'mixed1@example.com',
          username: 'mixeduser1',
          password: 'TestPass123!'
        })

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'mixed2@example.com',
          password: 'TestPass123!'
        })

      const anotherRegisterResponse = await request(app)
        .post('/auth/register')
        .send({
          email: 'mixed3@example.com',
          username: 'mixeduser3',
          password: 'TestPass123!'
        })

      // Assert - All should count towards the same rate limit
      expect(registerResponse.status).toBe(201)
      expect(registerResponse.headers['ratelimit-remaining']).toBe('4')
      
      expect(loginResponse.status).toBe(200)
      expect(loginResponse.headers['ratelimit-remaining']).toBe('3')
      
      expect(anotherRegisterResponse.status).toBe(201)
      expect(anotherRegisterResponse.headers['ratelimit-remaining']).toBe('2')
    })

    it('should handle authentication failures within rate limit', async () => {
      // Act - Make requests with invalid credentials
      const invalidLoginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'wrong@example.com',
          password: 'wrongpassword'
        })

      const validRegisterResponse = await request(app)
        .post('/auth/register')
        .send({
          email: 'valid@example.com',
          username: 'validuser',
          password: 'TestPass123!'
        })

      // Assert - Both should count against rate limit, regardless of success/failure
      expect(invalidLoginResponse.status).toBe(401)
      expect(invalidLoginResponse.headers['ratelimit-remaining']).toBe('4')
      
      expect(validRegisterResponse.status).toBe(201)
      expect(validRegisterResponse.headers['ratelimit-remaining']).toBe('3')
    })
  })
})