// backend/src/app.ts
// Version: 2.6
// Removed explicit type annotations to fix TypeScript constructor argument issue

import express from 'express'
import cors from 'cors'
import path from 'path'
import { PrismaClient } from '@prisma/client'

// Import route creators
import { createAuthRouter } from './routes/auth'
import { createPostsRouter } from './routes/posts'
import { createUsersRouter } from './routes/users'
import mediaRouter from './routes/media'

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

/**
 * Create and configure Express application with all routes and static file serving
 */
export function createApp() {
  const app = express()

  // ============================================================================
  // MIDDLEWARE SETUP
  // ============================================================================

  // Enable CORS for cross-origin requests
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }))

  // Parse JSON bodies with size limit
  app.use(express.json({ limit: '10mb' }))

  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }))

  // ============================================================================
  // STATIC FILE SERVING WITH SECURITY
  // ============================================================================

  /**
   * Serve uploaded media files from the uploads directory with comprehensive security
   * Files accessible at /uploads/<filename>
   * Includes path traversal protection, dotfiles protection, and security headers
   */
  const uploadsPath = path.join(process.cwd(), 'uploads')
  
  // Apply secure static file handlers (includes security middleware + static serving)
  app.use('/uploads', ...createSecureStaticFileHandler(uploadsPath))

  // ============================================================================
  // DEPENDENCY INJECTION SETUP
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
  const authController = new AuthController(authService)
  const postController = new PostController(postRepository, userRepository)
  const userController = new UserController(userRepository, blockRepository)
  const followController = new FollowController(followService, userRepository)

  // Initialize middleware
  const authMiddleware = createAuthMiddleware(authService)
  const optionalAuthMiddleware = createOptionalAuthMiddleware(authService)

  // ============================================================================
  // ROUTES SETUP
  // ============================================================================

  // API routes with version prefix
  app.use('/api/v1/auth', createAuthRouter(authController))
  app.use('/api/v1/posts', createPostsRouter(postController, authMiddleware, optionalAuthMiddleware))
  app.use('/api/v1/users', createUsersRouter(userController, followController, authMiddleware, optionalAuthMiddleware))
  app.use('/api/v1/media', mediaRouter)

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  /**
   * Health check endpoint for monitoring and load balancers
   */
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  })

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  /**
   * Global error handler for unhandled routes
   */
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`
      }
    })
  })

  /**
   * Global error handler for server errors
   */
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error handler:', err)
    
    // Don't expose internal errors in production
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? err.message : 'Internal server error'
      },
      ...(isDevelopment && { stack: err.stack })
    })
  })

  return app
}