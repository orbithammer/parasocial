// backend/src/index.ts
// Express 4.x server with refactored users router using FollowController

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

// Import route creators
import { createUsersRouter } from './routes/users'

// Import controllers
import { UserController } from './controllers/UserController'
import { PostController } from './controllers/PostController'
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
// SERVER CONFIGURATION
// ============================================================================

const app = express()
const PORT = process.env.PORT || 3001

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ============================================================================
// DEPENDENCY SETUP
// ============================================================================

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
const userController = new UserController(userRepository, followRepository, blockRepository)
const postController = new PostController(postRepository, userRepository)
const followController = new FollowController(followService, userRepository)

// Middleware
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
// ROUTER MOUNTING WITH REFACTORED FOLLOW CONTROLLER
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
    refactoring_notes: {
      follow_operations: 'Now consistently use FollowController',
      user_management: 'Block/unblock still use UserController',
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
  console.log(`🚀 ParaSocial API server running on port ${PORT}`)
  console.log(`📝 Express version: 4.x (downgraded from 5.x)`)
  console.log(`📚 API routes: http://localhost:${PORT}${apiPrefix}/debug/routes`)
  console.log(`❤️  Health check: http://localhost:${PORT}${apiPrefix}/health`)
  console.log(`✅ Refactored: Follow operations now use FollowController consistently`)
})

/**
 * Graceful shutdown handling
 */
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})