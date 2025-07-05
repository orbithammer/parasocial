// backend/src/middleware/__tests__/globalError.test.ts
// Comprehensive unit tests for global error handling middleware and utilities
// Version: 1.0.7 - Fixed TypeScript error with proper type assertion (as unknown as MockResponse)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { ZodError, ZodIssue } from 'zod'
import { MulterError } from 'multer'
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  sendSuccess,
  sendError
} from '../globalError'

// ============================================================================
// TEST UTILITIES AND MOCKS
// ============================================================================

/**
 * Interface for mock response with access to mock functions
 * Extends Express Response with references to the original Vitest mocks
 */
interface MockResponse extends Response {
  statusMock: ReturnType<typeof vi.fn>
  jsonMock: ReturnType<typeof vi.fn>
}

/**
 * Create mock Express request object with common properties
 * Allows testing different request scenarios
 */
function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    method: 'GET',
    path: '/test',
    ip: '127.0.0.1',
    get: vi.fn((header: string) => {
      if (header === 'User-Agent') return 'test-user-agent'
      if (header === 'set-cookie') return undefined as string[] | undefined
      return undefined as string | undefined
    }) as any,
    ...overrides
  }
}

/**
 * Create mock Express response object with spy functions
 * Tracks status codes and JSON responses for assertions
 */
function createMockResponse(): MockResponse {
  const statusMock = vi.fn().mockReturnThis()
  const jsonMock = vi.fn().mockReturnThis()
  
  const mockResponse = {
    status: statusMock,
    json: jsonMock,
    send: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    req: createMockRequest(),
    // Add minimal required properties to satisfy Express Response interface
    locals: {},
    headersSent: false,
    // Mock other commonly used methods
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    render: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    get: vi.fn(),
    type: vi.fn().mockReturnThis(),
    vary: vi.fn().mockReturnThis(),
    // Add placeholder methods for other Response methods
    sendFile: vi.fn(),
    download: vi.fn(),
    attachment: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    links: vi.fn().mockReturnThis(),
    location: vi.fn().mockReturnThis(),
    jsonp: vi.fn().mockReturnThis(),
    format: vi.fn().mockReturnThis(),
    // Keep references to mocks for testing
    statusMock,
    jsonMock
  }

  return mockResponse as unknown as MockResponse
}

/**
 * Create mock next function for middleware testing
 */
function createMockNext(): NextFunction {
  return vi.fn()
}

/**
 * Spy on console methods to verify logging behavior
 * Prevents actual console output during tests
 */
function mockConsole() {
  const originalWarn = console.warn
  const originalError = console.error
  
  console.warn = vi.fn()
  console.error = vi.fn()
  
  return {
    warn: console.warn as ReturnType<typeof vi.fn>,
    error: console.error as ReturnType<typeof vi.fn>,
    restore: () => {
      console.warn = originalWarn
      console.error = originalError
    }
  }
}

// ============================================================================
// CUSTOM ERROR CLASSES TESTS
// ============================================================================

describe('Custom Error Classes', () => {
  
  describe('AppError', () => {
    it('should create AppError with default values', () => {
      const error = new AppError('Test error')
      
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(500)
      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.isOperational).toBe(true)
      expect(error.name).toBe('Error')
      expect(error.stack).toBeDefined()
    })

    it('should create AppError with custom values', () => {
      const error = new AppError('Custom error', 400, 'CUSTOM_CODE')
      
      expect(error.message).toBe('Custom error')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('CUSTOM_CODE')
      expect(error.isOperational).toBe(true)
    })

    it('should maintain proper prototype chain', () => {
      const error = new AppError('Test error')
      
      expect(error instanceof Error).toBe(true)
      expect(error instanceof AppError).toBe(true)
    })
  })

  describe('ValidationError', () => {
    it('should create ValidationError with correct defaults', () => {
      const error = new ValidationError('Validation failed')
      
      expect(error.message).toBe('Validation failed')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.validationErrors).toBeNull()
    })

    it('should store validation errors when provided', () => {
      const validationErrors = { field: 'email', message: 'Invalid format' }
      const error = new ValidationError('Validation failed', validationErrors)
      
      expect(error.validationErrors).toEqual(validationErrors)
    })
  })

  describe('AuthenticationError', () => {
    it('should create AuthenticationError with default message', () => {
      const error = new AuthenticationError()
      
      expect(error.message).toBe('Authentication required')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('UNAUTHORIZED')
    })

    it('should create AuthenticationError with custom message', () => {
      const error = new AuthenticationError('Token expired')
      
      expect(error.message).toBe('Token expired')
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('AuthorizationError', () => {
    it('should create AuthorizationError with correct properties', () => {
      const error = new AuthorizationError('Access denied')
      
      expect(error.message).toBe('Access denied')
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('FORBIDDEN')
    })
  })

  describe('NotFoundError', () => {
    it('should create NotFoundError with correct properties', () => {
      const error = new NotFoundError('User not found')
      
      expect(error.message).toBe('User not found')
      expect(error.statusCode).toBe(404)
      expect(error.code).toBe('NOT_FOUND')
    })
  })

  describe('RateLimitError', () => {
    it('should create RateLimitError with correct properties', () => {
      const error = new RateLimitError('Too many requests')
      
      expect(error.message).toBe('Too many requests')
      expect(error.statusCode).toBe(429)
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED')
    })
  })
})

// ============================================================================
// GLOBAL ERROR HANDLER TESTS
// ============================================================================

describe('Global Error Handler', () => {
  let consoleMock: ReturnType<typeof mockConsole>

  beforeEach(() => {
    consoleMock = mockConsole()
  })

  afterEach(() => {
    consoleMock.restore()
    vi.clearAllMocks()
  })

  describe('Custom Application Errors', () => {
    it('should handle AppError correctly', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse()
      const next = createMockNext()
      const error = new AppError('Test error', 400, 'TEST_ERROR')

      globalErrorHandler(error, req, res, next)

      expect(res.statusMock).toHaveBeenCalledWith(400)
      expect(res.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Test error',
          code: 'TEST_ERROR',
          method: 'GET',
          path: '/test'
        })
      )
    })

    it('should handle ValidationError with validation details', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse()
      const next = createMockNext()
      const validationErrors = { field: 'email', message: 'Invalid' }
      const error = new ValidationError('Validation failed', validationErrors)

      globalErrorHandler(error, req, res, next)

      expect(res.statusMock).toHaveBeenCalledWith(400)
      expect(res.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationErrors
        })
      )
    })

    it('should handle AuthenticationError', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse()
      const next = createMockNext()
      const error = new AuthenticationError('Invalid token')

      globalErrorHandler(error, req, res, next)

      expect(res.statusMock).toHaveBeenCalledWith(401)
      expect(res.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid token',
          code: 'UNAUTHORIZED'
        })
      )
    })
  })

  describe('Zod Validation Errors', () => {
    it('should handle ZodError with field details', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      
      // Create mock Zod error
      const zodIssues: ZodIssue[] = [
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number'
        },
        {
          code: 'too_small',
          minimum: 8,
          type: 'string',
          inclusive: true,
          exact: false,
          path: ['password'],
          message: 'String must contain at least 8 character(s)'
        }
      ]
      
      const zodError = new ZodError(zodIssues)

      globalErrorHandler(zodError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Input validation failed',
          code: 'VALIDATION_ERROR',
          details: expect.objectContaining({
            field_errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'email',
                message: 'Expected string, received number'
              }),
              expect.objectContaining({
                field: 'password',
                message: 'String must contain at least 8 character(s)'
              })
            ])
          })
        })
      )
    })
  })

  describe('Multer Upload Errors', () => {
    it('should handle LIMIT_FILE_SIZE error', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const multerError = new MulterError('LIMIT_FILE_SIZE', 'image')

      globalErrorHandler(multerError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'File size exceeds maximum allowed limit',
          code: 'FILE_TOO_LARGE'
        })
      )
    })

    it('should handle LIMIT_FILE_COUNT error', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const multerError = new MulterError('LIMIT_FILE_COUNT', 'files')

      globalErrorHandler(multerError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Too many files uploaded',
          code: 'TOO_MANY_FILES'
        })
      )
    })

    it('should handle LIMIT_UNEXPECTED_FILE error', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const multerError = new MulterError('LIMIT_UNEXPECTED_FILE', 'avatar')

      globalErrorHandler(multerError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unexpected file field',
          code: 'UNEXPECTED_FILE'
        })
      )
    })

    it('should handle LIMIT_PART_COUNT error', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const multerError = new MulterError('LIMIT_PART_COUNT', 'form')

      globalErrorHandler(multerError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Too many form parts uploaded',
          code: 'TOO_MANY_PARTS'
        })
      )
    })

    it('should handle LIMIT_FIELD_COUNT error', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const multerError = new MulterError('LIMIT_FIELD_COUNT', 'fields')

      globalErrorHandler(multerError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Too many form fields',
          code: 'TOO_MANY_FIELDS'
        })
      )
    })
  })

  describe('JWT Token Errors', () => {
    it('should handle JsonWebTokenError', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const jwtError = new Error('Invalid token')
      jwtError.name = 'JsonWebTokenError'

      globalErrorHandler(jwtError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid authentication token',
          code: 'INVALID_TOKEN'
        })
      )
    })

    it('should handle TokenExpiredError', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const jwtError = new Error('Token expired')
      jwtError.name = 'TokenExpiredError'

      globalErrorHandler(jwtError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Authentication token has expired',
          code: 'TOKEN_EXPIRED'
        })
      )
    })
  })

  describe('Database Errors', () => {
    it('should handle Prisma unique constraint violation', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const dbError = new Error('Unique constraint failed')
      ;(dbError as any).code = 'P2002'

      globalErrorHandler(dbError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(409)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'A record with this information already exists',
          code: 'DUPLICATE_ENTRY'
        })
      )
    })

    it('should handle Prisma record not found', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const dbError = new Error('Record not found')
      ;(dbError as any).code = 'P2025'

      globalErrorHandler(dbError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'The requested record was not found',
          code: 'NOT_FOUND'
        })
      )
    })

    it('should handle Prisma connection error', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const dbError = new Error('Connection failed')
      ;(dbError as any).code = 'P1001'

      globalErrorHandler(dbError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(503)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Database connection failed',
          code: 'DATABASE_UNAVAILABLE'
        })
      )
    })
  })

  describe('Unknown Errors', () => {
    it('should handle unknown errors with generic response', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const unknownError = new Error('Something went wrong')

      globalErrorHandler(unknownError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'An unexpected error occurred',
          code: 'INTERNAL_ERROR'
        })
      )
    })

    it('should include stack trace in development environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const unknownError = new Error('Something went wrong')

      globalErrorHandler(unknownError, req, res, next)

      expect(res.jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            stack: expect.any(String),
            name: 'Error',
            original_message: 'Something went wrong'
          })
        })
      )

      process.env.NODE_ENV = originalEnv
    })

    it('should not include stack trace in production environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const unknownError = new Error('Something went wrong')

      globalErrorHandler(unknownError, req, res, next)

      const responseCall = res.jsonMock.mock.calls[0][0]
      expect(responseCall.details).toBeUndefined()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Error Logging', () => {
    it('should log client errors with warn level', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const error = new AppError('Client error', 400, 'CLIENT_ERROR')

      globalErrorHandler(error, req, res, next)

      expect(consoleMock.warn).toHaveBeenCalled()
      expect(consoleMock.error).not.toHaveBeenCalled()
    })

    it('should log server errors with error level', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const error = new AppError('Server error', 500, 'SERVER_ERROR')

      globalErrorHandler(error, req, res, next)

      expect(consoleMock.error).toHaveBeenCalled()
      expect(consoleMock.warn).not.toHaveBeenCalled()
    })

    it('should include user context in logs when available', () => {
      const req = createMockRequest({ user: { id: 123 } }) as Request & { user: { id: number } }
      const res = createMockResponse() as Response
      const next = createMockNext()
      const error = new AppError('Test error')

      globalErrorHandler(error, req, res, next)

      expect(consoleMock.error).toHaveBeenCalledWith(
        expect.stringContaining('"user_id":123')
      )
    })
  })

  describe('Request ID Generation', () => {
    it('should include unique request ID in response', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const error = new AppError('Test error')

      globalErrorHandler(error, req, res, next)

      const responseCall = res.jsonMock.mock.calls[0][0]
      expect(responseCall.request_id).toMatch(/^req_\d+_[a-z0-9]{6}$/)
    })

    it('should generate different request IDs for different calls', () => {
      const req1 = createMockRequest() as Request
      const res1 = createMockResponse() as Response
      const req2 = createMockRequest() as Request  
      const res2 = createMockResponse() as Response
      const next = createMockNext()
      const error = new AppError('Test error')

      globalErrorHandler(error, req1, res1, next)
      globalErrorHandler(error, req2, res2, next)

      const response1 = res1.jsonMock.mock.calls[0][0]
      const response2 = res2.jsonMock.mock.calls[0][0]
      
      expect(response1.request_id).not.toBe(response2.request_id)
    })
  })
})

// ============================================================================
// NOT FOUND HANDLER TESTS
// ============================================================================

describe('Not Found Handler', () => {
  let consoleMock: ReturnType<typeof mockConsole>

  beforeEach(() => {
    consoleMock = mockConsole()
  })

  afterEach(() => {
    consoleMock.restore()
  })

  it('should handle 404 for undefined routes', () => {
    const req = createMockRequest({ method: 'POST', path: '/undefined-route' }) as Request
    const res = createMockResponse()
    const next = createMockNext()

    notFoundHandler(req, res, next)

    expect(res.statusMock).toHaveBeenCalledWith(404)
    expect(res.jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Route POST /undefined-route not found',
        code: 'ROUTE_NOT_FOUND',
        method: 'POST',
        path: '/undefined-route'
      })
    )
  })

  it('should log 404 attempts', () => {
    const req = createMockRequest({ method: 'GET', path: '/missing' }) as Request
    const res = createMockResponse()
    const next = createMockNext()

    notFoundHandler(req, res, next)

    expect(consoleMock.warn).toHaveBeenCalledWith(
      expect.stringContaining('Route Not Found'),
      expect.objectContaining({
        method: 'GET',
        path: '/missing'
      })
    )
  })

  it('should include request ID in 404 response', () => {
    const req = createMockRequest() as Request
    const res = createMockResponse()
    const next = createMockNext()

    notFoundHandler(req, res, next)

    const responseCall = res.jsonMock.mock.calls[0][0]
    expect(responseCall.request_id).toMatch(/^req_\d+_[a-z0-9]{6}$/)
  })
})

// ============================================================================
// ASYNC HANDLER TESTS
// ============================================================================

describe('Async Handler', () => {
  it('should call async function and handle success', async () => {
    const req = createMockRequest() as Request
    const res = createMockResponse() as Response
    const next = createMockNext()
    
    const asyncFn = vi.fn().mockResolvedValue('success')
    const wrappedFn = asyncHandler(asyncFn)

    await wrappedFn(req, res, next)

    expect(asyncFn).toHaveBeenCalledWith(req, res, next)
    expect(next).not.toHaveBeenCalled()
  })

  it('should catch async errors and pass to next', async () => {
    const req = createMockRequest() as Request
    const res = createMockResponse() as Response
    const next = createMockNext()
    
    const error = new Error('Async error')
    const asyncFn = vi.fn().mockRejectedValue(error)
    const wrappedFn = asyncHandler(asyncFn)

    await wrappedFn(req, res, next)

    expect(asyncFn).toHaveBeenCalledWith(req, res, next)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('should handle synchronous errors', async () => {
    const req = createMockRequest() as Request
    const res = createMockResponse() as Response
    const next = createMockNext()
    
    const error = new Error('Sync error')
    const asyncFn = vi.fn().mockImplementation(() => {
      throw error
    })
    const wrappedFn = asyncHandler(asyncFn)

    await wrappedFn(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('Helper Functions', () => {
  
  describe('sendSuccess', () => {
    it('should send success response with default values', () => {
      const res = createMockResponse() as Response

      sendSuccess(res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Operation successful',
          data: null,
          timestamp: expect.any(String)
        })
      )
    })

    it('should send success response with custom values', () => {
      const res = createMockResponse() as Response
      const data = { users: ['alice', 'bob'] }

      sendSuccess(res, data, 'Users retrieved', 201)

      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Users retrieved',
          data: data,
          timestamp: expect.any(String)
        })
      )
    })
  })

  describe('sendError', () => {
    it('should send error response with default values', () => {
      const res = createMockResponse() as Response

      sendError(res, 'Something went wrong')

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Something went wrong',
          code: 'ERROR',
          timestamp: expect.any(String),
          method: 'GET',
          path: '/test'
        })
      )
    })

    it('should send error response with custom values', () => {
      const res = createMockResponse() as Response
      const details = { field: 'email', issue: 'invalid format' }

      sendError(res, 'Validation failed', 'VALIDATION_ERROR', 422, details)

      expect(res.status).toHaveBeenCalledWith(422)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: details,
          timestamp: expect.any(String)
        })
      )
    })

    it('should not include details when not provided', () => {
      const res = createMockResponse() as Response

      sendError(res, 'Error message')

      const responseCall = res.jsonMock.mock.calls[0][0]
      expect(responseCall.details).toBeUndefined()
    })
  })
})