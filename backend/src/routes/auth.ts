// backend/src/routes/auth.ts
// Express routes for authentication operations using TypeScript

import { Router, Request, Response, NextFunction } from 'express'
import { AuthController } from '../controllers/AuthController'

// Middleware function type
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>

// Dependencies interface for dependency injection
interface AuthRouterDependencies {
  authController: AuthController
  authMiddleware: MiddlewareFunction
}

/**
 * Create auth router with dependency injection
 * @param dependencies - Injected dependencies
 * @returns Configured Express router
 */
export function createAuthRouter(dependencies: AuthRouterDependencies): Router {
  const { authController, authMiddleware } = dependencies
  const router = Router()

  /**
   * POST /auth/register
   * Register a new user account
   * Public endpoint
   */
  router.post('/register', async (req: Request, res: Response) => {
    await authController.register(req, res)
  })

  /**
   * POST /auth/login
   * Login with existing credentials
   * Public endpoint
   */
  router.post('/login', async (req: Request, res: Response) => {
    await authController.login(req, res)
  })

  /**
   * POST /auth/logout
   * Logout current user
   * Public endpoint (stateless JWT)
   */
  router.post('/logout', async (req: Request, res: Response) => {
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