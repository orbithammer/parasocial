// Path: backend/src/app.ts
// Version: 2.17.0
// Fixed dependency injection - correct constructor arguments for all services and controllers

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

  // Initialize services - AuthService takes no arguments
  const authService = new AuthService()
  const followService = new FollowService(followRepository, userRepository)

  // Controllers
  const postController = new PostController(postRepository, userRepository)
  const userController = new UserController(userRepository, followRepository, blockRepository)
  const followController = new FollowController(followService, userRepository)

  // Middleware
  const authMiddleware = createAuthMiddleware(authService)
  const optionalAuthMiddleware = createOptionalAuthMiddleware(authService)

  // Security middleware
  const expressAwareSecurityMiddleware = createExpressAwareSecurityMiddleware()

  // Apply security middleware
  app.use(expressAwareSecurityMiddleware)

  // ============================================================================
  // STATIC FILE SERVING
  // ============================================================================
  
  // Serve uploaded files with security checks
  const uploadsPath = path.join(__dirname, '../../uploads')
  const secureStaticHandlers = createSecureStaticFileHandler(uploadsPath)
  app.use('/uploads', ...secureStaticHandlers)

  // ============================================================================
  // API ROUTES
  // ============================================================================

  // Configuration endpoint - /api/config
  app.use('/api/config', configRouter)

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

// Path: backend/src/app.ts
// Version: 2.17.0
// Fixed dependency injection - correct constructor arguments for all services and controllers