// backend/src/middleware/corsMiddleware.ts
// Version: 1.1.0
// Fixed: TypeScript type errors with boolean origin support in CorsOptions interface

import { Request, Response, NextFunction } from 'express'

/**
 * CORS configuration options interface
 * Defines all possible CORS settings for the middleware
 */
export interface CorsOptions {
  origin?: string | string[] | boolean | ((origin: string | undefined) => boolean)
  credentials?: boolean
  methods?: string[]
  allowedHeaders?: string[]
  exposedHeaders?: string[]
  maxAge?: number
  preflightContinue?: boolean
  optionsSuccessStatus?: number
}

/**
 * Default CORS configuration
 * Provides secure defaults for production use
 */
const DEFAULT_CORS_OPTIONS: Required<CorsOptions> = {
  origin: false, // No origins allowed by default
  credentials: false,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: [],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}

/**
 * Validates if the request origin is allowed
 * Handles string, array, function, boolean, and wildcard origin configurations
 */
export function validateOrigin(
  requestOrigin: string | undefined, 
  allowedOrigins: string | string[] | boolean | ((origin: string | undefined) => boolean),
  options?: CorsOptions
): boolean {
  // Handle boolean false (no origins allowed)
  if (allowedOrigins === false) {
    return false
  }

  // Handle boolean true or wildcard (all origins allowed)
  if (allowedOrigins === true || allowedOrigins === '*') {
    return true
  }

  // Security: reject null origin when credentials are enabled
  if (requestOrigin === 'null' && options?.credentials) {
    return false
  }

  // Handle missing origin (same-origin requests)
  if (!requestOrigin) {
    return true
  }

  // Security: validate origin format to prevent injection attacks
  if (requestOrigin.length > 200) {
    return false
  }

  const originRegex = /^https?:\/\/[a-zA-Z0-9.-]+$/
  if (!originRegex.test(requestOrigin)) {
    return false
  }

  // Handle function-based validation
  if (typeof allowedOrigins === 'function') {
    return allowedOrigins(requestOrigin)
  }

  // Handle string array
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.includes(requestOrigin)
  }

  // Handle single string
  if (typeof allowedOrigins === 'string') {
    return allowedOrigins === requestOrigin
  }

  return false
}

/**
 * Sets CORS headers on the response object
 * Applies all configured CORS headers based on options
 */
export function setCorsHeaders(
  res: Response, 
  requestOrigin: string | undefined, 
  options: CorsOptions
): void {
  const config = { ...DEFAULT_CORS_OPTIONS, ...options }

  // Set Access-Control-Allow-Origin
  if (validateOrigin(requestOrigin, config.origin, options)) {
    if (config.origin === true) {
      res.setHeader('Access-Control-Allow-Origin', '*')
    } else if (requestOrigin) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin)
    }
  }

  // Set Access-Control-Allow-Credentials
  if (config.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }

  // Set Access-Control-Allow-Methods
  if (config.methods && config.methods.length > 0) {
    res.setHeader('Access-Control-Allow-Methods', config.methods.join(', '))
  }

  // Set Access-Control-Allow-Headers
  if (config.allowedHeaders && config.allowedHeaders.length > 0) {
    res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(', '))
  }

  // Set Access-Control-Expose-Headers
  if (config.exposedHeaders && config.exposedHeaders.length > 0) {
    res.setHeader('Access-Control-Expose-Headers', config.exposedHeaders.join(', '))
  }

  // Set Access-Control-Max-Age
  if (config.maxAge !== undefined && config.maxAge >= 0) {
    res.setHeader('Access-Control-Max-Age', config.maxAge.toString())
  }
}

/**
 * Handles preflight OPTIONS requests
 * Manages CORS preflight behavior based on configuration
 */
export function handlePreflight(
  req: Request, 
  res: Response, 
  next: NextFunction, 
  options: CorsOptions
): void {
  const config = { ...DEFAULT_CORS_OPTIONS, ...options }

  if (req.method === 'OPTIONS') {
    // Set CORS headers for preflight
    setCorsHeaders(res, req.headers.origin, options)

    if (config.preflightContinue) {
      // Continue to next middleware instead of ending response
      next()
    } else {
      // End preflight request with success status
      res.status(config.optionsSuccessStatus).end()
    }
  } else {
    // Not a preflight request, continue normally
    next()
  }
}

/**
 * CORS middleware factory function
 * Creates Express middleware with specified CORS configuration
 */
export function createCorsMiddleware(options: CorsOptions = {}) {
  // Validate configuration at creation time
  if (options.maxAge !== undefined && options.maxAge < 0) {
    throw new Error('maxAge must be a positive number')
  }

  /**
   * Express CORS middleware function
   * Handles CORS headers and preflight requests for each request
   */
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const requestOrigin = req.headers.origin

      // Set CORS headers for all requests
      setCorsHeaders(res, requestOrigin, options)

      // Handle preflight requests
      handlePreflight(req, res, next, options)

    } catch (error) {
      // Handle any errors gracefully
      console.error('CORS middleware error:', error)
      res.status(500).end()
    }
  }
}

/**
 * Pre-configured CORS middleware for development
 * Allows all origins with credentials for local development
 */
export const developmentCors = createCorsMiddleware({
  origin: true,
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Rate-Limit'],
  maxAge: 86400
})

/**
 * Pre-configured CORS middleware for production
 * Restrictive settings for production security
 */
export function createProductionCors(allowedOrigins: string[]) {
  return createCorsMiddleware({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: [],
    maxAge: 3600 // 1 hour
  })
}

// backend/src/middleware/corsMiddleware.ts
// Version: 1.1.0