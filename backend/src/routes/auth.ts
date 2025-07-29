// backend/src/routes/auth.ts
// Version: 2.0.0 
// Fixed: Connected routes to actual AuthController methods instead of placeholder handlers
// Fixed: Proper dependency injection pattern with AuthController
// Fixed: Proper Express RequestHandler typing

import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { AuthController } from '../controllers/AuthController'

// Define the interface for auth router dependencies
interface AuthRouterDependencies {
  authController: AuthController
  authMiddleware: any
}

// Rate limiter configuration for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests to avoid penalizing legitimate users
  skipSuccessfulRequests: true,
  // Handle undefined IP by providing a key function
  keyGenerator: (req): string => {
    // Use req.ip if available, otherwise fall back to connection info
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           '127.0.0.1'
  }
})

/**
 * Create auth router with dependencies injected
 * Connects routes to actual AuthController methods
 * @param dependencies - Object containing authController and authMiddleware
 * @returns Configured Express router
 */
export const createAuthRouter = (dependencies: AuthRouterDependencies): Router => {
  const router = Router()
  const { authController, authMiddleware } = dependencies
  
  // Apply rate limiting to all auth routes
  router.use(authRateLimit)
  
  /**
   * POST /register
   * Register a new user account
   * Calls AuthController.register method
   */
  router.post('/register', (req, res) => {
    authController.register(req, res)
  })
  
  /**
   * POST /login  
   * Authenticate user and return JWT token
   * Calls AuthController.login method
   */
  router.post('/login', (req, res) => {
    authController.login(req, res)
  })
  
  /**
   * POST /logout
   * Logout current user session
   * Requires authentication
   * Calls AuthController.logout method
   */
  router.post('/logout', authMiddleware, (req, res) => {
    authController.logout(req, res)
  })
  
  /**
   * GET /me
   * Get current authenticated user's profile
   * Requires authentication
   * Calls AuthController.getCurrentUser method
   */
  router.get('/me', authMiddleware, (req, res) => {
    authController.getCurrentUser(req, res)
  })
  
  return router
}

// Default export for compatibility
export default createAuthRouter

// backend/src/routes/auth.ts
// Version: 2.0.0 
// Fixed: Connected routes to actual AuthController methods instead of placeholder handlers
// Fixed: Proper dependency injection pattern with AuthController
// Fixed: Proper Express RequestHandler typing