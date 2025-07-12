// backend/src/middleware/globalError.ts - Version 1.2
// Fixed process.env access with bracket notation, proper undefined handling, and unused parameter warnings

import { Request, Response, NextFunction } from 'express'
import multer from 'multer'

/**
 * Standard error response interface
 * All API errors follow this consistent structure
 */
interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  request_id: string
  timestamp: string
  method: string
  path: string
}

/**
 * Custom application error class
 * Used for structured errors with specific codes
 */
export class AppError extends Error {
  public code: string
  public statusCode: number
  public details?: any

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * Authentication error class
 * Used for auth-related failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: any) {
    super('UNAUTHORIZED', message, 401, details)
    this.name = 'AuthenticationError'
  }
}

/**
 * Validation error class
 * Used for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super('VALIDATION_ERROR', message, 400, details)
    this.name = 'ValidationError'
  }
}

/**
 * Generate unique request ID for error tracking
 */
function generateRequestId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `req_${timestamp}_${random}`
}

/**
 * Map error types to standardized error codes and status codes
 */
function mapErrorToStandardFormat(error: any): { code: string; message: string; statusCode: number; details?: any } {
  // Handle custom AppError instances
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details
    }
  }

  // Handle Multer errors
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds the limit',
          statusCode: 400
        }
      case 'LIMIT_FILE_COUNT':
        return {
          code: 'TOO_MANY_FILES',
          message: 'Too many files uploaded',
          statusCode: 400
        }
      case 'LIMIT_UNEXPECTED_FILE':
        return {
          code: 'UNEXPECTED_FILE',
          message: 'Unexpected file field',
          statusCode: 400
        }
      default:
        return {
          code: 'UPLOAD_ERROR',
          message: error.message || 'File upload error',
          statusCode: 400
        }
    }
  }

  // Handle custom file filter errors
  if (error.code === 'INVALID_FILE_TYPE') {
    return {
      code: 'INVALID_FILE_TYPE',
      message: error.message || 'Invalid file type',
      statusCode: 400
    }
  }

  // Handle Prisma/Database errors
  if (error.code === 'P2002') {
    return {
      code: 'DUPLICATE_ENTRY',
      message: 'Resource already exists',
      statusCode: 409
    }
  }

  if (error.code === 'P2025') {
    return {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      statusCode: 404
    }
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return {
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
      statusCode: 401
    }
  }

  if (error.name === 'TokenExpiredError') {
    return {
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired',
      statusCode: 401
    }
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError') {
    return {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      statusCode: 400,
      details: error.issues
    }
  }

  // Handle standard HTTP errors with status codes
  if (error.statusCode || error.status) {
    const statusCode = error.statusCode || error.status
    return {
      code: getErrorCodeFromStatus(statusCode),
      message: error.message || getDefaultMessageForStatus(statusCode),
      statusCode
    }
  }

  // Handle generic Error instances
  if (error instanceof Error) {
    return {
      code: 'INTERNAL_ERROR',
      message: process.env['NODE_ENV'] === 'production' 
        ? 'An internal error occurred' 
        : error.message,
      statusCode: 500
    }
  }

  // Handle unknown error types
  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500
  }
}

/**
 * Get error code from HTTP status code
 */
function getErrorCodeFromStatus(statusCode: number): string {
  switch (statusCode) {
    case 400: return 'BAD_REQUEST'
    case 401: return 'UNAUTHORIZED'
    case 403: return 'FORBIDDEN'
    case 404: return 'NOT_FOUND'
    case 409: return 'CONFLICT'
    case 422: return 'UNPROCESSABLE_ENTITY'
    case 429: return 'RATE_LIMIT_EXCEEDED'
    case 500: return 'INTERNAL_ERROR'
    case 502: return 'BAD_GATEWAY'
    case 503: return 'SERVICE_UNAVAILABLE'
    default: return 'HTTP_ERROR'
  }
}

/**
 * Get default message for HTTP status code
 */
function getDefaultMessageForStatus(statusCode: number): string {
  switch (statusCode) {
    case 400: return 'Bad request'
    case 401: return 'Unauthorized'
    case 403: return 'Forbidden'
    case 404: return 'Not found'
    case 409: return 'Conflict'
    case 422: return 'Unprocessable entity'
    case 429: return 'Rate limit exceeded'
    case 500: return 'Internal server error'
    case 502: return 'Bad gateway'
    case 503: return 'Service unavailable'
    default: return 'HTTP error'
  }
}

/**
 * Global error handling middleware
 * Catches all errors and formats them consistently
 */
export function globalErrorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Don't handle if response already sent
  if (res.headersSent) {
    return next(error)
  }

  // Map error to standard format
  const standardError = mapErrorToStandardFormat(error)

  // Generate request tracking info
  const requestId = generateRequestId()
  const timestamp = new Date().toISOString()

  // Create standardized error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: standardError.code,
      message: standardError.message,
      ...(standardError.details && { details: standardError.details })
    },
    request_id: requestId,
    timestamp,
    method: req.method,
    path: req.path
  }

  // Log error for debugging (in production, use proper logging service)
  if (process.env['NODE_ENV'] !== 'test') {
    console.error(`[${requestId}] ${req.method} ${req.path}:`, {
      error: error.message,
      stack: error.stack,
      code: standardError.code,
      statusCode: standardError.statusCode
    })
  }

  // Send error response
  res.status(standardError.statusCode).json(errorResponse)
}

/**
 * 404 handler for undefined routes
 * Should be registered after all routes
 */
export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const error = new AppError(
    'NOT_FOUND',
    `Route ${req.method} ${req.path} not found`,
    404
  )
  next(error)
}

/**
 * Async wrapper to catch promise rejections
 * Use this to wrap async route handlers
 */
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export default globalErrorHandler