// Path: backend/src/app.ts
// Version: 2.18.0
// Fixed syntax error - removed stray 'a' character and completed middleware setup

import express from 'express'
import cors from 'cors'
import path from 'path'
import { PrismaClient } from '@prisma/client'

// Import route creators
import authRouter from './routes/auth'
import { createPostsRouter } from './routes/posts'
import { createUsersRouter } from './routes/users'
import mediaRouter from './routes/media'
import configRouter from './routes/config'

// Import controllers
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
  const authService = new AuthService(userRepository)
  const followService = new FollowService(followRepository, userRepository, blockRepository)

  // Initialize controllers
  const postController = new PostController(postRepository, userRepository)
  const userController = new UserController(userRepository, followRepository, blockRepository)
  const followController = new FollowController(followService)

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
  app.use('/api/auth', authRouter)

  // User routes with dependency injection
  app.use('/api/users', createUsersRouter(userController, authMiddleware, optionalAuthMiddleware))

  // Post routes with dependency injection
  app.use('/api/posts', createPostsRouter(postController, authMiddleware, optionalAuthMiddleware))

  // Media routes
  app.use('/api/media', mediaRouter)

  // Configuration routes
  app.use('/api/config', configRouter)

  // ============================================================================
  // STATIC FILE SERVING
  // ============================================================================
  
  // Secure static file handler for uploads
  const secureFileHandler = createSecureStaticFileHandler({
    uploadsPath: path.join(process.cwd(), 'uploads'),
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxFileSize: 10 * 1024 * 1024 // 10MB
  })

  // Serve uploaded files securely
  app.use('/uploads', secureFileHandler)

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

// Path: backend/src/app.ts
// Version: 2.18.0
// Fixed syntax error - removed stray 'a' character and completed middleware setup