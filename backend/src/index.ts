// backend/src/index.ts
// Main application entry point with complete route setup including authentication

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

// Import route creators
import { createAuthRouter } from './routes/auth'
import { createUsersRouter } from './routes/users'

// Import controllers
import { AuthController } from './controllers/AuthController'
import { PostController } from './controllers/PostController'
import { UserController } from './controllers/UserController'
import { FollowController } from './controllers/FollowController'

// Import services
import { AuthService } from './services/AuthService'
import { FollowService } from './services/FollowService'

// Import repositories
import { UserRepository } from './repositories/UserRepository'
import { PostRepository } from './repositories/PostRepository'
import { FollowRepository } from './repositories/FollowRepository'
import { BlockRepository } from './repositories/BlockRepository'

// Import middleware
import { createAuthMiddleware, createOptionalAuthMiddleware } from './middleware/authMiddleware'

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = express()
const PORT = process.env.PORT || 3001

// Basic middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ============================================================================
// DEPENDENCY SETUP
// ============================================================================

// Database client
const prisma = new PrismaClient()

// Repositories
const userRepository = new UserRepository(prisma)
const postRepository = new PostRepository(prisma)
const followRepository = new FollowRepository(prisma)
const blockRepository = new BlockRepository(prisma)

// Services
const authService = new AuthService()
const followService = new FollowService(followRepository, userRepository)

// Controllers
const authController = new AuthController(authService, userRepository)
const postController = new PostController(postRepository, userRepository)
const userController = new UserController(userRepository, followRepository, blockRepository)
const followController = new FollowController(followService, userRepository)

// Middleware functions
const authMiddleware = createAuthMiddleware(authService)
const optionalAuthMiddleware = createOptionalAuthMiddleware(authService)

// ============================================================================
// BASIC ROUTES
// ============================================================================

const apiPrefix = '/api/v1'

/**
 * GET /
 * Health check endpoint
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'ParaSocial API Server',
    version: '1.0.0',
    express_version: '4.x',
    timestamp: new Date().toISOString()
  })
})

/**
 * GET /api/v1/health
 * Database health check
 */
app.get(`${apiPrefix}/health`, async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({
      success: true,
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * Mount authentication router with AuthController
 */
const authRouter = createAuthRouter({
  authController,
  authMiddleware
})

// Mount the auth router
app.use(`${apiPrefix}/auth`, authRouter)

// ============================================================================
// USER ROUTES (INCLUDING FOLLOW FUNCTIONALITY)
// ============================================================================

/**
 * Mount users router with FollowController for consistent follow operations
 */
const usersRouter = createUsersRouter({
  userController,
  postController,
  followController,  // Now properly integrated for all follow operations
  authMiddleware,
  optionalAuthMiddleware
})

// Mount the users router
app.use(`${apiPrefix}/users`, usersRouter)

// ============================================================================
// DEBUG ROUTES
// ============================================================================

/**
 * GET /api/v1/debug/routes
 * List all available routes
 */
app.get(`${apiPrefix}/debug/routes`, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'ParaSocial API Routes',
    express_version: '4.x',
    available_routes: {
      health: [
        'GET / - Health check',
        'GET /api/v1/health - Database health'
      ],
      authentication: [
        'POST /api/v1/auth/register - User registration',
        'POST /api/v1/auth/login - User login',
        'POST /api/v1/auth/logout - User logout (requires auth)',
        'GET /api/v1/auth/me - Get current user (requires auth)'
      ],
      users: [
        'GET /api/v1/users/:username - Get user profile',
        'GET /api/v1/users/:username/posts - Get user posts',
        'POST /api/v1/users/:username/follow - Follow user (FollowController)',
        'DELETE /api/v1/users/:username/follow - Unfollow user (FollowController)',
        'GET /api/v1/users/:username/followers - Get followers (FollowController)',
        'GET /api/v1/users/:username/following - Get following (FollowController)',
        'GET /api/v1/users/:username/stats - Follow statistics (FollowController)',
        'POST /api/v1/users/:username/block - Block user (UserController)',
        'DELETE /api/v1/users/:username/block - Unblock user (UserController)'
      ],
      debug: [
        'GET /api/v1/debug/routes - This endpoint'
      ]
    },
    notes: {
      authentication: 'All auth endpoints use AuthController',
      follow_operations: 'Follow operations use FollowController consistently',
      user_management: 'Block/unblock operations use UserController',
      separation_of_concerns: 'Follow logic separated from user management'
    }
  })
})

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * 404 handler for undefined routes
 */
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    suggestion: `Visit ${req.protocol}://${req.get('host')}${apiPrefix}/debug/routes to see available routes`
  })
})

/**
 * Global error handler
 */
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  })
})

// ============================================================================
// SERVER STARTUP
// ============================================================================

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log('🚀 ParaSocial API server running on port', PORT)
  console.log('📝 Express version: 4.x (downgraded from 5.x)')
  console.log('📚 API routes:', `http://localhost:${PORT}${apiPrefix}/debug/routes`)
  console.log('❤️  Health check:', `http://localhost:${PORT}${apiPrefix}/health`)
  console.log('🔐 Auth endpoints:', `http://localhost:${PORT}${apiPrefix}/auth/*`)
  console.log('✅ Refactored: Follow operations now use FollowController consistently')
})

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...')
  await prisma.$disconnect()
  console.log('✅ Database disconnected')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🔄 Shutting down gracefully...')
  await prisma.$disconnect()
  console.log('✅ Database disconnected')
  process.exit(0)
})