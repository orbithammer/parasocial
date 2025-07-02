// backend/src/app.ts
// Version: 1.2
// Added media router integration for file upload functionality

import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

// Import route creators
import { createAuthRouter } from './routes/auth'
import { createPostsRouter } from './routes/posts'
import { createUsersRouter } from './routes/users'
import mediaRouter from './routes/media'  // Added media router import
// Optional: import { createFollowsRouter } from './routes/follows'

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

/**
 * Create and configure Express application with all routes
 */
export function createApp() {
  const app = express()

  // ============================================================================
  // MIDDLEWARE SETUP
  // ============================================================================

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
  // Fixed: UserController expects userRepository, followRepository, and blockRepository
  const userController = new UserController(userRepository, followRepository, blockRepository)
  const followController = new FollowController(followService, userRepository)

  // Middleware functions
  const authMiddleware = createAuthMiddleware(authService)
  const optionalAuthMiddleware = createOptionalAuthMiddleware(authService)

  // ============================================================================
  // ROUTE REGISTRATION
  // ============================================================================

  // API base path
  const apiPrefix = '/api/v1'

  // Authentication routes
  const authRouter = createAuthRouter({
    authController,
    authMiddleware
  })
  app.use(`${apiPrefix}/auth`, authRouter)

  // Post routes
  const postsRouter = createPostsRouter({
    postController,
    authMiddleware,
    optionalAuthMiddleware
  })
  app.use(`${apiPrefix}/posts`, postsRouter)

  // User routes (includes all follow/unfollow functionality)
  const usersRouter = createUsersRouter({
    userController,
    postController,
    followController, // Added FollowController
    authMiddleware,
    optionalAuthMiddleware
  })
  app.use(`${apiPrefix}/users`, usersRouter)

  // Media upload routes - ADDED
  app.use(`${apiPrefix}/media`, mediaRouter)

  // Optional: Dedicated follow routes (alternative approach)
  // const followsRouter = createFollowsRouter({
  //   followController,
  //   authMiddleware,
  //   optionalAuthMiddleware
  // })
  // app.use(`${apiPrefix}/follows`, followsRouter)

  // ============================================================================
  // STATIC FILE SERVING
  // ============================================================================
  
  // Serve uploaded files statically
  app.use('/uploads', express.static('uploads'))

  // ============================================================================
  // API DOCUMENTATION ENDPOINT
  // ============================================================================

  /**
   * GET /api/v1/routes
   * Get available API routes (for development)
   */
  app.get(`${apiPrefix}/routes`, (req, res) => {
    res.json({
      success: true,
      data: {
        auth: [
          'POST /auth/register',
          'POST /auth/login', 
          'POST /auth/logout',
          'GET /auth/me'
        ],
        posts: [
          'GET /posts',
          'POST /posts',
          'GET /posts/:id',
          'DELETE /posts/:id'
        ],
        users: [
          'GET /users/:username',
          'GET /users/:username/posts'
        ],
        follows: [
          'POST /users/:username/follow',
          'DELETE /users/:username/follow',
          'GET /users/:username/followers',
          'GET /users/:username/following',
          'GET /users/:username/followers/recent',
          'GET /users/:username/stats',
          'GET /users/:username/following/:targetUsername',
          'POST /users/:username/following/check'
        ],
        blocking: [
          'POST /users/:username/block',
          'DELETE /users/:username/block'
        ],
        media: [  // Added media endpoints
          'POST /media/upload'
        ]
      }
    })
  })

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      code: 'NOT_FOUND'
    })
  })

  // Global error handler
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', error)
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  })

  return app
}

// ============================================================================
// SERVER STARTUP (if running directly)
// ============================================================================

if (require.main === module) {
  const app = createApp()
  const PORT = process.env.PORT || 3001

  app.listen(PORT, () => {
    console.log(`🚀 ParaSocial API server running on port ${PORT}`)
    console.log(`📚 API routes available at http://localhost:${PORT}/api/v1/routes`)
  })
}