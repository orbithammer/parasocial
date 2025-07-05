// backend/src/middleware/globalError.ts
// Global error handling middleware for centralized error responses and 404 handling
// Version: 1.0.0 - Initial implementation of comprehensive error handling system

import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { MulterError } from 'multer'

// ============================================================================
// ERROR TYPES AND INTERFACES
// ============================================================================

/**
 * Standard error response format for consistent API responses
 * All errors will follow this structure for frontend consistency
 */
interface ErrorResponse {
  success: false
  error: string
  code: string
  details?: any
  timestamp: string
  path: string
  method: string
  request_id?: string
}

/**
 * Custom application error class for business logic errors
 * Allows setting specific status codes and error codes
 */
export class AppError extends Error {
  public statusCode: number
  public code: string
  public isOperational: boolean

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.isOperational = true
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Validation error class for input validation failures
 * Extends AppError with validation-specific properties
 */
export class ValidationError extends AppError {
  public validationErrors: any

  constructor(message: string, validationErrors: any = null) {
    super(message, 400, 'VALIDATION_ERROR')
    this.validationErrors = validationErrors
  }
}

/**
 * Authentication error class for auth-related failures
 * Provides consistent auth error handling
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

/**
 * Authorization error class for permission failures
 * Used when user is authenticated but lacks permissions
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN')
  }
}

/**
 * Not found error class for missing resources
 * Used for user/post/resource not found scenarios
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
  }
}

/**
 * Rate limit error class for request throttling
 * Used when users exceed API rate limits
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED')
  }
}

// ============================================================================
// ERROR CLASSIFICATION FUNCTIONS
// ============================================================================

/**
 * Classify and standardize Zod validation errors
 * Converts Zod errors into consistent format with field details
 */
function handleZodError(error: ZodError): { statusCode: number, code: string, message: string, details: any } {
  const fieldErrors = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code
  }))

  return {
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    message: 'Input validation failed',
    details: {
      field_errors: fieldErrors,
      invalid_fields: fieldErrors.map(err => err.field)
    }
  }
}

/**
 * Classify and standardize Multer upload errors
 * Handles file upload specific errors with user-friendly messages
 */
function handleMulterError(error: MulterError): { statusCode: number, code: string, message: string, details?: any } {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return {
        statusCode: 400,
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds maximum allowed limit',
        details: { limit: error.field }
      }
    case 'LIMIT_FILE_COUNT':
      return {
        statusCode: 400,
        code: 'TOO_MANY_FILES',
        message: 'Too many files uploaded',
        details: { limit: error.field }
      }
    case 'LIMIT_UNEXPECTED_FILE':
      return {
        statusCode: 400,
        code: 'UNEXPECTED_FILE',
        message: 'Unexpected file field',
        details: { field: error.field }
      }
    case 'LIMIT_PART_COUNT':
      return {
        statusCode: 400,
        code: 'TOO_MANY_PARTS',
        message: 'Too many form parts uploaded',
        details: { field: error.field }
      }
    case 'LIMIT_FIELD_KEY':
      return {
        statusCode: 400,
        code: 'FIELD_NAME_TOO_LONG',
        message: 'Form field name too long',
        details: { field: error.field }
      }
    case 'LIMIT_FIELD_VALUE':
      return {
        statusCode: 400,
        code: 'FIELD_VALUE_TOO_LONG',
        message: 'Form field value too long',
        details: { field: error.field }
      }
    case 'LIMIT_FIELD_COUNT':
      return {
        statusCode: 400,
        code: 'TOO_MANY_FIELDS',
        message: 'Too many form fields',
        details: { field: error.field }
      }
    default:
      return {
        statusCode: 400,
        code: 'UPLOAD_ERROR',
        message: 'File upload failed'
      }
  }
}

/**
 * Classify and standardize database errors
 * Handles common Prisma/database errors with user-friendly messages
 */
function handleDatabaseError(error: any): { statusCode: number, code: string, message: string } {
  // Prisma unique constraint violation
  if (error.code === 'P2002') {
    return {
      statusCode: 409,
      code: 'DUPLICATE_ENTRY',
      message: 'A record with this information already exists'
    }
  }

  // Prisma record not found
  if (error.code === 'P2025') {
    return {
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'The requested record was not found'
    }
  }

  // Prisma foreign key constraint violation
  if (error.code === 'P2003') {
    return {
      statusCode: 400,
      code: 'INVALID_REFERENCE',
      message: 'Referenced record does not exist'
    }
  }

  // Prisma connection error
  if (error.code === 'P1001') {
    return {
      statusCode: 503,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Database connection failed'
    }
  }

  // Generic database error
  return {
    statusCode: 500,
    code: 'DATABASE_ERROR',
    message: 'Database operation failed'
  }
}

/**
 * Classify and standardize JWT token errors
 * Handles authentication token specific errors
 */
function handleJWTError(error: any): { statusCode: number, code: string, message: string } {
  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token'
    }
  }

  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired'
    }
  }

  if (error.name === 'NotBeforeError') {
    return {
      statusCode: 401,
      code: 'TOKEN_NOT_ACTIVE',
      message: 'Authentication token is not yet active'
    }
  }

  return {
    statusCode: 401,
    code: 'AUTH_ERROR',
    message: 'Authentication failed'
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique request ID for error tracking
 * Helps correlate errors across logs and systems
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
}

/**
 * Sanitize error details for production
 * Removes sensitive information in production environment
 */
function sanitizeErrorDetails(error: any, isDevelopment: boolean): any {
  if (isDevelopment) {
    return {
      stack: error.stack,
      name: error.name,
      original_message: error.message
    }
  }
  
  // In production, only include safe error details
  return undefined
}

/**
 * Log error with appropriate level and context
 * Provides structured logging for error monitoring
 */
function logError(error: any, req: Request, requestId: string): void {
  const logData = {
    request_id: requestId,
    method: req.method,
    path: req.path,
    user_id: (req as any).user?.id || null,
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code || 'UNKNOWN'
    },
    timestamp: new Date().toISOString()
  }

  // Use appropriate log level based on error severity
  if (error.statusCode && error.statusCode < 500) {
    console.warn('Client Error:', JSON.stringify(logData, null, 2))
  } else {
    console.error('Server Error:', JSON.stringify(logData, null, 2))
  }
}

// ============================================================================
// MAIN ERROR HANDLING MIDDLEWARE
// ============================================================================

/**
 * Global error handling middleware
 * Catches all errors and formats them consistently
 * Must be registered last in the middleware chain
 */
export function globalErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const requestId = generateRequestId()

  // Log the error for monitoring
  logError(error, req, requestId)

  // Default error response values
  let statusCode = 500
  let code = 'INTERNAL_ERROR'
  let message = 'An unexpected error occurred'
  let details = undefined

  // Classify and handle different error types
  if (error instanceof AppError) {
    // Custom application errors
    statusCode = error.statusCode
    code = error.code
    message = error.message
    
    if (error instanceof ValidationError && error.validationErrors) {
      details = error.validationErrors
    }
  } else if (error instanceof ZodError) {
    // Zod validation errors
    const zodError = handleZodError(error)
    statusCode = zodError.statusCode
    code = zodError.code
    message = zodError.message
    details = zodError.details
  } else if (error instanceof MulterError) {
    // Multer file upload errors
    const multerError = handleMulterError(error)
    statusCode = multerError.statusCode
    code = multerError.code
    message = multerError.message
    details = multerError.details
  } else if (error.name && error.name.includes('JsonWebToken')) {
    // JWT authentication errors
    const jwtError = handleJWTError(error)
    statusCode = jwtError.statusCode
    code = jwtError.code
    message = jwtError.message
  } else if (error.code && error.code.startsWith('P')) {
    // Prisma database errors
    const dbError = handleDatabaseError(error)
    statusCode = dbError.statusCode
    code = dbError.code
    message = dbError.message
  } else {
    // Unknown errors - include stack trace in development
    details = sanitizeErrorDetails(error, isDevelopment)
  }

  // Construct standardized error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    request_id: requestId
  }

  // Include details if available
  if (details) {
    errorResponse.details = details
  }

  // Send error response
  res.status(statusCode).json(errorResponse)
}

// ============================================================================
// 404 NOT FOUND HANDLER
// ============================================================================

/**
 * 404 Not Found middleware for undefined routes
 * Must be registered after all route definitions but before error handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const requestId = generateRequestId()
  
  // Log 404 for monitoring
  console.warn('Route Not Found:', {
    request_id: requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    user_agent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  })

  const errorResponse: ErrorResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    request_id: requestId
  }

  res.status(404).json(errorResponse)
}

// ============================================================================
// ASYNC ERROR WRAPPER
// ============================================================================

/**
 * Async error wrapper for route handlers
 * Automatically catches async errors and passes them to error middleware
 * Usage: router.get('/route', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// ============================================================================
// ERROR RESPONSE HELPERS
// ============================================================================

/**
 * Helper function to send standardized success responses
 * Ensures consistent response format across all endpoints
 */
export function sendSuccess(
  res: Response,
  data: any = null,
  message: string = 'Operation successful',
  statusCode: number = 200
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  })
}

/**
 * Helper function to send standardized error responses
 * Use when you need to send errors manually without throwing
 */
export function sendError(
  res: Response,
  message: string,
  code: string = 'ERROR',
  statusCode: number = 400,
  details: any = null
): void {
  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    code,
    timestamp: new Date().toISOString(),
    path: res.req.path,
    method: res.req.method
  }

  if (details) {
    errorResponse.details = details
  }

  res.status(statusCode).json(errorResponse)
}