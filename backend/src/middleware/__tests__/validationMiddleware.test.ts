// backend\src\middleware\__tests__\validationMiddleware.test.ts
// Version: 1.1.0
// Updated: Fixed import syntax for createValidationMiddleware function

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { createValidationMiddleware, ValidationError, commonSchemas } from '../validationMiddleware'

/**
 * Test utilities for creating mock Express objects
 */
const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  body: {},
  query: {},
  params: {},
  ...overrides
})

const createMockResponse = (): Partial<Response> => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis()
})

const createMockNext = (): NextFunction => vi.fn()

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockReq = createMockRequest()
    mockRes = createMockResponse()
    mockNext = createMockNext()
    vi.clearAllMocks()
  })

  describe('createValidationMiddleware', () => {
    it('should pass validation when all schemas are valid', () => {
      // Arrange
      const bodySchema = z.object({
        name: z.string(),
        age: z.number()
      })
      
      const querySchema = z.object({
        page: z.string()
      })

      const paramsSchema = z.object({
        id: z.string()
      })

      mockReq.body = { name: 'John', age: 25 }
      mockReq.query = { page: '1' }
      mockReq.params = { id: 'test-id' }

      const middleware = createValidationMiddleware({
        body: bodySchema,
        query: querySchema,
        params: paramsSchema
      })

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalledWith()
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockReq.body).toEqual({ name: 'John', age: 25 })
      expect(mockReq.query).toEqual({ page: '1' })
      expect(mockReq.params).toEqual({ id: 'test-id' })
    })

    it('should validate only body when only body schema provided', () => {
      // Arrange
      const bodySchema = z.object({
        email: z.string().email()
      })

      mockReq.body = { email: 'test@example.com' }
      mockReq.query = { invalidParam: 'should-be-ignored' }

      const middleware = createValidationMiddleware({ body: bodySchema })

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalledWith()
      expect(mockReq.body).toEqual({ email: 'test@example.com' })
    })

    it('should validate only query when only query schema provided', () => {
      // Arrange
      const querySchema = z.object({
        limit: z.string().transform(Number)
      })

      mockReq.query = { limit: '10' }
      mockReq.body = { shouldBeIgnored: 'test' }

      const middleware = createValidationMiddleware({ query: querySchema })

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalledWith()
      expect(mockReq.query).toEqual({ limit: 10 })
    })

    it('should validate only params when only params schema provided', () => {
      // Arrange
      const paramsSchema = z.object({
        userId: z.string().uuid()
      })

      mockReq.params = { userId: '123e4567-e89b-12d3-a456-426614174000' }

      const middleware = createValidationMiddleware({ params: paramsSchema })

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalledWith()
      expect(mockReq.params).toEqual({ userId: '123e4567-e89b-12d3-a456-426614174000' })
    })
  })

  describe('ValidationError handling', () => {
    it('should call next with ValidationError for invalid body data', () => {
      // Arrange
      const bodySchema = z.object({
        name: z.string().min(2),
        age: z.number().min(0)
      })

      mockReq.body = { name: 'A', age: -5 }

      const middleware = createValidationMiddleware({ body: bodySchema })

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
      
      const error = mockNext.mock.calls[0][0] as ValidationError
      expect(error.statusCode).toBe(400)
      expect(error.errors).toHaveLength(2)
      expect(error.errors).toEqual([
        { field: 'name', message: 'String must contain at least 2 character(s)' },
        { field: 'age', message: 'Number must be greater than or equal to 0' }
      ])
    })

    it('should call next with ValidationError for invalid query data', () => {
      // Arrange
      const querySchema = z.object({
        page: z.string().transform(Number).pipe(z.number().min(1))
      })

      mockReq.query = { page: '0' }

      const middleware = createValidationMiddleware({ query: querySchema })

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
      
      const error = mockNext.mock.calls[0][0] as ValidationError
      expect(error.errors).toContainEqual({
        field: 'page',
        message: 'Number must be greater than or equal to 1'
      })
    })

    it('should call next with ValidationError for invalid params data', () => {
      // Arrange
      const paramsSchema = z.object({
        id: z.string().uuid()
      })

      mockReq.params = { id: 'invalid-uuid' }

      const middleware = createValidationMiddleware({ params: paramsSchema })

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
      
      const error = mockNext.mock.calls[0][0] as ValidationError
      expect(error.errors).toContainEqual({
        field: 'id',
        message: 'Invalid uuid'
      })
    })

    it('should handle nested object validation errors correctly', () => {
      // Arrange
      const bodySchema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1)
          })
        })
      })

      mockReq.body = { user: { profile: { name: '' } } }

      const middleware = createValidationMiddleware({ body: bodySchema })

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
      
      const error = mockNext.mock.calls[0][0] as ValidationError
      expect(error.errors).toContainEqual({
        field: 'user.profile.name',
        message: 'String must contain at least 1 character(s)'
      })
    })

    it('should handle non-Zod errors by passing them through', () => {
      // Arrange
      const bodySchema = {
        parse: vi.fn(() => {
          throw new Error('Custom error')
        })
      } as unknown as z.ZodSchema

      const middleware = createValidationMiddleware({ body: bodySchema })

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
      expect(mockNext.mock.calls[0][0]).not.toBeInstanceOf(ValidationError)
    })
  })

  describe('ValidationError class', () => {
    it('should create ValidationError with correct properties', () => {
      // Arrange
      const errors = [
        { field: 'name', message: 'Name is required' },
        { field: 'email', message: 'Invalid email format' }
      ]

      // Act
      const validationError = new ValidationError(errors)

      // Assert
      expect(validationError.name).toBe('ValidationError')
      expect(validationError.message).toBe('Validation failed')
      expect(validationError.statusCode).toBe(400)
      expect(validationError.errors).toEqual(errors)
      expect(validationError).toBeInstanceOf(Error)
    })
  })

  describe('commonSchemas', () => {
    it('should validate UUID in id schema', () => {
      // Arrange
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      const invalidUuid = 'not-a-uuid'

      // Act & Assert
      expect(() => commonSchemas.id.parse({ id: validUuid })).not.toThrow()
      expect(() => commonSchemas.id.parse({ id: invalidUuid })).toThrow()
    })

    it('should validate pagination schema with default values', () => {
      // Arrange & Act
      const result = commonSchemas.pagination.parse({})

      // Assert
      expect(result).toEqual({})
    })

    it('should validate pagination schema with valid values', () => {
      // Arrange & Act
      const result = commonSchemas.pagination.parse({ page: '2', limit: '50' })

      // Assert
      expect(result).toEqual({ page: 2, limit: 50 })
    })

    it('should reject invalid pagination values', () => {
      // Arrange & Act & Assert
      expect(() => commonSchemas.pagination.parse({ page: '0' })).toThrow()
      expect(() => commonSchemas.pagination.parse({ limit: '101' })).toThrow()
      expect(() => commonSchemas.pagination.parse({ page: '-1' })).toThrow()
    })
  })

  describe('Integration scenarios', () => {
    it('should handle multiple validation errors across different sections', () => {
      // Arrange
      const middleware = createValidationMiddleware({
        body: z.object({ name: z.string().min(2) }),
        query: z.object({ page: z.string().transform(Number).pipe(z.number().min(1)) }),
        params: z.object({ id: z.string().uuid() })
      })

      mockReq.body = { name: 'A' }
      mockReq.query = { page: '0' }
      mockReq.params = { id: 'invalid' }

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError))
      
      const error = mockNext.mock.calls[0][0] as ValidationError
      expect(error.errors).toHaveLength(1) // Only body validation runs first and fails
    })

    it('should transform data types correctly during validation', () => {
      // Arrange
      const middleware = createValidationMiddleware({
        query: z.object({
          page: z.string().transform(Number),
          active: z.string().transform(val => val === 'true')
        })
      })

      mockReq.query = { page: '5', active: 'true' }

      // Act
      middleware(mockReq as Request, mockRes as Response, mockNext)

      // Assert
      expect(mockNext).toHaveBeenCalledWith()
      expect(mockReq.query).toEqual({ page: 5, active: true })
    })
  })
})

// backend\src\middleware\__tests__\validationMiddleware.test.ts
// Version: 1.1.0
// Updated: Fixed import syntax for createValidationMiddleware function