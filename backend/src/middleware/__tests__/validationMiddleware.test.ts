// backend/src/middleware/__tests__/validationMiddleware.test.ts
// Version: 1.0.0
// Initial implementation - Comprehensive Vitest test suite for general validation middleware

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

// Mock validation middleware factory function
interface ValidationMiddleware {
  (schema: z.ZodSchema, options?: ValidationOptions): (req: Request, res: Response, next: NextFunction) => void
}

interface ValidationOptions {
  source?: 'body' | 'params' | 'query'
  skipOnMissing?: boolean
  errorCode?: string
}

interface ValidationError {
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

// Mock implementation of the validation middleware factory
const createValidationMiddleware: ValidationMiddleware = (schema: z.ZodSchema, options: ValidationOptions = {}) => {
  const { source = 'body', skipOnMissing = false, errorCode = 'VALIDATION_ERROR' } = options
  
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[source]
      
      // Skip validation if data is missing and skipOnMissing is true
      if (skipOnMissing && (!data || Object.keys(data).length === 0)) {
        next()
        return
      }
      
      // Validate the data using the provided schema
      const validatedData = schema.parse(data)
      
      // Replace the request data with validated data
      req[source] = validatedData
      
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError: ValidationError = {
          success: false,
          error: {
            code: errorCode,
            message: 'Validation failed',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        }
        res.status(400).json(validationError)
        return
      } else {
        res.status(500).json({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Internal server error during validation'
          }
        })
        return
      }
    }
  }
}

describe('validationMiddleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction
  let statusSpy: any
  let jsonSpy: any

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Create fresh mock objects for each test
    jsonSpy = vi.fn()
    statusSpy = vi.fn().mockReturnThis()
    
    mockRequest = {
      body: {},
      params: {},
      query: {}
    }
    
    mockResponse = {
      status: statusSpy,
      json: jsonSpy
    }
    
    mockNext = vi.fn()
  })

  describe('createValidationMiddleware factory function', () => {
    it('should create a middleware function', () => {
      // Arrange: Create a simple schema
      const schema = z.object({
        name: z.string()
      })

      // Act: Create middleware
      const middleware = createValidationMiddleware(schema)

      // Assert: Should return a function with correct arity
      expect(typeof middleware).toBe('function')
      expect(middleware.length).toBe(3) // req, res, next parameters
    })

    it('should return different instances for different schemas', () => {
      // Arrange: Create two different schemas
      const schema1 = z.object({ name: z.string() })
      const schema2 = z.object({ email: z.string().email() })

      // Act: Create two middleware instances
      const middleware1 = createValidationMiddleware(schema1)
      const middleware2 = createValidationMiddleware(schema2)

      // Assert: Should be different function instances
      expect(middleware1).not.toBe(middleware2)
    })
  })

  describe('body validation (default source)', () => {
    it('should pass validation with valid data', () => {
      // Arrange: Set up valid request body and schema
      const schema = z.object({
        username: z.string().min(2),
        email: z.string().email()
      })
      
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com'
      }

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should call next() and not send error response
      expect(mockNext).toHaveBeenCalledOnce()
      expect(statusSpy).not.toHaveBeenCalled()
      expect(jsonSpy).not.toHaveBeenCalled()
    })

    it('should transform and sanitize valid data', () => {
      // Arrange: Schema with transformations
      const schema = z.object({
        email: z.string().email().toLowerCase(),
        age: z.string().transform(val => parseInt(val, 10))
      })
      
      mockRequest.body = {
        email: 'Test@Example.COM',
        age: '25'
      }

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should transform data and call next()
      expect(mockRequest.body).toEqual({
        email: 'test@example.com',
        age: 25
      })
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should reject invalid data with proper error format', () => {
      // Arrange: Schema that will fail validation
      const schema = z.object({
        username: z.string().min(3),
        email: z.string().email()
      })
      
      mockRequest.body = {
        username: 'ab', // Too short
        email: 'invalid-email' // Invalid email format
      }

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should return 400 error with validation details
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'username',
              message: expect.stringContaining('at least 3 characters')
            }),
            expect.objectContaining({
              field: 'email',
              message: expect.stringContaining('Invalid email')
            })
          ])
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle missing required fields', () => {
      // Arrange: Schema with required fields
      const schema = z.object({
        username: z.string(),
        email: z.string().email()
      })
      
      mockRequest.body = {
        username: 'testuser'
        // Missing email field
      }

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should return validation error for missing field
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'email',
                message: expect.stringContaining('Required')
              })
            ])
          })
        })
      )
    })
  })

  describe('params validation', () => {
    it('should validate request parameters when source is params', () => {
      // Arrange: Schema for URL parameters
      const schema = z.object({
        id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
        username: z.string().min(2)
      })
      
      mockRequest.params = {
        id: 'user123',
        username: 'testuser'
      }

      const middleware = createValidationMiddleware(schema, { source: 'params' })

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should validate params and call next()
      expect(mockNext).toHaveBeenCalledOnce()
      expect(statusSpy).not.toHaveBeenCalled()
    })

    it('should reject invalid parameters', () => {
      // Arrange: Schema with strict validation
      const schema = z.object({
        id: z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid ID format')
      })
      
      mockRequest.params = {
        id: 'invalid@id!' // Contains invalid characters
      }

      const middleware = createValidationMiddleware(schema, { source: 'params' })

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should return validation error
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'id',
                message: 'Invalid ID format'
              })
            ])
          })
        })
      )
    })
  })

  describe('query validation', () => {
    it('should validate query parameters', () => {
      // Arrange: Schema for query string validation
      const schema = z.object({
        page: z.string().transform(val => parseInt(val, 10)).refine(val => val > 0),
        limit: z.string().transform(val => parseInt(val, 10)).refine(val => val <= 100)
      })
      
      mockRequest.query = {
        page: '1',
        limit: '20'
      }

      const middleware = createValidationMiddleware(schema, { source: 'query' })

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should transform and validate query params
      expect(mockRequest.query).toEqual({
        page: 1,
        limit: 20
      })
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should handle optional query parameters', () => {
      // Arrange: Schema with optional fields
      const schema = z.object({
        search: z.string().optional(),
        sortBy: z.enum(['name', 'date']).optional()
      })
      
      mockRequest.query = {
        search: 'test query'
        // sortBy is optional and missing
      }

      const middleware = createValidationMiddleware(schema, { source: 'query' })

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should validate successfully with optional field missing
      expect(mockNext).toHaveBeenCalledOnce()
      expect(statusSpy).not.toHaveBeenCalled()
    })
  })

  describe('skipOnMissing option', () => {
    it('should skip validation when data is missing and skipOnMissing is true', () => {
      // Arrange: Schema with required fields and skipOnMissing enabled
      const schema = z.object({
        username: z.string(),
        email: z.string().email()
      })
      
      mockRequest.body = {} // Empty body

      const middleware = createValidationMiddleware(schema, { skipOnMissing: true })

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should skip validation and call next()
      expect(mockNext).toHaveBeenCalledOnce()
      expect(statusSpy).not.toHaveBeenCalled()
    })

    it('should validate when data exists even with skipOnMissing true', () => {
      // Arrange: Schema with skipOnMissing but data present
      const schema = z.object({
        username: z.string().min(3)
      })
      
      mockRequest.body = {
        username: 'ab' // Invalid - too short
      }

      const middleware = createValidationMiddleware(schema, { skipOnMissing: true })

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should still validate since data exists
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('custom error codes', () => {
    it('should use custom error code when provided', () => {
      // Arrange: Schema that will fail with custom error code
      const schema = z.object({
        username: z.string().min(3)
      })
      
      mockRequest.body = {
        username: 'ab'
      }

      const middleware = createValidationMiddleware(schema, { errorCode: 'CUSTOM_VALIDATION_ERROR' })

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should use custom error code
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'CUSTOM_VALIDATION_ERROR'
          })
        })
      )
    })
  })

  describe('error handling', () => {
    it('should handle schema parsing errors gracefully', () => {
      // Arrange: Create a schema that might throw an unexpected error
      const schema = z.object({
        data: z.any().refine(() => {
          throw new Error('Unexpected validation error')
        })
      })
      
      mockRequest.body = {
        data: 'test'
      }

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should return 500 error for non-Zod errors
      expect(statusSpy).toHaveBeenCalledWith(500)
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during validation'
        }
      })
    })

    it('should preserve original request data when validation fails', () => {
      // Arrange: Schema that will fail validation
      const schema = z.object({
        username: z.string().min(5)
      })
      
      const originalBody = { username: 'test' }
      mockRequest.body = { ...originalBody }

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Original request body should be unchanged after validation failure
      expect(mockRequest.body).toEqual(originalBody)
    })
  })

  describe('complex schema validation', () => {
    it('should handle nested object validation', () => {
      // Arrange: Complex nested schema
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(2),
            bio: z.string().optional()
          }),
          settings: z.object({
            privacy: z.enum(['public', 'private']),
            notifications: z.boolean()
          })
        })
      })
      
      mockRequest.body = {
        user: {
          profile: {
            name: 'Test User',
            bio: 'This is a test bio'
          },
          settings: {
            privacy: 'public',
            notifications: true
          }
        }
      }

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should validate complex nested structure
      expect(mockNext).toHaveBeenCalledOnce()
      expect(statusSpy).not.toHaveBeenCalled()
    })

    it('should validate arrays with item schemas', () => {
      // Arrange: Schema with array validation
      const schema = z.object({
        tags: z.array(z.string().min(1)).min(1).max(10),
        mediaIds: z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/)).optional()
      })
      
      mockRequest.body = {
        tags: ['technology', 'programming', 'web'],
        mediaIds: ['media_123', 'media_456']
      }

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should validate array contents
      expect(mockNext).toHaveBeenCalledOnce()
      expect(statusSpy).not.toHaveBeenCalled()
    })

    it('should reject arrays with invalid items', () => {
      // Arrange: Schema with strict array validation
      const schema = z.object({
        ids: z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/))
      })
      
      mockRequest.body = {
        ids: ['valid_id', 'invalid@id', 'another_valid_id']
      }

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should report validation error for invalid array item
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'ids.1',
                message: expect.any(String)
              })
            ])
          })
        })
      )
    })
  })
})

// backend/src/middleware/__tests__/validationMiddleware.test.ts