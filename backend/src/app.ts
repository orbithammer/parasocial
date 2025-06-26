// backend/src/app.ts
// Main Express application that wires up all routes and middleware

import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import container from './services/container'

// Load environment variables
dotenv.config()

/**
 * Error response interface
 */
interface ErrorResponse {
  success: false
  error: string
  message?: string
  stack?: string
}

/**
 * Custom error class for API errors
 */
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    this.name = 'APIError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Create and configure Express application
 */
async function createApp(): Promise<express.Application> {
  // Initialize service container
  console.log('🔄 Initializing application...')
  await container.initialize()

  // Create Express app
  const app = express()

  // Trust proxy (for rate limiting and IP detection)
  app.set('trust proxy', 1)

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false
  }))

  // CORS configuration
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }))

  // Logging middleware
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'))
  } else {
    app.use(morgan('combined'))
  }

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true, limit: '10mb' }))

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Requests per window
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  })
  app.use('/api/', limiter)

  // Stricter rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'development' ? 100 : 5, // Requests per window
    message: {
      success: false,
      error: 'Too many authentication attempts, please try again later'
    }
  })

  // Health check endpoint (before other routes)
  app.get('/health', async (req: Request, res: Response) => {
    try {
      const healthCheck = await container.healthCheck()
      
      if (healthCheck.healthy) {
        res.status(200).json({
          status: 'ok',
          ...healthCheck
        })
      } else {
        res.status(503).json({
          status: 'error',
          ...healthCheck
        })
      }
    } catch (error) {
      res.status(503).json({
        status: 'error',
        healthy: false,
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString()
      })
    }
  })

  // API status endpoint
  app.get('/api/status', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'ParaSocial API is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  })

  // Get dependencies from container
  const dependencies = container.getDependencies()

  // TODO: Setup API routes (will be added when route files are created)
  // app.use('/api/auth', authLimiter, createAuthRoutes(dependencies))
  // app.use('/api/posts', createPostsRouter(dependencies))
  // app.use('/api/users', createUsersRouter(dependencies))

  // Temporary placeholder for API routes
  app.use('/api', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'API routes will be available once route files are created',
      available_endpoints: {
        auth: 'POST /api/auth/register, POST /api/auth/login',
        posts: 'GET /api/posts, POST /api/posts',
        users: 'GET /api/users/:username'
      }
    })
  })

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Welcome to ParaSocial API',
      version: '1.0.0',
      documentation: '/api/status',
      health: '/health'
    })
  })

  // Global error handler
  app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('💥 Unhandled error:', error)

    const errorResponse: ErrorResponse = {
      success: false,
      error: error instanceof APIError ? error.message : 'Internal server error'
    }

    // Add details in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.message = error.message
      errorResponse.stack = error.stack
    }

    const statusCode = error instanceof APIError ? error.statusCode : 500
    res.status(statusCode).json(errorResponse)
  })

  // 404 handler for non-API routes
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Route not found',
      path: req.path,
      method: req.method,
      suggestion: 'Check the API documentation for available endpoints'
    })
  })

  console.log('✅ Application initialized successfully')
  return app
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    const app = await createApp()
    const PORT = process.env.PORT || 3001
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 ParaSocial backend running on http://localhost:${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`📚 API status: http://localhost:${PORT}/api/status`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
    })

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n🔄 Received ${signal}, shutting down gracefully...`)
      
      server.close(async () => {
        console.log('🔒 HTTP server closed')
        
        try {
          await container.shutdown()
          console.log('✅ Graceful shutdown completed')
          process.exit(0)
        } catch (error) {
          console.error('❌ Error during shutdown:', error)
          process.exit(1)
        }
      })

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('⚠️  Forced shutdown after timeout')
        process.exit(1)
      }, 10000)
    }

    // Listen for termination signals
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('💥 Uncaught Exception:', error)
      shutdown('uncaughtException')
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
      shutdown('unhandledRejection')
    })

  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer()
}

export { createApp, startServer, APIError }
export type { ErrorResponse }