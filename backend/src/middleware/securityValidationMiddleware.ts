// backend/src/middleware/securityValidationMiddleware.ts
// Version: 1.0
// General security and validation middleware for common request validation

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

/**
 * Common ID validation schema
 */
const idParamSchema = z.object({
  id: z.string()
    .min(1, 'ID is required')
    .max(255, 'ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'ID can only contain alphanumeric characters, hyphens, and underscores')
})

/**
 * Common pagination schema
 */
const paginationSchema = z.object({
  page: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 1)
    .refine(val => val >= 1 && val <= 1000, {
      message: 'Page must be between 1 and 1000'
    }),
  limit: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 20)
    .refine(val => val >= 1 && val <= 100, {
      message: 'Limit must be between 1 and 100'
    }),
  sort: z.enum(['newest', 'oldest', 'popular'])
    .optional()
    .default('newest'),
  search: z.string()
    .trim()
    .max(200, 'Search query too long')
    .optional()
})

/**
 * Security headers validation and setting
 */
export const setSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Set basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Set CORS headers for API endpoints
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  next()
}

/**
 * Content-Type validation for JSON endpoints
 */
export const validateJsonContentType = (req: Request, res: Response, next: NextFunction): void => {
  // Skip validation for GET requests and file uploads
  if (req.method === 'GET' || req.headers['content-type']?.includes('multipart/form-data')) {
    next()
    return
  }

  const contentType = req.headers['content-type']
  
  if (!contentType || !contentType.includes('application/json')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Content-Type must be application/json'
      }
    })
    return
  }

  next()
}

/**
 * Request size validation
 */
export const validateRequestSize = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = req.headers['content-length']
  
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (size > maxSize) {
      res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: 'Request body too large. Maximum size is 10MB'
        }
      })
      return
    }
  }

  next()
}

/**
 * User-Agent validation to prevent basic bot abuse
 */
export const validateUserAgent = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.headers['user-agent']
  
  // Block requests without User-Agent (basic bot prevention)
  if (!userAgent || userAgent.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'User-Agent header is required'
      }
    })
    return
  }

  // Block obvious bad actors
  const blockedPatterns = [
    /crawler/i,
    /bot/i,
    /spider/i,
    /scraper/i
  ]

  const isBlocked = blockedPatterns.some(pattern => pattern.test(userAgent))
  
  if (isBlocked) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied for automated requests'
      }
    })
    return
  }

  next()
}

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Recursively sanitize string values in request body
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove null bytes and control characters
      return obj.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject)
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value)
      }
      return sanitized
    }
    
    return obj
  }

  if (req.body) {
    req.body = sanitizeObject(req.body)
  }

  next()
}

/**
 * Middleware to validate common ID parameters
 */
export const validateIdParam = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validatedParams = idParamSchema.parse(req.params)
    req.params = validatedParams
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ID parameter',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        }
      })
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during validation'
        }
      })
    }
  }
}

/**
 * Middleware to validate common pagination parameters
 */
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validatedQuery = paginationSchema.parse(req.query)
    req.query = validatedQuery as any
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pagination parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        }
      })
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during validation'
        }
      })
    }
  }
}

/**
 * Extended Request interface to include clientIP
 */
interface ExtendedRequest extends Request {
  clientIP?: string
}

/**
 * IP address validation and logging
 */
export const validateAndLogIP = (req: ExtendedRequest, res: Response, next: NextFunction): void => {
  // Get real IP address (considering proxies)
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             req.ip ||
             'unknown'

  // Add custom IP property to request for logging and rate limiting
  req.clientIP = Array.isArray(ip) ? ip[0] : ip.toString()

  // Basic IP validation
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  
  if (req.clientIP !== 'unknown' && !ipRegex.test(req.clientIP.split(',')[0].trim())) {
    // Log suspicious IP format but don't block (might be behind proxy)
    console.warn(`Suspicious IP format detected: ${req.clientIP}`)
  }

  next()
}

/**
 * Combined security middleware that applies multiple security checks
 */
export const applyBasicSecurity = [
  setSecurityHeaders,
  validateRequestSize,
  validateAndLogIP,
  sanitizeInput
]

/**
 * Combined API validation middleware for JSON endpoints
 */
export const applyAPIValidation = [
  ...applyBasicSecurity,
  validateJsonContentType,
  validateUserAgent
]