// backend/src/middleware/rateLimitMiddleware.ts
// Rate limiting middleware for Phase 2.5 - Input validation and basic security
// Prevents spam and abuse across different endpoint categories

import rateLimit from 'express-rate-limit'
import { Request, Response } from 'express'

/**
 * Custom error response format for rate limiting
 * Matches the existing API response structure
 */
const createRateLimitResponse = (message: string) => {
  return {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message,
      retryAfter: '60 seconds'
    }
  }
}

/**
 * Custom rate limit handler that returns consistent JSON responses
 */
const rateLimitHandler = (message: string) => {
  return (req: Request, res: Response) => {
    res.status(429).json(createRateLimitResponse(message))
  }
}

/**
 * Strict rate limiting for authentication endpoints
 * 5 requests per minute to prevent brute force attacks
 */
export const authRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 5, // Maximum 5 requests per window
  message: 'Too many authentication attempts. Please try again in 1 minute.',
  standardHeaders: true, // Include rate limit info in headers
  legacyHeaders: false, // Disable legacy X-RateLimit headers
  handler: rateLimitHandler('Too many authentication attempts. Please try again in 1 minute.'),
  // Skip successful requests in the count for login/register
  skipSuccessfulRequests: false,
  // Use IP address for rate limiting
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown'
  }
})

/**
 * Moderate rate limiting for post creation
 * 10 posts per hour to prevent spam
 */
export const postCreationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // Maximum 10 posts per hour
  message: 'Post creation limit reached. You can create 10 posts per hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Post creation limit reached. You can create 10 posts per hour.'),
  // Use user ID if authenticated, otherwise IP
  keyGenerator: (req: Request) => {
    // Check if user is authenticated (assuming req.user is set by auth middleware)
    const authenticatedUser = (req as any).user
    return authenticatedUser?.id || req.ip || 'unknown'
  }
})

/**
 * Moderate rate limiting for follow operations
 * 20 follow/unfollow actions per hour to prevent automation abuse
 */
export const followRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window  
  max: 20, // Maximum 20 follow operations per hour
  message: 'Follow action limit reached. You can perform 20 follow/unfollow actions per hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Follow action limit reached. You can perform 20 follow/unfollow actions per hour.'),
  keyGenerator: (req: Request) => {
    const authenticatedUser = (req as any).user
    return authenticatedUser?.id || req.ip || 'unknown'
  }
})

/**
 * Strict rate limiting for media uploads
 * 20 uploads per hour to manage server resources
 */
export const mediaUploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 20, // Maximum 20 uploads per hour
  message: 'Media upload limit reached. You can upload 20 files per hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Media upload limit reached. You can upload 20 files per hour.'),
  keyGenerator: (req: Request) => {
    const authenticatedUser = (req as any).user
    return authenticatedUser?.id || req.ip || 'unknown'
  }
})

/**
 * General API rate limiting for all other endpoints
 * 100 requests per minute for general usage
 */
export const generalRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100, // Maximum 100 requests per minute
  message: 'API rate limit exceeded. You can make 100 requests per minute.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('API rate limit exceeded. You can make 100 requests per minute.'),
  keyGenerator: (req: Request) => {
    // Use IP for general rate limiting
    return req.ip || 'unknown'
  }
})

/**
 * Very strict rate limiting for password reset attempts
 * 3 attempts per hour to prevent abuse of password reset system
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 3, // Maximum 3 password reset attempts per hour
  message: 'Password reset limit reached. You can request 3 password resets per hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler('Password reset limit reached. You can request 3 password resets per hour.'),
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown'
  }
})

/**
 * Rate limiting configuration object for easy reference
 * Use this to understand the current limits across the application
 */
export const rateLimitConfig = {
  auth: {
    windowMs: 1 * 60 * 1000,
    max: 5,
    description: 'Authentication endpoints (login, register)'
  },
  postCreation: {
    windowMs: 60 * 60 * 1000,
    max: 10,
    description: 'Post creation endpoint'
  },
  follow: {
    windowMs: 60 * 60 * 1000,
    max: 20,
    description: 'Follow/unfollow operations'
  },
  mediaUpload: {
    windowMs: 60 * 60 * 1000,
    max: 20,
    description: 'Media file uploads'
  },
  general: {
    windowMs: 1 * 60 * 1000,
    max: 100,
    description: 'General API endpoints'
  },
  passwordReset: {
    windowMs: 60 * 60 * 1000,
    max: 3,
    description: 'Password reset requests'
  }
} as const