// backend\src\middleware\validationMiddleware.ts
// Version: 1.1.0
// Updated: Complete validation middleware implementation with proper exports for test compatibility

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/**
 * Custom validation error class for consistent error handling
 */
export class ValidationError extends Error {
  public errors: Array<{
    field: string
    message: string
  }>

  constructor(message: string, errors: Array<{ field: string; message: string }>) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
  }
}

/**
 * Validation schemas configuration interface
 */
interface ValidationSchemas {
  body?: z.ZodSchema
  query?: z.ZodSchema
  params?: z.ZodSchema
}

/**
 * Standard API error response format
 */
interface APIErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Array<{
      field: string
      message: string
    }>
  }
}

// =============================================================================
// COMMON VALIDATION SCHEMAS
// =============================================================================

/**
 * Common validation schemas used across the application
 */
export const commonSchemas = {
  /**
   * Pagination parameters schema
   */
  pagination: z.object({
    page: z.string().default('1').transform(Number).pipe(z.number().min(1)),
    limit: z.string().default('10').transform(Number).pipe(z.number().min(1).max(100))
  }),

  /**
   * UUID parameter schema
   */
  uuid: z.string().uuid('Invalid UUID format'),

  /**
   * ObjectId parameter schema (for MongoDB compatibility)
   */
  objectId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format'),

  /**
   * Email validation schema
   */
  email: z.string().email('Invalid email format').toLowerCase(),

  /**
   * Username validation schema
   */
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),

  /**
   * Boolean string transformation schema
   */
  booleanString: z.string().transform(val => val === 'true'),

  /**
   * ISO date string schema
   */
  isoDate: z.string().datetime('Invalid ISO date format')
} as const

// =============================================================================
// VALIDATION MIDDLEWARE FACTORY
// =============================================================================

/**
 * Creates validation middleware for Express routes
 * Validates request body, query parameters, and route parameters
 * 
 * @param schemas - Object containing zod schemas for body, query, and params
 * @returns Express middleware function
 */
export const createValidationMiddleware = (schemas: ValidationSchemas) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validationErrors: Array<{ field: string; message: string }> = []

      // Validate request body if schema provided
      if (schemas.body) {
        try {
          const validatedBody = schemas.body.parse(req.body)
          req.body = validatedBody
        } catch (error) {
          if (error instanceof z.ZodError) {
            error.errors.forEach(err => {
              validationErrors.push({
                field: `body.${err.path.join('.')}`,
                message: err.message
              })
            })
          }
        }
      }

      // If body validation failed, return early (don't continue with other validations)
      if (validationErrors.length > 0) {
        const validationError = new ValidationError('Body validation failed', validationErrors)
        next(validationError)
        return
      }

      // Validate query parameters if schema provided
      if (schemas.query) {
        try {
          const validatedQuery = schemas.query.parse(req.query)
          req.query = validatedQuery
        } catch (error) {
          if (error instanceof z.ZodError) {
            error.errors.forEach(err => {
              validationErrors.push({
                field: `query.${err.path.join('.')}`,
                message: err.message
              })
            })
          }
        }
      }

      // Validate route parameters if schema provided
      if (schemas.params) {
        try {
          const validatedParams = schemas.params.parse(req.params)
          req.params = validatedParams
        } catch (error) {
          if (error instanceof z.ZodError) {
            error.errors.forEach(err => {
              validationErrors.push({
                field: `params.${err.path.join('.')}`,
                message: err.message
              })
            })
          }
        }
      }

      // If any validation errors occurred, create ValidationError and pass to error handler
      if (validationErrors.length > 0) {
        const validationError = new ValidationError('Validation failed', validationErrors)
        next(validationError)
        return
      }

      // All validations passed, continue to next middleware
      next()

    } catch (error) {
      // Handle unexpected errors during validation
      console.error('Unexpected error in validation middleware:', error)
      const apiError: APIErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'An unexpected error occurred during validation'
        }
      }
      res.status(500).json(apiError)
    }
  }
}

// =============================================================================
// CONVENIENCE VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates only request body
 * @param schema - Zod schema for body validation
 */
export const validateBody = (schema: z.ZodSchema) => 
  createValidationMiddleware({ body: schema })

/**
 * Validates only query parameters
 * @param schema - Zod schema for query validation
 */
export const validateQuery = (schema: z.ZodSchema) => 
  createValidationMiddleware({ query: schema })

/**
 * Validates only route parameters
 * @param schema - Zod schema for params validation
 */
export const validateParams = (schema: z.ZodSchema) => 
  createValidationMiddleware({ params: schema })

/**
 * Validates pagination query parameters
 */
export const validatePagination = () => 
  validateQuery(commonSchemas.pagination)

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

/**
 * Express error handling middleware for validation errors
 * Should be used after route handlers to catch ValidationError instances
 */
export const validationErrorHandler = (
  error: Error, 
  _req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  // Handle our custom ValidationError
  if (error instanceof ValidationError) {
    const apiError: APIErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.errors
      }
    }
    res.status(400).json(apiError)
    return
  }

  // Pass other errors to the next error handler
  next(error)
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  createValidationMiddleware,
  validateBody,
  validateQuery,
  validateParams,
  validatePagination,
  validationErrorHandler,
  commonSchemas,
  ValidationError
}

// backend\src\middleware\validationMiddleware.ts
// Version: 1.1.0
// Updated: Complete validation middleware implementation with proper exports for test compatibility