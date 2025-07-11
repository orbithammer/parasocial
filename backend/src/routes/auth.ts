// backend/src/routes/auth.ts
// Version: 1.2.0 - Removed all TypeScript "any" types
// Changed: Replaced "any" with proper TypeScript types (NextFunction, unknown)

import { Router, Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthController } from '../controllers/AuthController'
import { AuthService } from '../services/AuthService'
import { createAuthMiddleware } from '../middleware/authMiddleware'
import { authRateLimit } from '../middleware/rateLimitMiddleware'

// Dependencies interface for dependency injection
interface AuthRouterDependencies {
  authController: AuthController
  authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>
}

// Standard response interfaces for TypeScript safety
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
      createdAt: string
    }
    token: string
  }
  message?: string  // Add optional message field for logout
  error?: {
    code: string
    message: string
    details?: unknown // FIXED: Changed from "any" to "unknown"
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
    details?: unknown // FIXED: Changed from "any" to "unknown"
  }
}

// Helper function to safely convert createdAt to string
function formatCreatedAt(createdAt: Date | string): string {
  return createdAt instanceof Date ? createdAt.toISOString() : createdAt
}

/**
 * Create authentication router with dependency injection
 * @param dependencies - Injected dependencies including controllers and middleware
 * @returns Configured Express router
 */
export function createAuthRouter(dependencies: AuthRouterDependencies): Router {
  const { authController, authMiddleware } = dependencies
  const router = Router()

  // ============================================================================
  // AUTHENTICATION ROUTES
  // ============================================================================

  /**
   * POST /auth/register
   * User registration endpoint with rate limiting
   * Body: { username: string, email: string, password: string, displayName?: string }
   */
  router.post('/register', authRateLimit, async (req: Request, res: Response<AuthResponse>) => {
    try {
      const result = await authController.register(req.body)
      
      // Format the response to match AuthResponse interface
      const response: AuthResponse = {
        success: true,
        data: {
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email,
            displayName: result.user.displayName,
            bio: result.user.bio,
            avatar: result.user.avatar,
            isVerified: result.user.isVerified,
            verificationTier: result.user.verificationTier,
            createdAt: formatCreatedAt(result.user.createdAt)
          },
          token: result.token
        }
      }
      
      res.status(201).json(response)
    } catch (error) {
      console.error('Registration error:', error)
      
      const response: AuthResponse = {
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: error instanceof Error ? error.message : 'Registration failed',
          details: error instanceof Error ? error.cause : undefined
        }
      }
      
      res.status(400).json(response)
    }
  })

  /**
   * POST /auth/login  
   * User login endpoint with rate limiting
   * Body: { username: string, password: string } OR { email: string, password: string }
   */
  router.post('/login', authRateLimit, async (req: Request, res: Response<AuthResponse>) => {
    try {
      const result = await authController.login(req.body)
      
      // Format the response to match AuthResponse interface
      const response: AuthResponse = {
        success: true,
        data: {
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email,
            displayName: result.user.displayName,
            bio: result.user.bio,
            avatar: result.user.avatar,
            isVerified: result.user.isVerified,
            verificationTier: result.user.verificationTier,
            createdAt: formatCreatedAt(result.user.createdAt)
          },
          token: result.token
        }
      }
      
      res.status(200).json(response)
    } catch (error) {
      console.error('Login error:', error)
      
      const response: AuthResponse = {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: error instanceof Error ? error.message : 'Login failed',
          details: error instanceof Error ? error.cause : undefined
        }
      }
      
      res.status(401).json(response)
    }
  })

  /**
   * POST /auth/logout
   * User logout endpoint (JWT stateless - mainly for client-side cleanup)
   * Requires authentication
   */
  router.post('/logout', authMiddleware, async (req: Request, res: Response<AuthResponse>) => {
    try {
      // Since JWT is stateless, logout is mainly client-side token cleanup
      // Could implement token blacklisting here if needed
      
      const response: AuthResponse = {
        success: true,
        message: 'Logged out successfully'
      }
      
      res.status(200).json(response)
    } catch (error) {
      console.error('Logout error:', error)
      
      const response: AuthResponse = {
        success: false,
        error: {
          code: 'LOGOUT_FAILED', 
          message: error instanceof Error ? error.message : 'Logout failed',
          details: error instanceof Error ? error.cause : undefined
        }
      }
      
      res.status(500).json(response)
    }
  })

  /**
   * GET /auth/me
   * Get current user profile
   * Requires authentication
   */
  router.get('/me', authMiddleware, async (req: Request, res: Response<UserProfileResponse>) => {
    try {
      // User should be available from authMiddleware
      const user = (req as Request & { user?: { id: string } }).user
      
      if (!user) {
        const response: UserProfileResponse = {
          success: false,
          error: {
            code: 'USER_NOT_AUTHENTICATED',
            message: 'User not authenticated'
          }
        }
        
        res.status(401).json(response)
        return
      }

      const result = await authController.getCurrentUser(user.id)
      
      const response: UserProfileResponse = {
        success: true,
        data: {
          id: result.id,
          username: result.username,
          email: result.email,
          displayName: result.displayName,
          bio: result.bio,
          avatar: result.avatar,
          isVerified: result.isVerified,
          verificationTier: result.verificationTier,
          createdAt: formatCreatedAt(result.createdAt)
        }
      }
      
      res.status(200).json(response)
    } catch (error) {
      console.error('Get current user error:', error)
      
      const response: UserProfileResponse = {
        success: false,
        error: {
          code: 'GET_USER_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get user profile',
          details: error instanceof Error ? error.cause : undefined
        }
      }
      
      res.status(500).json(response)
    }
  })

  /**
   * PUT /auth/me
   * Update current user profile
   * Requires authentication
   * Body: { displayName?: string, bio?: string, avatar?: string }
   */
  router.put('/me', authMiddleware, async (req: Request, res: Response<UserProfileResponse>) => {
    try {
      // User should be available from authMiddleware
      const user = (req as Request & { user?: { id: string } }).user
      
      if (!user) {
        const response: UserProfileResponse = {
          success: false,
          error: {
            code: 'USER_NOT_AUTHENTICATED',
            message: 'User not authenticated'
          }
        }
        
        res.status(401).json(response)
        return
      }

      const result = await authController.updateProfile(user.id, req.body)
      
      const response: UserProfileResponse = {
        success: true,
        data: {
          id: result.id,
          username: result.username,
          email: result.email,
          displayName: result.displayName,
          bio: result.bio,
          avatar: result.avatar,
          isVerified: result.isVerified,
          verificationTier: result.verificationTier,
          createdAt: formatCreatedAt(result.createdAt)
        }
      }
      
      res.status(200).json(response)
    } catch (error) {
      console.error('Update profile error:', error)
      
      const response: UserProfileResponse = {
        success: false,
        error: {
          code: 'UPDATE_PROFILE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update profile',
          details: error instanceof Error ? error.cause : undefined
        }
      }
      
      res.status(400).json(response)
    }
  })

  return router
}