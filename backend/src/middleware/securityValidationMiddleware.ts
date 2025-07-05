// backend/src/middleware/securityValidationMiddleware.ts
// Version: 1.1
// FIXED: ExtendedRequest interface properly extends Request without making required properties optional

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
    .transform(val => val ? parseInt(val, 10) : 10)
    .refine(val => val >= 1 && val <= 100, {
      message: 'Limit must be between 1 and 100'
    })
})

/**
 * Extended Request interface to include clientIP
 * Properly extends Request without making required properties optional
 */
interface ExtendedRequest extends Request {
  clientIP?: string
  // Don't override connection or socket - they're already on Request
}

/**
 * Set essential security headers for all responses
 */
export const setSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY')
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block')
  
  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  next()
}

/**
 * Validate JSON content type for API endpoints
 */
export const validateJsonContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    if (!req.headers['content-type']?.includes('application/json')) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONTENT_TYPE',
          message: 'Content-Type must be application/json'
        }
      })
      return
    }
  }
  next()
}

/**
 * Validate request size to prevent DoS attacks
 */
export const validateRequestSize = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = req.headers['content-length']
  
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    const maxSize = 10 * 1024 * 1024 // 10MB limit
    
    if (size > maxSize) {
      res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: 'Request size exceeds maximum allowed limit'
        }
      })
      return
    }
  }
  
  next()
}

/**
 * Validate User-Agent header to block obvious bot requests
 */
export const validateUserAgent = (req: Request, res: Response, next: NextFunction): void => {
  const userAgent = req.headers['user-agent']
  
  if (!userAgent) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_USER_AGENT',
        message: 'User-Agent header is required'
      }
    })
    return
  }
  
  // Block known malicious patterns
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /burp/i,
    /python-requests/i
  ]
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userAgent)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'BLOCKED_USER_AGENT',
          message: 'Request blocked due to suspicious User-Agent'
        }
      })
      return
    }
  }
  
  next()
}

/**
 * Sanitize input to remove control characters
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      // Remove control characters except newlines and tabs
      return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    }
    
    if (Array.isArray(value)) {
      return value.map(sanitizeValue)
    }
    
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {}
      for (const [key, val] of Object.entries(value)) {
        sanitized[key] = sanitizeValue(val)
      }
      return sanitized
    }
    
    return value
  }
  
  if (req.body) {
    req.body = sanitizeValue(req.body)
  }
  
  next()
}

/**
 * Middleware to validate ID parameter in route params
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
 * IP address validation and logging
 * Uses standard Request type and casts to ExtendedRequest when needed
 */
export const validateAndLogIP = (req: Request, res: Response, next: NextFunction): void => {
  // Type assertion to safely add clientIP property
  const extendedReq = req as ExtendedRequest
  
  // Get real IP address (considering proxies) with safe property access
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             req.connection?.remoteAddress || 
             req.socket?.remoteAddress ||
             req.ip ||
             'unknown'

  // Add custom IP property to request for logging and rate limiting
  extendedReq.clientIP = Array.isArray(ip) ? ip[0] : ip.toString()

  // Basic IP validation
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  
  if (extendedReq.clientIP !== 'unknown' && !ipRegex.test(extendedReq.clientIP.split(',')[0].trim())) {
    // Log suspicious IP format but don't block (might be behind proxy)
    console.warn(`Suspicious IP format detected: ${extendedReq.clientIP}`)
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