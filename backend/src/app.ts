// backend/src/app.ts
// Version: 1.8
// Fixed createUsersRouter dependencies to include all required parameters

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
  // STATIC FILE SERVING
  // ============================================================================

  /**
   * Serve uploaded media files from the uploads directory
   * Files accessible at /uploads/<filename>
   * Includes security headers and caching for performance
   */
  const uploadsPath = path.join(process.cwd(), 'uploads')
  
  app.use('/uploads', 
    // Security: Prevent directory traversal
    (req, res, next) => {
      if (req.path.includes('..') || req.path.includes('~')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      next()
    },
    // Serve static files with caching headers
    express.static(uploadsPath, {
      // Cache files for 1 day in production, no cache in development
      maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
      // Security: Don't expose file system details
      dotfiles: 'deny',
      // Add security headers
      setHeaders: (res, filePath) => {
        // Prevent files from being executed as scripts
        res.setHeader('X-Content-Type-Options', 'nosniff')
        // Only allow files to be embedded in same origin
        res.setHeader('X-Frame-Options', 'SAMEORIGIN')
        
        // Set appropriate Content-Type based on file extension
        const ext = path.extname(filePath).toLowerCase()
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          // Image files - allow inline display
          res.setHeader('Content-Disposition', 'inline')
        } else if (['.mp4', '.webm', '.mov'].includes(ext)) {
          // Video files - allow inline display
          res.setHeader('Content-Disposition', 'inline')
        } else {
          // Other files - force download for security
          res.setHeader('Content-Disposition', 'attachment')
        }
      }
    })
  )

  // ============================================================================
  // DATABASE AND SERVICES SETUP
  // ============================================================================

  // Initialize Prisma client
  const prisma: PrismaClient = new PrismaClient()

  // Initialize repositories with explicit types
  const userRepository: UserRepository = new UserRepository(prisma)
  const postRepository: PostRepository = new PostRepository(prisma)
  const followRepository: FollowRepository = new FollowRepository(prisma)
  const blockRepository: BlockRepository = new BlockRepository(prisma)

  // Initialize services - AuthService takes no constructor arguments
  const authService = new AuthService()
  const followService = new FollowService(followRepository, userRepository)

  // Initialize controllers with correct constructor arguments
  const authController = new AuthController(authService, userRepository)
  const postController = new PostController(postRepository, userRepository)
  const userController = new UserController(userRepository, followRepository, blockRepository)
  const followController = new FollowController(followService, userRepository)

  // Initialize middleware with explicit types
  const authMiddleware = createAuthMiddleware(authService)
  const optionalAuthMiddleware = createOptionalAuthMiddleware(authService)

  // ============================================================================
  // API ROUTES
  // ============================================================================

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      }
    })
  })

  // Mount API routes with proper dependency injection
  app.use('/auth', createAuthRouter({ 
    authController, 
    authMiddleware 
  }))
  
  app.use('/posts', createPostsRouter({ 
    postController, 
    authMiddleware, 
    optionalAuthMiddleware 
  }))
  
  app.use('/users', createUsersRouter({ 
    userController, 
    postController,
    followController,
    authMiddleware,
    optionalAuthMiddleware
  }))
  
  // Media upload routes with static serving
  app.use('/media', mediaRouter)

  // Optional: Follow routes (uncomment when ready)
  // app.use('/follows', createFollowsRouter({ followController, authMiddleware }))

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  // Handle 404 for undefined routes
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`
      }
    })
  })

  // Global error handler
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error handler:', error)

    // Don't send error details in production
    const isProduction = process.env.NODE_ENV === 'production'
    
    res.status(error.status || 500).json({
      success: false,
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: isProduction ? 'Internal server error' : error.message,
        ...(isProduction ? {} : { stack: error.stack })
      }
    })
  })

  return app
}

/**
 * Export app instance for use in server and tests
 */
export default createApp