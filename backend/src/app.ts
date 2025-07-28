// backend/src/app.ts
// Version: 2.23.0
// Fixed AuthService constructor call - removed userRepository parameter
// Fixed FollowService constructor call - removed blockRepository parameter  
// Fixed FollowController constructor call - added userRepository parameter
// Fixed auth router import and usage - using createAuthRouter function with dependencies
// Fixed createUsersRouter and createPostsRouter calls - passing dependency objects
// Added missing AuthController import and instantiation
// Fixed createSecureStaticFileHandler call - passing string path instead of object

import express from 'express'
import cors from 'cors'
import path from 'path'
import { PrismaClient } from '@prisma/client'

// Import route creators
import { createAuthRouter } from './routes/auth'
import { createPostsRouter } from './routes/posts'
import { createUsersRouter } from './routes/users'
import mediaRouter from './routes/media'
import configRouter from './routes/config'

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
import { createSecureStaticFileHandler } from './middleware/staticFileSecurityMiddleware'
import { createExpressAwareSecurityMiddleware } from './middleware/expressAwareSecurityMiddleware'

/**
 * Create and configure Express application with all routes and static file serving
 */
export function createApp() {
  const app = express()

  // ============================================================================
  // BASIC MIDDLEWARE
  // ============================================================================
  
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Security middleware
  app.use(createExpressAwareSecurityMiddleware())

  // ============================================================================
  // DEPENDENCY INJECTION
  // ============================================================================
  
  // Initialize Prisma client
  const prisma = new PrismaClient()

  // Initialize repositories
  const userRepository = new UserRepository(prisma)
  const postRepository = new PostRepository(prisma)
  const followRepository = new FollowRepository(prisma)
  const blockRepository = new BlockRepository(prisma)

  // Initialize services
  const authService = new AuthService() // Fixed: removed userRepository parameter
  const followService = new FollowService(followRepository, userRepository) // Fixed: removed blockRepository parameter

  // Initialize controllers
  const authController = new AuthController(authService, userRepository)
  const postController = new PostController(postRepository, userRepository)
  const userController = new UserController(userRepository, followRepository, blockRepository)
  const followController = new FollowController(followService, userRepository) // Fixed: added userRepository parameter

  // Initialize middleware
  const authMiddleware = createAuthMiddleware(authService)
  const optionalAuthMiddleware = createOptionalAuthMiddleware(authService)

  // ============================================================================
  // HEALTH CHECK ENDPOINT
  // ============================================================================
  
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  })

  // ============================================================================
  // API ROUTES
  // ============================================================================
  
  // Authentication routes
  app.use('/api/auth', createAuthRouter({
    authController,
    authMiddleware
  }))

  // User routes with dependency injection
  app.use('/api/users', createUsersRouter({
    userController,
    postController, 
    followController,
    authMiddleware,
    optionalAuthMiddleware
  }))

  // Post routes with dependency injection
  app.use('/api/posts', createPostsRouter({
    postController,
    authMiddleware,
    optionalAuthMiddleware
  }))

  // Media routes
  app.use('/api/media', mediaRouter)

  // Configuration routes
  app.use('/api/config', configRouter)

  // ============================================================================
  // STATIC FILE SERVING
  // ============================================================================
  
  // Secure static file handler for uploads
  const uploadsPath = path.join(process.cwd(), 'uploads')
  const secureFileHandler = createSecureStaticFileHandler(uploadsPath)

  // Serve uploaded files securely
  app.use('/uploads', ...secureFileHandler)

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================
  
  // 404 handler for unknown routes
  app.use('*', (_req, res) => {
    res.status(404).json({
      error: 'Route not found',
      message: 'The requested endpoint does not exist'
    })
  })

  // Global error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Global error handler:', err)
    
    res.status(500).json({
      error: 'Internal server error',
      message: process.env['NODE_ENV'] === 'development' ? err.message : 'Something went wrong'
    })
  })

  return app
}

export default createApp

// backend/src/app.ts
// Version: 2.23.0
// Fixed AuthService constructor call - removed userRepository parameter
// Fixed FollowService constructor call - removed blockRepository parameter  
// Fixed FollowController constructor call - added userRepository parameter
// Fixed auth router import and usage - using createAuthRouter function with dependencies
// Fixed createUsersRouter and createPostsRouter calls - passing dependency objects
// Added missing AuthController import and instantiation
// Fixed createSecureStaticFileHandler call - passing string path instead of object