// backend/src/routes/__tests__/auth.rateLimit.test.ts
// Version: 1.1.0 - Colocated test for authentication rate limiting
// Tests rate limiting on login and register endpoints to prevent brute force attacks

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express, { Application } from 'express'
import request from 'supertest'
import { createAuthRouter } from '../auth'

/**
 * Mock AuthController for testing
 * Simulates successful authentication responses
 * Only includes public methods, not private properties
 */
const mockAuthController = {
  // Method implementations (only public interface)
  register: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: 'user_123',
          username: 'testuser',
          email: 'test@example.com',
          displayName: null,
          bio: null,
          avatar: null,
          isVerified: false,
          verificationTier: null,
          createdAt: new Date().toISOString()
        },
        token: 'jwt.token.here'
      }
    })
  }),

  login: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: 'user_123',
          username: 'testuser',
          email: 'test@example.com',
          displayName: null,
          bio: null,
          avatar: null,
          isVerified: false,
          verificationTier: null,
          createdAt: new Date().toISOString()
        },
        token: 'jwt.token.here'
      }
    })
  }),

  logout: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    })
  }),

  getCurrentUser: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      data: {
        id: 'user_123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: null,
        bio: null,
        avatar: null,
        isVerified: false,
        verificationTier: null,
        createdAt: new Date().toISOString()
      }
    })
  })
} as any // Type assertion to bypass strict interface checking

/**
 * Mock auth middleware for testing
 * Simulates successful authentication
 */
const mockAuthMiddleware = vi.fn().mockImplementation(async (req: any, res: any, next: any) => {
  req.user = {
    id: 'user_123',
    email: 'test@example.com',
    username: 'testuser'
  }
  next()
})

/**
 * Create test Express application with auth routes
 * Includes rate limiting and proper middleware setup
 */
function createTestApp(): Application {
  const app = express()
  
  // Basic middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Mount auth routes with rate limiting
  app.use('/auth', createAuthRouter({
    authController: mockAuthController,
    authMiddleware: mockAuthMiddleware
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

describe('Auth Routes Rate Limiting', () => {
  let app: Application

  beforeEach(() => {
    app = createTestApp()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('POST /auth/register Rate Limiting', () => {
    const registerData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'securepassword123'
    }

    it('should allow requests within the limit (5 per minute)', async () => {
      const responses = await makeSequentialRequests(app, '/auth/register', registerData, 5)
      
      // All 5 requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.message).toBe('User registered successfully')
        expect(mockAuthController.register).toHaveBeenNthCalledWith(index + 1, expect.any(Object), expect.any(Object))
      })
      
      expect(mockAuthController.register).toHaveBeenCalledTimes(5)
    })

    it('should block 6th registration request with rate limit error', async () => {
      const responses = await makeSequentialRequests(app, '/auth/register', registerData, 6)
      
      // First 5 should succeed
      for (let i = 0; i < 5; i++) {
        expect(responses[i].status).toBe(201)
        expect(responses[i].body.success).toBe(true)
      }
      
      // 6th request should be rate limited
      expect(responses[5].status).toBe(429)
      expect(responses[5].body.success).toBe(false)
      expect(responses[5].body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(responses[5].body.error.message).toContain('Too many authentication attempts')
      expect(responses[5].body.error.message).toContain('1 minute')
      
      // Controller should only be called 5 times
      expect(mockAuthController.register).toHaveBeenCalledTimes(5)
    })

    it('should include rate limit headers in response', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(registerData)
      
      expect(response.headers['ratelimit-limit']).toBeDefined()
      expect(response.headers['ratelimit-remaining']).toBeDefined()
      expect(response.headers['ratelimit-reset']).toBeDefined()
      
      // Should start with 4 remaining (5 total - 1 used)
      expect(response.headers['ratelimit-remaining']).toBe('4')
      expect(response.headers['ratelimit-limit']).toBe('5')
    })

    it('should track rate limits by IP address', async () => {
      // Make requests that will hit the rate limit
      const responses = await makeSequentialRequests(app, '/auth/register', registerData, 6)
      
      // Verify the rate limiting is working
      expect(responses[5].status).toBe(429)
      
      // The rate limiting should be based on IP (since no user authentication for registration)
      expect(responses[5].body.error.message).toContain('authentication attempts')
    })
  })

  describe('POST /auth/login Rate Limiting', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123'
    }

    it('should allow multiple login attempts within limit', async () => {
      const responses = await makeSequentialRequests(app, '/auth/login', loginData, 5)
      
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.message).toBe('Login successful')
      })
      
      expect(mockAuthController.login).toHaveBeenCalledTimes(5)
    })

    it('should block login attempts after rate limit exceeded', async () => {
      const responses = await makeSequentialRequests(app, '/auth/login', loginData, 6)
      
      // First 5 should succeed
      for (let i = 0; i < 5; i++) {
        expect(responses[i].status).toBe(200)
        expect(responses[i].body.success).toBe(true)
      }
      
      // 6th attempt should be blocked
      expect(responses[5].status).toBe(429)
      expect(responses[5].body.success).toBe(false)
      expect(responses[5].body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(responses[5].body.error.message).toContain('Too many authentication attempts')
      
      expect(mockAuthController.login).toHaveBeenCalledTimes(5)
    })

    it('should share rate limit between login and register', async () => {
      // Make 3 registration attempts
      await makeSequentialRequests(app, '/auth/register', {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      }, 3)
      
      // Make 3 login attempts (should hit rate limit on 3rd)
      const loginResponses = await makeSequentialRequests(app, '/auth/login', loginData, 3)
      
      // First 2 login attempts should succeed (3 register + 2 login = 5 total)
      expect(loginResponses[0].status).toBe(200)
      expect(loginResponses[1].status).toBe(200)
      
      // 3rd login attempt should be rate limited (would be 6th total request)
      expect(loginResponses[2].status).toBe(429)
      expect(loginResponses[2].body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })

  describe('Protected Routes (No Rate Limiting)', () => {
    it('should not apply rate limiting to logout endpoint', async () => {
      // Make many logout requests - should not be rate limited
      const responses = await makeSequentialRequests(app, '/auth/logout', {}, 10)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.message).toBe('Logout successful')
      })
      
      expect(mockAuthController.logout).toHaveBeenCalledTimes(10)
    })

    it('should not apply rate limiting to profile endpoint', async () => {
      // Make many profile requests - should not be rate limited
      const responses = []
      for (let i = 0; i < 10; i++) {
        const response = await request(app).get('/auth/me')
        responses.push(response)
      }
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockAuthController.getCurrentUser).toHaveBeenCalledTimes(10)
    })
  })

  describe('Rate Limit Error Response Format', () => {
    it('should return consistent error format when rate limited', async () => {
      // Hit the rate limit
      await makeSequentialRequests(app, '/auth/login', { email: 'test@example.com', password: 'pass' }, 5)
      
      // Make one more request to trigger rate limit
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'pass' })
      
      expect(response.status).toBe(429)
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: expect.stringContaining('Too many authentication attempts'),
          retryAfter: '60 seconds'
        }
      })
    })
  })
})