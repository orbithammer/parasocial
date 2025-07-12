// src/middleware/rateLimitMiddleware.ts
// Version: 1.0.0
// Initial implementation of rate limiting middleware

import { Request, Response, NextFunction } from 'express'

// Interface for rate limit request
interface RateLimitRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
  ip: string
}

// Rate limit configuration interface
export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  max: number // Maximum number of requests per window
  keyGenerator?: (req: RateLimitRequest) => string // Custom key generator
  skipSuccessfulRequests?: boolean // Skip counting successful requests
  skipFailedRequests?: boolean // Skip counting failed requests
  standardHeaders?: boolean // Include rate limit headers
  legacyHeaders?: boolean // Include legacy X-RateLimit headers
}

// Rate limit error types
export enum RateLimitError {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_RATE_LIMIT_CONFIG = 'INVALID_RATE_LIMIT_CONFIG'
}

// In-memory store for rate limiting (in production, use Redis)
interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const rateLimitStore: RateLimitStore = {}

// Default rate limit configurations
export const DEFAULT_CONFIGS = {
  // Authentication endpoints (login, register)
  auth: {
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 attempts per minute
    keyGenerator: (req: RateLimitRequest): string => req.ip,
    standardHeaders: true
  },
  
  // Post creation
  postCreation: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 posts per minute
    keyGenerator: (req: RateLimitRequest): string => req.user?.id || req.ip,
    standardHeaders: true
  },
  
  // Media upload
  mediaUpload: {
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute
    keyGenerator: (req: RateLimitRequest): string => req.user?.id || req.ip,
    standardHeaders: true
  },
  
  // Follow operations
  followOperations: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 follow/unfollow operations per hour
    keyGenerator: (req: RateLimitRequest): string => req.user?.id || req.ip,
    standardHeaders: true
  },
  
  // General API
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    keyGenerator: (req: RateLimitRequest): string => req.user?.id || req.ip,
    standardHeaders: true
  }
}

// Clean up expired entries from rate limit store
const cleanupExpiredEntries = (): void => {
  const now = Date.now()
  for (const key in rateLimitStore) {
    const entry = rateLimitStore[key]
    if (entry && entry.resetTime <= now) {
      delete rateLimitStore[key]
    }
  }
}

// Create rate limit middleware with configuration
export const createRateLimit = (config: RateLimitConfig) => {
  // Validate configuration
  if (!config.windowMs || config.windowMs <= 0) {
    throw new Error('windowMs must be a positive number')
  }
  
  if (!config.max || config.max <= 0) {
    throw new Error('max must be a positive number')
  }

  // Default key generator uses user ID if authenticated, otherwise IP
  const keyGenerator = config.keyGenerator || ((req: RateLimitRequest): string => {
    return req.user?.id || req.ip
  })

  return (req: RateLimitRequest, res: Response, next: NextFunction): void => {
    try {
      // Clean up expired entries periodically
      if (Math.random() < 0.01) { // 1% chance to clean up
        cleanupExpiredEntries()
      }

      const key = keyGenerator(req)
      const now = Date.now()
      const windowStart = now
      const resetTime = windowStart + config.windowMs

      // Get or create rate limit entry
      let entry = rateLimitStore[key]
      
      if (!entry || entry.resetTime <= now) {
        // Create new entry or reset expired entry
        entry = {
          count: 0,
          resetTime
        }
        rateLimitStore[key] = entry
      }

      // Check if limit exceeded
      if (entry.count >= config.max) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
        
        // Set rate limit headers
        if (config.standardHeaders !== false) {
          res.set({
            'RateLimit-Limit': config.max.toString(),
            'RateLimit-Remaining': '0',
            'RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
          })
        }

        if (config.legacyHeaders) {
          res.set({
            'X-RateLimit-Limit': config.max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
          })
        }

        res.status(429).json({
          success: false,
          error: {
            code: RateLimitError.RATE_LIMIT_EXCEEDED,
            message: 'Rate limit exceeded',
            rateLimitKey: key,
            retryAfter: `${retryAfter} seconds`
          }
        })
        return
      }

      // Increment counter
      entry.count++

      // Set rate limit headers
      if (config.standardHeaders !== false) {
        res.set({
          'RateLimit-Limit': config.max.toString(),
          'RateLimit-Remaining': (config.max - entry.count).toString(),
          'RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
        })
      }

      if (config.legacyHeaders) {
        res.set({
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': (config.max - entry.count).toString(),
          'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString()
        })
      }

      next()
    } catch (error) {
      // Log error and continue (don't block requests due to rate limit errors)
      console.error('Rate limit middleware error:', error)
      next()
    }
  }
}

// Pre-configured rate limit middleware for common use cases
export const authRateLimit = createRateLimit(DEFAULT_CONFIGS.auth)
export const postCreationRateLimit = createRateLimit(DEFAULT_CONFIGS.postCreation)
export const mediaUploadRateLimit = createRateLimit(DEFAULT_CONFIGS.mediaUpload)
export const followOperationsRateLimit = createRateLimit(DEFAULT_CONFIGS.followOperations)
export const generalRateLimit = createRateLimit(DEFAULT_CONFIGS.general)

// Key generator functions for different strategies
export const keyGenerators = {
  // Rate limit by IP address
  byIP: (req: RateLimitRequest): string => req.ip,
  
  // Rate limit by user ID (requires authentication)
  byUserID: (req: RateLimitRequest): string => {
    if (!req.user?.id) {
      throw new Error('User authentication required for user-based rate limiting')
    }
    return req.user.id
  },
  
  // Rate limit by user ID if authenticated, otherwise by IP
  byUserOrIP: (req: RateLimitRequest): string => req.user?.id || req.ip,
  
  // Rate limit by a combination of user ID and endpoint
  byUserAndEndpoint: (endpoint: string) => (req: RateLimitRequest): string => {
    const userKey = req.user?.id || req.ip
    return `${userKey}:${endpoint}`
  }
}

// Utility function to create custom rate limits
export const createCustomRateLimit = (
  windowMs: number,
  max: number,
  keyGenerator?: (req: RateLimitRequest) => string
) => {
  return createRateLimit({
    windowMs,
    max,
    keyGenerator: keyGenerator || keyGenerators.byUserOrIP,
    standardHeaders: true
  })
}

// Reset rate limit for a specific key (useful for testing)
export const resetRateLimit = (key: string): void => {
  delete rateLimitStore[key]
}

// Reset all rate limits (useful for testing)
export const resetAllRateLimits = (): void => {
  for (const key in rateLimitStore) {
    delete rateLimitStore[key]
  }
}

// Get current rate limit status for a key
export const getRateLimitStatus = (key: string): { count: number, resetTime: number } | null => {
  const entry = rateLimitStore[key]
  if (!entry || entry.resetTime <= Date.now()) {
    return null
  }
  return { ...entry }
}

// Export default rate limit configurations
export default {
  createRateLimit,
  authRateLimit,
  postCreationRateLimit,
  mediaUploadRateLimit,
  followOperationsRateLimit,
  generalRateLimit,
  keyGenerators,
  createCustomRateLimit,
  resetRateLimit,
  resetAllRateLimits,
  getRateLimitStatus,
  RateLimitError,
  DEFAULT_CONFIGS
}