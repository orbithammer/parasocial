// backend/src/app.ts  
// Version: 2.15.0 - Removed unused imports and variables
// Changed: Removed unused createGlobalSecurityMiddleware, AuthController, and fixed unused req parameter

import express from 'express'
import cors from 'cors'
import path from 'path'
import { PrismaClient } from '@prisma/client'

// Import route creators
import authRouter from './routes/auth'
import { createPostsRouter } from './routes/posts'
import { createUsersRouter } from './routes/users'
import mediaRouter from './routes/media'

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
  // GLOBAL SECURITY MIDDLEWARE (APPLIED FIRST)
  // ============================================================================
  
  /**
   * Global security middleware catches path traversal attempts before route matching
   * This is critical because Express route matching can miss traversal attempts
   */
  
  app.use(createExpressAwareSecurityMiddleware())

  // ============================================================================
  // MIDDLEWARE SETUP
  // ============================================================================

  // Enable CORS for cross-origin requests
  app.use(cors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
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
   * Includes local security (dotfiles) and static serving
   * Global security (path traversal) is handled above
   * FIXED: Apply secure static file handlers without spread syntax
   */
  const uploadsPath = path.join(process.cwd(), 'uploads')
  
  // Apply secure static file handlers (without spread syntax to prevent iterator errors)
  const secureHandler = createSecureStaticFileHandler(uploadsPath)
  if (Array.isArray(secureHandler)) {
    // If it returns an array, apply each middleware
    secureHandler.forEach(middleware => {
      app.use('/uploads', middleware)
    })
  } else {
    // If it returns a single middleware function
    app.use('/uploads', secureHandler)
  }

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
  const followService = new FollowService(followRepository, userRepository)

  // Initialize controllers with CORRECT ARGUMENTS
  const postController = new PostController(postRepository, userRepository)
  
  // ✅ FIXED: UserController now receives all 3 required arguments
  const userController = new UserController(userRepository, followRepository, blockRepository)
  
  const followController = new FollowController(followService, userRepository)

  // ✅ FIXED: Create authentication middleware instances with AuthService (NOT UserRepository)
  const authMiddleware = createAuthMiddleware(authService)
  const optionalAuthMiddleware = createOptionalAuthMiddleware(authService)

  // ============================================================================
  // API ROUTES
  // ============================================================================

  // Authentication routes - /auth/* (uses plain router, no dependency injection)
  app.use('/auth', authRouter)

  // User management routes - /users/*  
  app.use('/users', createUsersRouter({ userController, postController, followController, authMiddleware, optionalAuthMiddleware }))

  // Post management routes - /posts/*
  app.use('/posts', createPostsRouter({ postController, authMiddleware, optionalAuthMiddleware }))

  // Media upload routes - /media/*
  app.use('/media', mediaRouter)

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================
  
  /**
   * Basic health check endpoint
   * Returns server status and timestamp
   */
  app.get('/health', (_req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  })

  // ============================================================================
  // 404 HANDLER (MUST BE LAST)
  // ============================================================================
  
  /**
   * Catch-all 404 handler for undefined routes
   * This runs only if no other routes match
   */
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`
      }
    })
  })

  return app
}

// backend/src/app.ts  
// Version: 2.15.0