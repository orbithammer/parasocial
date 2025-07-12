// backend/tests/middleware/postValidationMiddleware.test.ts
// Version: 1.0
// Comprehensive tests for post validation middleware
// 
// IMPORTANT: Make sure the following file exists first:
// backend/src/middleware/postValidationMiddleware.ts
//
// If you get import errors, check:
// 1. File exists at the correct path
// 2. TypeScript compilation is working
// 3. All dependencies (zod) are installed

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'

// Import validation middleware functions
// Adjust path if your project structure is different
import {
  validateCreatePost,
  validateUpdatePost,
  validatePostQuery,
  validatePostId
} from '../postValidationMiddleware'

describe('Post Validation Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let jsonSpy: any
  let statusSpy: any

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Create fresh mock objects for each test
    jsonSpy = vi.fn()
    statusSpy = vi.fn().mockReturnThis()
    
    mockReq = {
      body: {},
      query: {},
      params: {}
    }
    
    mockRes = {
      status: statusSpy,
      json: jsonSpy
    }
    
    mockNext = vi.fn()
  })

  describe('validateCreatePost', () => {
    describe('Valid Post Creation', () => {
      it('should pass validation with minimal valid data', () => {
        // Arrange - Set up valid minimal post data
        mockReq.body = {
          content: 'This is a valid post content'
        }

        // Act - Call the validation middleware
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Should call next() and not send error response
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
        expect(jsonSpy).not.toHaveBeenCalled()
      })

      it('should pass validation with all optional fields', () => {
        // Arrange - Set up post data with all optional fields
        mockReq.body = {
          content: 'This is a comprehensive post with all fields',
          contentWarning: 'Contains sensitive content',
          isScheduled: true,
          scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          isPublished: false
        }

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
      })

      it('should pass validation with empty content warning', () => {
        // Arrange - Test empty content warning handling
        mockReq.body = {
          content: 'Post with empty content warning',
          contentWarning: ''
        }

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should apply default values correctly', () => {
        // Arrange - Test that defaults are applied
        mockReq.body = {
          content: 'Post with defaults'
        }

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Check that defaults were applied
        expect(mockNext).toHaveBeenCalledOnce()
        expect(mockReq.body.isScheduled).toBe(false)
        expect(mockReq.body.isPublished).toBe(true)
      })
    })

    describe('Invalid Post Creation', () => {
      it('should reject empty content', () => {
        // Arrange - Empty content should fail
        mockReq.body = {
          content: ''
        }

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Should return validation error
        expect(mockNext).not.toHaveBeenCalled()
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid post data',
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'content',
                message: 'Post content cannot be empty'
              })
            ])
          }
        })
      })

      it('should reject content that is too long', () => {
        // Arrange - Content exceeding character limit
        mockReq.body = {
          content: 'x'.repeat(2001) // Exceeds 2000 character limit
        }

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid post data',
            details: expect.arrayContaining([
              expect.objectContaining({
                field: 'content',
                message: 'Post content must be less than 2000 characters'
              })
            ])
          }
        })
      })

      it('should reject content warning that is too long', () => {
        // Arrange - Content warning exceeding limit
        mockReq.body = {
          content: 'Valid content',
          contentWarning: 'x'.repeat(201) // Exceeds 200 character limit
        }

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'contentWarning',
                  message: 'Content warning must be less than 200 characters'
                })
              ])
            })
          })
        )
      })

      it('should reject scheduled post without scheduled date', () => {
        // Arrange - Scheduled post missing scheduledFor
        mockReq.body = {
          content: 'Scheduled post',
          isScheduled: true
          // Missing scheduledFor
        }

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'scheduledFor',
                  message: 'Scheduled posts must have a future date'
                })
              ])
            })
          })
        )
      })

      it('should reject scheduled date in the past', () => {
        // Arrange - Scheduled date in the past
        mockReq.body = {
          content: 'Past scheduled post',
          isScheduled: true,
          scheduledFor: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        }

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'scheduledFor',
                  message: 'Scheduled posts must have a future date'
                })
              ])
            })
          })
        )
      })

      it('should reject invalid datetime format', () => {
        // Arrange - Invalid datetime format
        mockReq.body = {
          content: 'Post with invalid date',
          scheduledFor: 'not-a-valid-date'
        }

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'scheduledFor',
                  message: 'Invalid scheduled date format'
                })
              ])
            })
          })
        )
      })

      it('should handle multiple validation errors', () => {
        // Arrange - Multiple validation failures
        mockReq.body = {
          content: '', // Empty content
          contentWarning: 'x'.repeat(201), // Too long warning
          scheduledFor: 'invalid-date' // Invalid date
        }

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Should return multiple errors
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'VALIDATION_ERROR',
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'content'
                }),
                expect.objectContaining({
                  field: 'contentWarning'
                }),
                expect.objectContaining({
                  field: 'scheduledFor'
                })
              ])
            })
          })
        )
      })
    })

    describe('Edge Cases', () => {
      it('should handle missing request body', () => {
        // Arrange - No body provided
        mockReq.body = undefined

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Should handle gracefully
        expect(statusSpy).toHaveBeenCalledWith(400)
      })

      it('should trim content whitespace', () => {
        // Arrange - Content with leading/trailing whitespace
        mockReq.body = {
          content: '   This content has whitespace   '
        }

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Should pass and trim content
        expect(mockNext).toHaveBeenCalledOnce()
        expect(mockReq.body.content).toBe('This content has whitespace')
      })

      it('should handle non-string content types', () => {
        // Arrange - Non-string content
        mockReq.body = {
          content: 123 // Number instead of string
        }

        // Act
        validateCreatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Should reject with type error
        expect(statusSpy).toHaveBeenCalledWith(400)
      })
    })
  })

  describe('validateUpdatePost', () => {
    describe('Valid Post Updates', () => {
      it('should pass validation with partial update data', () => {
        // Arrange - Only updating content
        mockReq.body = {
          content: 'Updated post content'
        }

        // Act
        validateUpdatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
      })

      it('should pass validation with all updatable fields', () => {
        // Arrange - Update all allowed fields
        mockReq.body = {
          content: 'Updated content',
          contentWarning: 'Updated warning',
          isPublished: false
        }

        // Act
        validateUpdatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should pass validation with empty body', () => {
        // Arrange - Empty update (no changes)
        mockReq.body = {}

        // Act
        validateUpdatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Should allow empty updates
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })

    describe('Invalid Post Updates', () => {
      it('should reject empty content when provided', () => {
        // Arrange - Empty content in update
        mockReq.body = {
          content: ''
        }

        // Act
        validateUpdatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'content',
                  message: 'Post content cannot be empty'
                })
              ])
            })
          })
        )
      })

      it('should reject content that is too long', () => {
        // Arrange - Content exceeding limit in update
        mockReq.body = {
          content: 'x'.repeat(2001)
        }

        // Act
        validateUpdatePost(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
      })
    })
  })

  describe('validatePostQuery', () => {
    describe('Valid Query Parameters', () => {
      it('should pass validation with default parameters', () => {
        // Arrange - Empty query (should use defaults)
        mockReq.query = {}

        // Act
        validatePostQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(mockReq.query.page).toBe(1)
        expect(mockReq.query.limit).toBe(20)
      })

      it('should pass validation with valid page and limit', () => {
        // Arrange - Valid pagination parameters
        mockReq.query = {
          page: '5',
          limit: '50'
        }

        // Act
        validatePostQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(mockReq.query.page).toBe(5)
        expect(mockReq.query.limit).toBe(50)
      })

      it('should pass validation with userId filter', () => {
        // Arrange - Query with user filter
        mockReq.query = {
          userId: 'user123'
        }

        // Act
        validatePostQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })

    describe('Invalid Query Parameters', () => {
      it('should reject page number that is too high', () => {
        // Arrange - Page number exceeding limit
        mockReq.query = {
          page: '1001' // Exceeds maximum of 1000
        }

        // Act
        validatePostQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
      })

      it('should reject negative page number', () => {
        // Arrange - Negative page number
        mockReq.query = {
          page: '-1'
        }

        // Act
        validatePostQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
      })

      it('should reject limit that is too high', () => {
        // Arrange - Limit exceeding maximum
        mockReq.query = {
          limit: '101' // Exceeds maximum of 100
        }

        // Act
        validatePostQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
      })

      it('should reject zero limit', () => {
        // Arrange - Zero limit
        mockReq.query = {
          limit: '0'
        }

        // Act
        validatePostQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
      })
    })
  })

  describe('validatePostId', () => {
    describe('Valid Post IDs', () => {
      it('should pass validation with valid post ID', () => {
        // Arrange - Valid post ID
        mockReq.params = {
          id: 'post123'
        }

        // Act
        validatePostId(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should pass validation with alphanumeric ID', () => {
        // Arrange - Alphanumeric ID
        mockReq.params = {
          id: 'post123abc'
        }

        // Act
        validatePostId(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })

    describe('Invalid Post IDs', () => {
      it('should reject empty post ID', () => {
        // Arrange - Empty ID
        mockReq.params = {
          id: ''
        }

        // Act
        validatePostId(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'id',
                  message: 'Post ID is required'
                })
              ])
            })
          })
        )
      })

      it('should reject missing post ID', () => {
        // Arrange - Missing ID parameter
        mockReq.params = {}

        // Act
        validatePostId(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
      })

      it('should reject ID that is too long', () => {
        // Arrange - ID exceeding length limit
        mockReq.params = {
          id: 'x'.repeat(256) // Exceeds 255 character limit
        }

        // Act
        validatePostId(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', () => {
      // Arrange - Force an internal error by corrupting the schema
      const originalConsoleError = console.error
      console.error = vi.fn() // Suppress error logging during test
      
      // Mock Zod to throw a non-ZodError
      const mockReqWithCorruptedBody = {
        body: {
          get content() {
            throw new Error('Simulated internal error')
          }
        }
      }

      // Act
      validateCreatePost(mockReqWithCorruptedBody as Request, mockRes as Response, mockNext)

      // Assert - Should handle internal errors
      expect(statusSpy).toHaveBeenCalledWith(500)
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during validation'
        }
      })

      // Cleanup
      console.error = originalConsoleError
    })
  })
})