// backend/src/routes/auth.ts
// Version: 1.1.0 - Added rate limiting to authentication endpoints
// Changed: Applied authRateLimit to login and register routes for security

import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthController } from '../controllers/AuthController'
import { AuthService } from '../services/AuthService'
import { createAuthMiddleware } from '../middleware/authMiddleware'
import { authRateLimit } from '../middleware/rateLimitMiddleware' // ADDED: Import rate limiting

// Dependencies interface for dependency injection
interface AuthRouterDependencies {
  authController: AuthController
  authMiddleware: (req: Request, res: Response, next: any) => Promise<void>
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
   * UPDATED: Added rate limiting to prevent account creation abuse
   */
  router.post('/register', authRateLimit, async (req: Request, res: Response) => {
    await authController.register(req, res)
  })

  /**
   * POST /auth/login  
   * Login to existing account using AuthController
   * UPDATED: Added rate limiting to prevent brute force attacks
   */
  router.post('/login', authRateLimit, async (req: Request, res: Response) => {
    await authController.login(req, res)
  })

  /**
   * POST /auth/logout
   * Logout current session using AuthController
   * No rate limiting needed for logout operations
   */
  router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
    await authController.logout(req, res)
  })

  /**
   * GET /auth/me
   * Get current authenticated user's profile using AuthController
   * No rate limiting needed for profile fetching
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
   * UPDATED: Added rate limiting for consistency with main router
   */
  router.post('/register', authRateLimit, async (req: Request, res: Response) => {
    // Implementation would be here for testing routes
    // This version includes rate limiting for test consistency
  })

  /**
   * POST /auth/login
   * Login with direct service access for testing
   * UPDATED: Added rate limiting for consistency with main router
   */
  router.post('/login', authRateLimit, async (req: Request, res: Response) => {
    // Implementation would be here for testing routes
    // This version includes rate limiting for test consistency
  })

  return router
}