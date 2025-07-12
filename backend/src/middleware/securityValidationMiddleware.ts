// backend\src\middleware\securityValidationMiddleware.ts
// Version: 2.0.0
// Added individual exported functions that were missing: setSecurityHeaders, validateJsonContentType, etc.

import { Request, Response, NextFunction } from 'express'

// Interface for validation error response
interface ValidationError {
  error: string
  details?: string
}

// Custom request interface to add clientIP property
interface RequestWithClientIP extends Request {
  clientIP?: string
}

/**
 * Sets security headers on the response
 * Adds X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, and Referrer-Policy headers
 */
export const setSecurityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
}

/**
 * Validates JSON content type for POST/PUT requests
 * Ensures only allowed content types are accepted
 */
export const validateJsonContentType = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (req.method === 'POST' || req.method === 'PUT') {
      const contentTypeHeader = req.headers['content-type']
      const contentType: string = contentTypeHeader || 'application/octet-stream'
      
      const allowedContentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain'
      ]
      
      const isValidContentType = allowedContentTypes.some(allowedType => 
        contentType.startsWith(allowedType)
      )
      
      if (!isValidContentType) {
        const error: ValidationError = {
          error: 'Invalid content type',
          details: `Content-Type '${contentType}' is not allowed`
        }
        res.status(400).json(error)
        return
      }
    }
    next()
  } catch (error) {
    console.error('Content type validation error:', error)
    const validationError: ValidationError = {
      error: 'Content type validation failed',
      details: 'An error occurred during content type validation'
    }
    res.status(500).json(validationError)
  }
}

/**
 * Validates request size against maximum allowed size
 * Prevents excessively large requests that could cause memory issues
 */
export const validateRequestSize = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const contentLength = req.headers['content-length']
    if (contentLength) {
      const requestSize = parseInt(contentLength, 10)
      const maxSize = 50 * 1024 * 1024 // 50MB limit
      
      if (requestSize > maxSize) {
        const error: ValidationError = {
          error: 'Request too large',
          details: `Request size ${requestSize} bytes exceeds limit of ${maxSize} bytes`
        }
        res.status(413).json(error)
        return
      }
    }
    next()
  } catch (error) {
    console.error('Request size validation error:', error)
    const validationError: ValidationError = {
      error: 'Request size validation failed',
      details: 'An error occurred during request size validation'
    }
    res.status(500).json(validationError)
  }
}

/**
 * Validates User-Agent header for API requests
 * Ensures API requests include required User-Agent header
 */
export const validateUserAgent = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (req.path.startsWith('/api/')) {
      const userAgent = req.headers['user-agent']
      if (!userAgent) {
        const error: ValidationError = {
          error: 'Missing required headers',
          details: 'User-Agent header is required for API requests'
        }
        res.status(400).json(error)
        return
      }
    }
    next()
  } catch (error) {
    console.error('User agent validation error:', error)
    const validationError: ValidationError = {
      error: 'User agent validation failed',
      details: 'An error occurred during user agent validation'
    }
    res.status(500).json(validationError)
  }
}

/**
 * Sanitizes input by removing control characters from request body
 * Recursively processes objects and arrays to clean all string values
 */
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body)
    }
    next()
  } catch (error) {
    console.error('Input sanitization error:', error)
    const validationError: ValidationError = {
      error: 'Input sanitization failed',
      details: 'An error occurred during input sanitization'
    }
    res.status(500).json(validationError)
  }
}

/**
 * Recursively sanitizes an object by removing control characters from strings
 * Handles nested objects and arrays
 */
const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    // Remove control characters (0x00-0x1F and 0x7F)
    return obj.replace(/[\x00-\x1F\x7F]/g, '')
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, any> = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  
  return obj
}

/**
 * Validates ID parameter format
 * Ensures ID contains only alphanumeric characters, hyphens, and underscores
 */
export const validateIdParam = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { id } = req.params
    
    if (!id || id.length === 0) {
      const error: ValidationError = {
        error: 'Invalid ID parameter',
        details: 'ID parameter is required and cannot be empty'
      }
      res.status(400).json(error)
      return
    }
    
    // Allow alphanumeric characters, hyphens, and underscores only
    const idPattern = /^[a-zA-Z0-9_-]+$/
    if (!idPattern.test(id)) {
      const error: ValidationError = {
        error: 'Invalid ID format',
        details: 'ID must contain only alphanumeric characters, hyphens, and underscores'
      }
      res.status(400).json(error)
      return
    }
    
    // Check maximum length
    if (id.length > 255) {
      const error: ValidationError = {
        error: 'Invalid ID length',
        details: 'ID parameter cannot exceed 255 characters'
      }
      res.status(400).json(error)
      return
    }
    
    next()
  } catch (error) {
    console.error('ID parameter validation error:', error)
    const validationError: ValidationError = {
      error: 'ID validation failed',
      details: 'An error occurred during ID parameter validation'
    }
    res.status(500).json(validationError)
  }
}

/**
 * Validates pagination parameters (page and limit)
 * Ensures pagination values are within acceptable ranges
 */
export const validatePagination = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { page, limit } = req.query
    
    if (page !== undefined) {
      const pageNum = parseInt(page as string, 10)
      if (isNaN(pageNum) || pageNum < 1 || pageNum > 10000) {
        const error: ValidationError = {
          error: 'Invalid pagination parameter',
          details: 'Page must be a number between 1 and 10000'
        }
        res.status(400).json(error)
        return
      }
    }
    
    if (limit !== undefined) {
      const limitNum = parseInt(limit as string, 10)
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        const error: ValidationError = {
          error: 'Invalid pagination parameter',
          details: 'Limit must be a number between 1 and 1000'
        }
        res.status(400).json(error)
        return
      }
    }
    
    next()
  } catch (error) {
    console.error('Pagination validation error:', error)
    const validationError: ValidationError = {
      error: 'Pagination validation failed',
      details: 'An error occurred during pagination validation'
    }
    res.status(500).json(validationError)
  }
}

/**
 * Validates and logs client IP address
 * Extracts IP from various sources and adds it to request object
 */
export const validateAndLogIP = (
  req: RequestWithClientIP,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract client IP from various sources
    const forwardedFor = req.headers['x-forwarded-for'] as string
    const realIP = req.headers['x-real-ip'] as string
    const connectionIP = req.connection?.remoteAddress
    const socketIP = req.socket?.remoteAddress
    const reqIP = req.ip
    
    // Prioritize forwarded headers, then connection/socket IP
    const clientIP = forwardedFor || realIP || connectionIP || socketIP || reqIP || 'unknown'
    
    // Add to request object for later use
    req.clientIP = clientIP
    
    // Log the request with IP for security monitoring
    console.log(`Request from IP: ${clientIP} to ${req.method} ${req.path}`)
    
    next()
  } catch (error) {
    console.error('IP validation error:', error)
    const validationError: ValidationError = {
      error: 'IP validation failed',
      details: 'An error occurred during IP validation'
    }
    res.status(500).json(validationError)
  }
}

/**
 * Applies basic security validations
 * Combines multiple security checks for general use
 */
export const applyBasicSecurity = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Chain multiple security validations
  setSecurityHeaders(req, res, () => {
    validateJsonContentType(req, res, () => {
      validateRequestSize(req, res, () => {
        sanitizeInput(req, res, next)
      })
    })
  })
}

/**
 * Applies API-specific security validations
 * Includes all basic security plus API-specific checks
 */
export const applyAPIValidation = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Chain API-specific validations
  applyBasicSecurity(req, res, () => {
    validateUserAgent(req, res, () => {
      validateAndLogIP(req as RequestWithClientIP, res, next)
    })
  })
}

/**
 * Main security validation middleware for comprehensive request validation
 * Includes path traversal protection and suspicious pattern detection
 */
export const securityValidationMiddleware = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  try {
    // Check for suspicious patterns in URL
    const suspiciousPatterns = [
      /\.\./,           // Path traversal
      /<script/i,       // XSS attempts
      /javascript:/i,   // JavaScript protocol
      /data:/i,         // Data URI
      /vbscript:/i      // VBScript
    ]
    
    const hasSuspiciousPattern = suspiciousPatterns.some(pattern => 
      pattern.test(req.url)
    )
    
    if (hasSuspiciousPattern) {
      console.warn(`Suspicious request pattern detected: ${req.url}`)
      const error: ValidationError = {
        error: 'Invalid request format',
        details: 'Request contains suspicious patterns'
      }
      res.status(400).json(error)
      return
    }
    
    // Apply comprehensive security validations
    applyAPIValidation(req, res, next)
    
  } catch (error) {
    console.error('Security validation error:', error)
    const validationError: ValidationError = {
      error: 'Security validation failed',
      details: 'An error occurred during request validation'
    }
    res.status(500).json(validationError)
  }
}