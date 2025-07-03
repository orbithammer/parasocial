// backend/src/app.ts
// Version: 2.7
// Fixed AuthService constructor call - removed userRepository argument

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

  // Initialize services - AuthService takes no arguments
  const authService = new AuthService()
  const followService = new FollowService(followRepository, userRepository, blockRepository)

  // Initialize controllers
  const authController = new AuthController(authService, userRepository)
  const postController = new PostController(postRepository, userRepository)
  const userController = new UserController(userRepository, blockRepository)
  const followController = new FollowController(followService, userRepository)

  // Initialize middleware
  const authMiddleware = createAuthMiddleware(authService)
  const optionalAuthMiddleware = createOptionalAuthMiddleware(authService)

  // ============================================================================
  // ROUTE SETUP
  // ============================================================================

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  })

  // Authentication routes
  app.use('/auth', createAuthRouter(authController))

  // User routes
  app.use('/users', createUsersRouter(userController, followController, authMiddleware, optionalAuthMiddleware))

  // Post routes
  app.use('/posts', createPostsRouter(postController, authMiddleware, optionalAuthMiddleware))

  // Media routes
  app.use('/media', mediaRouter)

  // 404 handler for unmatched routes
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found'
      }
    })
  })

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Global error:', err)
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal server error occurred'
      }
    })
  })

  return app
}