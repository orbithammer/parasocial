// backend/src/routes/auth.ts
// Authentication routes with both controller-based and direct service injection approaches
// Includes register, login, logout, and me endpoints with proper error handling

import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { AuthService } from '../services/AuthService'
import { AuthController } from '../controllers/AuthController'
import { createAuthMiddleware } from '../middleware/authMiddleware'

// Extend Express Request to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

// Middleware function type
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>

// Dependencies interface for controller-based routing
interface AuthRouterDependencies {
  authController: AuthController
  authMiddleware: MiddlewareFunction
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
      createdAt: string  // Changed from Date to string since we use toISOString()
    }
    token: string
    message?: string  // Add optional message field for logout
  }
  error?: {
    code: string
    message: string
    details?: any
  }
}

// Helper function to safely convert createdAt to string
function formatCreatedAt(createdAt: Date | string): string {
  return createdAt instanceof Date ? createdAt.toISOString() : createdAt
}

/**
 * Creates authentication router using controller-based approach
 * This is the function that app.ts uses for dependency injection
 * @param dependencies - Injected AuthController and middleware
 * @returns Express router with authentication endpoints
 */
export function createAuthRouter(dependencies: AuthRouterDependencies): Router {
  const { authController, authMiddleware } = dependencies
  const router = Router()

  /**
   * POST /auth/register
   * Register a new user account using AuthController
   */
  router.post('/register', async (req: Request, res: Response) => {
    await authController.register(req, res)
  })

  /**
   * POST /auth/login  
   * Login to existing account using AuthController
   */
  router.post('/login', async (req: Request, res: Response) => {
    await authController.login(req, res)
  })

  /**
   * POST /auth/logout
   * Logout current session using AuthController
   */
  router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
    await authController.logout(req, res)
  })

  /**
   * GET /auth/me
   * Get current authenticated user's profile using AuthController
   */
  router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    await authController.getCurrentUser(req, res)
  })

  return router
}

/**
 * Creates authentication routes with direct service injection for testing
 * This function is used by tests that mock Prisma and AuthService directly
 * @param prisma - Prisma client instance for database operations
 * @param authService - Authentication service for password hashing and JWT operations
 * @returns Express router with authentication endpoints
 */
export function createAuthRoutes(prisma: PrismaClient, authService: AuthService): Router {
  const router = Router()
  const authMiddleware = createAuthMiddleware(authService)

  /**
   * POST /auth/register
   * Register a new user account with direct service access for testing
   * Validates input, checks for existing users, hashes password, creates user, and returns token
   */
  router.post('/register', async (req: Request, res: Response): Promise<void> => {
    try {
      // Input validation using AuthService (for test compatibility)
      const validation = authService.validateRegistrationData(req.body)
      if (!validation.success || !validation.data) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
            details: validation.error?.errors || validation.error
          }
        } as AuthResponse)
        return
      }

      // TypeScript now knows validation.data exists and is RegistrationData
      const validatedData = validation.data
      const { username, email, password, displayName } = validatedData
      
      // Handle bio separately since it's not in the RegistrationData interface
      // but might be present in the request body for database storage
      const bio = typeof req.body.bio === 'string' ? req.body.bio : null

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      })

      if (existingUser) {
        const conflictField = existingUser.email === email ? 'email' : 'username'
        res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: `User with this ${conflictField} already exists`
          }
        } as AuthResponse)
        return
      }

      // Hash password
      const passwordHash = await authService.hashPassword(password)

      // Create new user
      const newUser = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          displayName: displayName || username,
          bio,
          isVerified: false,
          verificationTier: 'none'
        }
      })

      // Generate token
      const userForToken = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
      const token = authService.generateToken(userForToken)

      // Return success response without password hash
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            displayName: newUser.displayName,
            bio: newUser.bio,
            avatar: newUser.avatar,
            isVerified: newUser.isVerified,
            verificationTier: newUser.verificationTier,
            createdAt: formatCreatedAt(newUser.createdAt)
          },
          token
        }
      } as AuthResponse)

    } catch (error) {
      console.error('Registration error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during registration'
        }
      } as AuthResponse)
    }
  })

  /**
   * POST /auth/login
   * Authenticate user with email and password
   * Uses explicit field selection to exclude passwordHash from response
   */
  router.post('/login', async (req: Request, res: Response): Promise<void> => {
    try {
      // Input validation using AuthService
      const validation = authService.validateLoginData(req.body)
      if (!validation.success || !validation.data) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login data',
            details: validation.error?.errors
          }
        } as AuthResponse)
        return
      }

      const { email, password } = validation.data

      // Find user by email with all required fields
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          username: true,
          email: true,
          passwordHash: true,
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

      // Verify password
      const isPasswordValid = await authService.verifyPassword(user.passwordHash, password)

      if (!isPasswordValid) {
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
      const { passwordHash: _, ...userWithoutPassword } = user

      res.status(200).json({
        success: true,
        data: {
          user: {
            ...userWithoutPassword,
            createdAt: formatCreatedAt(userWithoutPassword.createdAt)
          },
          token
        }
      } as AuthResponse)

    } catch (error) {
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
      } as AuthResponse)
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

      // Fetch current user data from database with explicit field selection
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
          user: {
            ...user,
            createdAt: formatCreatedAt(user.createdAt)
          },
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

// Default export for easy importing (controller-based approach)
export default createAuthRouter