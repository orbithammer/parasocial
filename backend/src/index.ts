// backend/src/index.ts
// Enhanced Express server with dependency injection and route setup

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Import our repositories, controllers, and routes
import { UserRepository } from './repositories/UserRepository'
import { PostRepository } from './repositories/PostRepository'
import { FollowRepository } from './repositories/FollowRepository'
import { BlockRepository } from './repositories/BlockRepository'

import { AuthController } from './controllers/AuthController'
import { PostController } from './controllers/PostController'
import { UserController } from './controllers/UserController'

// Import the real AuthService instead of mock
import { AuthService } from './services/AuthService'

import { createAuthMiddleware, createOptionalAuthMiddleware } from './middleware/authMiddleware'
import { createPostsRouter } from './routes/posts'
import { createUsersRouter } from './routes/users'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Initialize Prisma client
const prisma = new PrismaClient()

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}))
app.use(morgan('combined'))
app.use(express.json())

// Initialize repositories with Prisma client
const userRepository = new UserRepository(prisma)
const postRepository = new PostRepository(prisma)
const followRepository = new FollowRepository(prisma)
const blockRepository = new BlockRepository(prisma)

// Initialize the real AuthService
const authService = new AuthService()

// Initialize controllers with real AuthService
const authController = new AuthController(authService, userRepository)
const postController = new PostController(postRepository, userRepository)
const userController = new UserController(userRepository, followRepository, blockRepository)

// Initialize middleware with real AuthService
const authMiddleware = createAuthMiddleware(authService)
const optionalAuthMiddleware = createOptionalAuthMiddleware(authService)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API status endpoint
app.get('/api/v1/status', (req, res) => {
  res.json({ 
    message: 'ParaSocial API is running',
    version: '1.0.0',
    endpoints: {
      posts: '/api/v1/posts',
      users: '/api/v1/users',
      auth: '/api/v1/auth'
    }
  })
})
// Add this temporary debug endpoint BEFORE the auth routes
app.get('/api/v1/debug/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        // Don't include passwordHash for security, but let's see if users exist
      }
    })
    res.json({ users })
  } catch (error) {
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
})
// Auth routes (now using real AuthService)
app.post('/api/v1/auth/register', async (req, res) => {
  await authController.register(req, res)
})

app.post('/api/v1/auth/login', async (req, res) => {
  await authController.login(req, res)
})

app.post('/api/v1/auth/logout', async (req, res) => {
  await authController.logout(req, res)
})

app.get('/api/v1/users/me', authMiddleware, async (req, res) => {
  await authController.getCurrentUser(req, res)
})

// Mount route modules
const postsRouter = createPostsRouter({
  postController,
  authMiddleware,
  optionalAuthMiddleware
})

const usersRouter = createUsersRouter({
  userController,
  postController,
  authMiddleware,
  optionalAuthMiddleware
})

app.use('/api/v1/posts', postsRouter)
app.use('/api/v1/users', usersRouter)

// Enhanced seed endpoint with better error handling
app.post('/api/v1/dev/seed', async (req, res) => {
  try {
    // Create mock users with properly hashed passwords
    const mockUsers = [
      {
        email: 'alice@example.com',
        username: 'alice',
        passwordHash: await authService.hashPassword('password123'),
        displayName: 'Alice Johnson',
        bio: 'Content creator and designer',
        isVerified: true,
        verificationTier: 'identity'
      },
      {
        email: 'bob@example.com',
        username: 'bob',
        passwordHash: await authService.hashPassword('password123'),
        displayName: 'Bob Smith',
        bio: 'Photographer and traveler',
        isVerified: false
      },
      {
        email: 'testuser@example.com',
        username: 'testuser',
        passwordHash: await authService.hashPassword('password123'),
        displayName: 'Test User',
        bio: 'This is a test account for development'
      }
    ]

    // Create users (skip if they already exist)
    const createdUsers = []
    for (const userData of mockUsers) {
      try {
        const user = await prisma.user.create({ data: userData })
        createdUsers.push(user)
        console.log(`✅ Created user: ${user.username}`)
      } catch (error) {
        // User probably already exists, try to find them
        const existingUser = await prisma.user.findUnique({
          where: { username: userData.username }
        })
        if (existingUser) {
          createdUsers.push(existingUser)
          console.log(`ℹ️  User already exists: ${existingUser.username}`)
        }
      }
    }

    // Create some mock posts
    const mockPosts = [
      {
        content: 'Welcome to ParaSocial! This is my first post on this amazing platform. 🎉\n\nI\'m excited to share my content with everyone!',
        isPublished: true,
        publishedAt: new Date(),
        authorId: createdUsers[0]?.id
      },
      {
        content: 'Just finished an amazing photo shoot! The lighting was perfect today. Can\'t wait to share the results with everyone. 📸✨',
        isPublished: true,
        publishedAt: new Date(),
        authorId: createdUsers[1]?.id
      },
      {
        content: 'Testing the post creation functionality. This platform has great potential for content creators!\n\nThe API is working perfectly. 🚀',
        contentWarning: 'Test content - may contain technical details',
        isPublished: true,
        publishedAt: new Date(),
        authorId: createdUsers[2]?.id
      },
      {
        content: 'Another test post to demonstrate the feed functionality. This should appear in the timeline with proper formatting and styling.',
        isPublished: true,
        publishedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        authorId: createdUsers[0]?.id
      }
    ]

    const createdPosts = []
    for (const postData of mockPosts) {
      if (postData.authorId) {
        try {
          const post = await prisma.post.create({ 
            data: postData,
            include: {
              author: {
                select: {
                  username: true,
                  displayName: true
                }
              }
            }
          })
          createdPosts.push(post)
          console.log(`✅ Created post by ${post.author.username}`)
        } catch (error) {
          console.warn('Failed to create post:', error)
        }
      }
    }

    res.json({
      success: true,
      message: 'Mock data created successfully',
      data: {
        users: createdUsers.length,
        posts: createdPosts.length,
        userDetails: createdUsers.map(u => ({ 
          username: u.username, 
          email: u.email,
          loginInfo: 'Password: password123'
        }))
      }
    })
  } catch (error) {
    console.error('Seed error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create mock data',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error)
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`
  })
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

// Start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    app.listen(PORT, () => {
      console.log(`🚀 ParaSocial backend running on http://localhost:${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`🔗 API status: http://localhost:${PORT}/api/v1/status`)
      console.log(`🌱 Seed data: POST http://localhost:${PORT}/api/v1/dev/seed`)
      console.log(`🔐 Auth endpoints: POST /api/v1/auth/register, POST /api/v1/auth/login`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()