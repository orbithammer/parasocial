// backend/src/middleware/authMiddleware.js
// Express middleware for JWT token authentication

/**
 * Authentication middleware factory
 * Creates middleware function with injected AuthService
 */
export function createAuthMiddleware(authService) {
  /**
   * Express middleware to authenticate requests
   * Extracts and verifies JWT token, adds user info to request
   */
  return async (req, res, next) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization
      const token = authService.extractTokenFromHeader(authHeader)

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication token required'
        })
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
      return res.status(401).json({
        success: false,
        error: error.message || 'Invalid authentication token'
      })
    }
  }
}

/**
 * Optional authentication middleware
 * Similar to auth middleware but doesn't fail if no token is provided
 */
export function createOptionalAuthMiddleware(authService) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization
      const token = authService.extractTokenFromHeader(authHeader)

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