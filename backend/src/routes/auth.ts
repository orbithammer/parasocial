// backend/src/routes/auth.ts
// Authentication route handlers for user registration, login, logout, and profile retrieval
// Uses existing AuthService and follows API documentation structure

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { AuthService } from '../services/AuthService'
import { createAuthMiddleware } from '../middleware/authMiddleware'

// Extend Express Request to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

// Input validation schemas using Zod
const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be no more than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be no more than 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be no more than 128 characters'),
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must be no more than 100 characters')
    .optional(),
  bio: z.string()
    .max(500, 'Bio must be no more than 500 characters')
    .optional()
})

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

// Response type definitions for better TypeScript support
interface AuthResponse {
  success: boolean
  data?: {
    user: {
      id: string
      username: string
      email: string
      displayName: string | null
      bio: string | null
      avatar: string | null
      isVerified: boolean
      verificationTier: string | null
      createdAt: Date
    }
    token: string
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

/**
 * Creates authentication routes with dependency injection for better testability
 * @param prisma - Prisma client instance for database operations
 * @param authService - Authentication service for password hashing and JWT operations
 * @returns Express router with authentication endpoints
 */
export function createAuthRoutes(prisma: PrismaClient, authService: AuthService): Router {
  const router = Router()
  const authMiddleware = createAuthMiddleware(authService)

  /**
   * POST /auth/register
   * Register a new user account
   * 
   * Request Body:
   * - username: string (3-30 chars, alphanumeric + underscore)
   * - email: string (valid email)
   * - password: string (8-128 chars)
   * - displayName?: string (1-100 chars)
   * - bio?: string (max 500 chars)
   */
  router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate input data
    const validatedData = loginSchema.parse(req.body)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true, // Need passwordHash for verification
        displayName: true,
        bio: true,
        avatar: true,
        isVerified: true,
        verificationTier: true,
        createdAt: true
      }
    })

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      } as AuthResponse)
      return
    }

    // Check if passwordHash exists
    if (!user.passwordHash) {
      throw new Error('Malformed user data: passwordHash missing')
    }

    // Verify password using AuthService
    const isValidPassword = await authService.verifyPassword(user.passwordHash, validatedData.password)

    if (!isValidPassword) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      } as AuthResponse)
      return
    }

    // Generate JWT token
    const userForToken = {
      id: user.id,
      username: user.username,
      email: user.email
    }
    const token = authService.generateToken(userForToken)

    // Return user data without passwordHash
    const { passwordHash, ...userWithoutPassword } = user

    res.status(200).json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      }
    } as AuthResponse)

  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors
        }
      } as AuthResponse)
      return
    }

    // Handle other errors
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error during login'
      }
    } as AuthResponse)
  }
})

  /**
   * POST /auth/login
   * Authenticate user and return JWT token
   * 
   * Request Body:
   * - email: string (valid email)
   * - password: string (user's password)
   */
  router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate input data
      const validatedData = loginSchema.parse(req.body)

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: validatedData.email },
        select: {
          id: true,
          username: true,
          email: true,
          passwordHash: true, // Need passwordHash for verification
          displayName: true,
          bio: true,
          avatar: true,
          isVerified: true,
          verificationTier: true,
          createdAt: true
        }
      })

      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        } as AuthResponse)
        return
      }

      // Verify password using AuthService
      const isValidPassword = await authService.verifyPassword(user.passwordHash, validatedData.password)

      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        } as AuthResponse)
        return
      }

      // Generate JWT token
      const userForToken = {
        id: user.id,
        username: user.username,
        email: user.email
      }
      const token = authService.generateToken(userForToken)

      // Return user data without passwordHash
      const { passwordHash, ...userWithoutPassword } = user

      res.status(200).json({
        success: true,
        data: {
          user: userWithoutPassword,
          token
        }
      } as AuthResponse)

    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors
          }
        } as AuthResponse)
        return
      }

      // Handle other errors
      console.error('Login error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during login'
        }
      } as AuthResponse)
    }
  })

  /**
   * POST /auth/logout
   * Logout user (client-side token removal, server acknowledges)
   * Protected route - requires valid JWT token
   */
  router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // For JWT tokens, logout is primarily client-side (remove token)
      // Server just acknowledges the logout request
      // In the future, this could be enhanced with token blacklisting
      
      res.status(200).json({
        success: true,
        data: {
          message: 'Successfully logged out'
        }
      })

    } catch (error) {
      console.error('Logout error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during logout'
        }
      })
    }
  })

  /**
   * GET /auth/me
   * Get current authenticated user's profile
   * Protected route - requires valid JWT token
   */
  router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // User data is available from auth middleware
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Valid authentication token required'
          }
        } as AuthResponse)
        return
      }

      // Fetch current user data from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          bio: true,
          avatar: true,
          isVerified: true,
          verificationTier: true,
          createdAt: true
        }
      })

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User account not found'
          }
        } as AuthResponse)
        return
      }

      res.status(200).json({
        success: true,
        data: {
          user,
          token: req.headers.authorization?.replace('Bearer ', '') || '' // Return current token
        }
      } as AuthResponse)

    } catch (error) {
      console.error('Get user profile error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error retrieving user profile'
        }
      } as AuthResponse)
    }
  })

  return router
}

// Default export for easy importing
export default createAuthRoutes