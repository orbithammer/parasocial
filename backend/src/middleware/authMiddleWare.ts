// backend/src/middleware/authMiddleware.ts
// Express middleware for JWT token authentication using TypeScript

import { Request, Response, NextFunction } from 'express'

// Extend Express Request to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

// Auth service interface
interface AuthService {
  extractTokenFromHeader(header: string): string | null
  verifyToken(token: string): {
    userId: string
    email: string
    username: string
  }
}

/**
 * Authentication middleware factory
 * Creates middleware function with injected AuthService
 */
export function createAuthMiddleware(authService: AuthService) {
  /**
   * Express middleware to authenticate requests
   * Extracts and verifies JWT token, adds user info to request
   */
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization
      const token = authService.extractTokenFromHeader(authHeader || '')

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authentication token required'
        })
        return
      }

      // Verify token and extract user information
      const decoded = authService.verifyToken(token)
      
      // Add user information to request object
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        username: decoded.username
      }

      next()
    } catch (error) {
      res.status(401).json({
        success: false,
        error: error instanceof Error ? error.message : 'Invalid authentication token'
      })
    }
  }
}

/**
 * Optional authentication middleware
 * Similar to auth middleware but doesn't fail if no token is provided
 */
export function createOptionalAuthMiddleware(authService: AuthService) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization
      const token = authService.extractTokenFromHeader(authHeader || '')

      if (token) {
        const decoded = authService.verifyToken(token)
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          username: decoded.username
        }
      }

      next()
    } catch (error) {
      // For optional auth, continue without user info if token is invalid
      next()
    }
  }
}