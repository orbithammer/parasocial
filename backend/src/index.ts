// backend/src/index.ts
// Minimal debug version to isolate the route parsing error

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

// Import controllers
import { FollowController } from './controllers/FollowController'

// Import services
import { FollowService } from './services/FollowService'

// Import repositories
import { UserRepository } from './repositories/UserRepository'
import { FollowRepository } from './repositories/FollowRepository'

// Import middleware
import { createAuthMiddleware, createOptionalAuthMiddleware } from './middleware/authMiddleware'
import { AuthService } from './services/AuthService'

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
const followRepository = new FollowRepository(prisma)

// Services
const authService = new AuthService()
const followService = new FollowService(followRepository, userRepository)

// Controllers
const followController = new FollowController(followService, userRepository)

// Middleware
const authMiddleware = createAuthMiddleware(authService)
const optionalAuthMiddleware = createOptionalAuthMiddleware(authService)

// ============================================================================
// MINIMAL ROUTES FOR TESTING
// ============================================================================

const apiPrefix = '/api/v1'

/**
 * GET /
 * Health check
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'ParaSocial API Server - Debug Mode',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

/**
 * GET /api/v1/health
 * Health check
 */
app.get(`${apiPrefix}/health`, async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({
      success: true,
      status: 'healthy',
      database: 'connected'
    })
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      database: 'disconnected'
    })
  }
})

// ============================================================================
// FOLLOW ROUTES (Test one by one)
// ============================================================================

// Define the authenticated request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

/**
 * Test basic follow route
 */
app.post(`${apiPrefix}/test/follow`, optionalAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    message: 'Follow endpoint working',
    authenticated: !!req.user
  })
})

/**
 * GET /api/v1/users/:username/stats
 * Test user stats route
 */
app.get(`${apiPrefix}/users/:username/stats`, async (req: Request, res: Response) => {
  await followController.getUserFollowStats(req, res)
})

/**
 * POST /api/v1/users/:username/follow
 * Test follow user route
 */
app.post(`${apiPrefix}/users/:username/follow`, optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  await followController.followUser(req, res)
})

/**
 * DELETE /api/v1/users/:username/follow
 * Test unfollow user route
 */
app.delete(`${apiPrefix}/users/:username/follow`, authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  await followController.unfollowUser(req, res)
})

/**
 * GET /api/v1/users/:username/followers
 * Test get followers route
 */
app.get(`${apiPrefix}/users/:username/followers`, async (req: Request, res: Response) => {
  await followController.getUserFollowers(req, res)
})

// ============================================================================
// DEBUG ROUTES
// ============================================================================

/**
 * GET /api/v1/debug/routes
 * List all registered routes for debugging
 */
app.get(`${apiPrefix}/debug/routes`, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Debug mode - minimal routes only',
    routes: [
      'GET / - Health check',
      'GET /api/v1/health - Database health',
      'POST /api/v1/test/follow - Test endpoint',
      'GET /api/v1/users/:username/stats - Follow stats',
      'POST /api/v1/users/:username/follow - Follow user',
      'DELETE /api/v1/users/:username/follow - Unfollow user',
      'GET /api/v1/users/:username/followers - Get followers'
    ]
  })
})

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  })
})

// Global error handler
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', error)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  })
})

// ============================================================================
// SERVER STARTUP
// ============================================================================

app.listen(PORT, () => {
  console.log('🚀 ParaSocial API server started (DEBUG MODE)')
  console.log(`📍 Server: http://localhost:${PORT}`)
  console.log(`🔍 Health: http://localhost:${PORT}${apiPrefix}/health`)
  console.log(`📋 Routes: http://localhost:${PORT}${apiPrefix}/debug/routes`)
  console.log('\n🧪 Testing Follow Routes:')
  console.log(`  Follow user: POST ${apiPrefix}/users/testuser/follow`)
  console.log(`  Get stats: GET ${apiPrefix}/users/testuser/stats`)
  console.log(`  Get followers: GET ${apiPrefix}/users/testuser/followers`)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})