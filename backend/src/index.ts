// backend/src/index.ts
// Version: 1.1
// Fixed: UserController constructor arguments - added missing followRepository and blockRepository

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

// Import route creators
import { createAuthRouter } from './routes/auth'
import { createUsersRouter } from './routes/users'

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

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = express()
const PORT = process.env.PORT || 3001

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

// FIXED: UserController now receives all 3 required arguments
const userController = new UserController(userRepository, followRepository, blockRepository)

const followController = new FollowController(followService, userRepository)

// Create middleware instances
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
app.use('/auth', createAuthRouter({
  authController,
  authMiddleware
}))

// User routes
app.use('/users', createUsersRouter({
  userController,
  postController,
  followController,
  authMiddleware,
  optionalAuthMiddleware
}))

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

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📚 API Documentation: http://localhost:${PORT}/health`)
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`)
})