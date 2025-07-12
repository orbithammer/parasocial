// backend/src/routes/auth.ts
// Version: 1.2.0 - Removed all TypeScript "any" types
// Changed: Replaced "any" with proper TypeScript types (NextFunction, unknown)

import { Router, Request, Response, NextFunction } from 'express'
import { AuthController } from '../controllers/AuthController'
import { authRateLimit } from '../middleware/rateLimitMiddleware'

// Dependencies interface for dependency injection
interface AuthRouterDependencies {
  authController: AuthController
  authMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>
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
  router.post('/register', authRateLimit, async (req: Request, res: Response) => {
    await authController.register(req, res)
  })

  /**
   * POST /auth/login  
   * User login endpoint with rate limiting
   * Body: { username: string, password: string } OR { email: string, password: string }
   */
  router.post('/login', authRateLimit, async (req: Request, res: Response) => {
    await authController.login(req, res)
  })

  /**
   * POST /auth/logout
   * User logout endpoint (JWT stateless - mainly for client-side cleanup)
   * Requires authentication
   */
  router.post('/logout', authMiddleware, async (req: Request, res: Response) => {
    await authController.logout(req, res)
  })

  /**
   * GET /auth/me
   * Get current user profile
   * Requires authentication
   */
  router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    await authController.getCurrentUser(req, res)
  })

  return router
}