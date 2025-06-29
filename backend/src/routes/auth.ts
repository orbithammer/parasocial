// backend/src/routes/auth.ts
// Authentication routes with both controller-based and direct service injection approaches
// Fixed to match test expectations and proper error handling

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

// User profile response for /me endpoint
interface UserProfileResponse {
  success: boolean
  data?: {
    id: string
    username: string
    email: string
    displayName: string | null
    bio: string | null
    avatar: string | null
    isVerified: boolean
    verificationTier: string | null
    createdAt: string
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

      // Check if user already exists - first check username, then email
      const existingUserByUsername = await prisma.user.findUnique({
        where: { username }
      })

      if (existingUserByUsername) {
        res.status(409).json({
          success: false,
          error: {
            code: 'USERNAME_EXISTS',
            message: 'Username is already taken',
            details: {
              field: 'username',
              value: username
            }
          }
        } as AuthResponse)
        return
      }

      const existingUserByEmail = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUserByEmail) {
        res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email is already registered',
            details: {
              field: 'email',
              value: email
            }
          }
        } as AuthResponse)
        return
      }

      // Hash password and create user
      const hashedPassword = await authService.hashPassword(password)
      const userData = {
        username,
        email,
        passwordHash: hashedPassword,
        displayName: displayName || username,
        bio: bio,
        isVerified: false,
        verificationTier: 'none'
      }

      const newUser = await prisma.user.create({
        data: userData
      })

      // Generate token for user authentication
      const tokenPayload = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }
      const token = authService.generateToken(tokenPayload)

      // Return user data and token (excluding password hash)
      const responseUser = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        displayName: newUser.displayName,
        bio: newUser.bio,
        avatar: newUser.avatar,
        isVerified: newUser.isVerified,
        verificationTier: newUser.verificationTier,
        createdAt: formatCreatedAt(newUser.createdAt)
      }

      res.status(201).json({
        success: true,
        data: {
          user: responseUser,
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
   * Authenticate user and return JWT token
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
            details: validation.error?.errors || validation.error
          }
        } as AuthResponse)
        return
      }

      const { email, password } = validation.data

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
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
      const isValidPassword = await authService.verifyPassword(user.passwordHash, password)
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

      // Generate token for authenticated user
      const tokenPayload = {
        id: user.id,
        username: user.username,
        email: user.email
      }
      const token = authService.generateToken(tokenPayload)

      // Return user data and token (excluding password hash)
      const responseUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar,
        isVerified: user.isVerified,
        verificationTier: user.verificationTier,
        createdAt: formatCreatedAt(user.createdAt)
      }

      res.json({
        success: true,
        data: {
          user: responseUser,
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
   * Logout current user session (JWT-based - handled client-side)
   */
  router.post('/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // For JWT-based auth, logout is typically handled client-side
      // Server can maintain a blacklist of tokens if needed
      res.json({
        success: true,
        data: {
          message: 'Logged out successfully'
        }
      } as AuthResponse)
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
   */
  router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        } as UserProfileResponse)
        return
      }

      // Find user by ID from token
      const user = await prisma.user.findUnique({
        where: { id: req.user.id }
      })

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        } as UserProfileResponse)
        return
      }

      // Return user profile data
      const responseUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatar: user.avatar,
        isVerified: user.isVerified,
        verificationTier: user.verificationTier,
        createdAt: formatCreatedAt(user.createdAt)
      }

      res.json({
        success: true,
        data: responseUser
      } as UserProfileResponse)

    } catch (error) {
      console.error('Get current user error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error while fetching user'
        }
      } as UserProfileResponse)
    }
  })

  return router
}