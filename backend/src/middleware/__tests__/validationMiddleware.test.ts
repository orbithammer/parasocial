// backend/src/middleware/__tests__/validationMiddleware.test.ts
// Version: 1.1.1
// Fixed import to use actual validation middleware implementation

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import { createValidationMiddleware } from '../validationMiddleware'
import type { Request, Response, NextFunction } from 'express'

describe('validationMiddleware', () => {
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction
  let statusSpy: ReturnType<typeof vi.fn>
  let jsonSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Create fresh mock objects for each test
    statusSpy = vi.fn().mockReturnThis()
    jsonSpy = vi.fn().mockReturnThis()
    
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

  describe('body validation (default source)', () => {
    it('should call next() when validation passes', () => {
      // Arrange: Valid schema and data
      const schema = z.object({
        username: z.string().min(3),
        email: z.string().email(),
        age: z.number().min(18)
      })
      
      mockRequest.body = {
        username: 'testuser',
        email: 'test@example.com',
        age: 25
      }

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should call next() without any response
      expect(mockNext).toHaveBeenCalledOnce()
      expect(statusSpy).not.toHaveBeenCalled()
      expect(jsonSpy).not.toHaveBeenCalled()
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

      // Assert: Should return 400 error with exact validation details
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [
            {
              field: 'username',
              message: 'String must contain at least 3 character(s)'
            },
            {
              field: 'email',
              message: 'Invalid email'
            }
          ]
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

    it('should handle transformation and validation', () => {
      // Arrange: Schema with transformation
      const schema = z.object({
        age: z.string().transform(val => parseInt(val, 10)).refine(val => val >= 18, 'Must be 18 or older'),
        active: z.string().transform(val => val === 'true').optional()
      })
      
      mockRequest.body = {
        age: '25',
        active: 'true'
      }

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should transform data and call next()
      expect(mockRequest.body).toEqual({
        age: 25,
        active: true
      })
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should handle complex nested object validation', () => {
      // Arrange: Complex nested schema
      const schema = z.object({
        user: z.object({
          profile: z.object({
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            settings: z.object({
              privacy: z.enum(['public', 'private']),
              notifications: z.boolean()
            })
          })
        })
      })
      
      mockRequest.body = {
        user: {
          profile: {
            firstName: 'John',
            lastName: 'Doe',
            settings: {
              privacy: 'public',
              notifications: true
            }
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

  describe('error handling', () => {
    it('should handle validation errors gracefully', () => {
      // Arrange: Schema that will definitely fail
      const schema = z.object({
        required: z.string().min(10, 'Must be at least 10 characters')
      })
      
      mockRequest.body = {
        required: 'short'
      }

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should return structured error response
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [
            {
              field: 'required',
              message: 'Must be at least 10 characters'
            }
          ]
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle unknown validation errors', () => {
      // Arrange: Malformed request to trigger edge case
      const schema = z.object({
        data: z.string()
      })
      
      // Simulate a request with null/undefined body
      mockRequest.body = null

      const middleware = createValidationMiddleware(schema)

      // Act: Call the validation middleware
      middleware(mockRequest as Request, mockResponse as Response, mockNext)

      // Assert: Should handle gracefully
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      )
    })
  })
})

// backend/src/middleware/__tests__/validationMiddleware.test.ts