// Path: backend/src/index.ts
// Version: 2.2.0
// Added config router for /api/config endpoint

import express from 'express'
import cors from 'cors'
import { PrismaClient } from '@prisma/client'

// Import route creators
import { createAuthRouter } from './routes/auth'
import { createUsersRouter } from './routes/users'
import { createPostsRouter } from './routes/posts'
import { createReportsRouter } from './routes/reports'
import { createMediaRouter } from './routes/media'
import configRouter from './routes/config'

// Import controllers
import { AuthController } from './controllers/AuthController'
import { PostController } from './controllers/PostController'
import { UserController } from './controllers/UserController'
import { FollowController } from './controllers/FollowController'
import { ReportController } from './controllers/ReportController'

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
import { globalErrorHandler, notFoundHandler } from './middleware/globalError'

// ============================================================================
// APPLICATION SETUP
// ============================================================================

const app = express()
const PORT = process.env['PORT'] || 3001

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
const userController = new UserController(userRepository, followRepository, blockRepository)
const followController = new FollowController(followService, userRepository)
const reportController = new ReportController(userRepository, postRepository)

// Create middleware instances
const authMiddleware = createAuthMiddleware(authService)
const optionalAuthMiddleware = createOptionalAuthMiddleware(authService)

// ============================================================================
// ROUTE SETUP
// ============================================================================

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.2.0'
  })
})

// Configuration endpoint
app.use('/api/config', configRouter)

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

// Post routes
app.use('/posts', createPostsRouter({
  postController,
  authMiddleware,
  optionalAuthMiddleware
}))

// Media upload routes
app.use('/media', createMediaRouter({
  authMiddleware
}))

// Report/moderation routes
app.use('/reports', createReportsRouter({
  reportController,
  authMiddleware,
  optionalAuthMiddleware
}))

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler for undefined routes (must be before global error handler)
app.use(notFoundHandler)

// Global error handling middleware (must be last)
app.use(globalErrorHandler)

// ============================================================================
// SERVER START
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📚 API Documentation: http://localhost:${PORT}/health`)
  console.log(`🔧 Environment: ${process.env['NODE_ENV'] || 'development'}`)
  console.log('✅ Routes mounted:')
  console.log('   - /api/config (application configuration)')
  console.log('   - /auth/* (authentication)')
  console.log('   - /users/* (user management)')
  console.log('   - /posts/* (post operations)')
  console.log('   - /media/* (file uploads)')
  console.log('   - /reports/* (content moderation)')
  console.log('✅ Rate limiting applied to all critical routes')
})

// Path: backend/src/index.ts
// Version: 2.2.0
// Added config router for /api/config endpoint