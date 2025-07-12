// backend\src\middleware\securityValidationMiddleware.ts
// Version: 1.0.0
// Fixed undefined content-type header handling with proper type safety

import { Request, Response, NextFunction } from 'express'

// Interface for validation error response
interface ValidationError {
  error: string
  details?: string
}

// Security validation middleware for content type and request validation
export const securityValidationMiddleware = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  try {
    // Safely get content-type header with undefined handling
    const contentTypeHeader = req.headers['content-type']
    const contentType: string = contentTypeHeader || 'application/octet-stream'
    
    // Validate content type for POST/PUT requests
    if (req.method === 'POST' || req.method === 'PUT') {
      const allowedContentTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain'
      ]
      
      // Check if content type is allowed (handle multipart boundary case)
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
    
    // Validate request size
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
    
    // Validate required headers for API requests
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
    
    // Add security headers to response
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Continue to next middleware
    next()
    
  } catch (error) {
    console.error('Security validation error:', error)
    const validationError: ValidationError = {
      error: 'Security validation failed',
      details: 'An error occurred during request validation'
    }
    res.status(500).json(validationError)
  }
}