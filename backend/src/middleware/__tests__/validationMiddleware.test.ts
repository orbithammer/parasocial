// backend/src/middleware/__tests__/validationMiddleware.test.ts
// Version: 1.0.0
// Initial implementation: Comprehensive test suite for validation middleware

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import {
  ValidationError,
  createValidationMiddleware,
  validateBody,
  validateQuery,
  validateParams,
  validatePagination,
  validationErrorHandler,
  commonSchemas
} from '../validationMiddleware'

/**
 * Test setup helper to create clean mocks for each test
 */
interface TestMocks {
  mockReq: Partial<Request>
  mockRes: Partial<Response>
  mockNext: NextFunction & { mock: any }
  jsonSpy: MockedFunction<any>
  statusSpy: MockedFunction<any>
}

/**
 * Create fresh mocks for each test to ensure isolation
 */
function createTestMocks(): TestMocks {
  const jsonSpy = vi.fn()
  const statusSpy = vi.fn().mockReturnThis()
  
  const mockReq: Partial<Request> = {
    body: {},
    query: {},
    params: {}
  }
  
  const mockRes: Partial<Response> = {
    status: statusSpy,
    json: jsonSpy
  }
  
  const mockNext = vi.fn() as NextFunction & { mock: any }
  
  return {
    mockReq,
    mockRes,
    mockNext,
    jsonSpy,
    statusSpy
  }
}

describe('Validation Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ValidationError', () => {
    it('should create validation error with message and errors array', () => {
      const errors = [
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password too short' }
      ]
      
      const error = new ValidationError('Validation failed', errors)
      
      expect(error.name).toBe('ValidationError')
      expect(error.message).toBe('Validation failed')
      expect(error.errors).toEqual(errors)
      expect(error).toBeInstanceOf(Error)
    })

    it('should be properly identifiable as ValidationError instance', () => {
      const error = new ValidationError('Test error', [])
      
      expect(error instanceof ValidationError).toBe(true)
      expect(error instanceof Error).toBe(true)
    })
  })

  describe('createValidationMiddleware', () => {
    it('should validate request body successfully with valid data', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        name: z.string().min(1),
        age: z.number().min(0)
      })
      
      mockReq.body = { name: 'John', age: 25 }
      
      const middleware = createValidationMiddleware({ body: schema })
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should validate query parameters successfully with valid data', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        page: z.string().transform(Number).pipe(z.number().min(1)),
        limit: z.string().transform(Number).pipe(z.number().min(1).max(100))
      })
      
      mockReq.query = { page: '1', limit: '10' }
      
      const middleware = createValidationMiddleware({ query: schema })
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should validate route parameters successfully with valid data', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        id: z.string().min(1),
        userId: z.string().uuid()
      })
      
      mockReq.params = { 
        id: 'post123', 
        userId: '123e4567-e89b-12d3-a456-426614174000' 
      }
      
      const middleware = createValidationMiddleware({ params: schema })
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should fail validation with invalid body data', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        name: z.string().min(2),
        age: z.number().min(0)
      })
      
      mockReq.body = { name: 'A', age: -5 } // Invalid: name too short, age negative
      
      const middleware = createValidationMiddleware({ body: schema })
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should fail validation with missing required fields', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6)
      })
      
      mockReq.body = { email: 'test@example.com' } // Missing password
      
      const middleware = createValidationMiddleware({ body: schema })
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })

    it('should validate multiple request parts simultaneously', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const bodySchema = z.object({
        title: z.string().min(1)
      })
      
      const paramsSchema = z.object({
        id: z.string().min(1)
      })
      
      const querySchema = z.object({
        include: z.string().optional()
      })
      
      mockReq.body = { title: 'Test Post' }
      mockReq.params = { id: 'post123' }
      mockReq.query = { include: 'author' }
      
      const middleware = createValidationMiddleware({
        body: bodySchema,
        params: paramsSchema,
        query: querySchema
      })
      
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should handle empty request parts when no schema provided', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      // Only validate body, ignore params and query
      const schema = z.object({
        name: z.string()
      })
      
      mockReq.body = { name: 'Test' }
      mockReq.params = undefined
      mockReq.query = undefined
      
      const middleware = createValidationMiddleware({ body: schema })
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
    })
  })

  describe('validateBody', () => {
    it('should create middleware that validates only request body', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        username: z.string().min(3),
        email: z.string().email()
      })
      
      mockReq.body = { username: 'testuser', email: 'test@example.com' }
      
      const middleware = validateBody(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should fail when body validation fails', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        email: z.string().email()
      })
      
      mockReq.body = { email: 'invalid-email' }
      
      const middleware = validateBody(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })
  })

  describe('validateQuery', () => {
    it('should create middleware that validates only query parameters', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        search: z.string().optional(),
        category: z.enum(['tech', 'lifestyle', 'business'])
      })
      
      mockReq.query = { search: 'nodejs', category: 'tech' }
      
      const middleware = validateQuery(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should handle query string conversion correctly', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        page: z.string().transform(Number).pipe(z.number().min(1)),
        active: z.enum(['true', 'false']).transform(val => val === 'true')
      })
      
      mockReq.query = { page: '2', active: 'true' }
      
      const middleware = validateQuery(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
    })
  })

  describe('validateParams', () => {
    it('should create middleware that validates only route parameters', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        postId: z.string().min(1),
        commentId: z.string().min(1)
      })
      
      mockReq.params = { postId: 'post123', commentId: 'comment456' }
      
      const middleware = validateParams(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should validate UUID parameters correctly', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        userId: z.string().uuid()
      })
      
      mockReq.params = { userId: '123e4567-e89b-12d3-a456-426614174000' }
      
      const middleware = validateParams(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
    })
  })

  describe('validatePagination', () => {
    it('should validate standard pagination parameters', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      mockReq.query = { page: '1', limit: '20' }
      
      const middleware = validatePagination()
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should use default values for missing pagination parameters', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      mockReq.query = {} // No pagination parameters
      
      const middleware = validatePagination()
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
      expect(mockNext).toHaveBeenCalledWith() // Called without error
      
      // Check that default values were applied
      expect(mockReq.query).toEqual({ page: 1, limit: 10 })
    })

    it('should fail validation for invalid pagination values', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      mockReq.query = { page: '0', limit: '1000' } // Invalid: page 0, limit too high
      
      const middleware = validatePagination()
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
    })
  })

  describe('validationErrorHandler', () => {
    it('should handle ValidationError and return 400 status', () => {
      const { mockReq, mockRes, mockNext, jsonSpy, statusSpy } = createTestMocks()
      
      const errors = [
        { field: 'email', message: 'Invalid email format' }
      ]
      
      const validationError = new ValidationError('Validation failed', errors)
      
      validationErrorHandler(
        validationError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      )
      
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should pass non-ValidationError to next handler', () => {
      const { mockReq, mockRes, mockNext, jsonSpy, statusSpy } = createTestMocks()
      
      const regularError = new Error('Database connection failed')
      
      validationErrorHandler(
        regularError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      )
      
      expect(statusSpy).not.toHaveBeenCalled()
      expect(jsonSpy).not.toHaveBeenCalled()
      expect(mockNext).toHaveBeenCalledWith(regularError)
    })

    it('should handle ValidationError with empty errors array', () => {
      const { mockReq, mockRes, mockNext, jsonSpy, statusSpy } = createTestMocks()
      
      const validationError = new ValidationError('General validation error', [])
      
      validationErrorHandler(
        validationError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      )
      
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'General validation error',
          details: []
        }
      })
    })

    it('should handle ValidationError with multiple field errors', () => {
      const { mockReq, mockRes, mockNext, jsonSpy } = createTestMocks()
      
      const errors = [
        { field: 'username', message: 'Username is required' },
        { field: 'email', message: 'Invalid email format' },
        { field: 'password', message: 'Password must be at least 6 characters' }
      ]
      
      const validationError = new ValidationError('Multiple validation errors', errors)
      
      validationErrorHandler(
        validationError,
        mockReq as Request,
        mockRes as Response,
        mockNext
      )
      
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Multiple validation errors',
          details: errors
        }
      })
    })
  })

  describe('commonSchemas', () => {
    it('should have pagination schema that validates page and limit', () => {
      const validPagination = { page: '1', limit: '20' }
      
      const result = commonSchemas.pagination.safeParse(validPagination)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('should apply default values for pagination schema', () => {
      const emptyPagination = {}
      
      const result = commonSchemas.pagination.safeParse(emptyPagination)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10) // Default is 10, not 20
      }
    })

    it('should reject invalid pagination values', () => {
      const invalidPagination = { page: '0', limit: '1000' }
      
      const result = commonSchemas.pagination.safeParse(invalidPagination)
      
      expect(result.success).toBe(false)
    })
  })

  describe('Integration Tests', () => {
    it('should handle complex validation scenario with transformation', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        email: z.string().email().toLowerCase(),
        age: z.string().transform(Number).pipe(z.number().min(18)),
        interests: z.string().transform(str => str.split(',').map(s => s.trim())),
        newsletter: z.enum(['true', 'false']).transform(val => val === 'true')
      })
      
      mockReq.body = {
        email: 'TEST@EXAMPLE.COM',
        age: '25',
        interests: 'coding, reading, travel',
        newsletter: 'true'
      }
      
      const middleware = validateBody(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
      expect(mockNext).toHaveBeenCalledWith() // Called without error
      
      // Check transformations were applied
      expect(mockReq.body.email).toBe('test@example.com')
      expect(mockReq.body.age).toBe(25)
      expect(mockReq.body.interests).toEqual(['coding', 'reading', 'travel'])
      expect(mockReq.body.newsletter).toBe(true)
    })

    it('should provide detailed error information for debugging', () => {
      const { mockReq, mockRes, mockNext } = createTestMocks()
      
      const schema = z.object({
        username: z.string().min(3).max(20),
        email: z.string().email(),
        password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
        confirmPassword: z.string()
      }).refine(data => data.password === data.confirmPassword, {
        message: 'Passwords do not match',
        path: ['confirmPassword']
      })
      
      mockReq.body = {
        username: 'ab', // Too short
        email: 'invalid-email', // Invalid format
        password: 'weak', // Too short and weak
        confirmPassword: 'different' // Doesn't match password
      }
      
      const middleware = validateBody(schema)
      middleware(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
      
      // Get the ValidationError from the next() call
      const calledWithError = mockNext.mock.calls[0][0]
      expect(calledWithError).toBeInstanceOf(ValidationError)
      expect(calledWithError.errors.length).toBeGreaterThan(0)
    })
  })
})

// backend/src/middleware/__tests__/validationMiddleware.test.ts
// Version: 1.0.0
// Initial implementation: Comprehensive test suite for validation middleware