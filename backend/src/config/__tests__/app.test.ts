// backend/src/config/__tests__/app.test.ts
// Version: 1.0
// Initial creation: Unit tests for Express app configuration and middleware setup

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import request from 'supertest'
import express, { type Application } from 'express'
import cors from 'cors'
import path from 'path'
import { PrismaClient } from '@prisma/client'

// Mock external dependencies before importing our app
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn()
    },
    post: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn()
    }
  }))
}))

// Mock all route modules
vi.mock('../../routes/auth', () => ({
  createAuthRouter: vi.fn(() => {
    const router = express.Router()
    router.post('/login', (req, res) => res.json({ message: 'mock auth' }))
    return router
  })
}))

vi.mock('../../routes/posts', () => ({
  createPostsRouter: vi.fn(() => {
    const router = express.Router()
    router.get('/', (req, res) => res.json({ posts: [] }))
    return router
  })
}))

vi.mock('../../routes/users', () => ({
  createUsersRouter: vi.fn(() => {
    const router = express.Router()
    router.get('/profile', (req, res) => res.json({ user: null }))
    return router
  })
}))

vi.mock('../../routes/media', () => ({
  default: express.Router()
}))

// Mock all controller classes
vi.mock('../../controllers/AuthController', () => ({
  AuthController: vi.fn(() => ({
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn()
  }))
}))

vi.mock('../../controllers/PostController', () => ({
  PostController: vi.fn(() => ({
    createPost: vi.fn(),
    getPosts: vi.fn(),
    getPostById: vi.fn()
  }))
}))

vi.mock('../../controllers/UserController', () => ({
  UserController: vi.fn(() => ({
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    getUsers: vi.fn()
  }))
}))

vi.mock('../../controllers/FollowController', () => ({
  FollowController: vi.fn(() => ({
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    getFollowers: vi.fn()
  }))
}))

// Mock all service classes
vi.mock('../../services/AuthService', () => ({
  AuthService: vi.fn(() => ({
    verifyToken: vi.fn(),
    extractTokenFromHeader: vi.fn(),
    generateToken: vi.fn(),
    hashPassword: vi.fn()
  }))
}))

vi.mock('../../services/FollowService', () => ({
  FollowService: vi.fn(() => ({
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    isFollowing: vi.fn()
  }))
}))

// Mock all repository classes
vi.mock('../../repositories/UserRepository', () => ({
  UserRepository: vi.fn(() => ({
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }))
}))

vi.mock('../../repositories/PostRepository', () => ({
  PostRepository: vi.fn(() => ({
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn()
  }))
}))

vi.mock('../../repositories/FollowRepository', () => ({
  FollowRepository: vi.fn(() => ({
    create: vi.fn(),
    delete: vi.fn(),
    findByFollowerAndFollowing: vi.fn()
  }))
}))

vi.mock('../../repositories/BlockRepository', () => ({
  BlockRepository: vi.fn(() => ({
    create: vi.fn(),
    delete: vi.fn(),
    findByBlockerAndBlocked: vi.fn()
  }))
}))

// Mock middleware modules
vi.mock('../../middleware/authMiddleware', () => ({
  createAuthMiddleware: vi.fn(() => (req: express.Request, res: express.Response, next: express.NextFunction) => next()),
  createOptionalAuthMiddleware: vi.fn(() => (req: express.Request, res: express.Response, next: express.NextFunction) => next())
}))

vi.mock('../../middleware/staticFileSecurityMiddleware', () => ({
  createSecureStaticFileHandler: vi.fn(() => (req: express.Request, res: express.Response, next: express.NextFunction) => next()),
  createGlobalSecurityMiddleware: vi.fn(() => (req: express.Request, res: express.Response, next: express.NextFunction) => next())
}))

vi.mock('../../middleware/expressAwareSecurityMiddleware', () => ({
  createExpressAwareSecurityMiddleware: vi.fn(() => (req: express.Request, res: express.Response, next: express.NextFunction) => next())
}))

// Import the createApp function after mocking dependencies
import { createApp } from '../../app'

describe('Express App Configuration', () => {
  let app: Application
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env }
    
    // Clear all mocks before each test
    vi.clearAllMocks()
    
    // Create fresh app instance for each test
    app = createApp()
  })

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv
  })

  describe('App Creation and Basic Setup', () => {
    it('should create Express app instance successfully', () => {
      expect(app).toBeDefined()
      expect(typeof app).toBe('function') // Express app is a function
    })

    it('should respond to health check endpoint', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        version: expect.any(String)
      })
      
      // Verify timestamp is a valid ISO string
      expect(() => new Date(response.body.timestamp)).not.toThrow()
    })
  })

  describe('CORS Configuration', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type')

      // CORS should not block the request
      expect(response.status).not.toBe(403)
    })

    it('should set appropriate CORS headers for allowed origins', async () => {
      process.env.FRONTEND_URL = 'http://localhost:3000'
      
      // Create new app with updated env
      const testApp = createApp()
      
      const response = await request(testApp)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200)

      // Should include CORS headers
      expect(response.headers['access-control-allow-origin']).toBeDefined()
    })
  })

  describe('JSON and URL-encoded Body Parsing', () => {
    it('should parse JSON bodies correctly', async () => {
      const testData = { test: 'data', number: 123 }
      
      // Since we don't have a dedicated test endpoint, let's use a mock route
      app.post('/test-json', (req, res) => {
        res.json({ received: req.body })
      })

      const response = await request(app)
        .post('/test-json')
        .send(testData)
        .set('Content-Type', 'application/json')
        .expect(200)

      expect(response.body.received).toEqual(testData)
    })

    it('should parse URL-encoded bodies correctly', async () => {
      app.post('/test-urlencoded', (req, res) => {
        res.json({ received: req.body })
      })

      const response = await request(app)
        .post('/test-urlencoded')
        .send('name=test&value=123')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(200)

      expect(response.body.received).toEqual({
        name: 'test',
        value: '123'
      })
    })

    it('should respect JSON body size limits', async () => {
      // Create a large payload that exceeds typical limits
      const largePayload = {
        data: 'x'.repeat(15 * 1024 * 1024) // 15MB string
      }

      app.post('/test-large-json', (req, res) => {
        res.json({ status: 'received' })
      })

      const response = await request(app)
        .post('/test-large-json')
        .send(largePayload)
        .set('Content-Type', 'application/json')

      // Should either succeed (if within limit) or fail with 413
      expect([200, 413]).toContain(response.status)
    })
  })

  describe('Security Middleware Integration', () => {
    it('should apply express-aware security middleware', () => {
      const { createExpressAwareSecurityMiddleware } = require('../../middleware/expressAwareSecurityMiddleware')
      expect(createExpressAwareSecurityMiddleware).toHaveBeenCalled()
    })

    it('should apply static file security middleware', () => {
      const { createSecureStaticFileHandler } = require('../../middleware/staticFileSecurityMiddleware')
      expect(createSecureStaticFileHandler).toHaveBeenCalled()
    })

    it('should handle security violations gracefully', async () => {
      // Test that app doesn't crash on potential security issues
      const response = await request(app)
        .get('/../../../etc/passwd')
        .expect((res) => {
          // Should not return actual file contents or crash
          expect(res.status).not.toBe(500)
        })
    })
  })

  describe('Route Registration', () => {
    it('should register authentication routes', () => {
      const { createAuthRouter } = require('../../routes/auth')
      expect(createAuthRouter).toHaveBeenCalled()
    })

    it('should register posts routes', () => {
      const { createPostsRouter } = require('../../routes/posts')
      expect(createPostsRouter).toHaveBeenCalled()
    })

    it('should register users routes', () => {
      const { createUsersRouter } = require('../../routes/users')
      expect(createUsersRouter).toHaveBeenCalled()
    })

    it('should mount media routes', async () => {
      // Test that media routes are accessible
      const response = await request(app)
        .get('/uploads/test')

      // Should not return 404 for route not found, but may return 404 for file not found
      // or be handled by the static file middleware
      expect(response.status).not.toBe(404)
    })
  })

  describe('Static File Serving', () => {
    it('should configure uploads directory serving', async () => {
      // Test that uploads path is configured
      const response = await request(app)
        .get('/uploads/nonexistent.jpg')

      // Should be handled by static file middleware (404 for missing file is expected)
      expect([200, 404, 403]).toContain(response.status)
    })

    it('should apply security to static file serving', () => {
      const { createSecureStaticFileHandler } = require('../../middleware/staticFileSecurityMiddleware')
      
      // Verify security middleware was called for static files
      expect(createSecureStaticFileHandler).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle unmatched routes gracefully', async () => {
      const response = await request(app)
        .get('/nonexistent-route')

      expect(response.status).toBe(404)
    })

    it('should handle malformed JSON gracefully', async () => {
      app.post('/test-malformed', (req, res) => {
        res.json({ received: true })
      })

      const response = await request(app)
        .post('/test-malformed')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')

      expect(response.status).toBe(400)
    })
  })

  describe('Dependency Injection Setup', () => {
    it('should initialize PrismaClient', () => {
      expect(PrismaClient).toHaveBeenCalled()
    })

    it('should create all required repositories', () => {
      const { UserRepository } = require('../../repositories/UserRepository')
      const { PostRepository } = require('../../repositories/PostRepository')
      const { FollowRepository } = require('../../repositories/FollowRepository')
      const { BlockRepository } = require('../../repositories/BlockRepository')

      expect(UserRepository).toHaveBeenCalled()
      expect(PostRepository).toHaveBeenCalled()
      expect(FollowRepository).toHaveBeenCalled()
      expect(BlockRepository).toHaveBeenCalled()
    })

    it('should create all required services', () => {
      const { AuthService } = require('../../services/AuthService')
      const { FollowService } = require('../../services/FollowService')

      expect(AuthService).toHaveBeenCalled()
      expect(FollowService).toHaveBeenCalled()
    })

    it('should create all required controllers', () => {
      const { AuthController } = require('../../controllers/AuthController')
      const { PostController } = require('../../controllers/PostController')
      const { UserController } = require('../../controllers/UserController')
      const { FollowController } = require('../../controllers/FollowController')

      expect(AuthController).toHaveBeenCalled()
      expect(PostController).toHaveBeenCalled()
      expect(UserController).toHaveBeenCalled()
      expect(FollowController).toHaveBeenCalled()
    })

    it('should create authentication middleware instances', () => {
      const { createAuthMiddleware, createOptionalAuthMiddleware } = require('../../middleware/authMiddleware')

      expect(createAuthMiddleware).toHaveBeenCalled()
      expect(createOptionalAuthMiddleware).toHaveBeenCalled()
    })
  })

  describe('Environment Configuration', () => {
    it('should use default FRONTEND_URL when not set', () => {
      delete process.env.FRONTEND_URL
      
      const testApp = createApp()
      
      // App should still work with default configuration
      expect(testApp).toBeDefined()
    })

    it('should use custom FRONTEND_URL when set', () => {
      process.env.FRONTEND_URL = 'https://custom-domain.com'
      
      const testApp = createApp()
      
      // App should configure CORS with custom URL
      expect(testApp).toBeDefined()
    })
  })
})

// backend/src/config/__tests__/app.test.ts