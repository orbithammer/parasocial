// backend/src/routes/__tests__/mediaUpload.test.ts
// Version: 1.0.2 - Fixed Request.get() mock overloads for TypeScript compatibility
// Changed: Updated mock to properly handle set-cookie header array return type

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
} from '../../middleware/globalError'

// ============================================================================
// TEST UTILITIES AND MOCKS
// ============================================================================

/**
 * Create mock Express request object with common properties
 * Handles Express Request.get() method overloads properly
 */
function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    method: 'GET',
    path: '/test',
    ip: '127.0.0.1',
    // Properly handle Express Request.get() overloads
    get: vi.fn().mockImplementation((header: string) => {
      if (header === 'set-cookie') {
        return undefined as string[] | undefined
      }
      if (header === 'User-Agent') {
        return 'test-user-agent' as string | undefined
      }
      return undefined as string | undefined
    }),
    ...overrides
  }
}

/**
 * Create mock Express response object with spy functions
 * Tracks status codes and JSON responses for assertions
 */
function createMockResponse(): Partial<Response> & { 
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  req: Partial<Request>
} {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    req: createMockRequest()
  }
  return res as any
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
// EXAMPLE TESTS FOR MEDIA UPLOAD
// ============================================================================

describe('Media Upload Error Handling', () => {
  let consoleMock: ReturnType<typeof mockConsole>

  beforeEach(() => {
    consoleMock = mockConsole()
    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleMock.restore()
  })

  describe('File Upload Errors', () => {
    it('should handle file size limit exceeded', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const multerError = new MulterError('LIMIT_FILE_SIZE', 'file')

      globalErrorHandler(multerError, req, res, next)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('File size'),
          code: expect.any(String)
        })
      )
    })

    it('should handle authentication errors', () => {
      const req = createMockRequest() as Request
      const res = createMockResponse() as Response
      const next = createMockNext()
      const error = new AuthenticationError('Token required')

      globalErrorHandler(error, req, res, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Token required',
          code: 'UNAUTHORIZED'
        })
      )
    })
  })

  describe('Request Mock Validation', () => {
    it('should properly mock request.get() method', () => {
      const req = createMockRequest() as Request
      
      // Test User-Agent header
      expect(req.get?.('User-Agent')).toBe('test-user-agent')
      
      // Test set-cookie header (should return undefined array)
      expect(req.get?.('set-cookie')).toBeUndefined()
      
      // Test unknown header
      expect(req.get?.('unknown-header')).toBeUndefined()
    })
  })
})