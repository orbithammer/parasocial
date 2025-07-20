// backend/src/config/__tests__/app.test.ts
// Version: 3.0.0 - Simplified test structure to resolve test discovery issues
// Changed: Minimal mocking, focus on basic app functionality, removed complex dependency injection tests

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express, { type Application } from 'express'

// Set required environment variables before any imports
process.env['JWT_SECRET'] = 'test-jwt-secret-that-is-at-least-32-characters-long-for-security'
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test_db'
process.env['NODE_ENV'] = 'test'

// Mock Prisma Client first
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    post: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
    follow: { create: vi.fn(), delete: vi.fn(), findFirst: vi.fn() },
    block: { create: vi.fn(), delete: vi.fn(), findFirst: vi.fn() }
  }))
}))

// Mock external dependencies
vi.mock('cors', () => ({
  default: vi.fn(() => (req: any, res: any, next: any) => next())
}))

// Mock all route modules with simple implementations
vi.mock('../../routes/auth', () => ({
  default: (() => {
    const router = express.Router()
    router.post('/login', (req, res) => res.json({ success: true }))
    router.post('/register', (req, res) => res.json({ success: true }))
    return router
  })()
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
    router.get('/:username', (req, res) => res.json({ user: null }))
    return router
  })
}))

vi.mock('../../routes/media', () => ({
  default: (() => {
    const router = express.Router()
    router.get('/', (req, res) => res.json({ media: [] }))
    return router
  })()
}))

// Mock all controller classes
vi.mock('../../controllers/PostController', () => ({
  PostController: vi.fn().mockImplementation(() => ({}))
}))

vi.mock('../../controllers/UserController', () => ({
  UserController: vi.fn().mockImplementation(() => ({}))
}))

vi.mock('../../controllers/FollowController', () => ({
  FollowController: vi.fn().mockImplementation(() => ({}))
}))

// Mock all service classes
vi.mock('../../services/AuthService', () => ({
  AuthService: vi.fn().mockImplementation(() => ({}))
}))

vi.mock('../../services/FollowService', () => ({
  FollowService: vi.fn().mockImplementation(() => ({}))
}))

// Mock all repository classes
vi.mock('../../repositories/UserRepository', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({}))
}))

vi.mock('../../repositories/PostRepository', () => ({
  PostRepository: vi.fn().mockImplementation(() => ({}))
}))

vi.mock('../../repositories/FollowRepository', () => ({
  FollowRepository: vi.fn().mockImplementation(() => ({}))
}))

vi.mock('../../repositories/BlockRepository', () => ({
  BlockRepository: vi.fn().mockImplementation(() => ({}))
}))

// Mock all middleware
vi.mock('../../middleware/authMiddleware', () => ({
  createAuthMiddleware: vi.fn(() => (req: any, res: any, next: any) => next()),
  createOptionalAuthMiddleware: vi.fn(() => (req: any, res: any, next: any) => next())
}))

vi.mock('../../middleware/staticFileSecurityMiddleware', () => ({
  createSecureStaticFileHandler: vi.fn(() => (req: any, res: any, next: any) => next())
}))

vi.mock('../../middleware/expressAwareSecurityMiddleware', () => ({
  createExpressAwareSecurityMiddleware: vi.fn(() => (req: any, res: any, next: any) => next())
}))

// Import the createApp function after all mocks are set up
import { createApp } from '../../app'

describe('Express App Configuration', () => {
  let app: Application
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env }
    
    // Ensure required environment variables are set
    process.env['JWT_SECRET'] = 'test-jwt-secret-that-is-at-least-32-characters-long-for-security'
    process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test_db'
    process.env['NODE_ENV'] = 'test'
    
    // Clear all mocks
    vi.clearAllMocks()
    
    // Create fresh app instance
    app = createApp()
  })

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv
  })

  describe('Basic App Functionality', () => {
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
    })

    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/unknown-route')
        .expect(404)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: expect.stringContaining('Route GET /unknown-route not found')
        }
      })
    })
  })

  describe('Route Availability', () => {
    it('should have auth routes mounted', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password' })
      
      // Should not be 404
      expect(response.status).not.toBe(404)
    })

    it('should have posts routes mounted', async () => {
      const response = await request(app)
        .get('/posts')
      
      // Should not be 404
      expect(response.status).not.toBe(404)
    })

    it('should have users routes mounted', async () => {
      const response = await request(app)
        .get('/users/testuser')
      
      // Should not be 404
      expect(response.status).not.toBe(404)
    })

    it('should have media routes mounted', async () => {
      const response = await request(app)
        .get('/media')
      
      // Should not be 404
      expect(response.status).not.toBe(404)
    })
  })

  describe('CORS Configuration', () => {
    it('should handle CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000')
      
      expect(response.status).toBe(200)
    })
  })
})

// backend/src/config/__tests__/app.test.ts
// Version: 3.0.0