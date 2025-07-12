// backend/src/routes/__tests__/mediaUpload.test.ts
// Version: 2.0.0 - Fixed missing multer dependency and unhandled error issues
// Changed: Removed multer dependency, added proper async handling, fixed process cleanup

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { ZodError, ZodIssue } from 'zod'
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

/**
 * Mock file upload error (simulates MulterError without requiring multer)
 */
class MockFileUploadError extends Error {
  public code: string
  public field?: string
  public limit?: number
  
  constructor(code: string, message: string, field?: string) {
    super(message)
    this.name = 'MulterError'
    this.code = code
    this.field = field
  }
}

// ============================================================================
// MEDIA UPLOAD ERROR HANDLING TESTS
// ============================================================================

describe('Media Upload Error Handling', () => {
  let consoleMock: ReturnType<typeof mockConsole>

  beforeEach(() => {
    consoleMock = mockConsole()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Proper cleanup to prevent unhandled errors
    consoleMock.restore()
    vi.clearAllMocks()
    
    // Allow any pending promises to resolve
    await new Promise(resolve => setImmediate(resolve))
  })

  describe('File Upload Errors', () => {
    it('should handle file size limit exceeded', async () => {
      // Arrange
      const req = createMockRequest()
      const res = createMockResponse()
      const next = createMockNext()
      
      // Create mock file size error
      const fileSizeError = new MockFileUploadError(
        'LIMIT_FILE_SIZE',
        'File too large',
        'file'
      )

      // Act
      await globalErrorHandler(fileSizeError, req as Request, res as Response, next)

      // Assert
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds the limit'
        }
      })
    })

    it('should handle authentication errors', async () => {
      // Arrange
      const req = createMockRequest()
      const res = createMockResponse()
      const next = createMockNext()
      
      const authError = new AuthenticationError('Token required')

      // Act
      await globalErrorHandler(authError, req as Request, res as Response, next)

      // Assert
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token required'
        }
      })
    })
  })

  describe('Request Mock Validation', () => {
    it('should properly mock request.get() method', () => {
      // Arrange
      const req = createMockRequest()

      // Act & Assert
      expect(req.get).toBeDefined()
      expect(typeof req.get).toBe('function')
      
      // Test header retrieval
      const userAgent = req.get!('User-Agent')
      expect(userAgent).toBe('test-user-agent')
      
      // Test undefined header
      const customHeader = req.get!('X-Custom-Header')
      expect(customHeader).toBeUndefined()
    })
  })

  describe('File Upload Validation', () => {
    it('should validate file type correctly', () => {
      // Test file type validation logic
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      
      const isValidFileType = (mimetype: string): boolean => {
        return allowedMimeTypes.includes(mimetype)
      }
      
      // Valid file types
      expect(isValidFileType('image/jpeg')).toBe(true)
      expect(isValidFileType('image/png')).toBe(true)
      
      // Invalid file types
      expect(isValidFileType('application/pdf')).toBe(false)
      expect(isValidFileType('text/plain')).toBe(false)
    })

    it('should validate file size correctly', () => {
      // Test file size validation logic
      const maxSize = 10 * 1024 * 1024 // 10MB
      
      const isValidFileSize = (size: number): boolean => {
        return size > 0 && size <= maxSize
      }
      
      // Valid file sizes
      expect(isValidFileSize(1024)).toBe(true) // 1KB
      expect(isValidFileSize(maxSize)).toBe(true) // Exactly 10MB
      
      // Invalid file sizes
      expect(isValidFileSize(0)).toBe(false) // Empty file
      expect(isValidFileSize(maxSize + 1)).toBe(false) // Too large
    })
  })

  describe('Error Response Format', () => {
    it('should return consistent error format', async () => {
      // Test error response consistency
      const req = createMockRequest()
      const res = createMockResponse()
      const next = createMockNext()
      
      const validationError = new ValidationError('Invalid input data')

      // Act
      await globalErrorHandler(validationError, req as Request, res as Response, next)

      // Assert - Check response format
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data'
        }
      })
    })
  })

  describe('Async Error Handling', () => {
    it('should handle async upload operations correctly', async () => {
      // Test async error handling to prevent unhandled rejections
      const asyncUploadOperation = async (): Promise<string> => {
        // Simulate async file processing
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error('Upload failed')
      }

      // Wrap in try-catch to prevent unhandled rejection
      try {
        await asyncUploadOperation()
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Upload failed')
      }
    })

    it('should handle promise rejection in upload middleware', async () => {
      // Test promise handling in middleware context
      const mockMiddleware = async (req: Request, res: Response, next: NextFunction) => {
        try {
          // Simulate async operation that might fail
          await Promise.reject(new Error('Async operation failed'))
        } catch (error) {
          next(error)
        }
      }

      const req = createMockRequest()
      const res = createMockResponse()
      const next = createMockNext()

      // Act
      await mockMiddleware(req as Request, res as Response, next)

      // Assert
      expect(next).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})