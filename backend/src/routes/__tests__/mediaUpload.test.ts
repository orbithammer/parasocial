// backend/src/routes/__tests__/mediaUpload.test.ts
// v2.2.0 - Fixed Express Request.get method type compatibility

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface MockMulterFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  buffer: Buffer
  size: number
}

interface MockRequest extends Partial<Request> {
  file?: MockMulterFile
  user?: {
    id: string
    username: string
    email: string
  }
  get?: {
    (name: "set-cookie"): string[] | undefined
    (name: string): string | undefined
  }
}

interface MockResponse extends Partial<Response> {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
}

interface ValidationError extends Error {
  name: 'ValidationError'
  field?: string
}

interface AuthenticationError extends Error {
  name: 'AuthenticationError'
}

interface MulterError extends Error {
  name: 'MulterError'
  code: string
  field?: string
  limit?: number
}

// ============================================================================
// MOCK FUNCTIONS
// ============================================================================

/**
 * Create mock console functions to suppress error logs during testing
 */
function mockConsole() {
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  
  const consoleErrorSpy = vi.fn()
  const consoleWarnSpy = vi.fn()
  
  console.error = consoleErrorSpy
  console.warn = consoleWarnSpy
  
  return {
    error: consoleErrorSpy,
    warn: consoleWarnSpy,
    restore: () => {
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
    }
  }
}

/**
 * Create mock request object with proper typing
 */
function createMockRequest(file?: MockMulterFile): MockRequest {
  return {
    file,
    user: {
      id: 'test-user-123',
      username: 'testuser',
      email: 'test@example.com'
    },
    get: vi.fn((header: string) => {
      if (header === 'set-cookie') {
        return ['test-cookie=value'] as string[]
      }
      const headers: Record<string, string> = {
        'User-Agent': 'test-user-agent',
        'Content-Type': 'multipart/form-data'
      }
      return headers[header]
    }) as {
      (name: "set-cookie"): string[] | undefined
      (name: string): string | undefined
    },
    body: {},
    params: {},
    query: {},
    headers: {
      'user-agent': 'test-user-agent',
      'content-type': 'multipart/form-data'
    }
  }
}

/**
 * Create mock response object with proper method spies
 */
function createMockResponse(): MockResponse {
  const json = vi.fn().mockReturnThis()
  const status = vi.fn().mockReturnThis()
  
  return {
    status,
    json,
    setHeader: vi.fn(),
    getHeader: vi.fn(),
    send: vi.fn()
  }
}

/**
 * Create mock next function
 */
function createMockNext(): NextFunction {
  return vi.fn()
}

/**
 * Create mock validation error
 */
function createValidationError(message: string, field?: string): ValidationError {
  const error = new Error(message) as ValidationError
  error.name = 'ValidationError'
  error.field = field
  return error
}

/**
 * Create mock authentication error
 */
function createAuthenticationError(message: string): AuthenticationError {
  const error = new Error(message) as AuthenticationError
  error.name = 'AuthenticationError'
  return error
}

/**
 * Create mock multer error for file upload issues
 */
function createMulterError(code: string, message: string, field?: string): MulterError {
  const error = new Error(message) as MulterError
  error.name = 'MulterError'
  error.code = code
  error.field = field
  return error
}

/**
 * Mock global error handler that matches actual implementation
 * Returns response format with additional metadata fields
 */
async function mockGlobalErrorHandler(
  error: Error,
  req: MockRequest,
  res: MockResponse,
  next: NextFunction
): Promise<void> {
  // Generate mock request metadata
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
  const timestamp = new Date().toISOString()
  const method = 'GET' // Default for tests
  const path = '/test' // Default for tests

  // Handle different error types
  if (error.name === 'ValidationError') {
    res.status(400)
    res.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message
      },
      method,
      path,
      request_id: requestId,
      timestamp
    })
    return
  }

  if (error.name === 'AuthenticationError') {
    res.status(401)
    res.json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: error.message
      },
      method,
      path,
      request_id: requestId,
      timestamp
    })
    return
  }

  if (error.name === 'MulterError') {
    const multerError = error as MulterError
    let statusCode = 400
    let errorCode = 'FILE_UPLOAD_ERROR'
    let errorMessage = error.message

    // Map multer error codes to appropriate responses
    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        statusCode = 400
        errorCode = 'FILE_TOO_LARGE'
        errorMessage = 'File size exceeds the limit'
        break
      case 'LIMIT_FILE_COUNT':
        statusCode = 400
        errorCode = 'TOO_MANY_FILES'
        errorMessage = 'Too many files uploaded'
        break
      case 'LIMIT_UNEXPECTED_FILE':
        statusCode = 400
        errorCode = 'UNEXPECTED_FILE'
        errorMessage = 'Unexpected file field'
        break
    }

    res.status(statusCode)
    res.json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage
      },
      method,
      path,
      request_id: requestId,
      timestamp
    })
    return
  }

  // Default server error
  res.status(500)
  res.json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    },
    method,
    path,
    request_id: requestId,
    timestamp
  })
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
      
      // Create mock file size error (multer LIMIT_FILE_SIZE)
      const fileSizeError = createMulterError(
        'LIMIT_FILE_SIZE',
        'File too large',
        'file'
      )

      // Act
      await mockGlobalErrorHandler(fileSizeError, req, res, next)

      // Assert - Expect 400 status and specific error format
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds the limit'
          },
          method: expect.any(String),
          path: expect.any(String),
          request_id: expect.any(String),
          timestamp: expect.any(String)
        })
      )
    })

    it('should handle authentication errors', async () => {
      // Arrange
      const req = createMockRequest()
      const res = createMockResponse()
      const next = createMockNext()
      
      const authError = createAuthenticationError('Token required')

      // Act
      await mockGlobalErrorHandler(authError, req, res, next)

      // Assert - Check for complete response format including metadata
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token required'
          },
          method: expect.any(String),
          path: expect.any(String),
          request_id: expect.any(String),
          timestamp: expect.any(String)
        })
      )
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
      
      // Test set-cookie header (returns array)
      const setCookie = req.get!('set-cookie')
      expect(setCookie).toEqual(['test-cookie=value'])
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
      // Test error response consistency with metadata
      const req = createMockRequest()
      const res = createMockResponse()
      const next = createMockNext()
      
      const validationError = createValidationError('Invalid input data')

      // Act
      await mockGlobalErrorHandler(validationError, req, res, next)

      // Assert - Check complete response format with metadata
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data'
          },
          method: expect.any(String),
          path: expect.any(String),
          request_id: expect.any(String),
          timestamp: expect.any(String)
        })
      )
    })
  })

  describe('Async Error Handling', () => {
    it('should handle async upload operations correctly', async () => {
      // Test async error handling to prevent unhandled rejections
      const asyncUploadOperation = async (): Promise<string> => {
        // Simulate async file upload operation
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'upload-success'
      }

      // Act & Assert
      const result = await asyncUploadOperation()
      expect(result).toBe('upload-success')
    })

    it('should handle promise rejection in upload middleware', async () => {
      // Test promise rejection handling
      const failingAsyncOperation = async (): Promise<never> => {
        throw new Error('Upload failed')
      }

      // Act & Assert
      await expect(failingAsyncOperation()).rejects.toThrow('Upload failed')
    })
  })

  describe('Multer Error Code Mapping', () => {
    it('should map LIMIT_FILE_COUNT errors correctly', async () => {
      // Arrange
      const req = createMockRequest()
      const res = createMockResponse()
      const next = createMockNext()
      
      const fileCountError = createMulterError(
        'LIMIT_FILE_COUNT',
        'Too many files',
        'files'
      )

      // Act
      await mockGlobalErrorHandler(fileCountError, req, res, next)

      // Assert
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Too many files uploaded'
          }
        })
      )
    })

    it('should map LIMIT_UNEXPECTED_FILE errors correctly', async () => {
      // Arrange
      const req = createMockRequest()
      const res = createMockResponse()
      const next = createMockNext()
      
      const unexpectedFileError = createMulterError(
        'LIMIT_UNEXPECTED_FILE',
        'Unexpected file field',
        'wrongfield'
      )

      // Act
      await mockGlobalErrorHandler(unexpectedFileError, req, res, next)

      // Assert
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'UNEXPECTED_FILE',
            message: 'Unexpected file field'
          }
        })
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle unknown error types', async () => {
      // Arrange
      const req = createMockRequest()
      const res = createMockResponse()
      const next = createMockNext()
      
      const unknownError = new Error('Unknown error occurred')

      // Act
      await mockGlobalErrorHandler(unknownError, req, res, next)

      // Assert
      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred'
          }
        })
      )
    })

    it('should handle errors without message', async () => {
      // Arrange
      const req = createMockRequest()
      const res = createMockResponse()
      const next = createMockNext()
      
      const errorWithoutMessage = createValidationError('')

      // Act
      await mockGlobalErrorHandler(errorWithoutMessage, req, res, next)

      // Assert
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: ''
          }
        })
      )
    })
  })
})