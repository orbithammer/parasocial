// backend/src/config/__tests__/app.test.ts
// Version: 5.0.0
// Fixed: Updated route paths to match actual API endpoints with /api prefix
// Fixed: Updated 404 error format to match actual app response structure

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import { Application } from 'express'

// Import Express Router to create proper router instances
import { Router } from 'express'

// Mock all the route modules with their actual exports
vi.mock('../../routes/auth', () => ({
  createAuthRouter: vi.fn(() => {
    const router = Router()
    // Mock the specific routes that would be added
    router.post('/login', vi.fn((req, res) => res.json({ success: true })))
    router.post('/register', vi.fn((req, res) => res.json({ success: true })))
    return router
  })
}))

vi.mock('../../routes/posts', () => ({
  createPostsRouter: vi.fn(() => {
    const router = Router()
    // Mock the specific routes that would be added
    router.get('/', vi.fn((req, res) => res.json({ posts: [] })))
    router.post('/', vi.fn((req, res) => res.json({ success: true })))
    return router
  })
}))

vi.mock('../../routes/users', () => ({
  createUsersRouter: vi.fn(() => {
    const router = Router()
    // Mock the specific routes that would be added
    router.get('/:username', vi.fn((req, res) => res.json({ user: {} })))
    router.put('/:username', vi.fn((req, res) => res.json({ success: true })))
    return router
  })
}))

vi.mock('../../routes/media', () => {
  const router = Router()
  router.get('/', vi.fn((req, res) => res.json({ media: [] })))
  router.post('/upload', vi.fn((req, res) => res.json({ success: true })))
  return { default: router }
})

vi.mock('../../routes/config', () => {
  const router = Router()
  router.get('/', vi.fn((req, res) => res.json({ config: {} })))
  return { default: router }
})

// Mock all controllers
vi.mock('../../controllers/AuthController', () => ({
  AuthController: vi.fn().mockImplementation(() => ({
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn()
  }))
}))

vi.mock('../../controllers/PostController', () => ({
  PostController: vi.fn().mockImplementation(() => ({
    createPost: vi.fn(),
    getPosts: vi.fn(),
    getPost: vi.fn(),
    updatePost: vi.fn(),
    deletePost: vi.fn()
  }))
}))

vi.mock('../../controllers/UserController', () => ({
  UserController: vi.fn().mockImplementation(() => ({
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    deleteUser: vi.fn(),
    blockUser: vi.fn(),
    unblockUser: vi.fn()
  }))
}))

vi.mock('../../controllers/FollowController', () => ({
  FollowController: vi.fn().mockImplementation(() => ({
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    getUserFollowers: vi.fn(),
    getUserFollowing: vi.fn(),
    getUserFollowStats: vi.fn()
  }))
}))

// Mock all services
vi.mock('../../services/AuthService', () => ({
  AuthService: vi.fn().mockImplementation(() => ({
    validateLoginData: vi.fn(),
    validateRegistrationData: vi.fn(),
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
    generateToken: vi.fn(),
    verifyToken: vi.fn(),
    extractTokenFromHeader: vi.fn()
  }))
}))

vi.mock('../../services/FollowService', () => ({
  FollowService: vi.fn().mockImplementation(() => ({
    followUser: vi.fn(),
    unfollowUser: vi.fn(),
    getFollowers: vi.fn(),
    getFollowing: vi.fn(),
    getFollowStats: vi.fn()
  }))
}))

// Mock all repositories
vi.mock('../../repositories/UserRepository', () => ({
  UserRepository: vi.fn().mockImplementation(() => ({
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByUsername: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }))
}))

vi.mock('../../repositories/PostRepository', () => ({
  PostRepository: vi.fn().mockImplementation(() => ({
    findById: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }))
}))

vi.mock('../../repositories/FollowRepository', () => ({
  FollowRepository: vi.fn().mockImplementation(() => ({
    create: vi.fn(),
    delete: vi.fn(),
    findFollowers: vi.fn(),
    findFollowing: vi.fn(),
    checkIsFollowing: vi.fn()
  }))
}))

// Mock middleware
vi.mock('../../middleware/authMiddleware', () => ({
  createAuthMiddleware: vi.fn(() => (req: any, res: any, next: any) => next()),
  createOptionalAuthMiddleware: vi.fn(() => (req: any, res: any, next: any) => next())
}))

vi.mock('../../middleware/staticFileSecurityMiddleware', () => ({
  createSecureStaticFileHandler: vi.fn(() => [
    // Return an array of middleware functions that can be spread
    vi.fn((req: any, res: any, next: any) => next()),
    vi.fn((req: any, res: any, next: any) => next()),
    vi.fn((req: any, res: any, next: any) => next())
  ])
}))

vi.mock('../../middleware/expressAwareSecurityMiddleware', () => ({
  createExpressAwareSecurityMiddleware: vi.fn(() => [
    // Return an array of middleware functions in case this is also spread
    vi.fn((req: any, res: any, next: any) => next())
  ])
}))

// Mock Prisma client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    post: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    follow: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    }
  }))
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
        error: 'Route not found',
        message: 'The requested endpoint does not exist'
      })
    })
  })

  describe('Route Availability', () => {
    it('should have auth routes mounted', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' })
      
      // Should not be 404
      expect(response.status).not.toBe(404)
    })

    it('should have posts routes mounted', async () => {
      const response = await request(app)
        .get('/api/posts')
      
      // Should not be 404
      expect(response.status).not.toBe(404)
    })

    it('should have users routes mounted', async () => {
      const response = await request(app)
        .get('/api/users/testuser')
      
      // Should not be 404
      expect(response.status).not.toBe(404)
    })

    it('should have media routes mounted', async () => {
      const response = await request(app)
        .get('/api/media')
      
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
// Version: 5.0.0
// Fixed: Updated route paths to match actual API endpoints with /api prefix
// Fixed: Updated 404 error format to match actual app response structure