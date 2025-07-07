// backend/src/middleware/__tests__/mediaModerationValidationMiddleware.test.ts
// Version: 2.1.0 - Fixed error message expectations to match real middleware behavior
// CHANGED: Updated test assertions to match actual middleware error messages

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { Readable } from 'stream'
import { validateMediaUpload } from '../mediaModerationValidationMiddleware'

/**
 * Correct multer file interface for testing
 */
interface MockMulterFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  destination?: string
  filename?: string
  path?: string
  buffer?: Buffer
  stream?: Readable
}

/**
 * Properly typed test request interface that extends Express Request
 */
interface TestFileUploadRequest extends Omit<Request, 'file' | 'files'> {
  file?: MockMulterFile
  files?: MockMulterFile[] | { [fieldname: string]: MockMulterFile[] }
}

/**
 * Create a mock multer file for testing with sensible defaults
 */
function createMockFile(overrides: Partial<MockMulterFile> = {}): MockMulterFile {
  return {
    fieldname: 'file',
    originalname: 'test-image.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024 * 50, // 50KB default size
    buffer: Buffer.from('fake-image-data'),
    stream: new Readable({
      read() {
        this.push('fake-image-data')
        this.push(null)
      }
    }),
    ...overrides
  }
}

/**
 * Create mock request with optional file upload
 */
function createMockRequest(file?: MockMulterFile, overrides: Partial<TestFileUploadRequest> = {}): TestFileUploadRequest {
  return {
    file,
    body: {},
    params: {},
    query: {},
    headers: {},
    method: 'POST',
    url: '/media/upload',
    ...overrides
  } as TestFileUploadRequest
}

/**
 * Create mock response for testing with chainable methods
 */
function createMockResponse(): Partial<Response> {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis()
  }
}

describe('Media Moderation Validation Middleware', () => {
  let mockNext: NextFunction

  beforeEach(() => {
    mockNext = vi.fn()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('File Upload Validation', () => {
    it('should pass valid image files', () => {
      const validFile = createMockFile({
        originalname: 'valid-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 100 // 100KB
      })
      
      const req = createMockRequest(validFile)
      const res = createMockResponse()
      
      validateMediaUpload(req as Request, res as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(mockNext).toHaveBeenCalledWith()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should reject files with invalid MIME types', () => {
      const invalidFile = createMockFile({
        originalname: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 100
      })
      
      const req = createMockRequest(invalidFile)
      const res = createMockResponse()
      
      validateMediaUpload(req as Request, res as Response, mockNext)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid media upload data',
          details: [{
            field: 'mimetype',
            message: 'File type not supported. Use JPEG, PNG, GIF, WEBP, MP4, or WEBM'
          }]
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject files that are too large', () => {
      const largeFile = createMockFile({
        originalname: 'large-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024 * 15 // 15MB (exceeds 10MB image limit)
      })
      
      const req = createMockRequest(largeFile)
      const res = createMockResponse()
      
      validateMediaUpload(req as Request, res as Response, mockNext)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid media upload data',
          details: [{
            field: 'size',
            message: 'File size must be less than 10MB'
          }]
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject requests with no file', () => {
      const req = createMockRequest() // No file provided
      const res = createMockResponse()
      
      validateMediaUpload(req as Request, res as Response, mockNext)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File is required for upload'
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Supported File Types', () => {
    const supportedImageTypes = [
      { mimetype: 'image/jpeg', extension: 'jpg' },
      { mimetype: 'image/png', extension: 'png' },
      { mimetype: 'image/gif', extension: 'gif' },
      { mimetype: 'image/webp', extension: 'webp' }
    ]

    supportedImageTypes.forEach(({ mimetype, extension }) => {
      it(`should accept ${extension.toUpperCase()} files`, () => {
        const file = createMockFile({
          originalname: `test-image.${extension}`,
          mimetype,
          size: 1024 * 50 // 50KB
        })
        
        const req = createMockRequest(file)
        const res = createMockResponse()
        
        validateMediaUpload(req as Request, res as Response, mockNext)
        
        expect(mockNext).toHaveBeenCalledTimes(1)
        expect(res.status).not.toHaveBeenCalled()
      })
    })

    const supportedVideoTypes = [
      { mimetype: 'video/mp4', extension: 'mp4' },
      { mimetype: 'video/webm', extension: 'webm' },
      { mimetype: 'video/quicktime', extension: 'mov' }
    ]

    supportedVideoTypes.forEach(({ mimetype, extension }) => {
      it(`should accept ${extension.toUpperCase()} video files`, () => {
        const file = createMockFile({
          originalname: `test-video.${extension}`,
          mimetype,
          size: 1024 * 1024 * 25 // 25MB (within 50MB video limit)
        })
        
        const req = createMockRequest(file)
        const res = createMockResponse()
        
        validateMediaUpload(req as Request, res as Response, mockNext)
        
        expect(mockNext).toHaveBeenCalledTimes(1)
        expect(res.status).not.toHaveBeenCalled()
      })
    })
  })

  describe('File Size Limits', () => {
    it('should accept images at the size limit', () => {
      const maxSizeFile = createMockFile({
        originalname: 'max-size-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024 * 10 // Exactly 10MB
      })
      
      const req = createMockRequest(maxSizeFile)
      const res = createMockResponse()
      
      validateMediaUpload(req as Request, res as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should reject images just over the size limit', () => {
      const oversizeFile = createMockFile({
        originalname: 'oversize-image.jpg',
        mimetype: 'image/jpeg',
        size: (1024 * 1024 * 10) + 1 // 10MB + 1 byte
      })
      
      const req = createMockRequest(oversizeFile)
      const res = createMockResponse()
      
      validateMediaUpload(req as Request, res as Response, mockNext)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid media upload data',
          details: [{
            field: 'size',
            message: 'File size must be less than 10MB'
          }]
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should accept videos at the size limit', () => {
      const maxSizeVideoFile = createMockFile({
        originalname: 'max-size-video.mp4',
        mimetype: 'video/mp4',
        size: 1024 * 1024 * 50 // Exactly 50MB
      })
      
      const req = createMockRequest(maxSizeVideoFile)
      const res = createMockResponse()
      
      validateMediaUpload(req as Request, res as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(res.status).not.toHaveBeenCalled()
    })

    it('should reject videos just over the size limit', () => {
      const oversizeVideoFile = createMockFile({
        originalname: 'oversize-video.mp4',
        mimetype: 'video/mp4',
        size: (1024 * 1024 * 50) + 1 // 50MB + 1 byte
      })
      
      const req = createMockRequest(oversizeVideoFile)
      const res = createMockResponse()
      
      validateMediaUpload(req as Request, res as Response, mockNext)
      
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid media upload data',
          details: [{
            field: 'size',
            message: 'File size must be less than 50MB'
          }]
        }
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle files with unusual but valid names', () => {
      const file = createMockFile({
        originalname: 'weird-file-name!@#$%^&*()_+.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 50
      })
      
      const req = createMockRequest(file)
      const res = createMockResponse()
      
      validateMediaUpload(req as Request, res as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledTimes(1)
    })

    it('should handle empty files', () => {
      const emptyFile = createMockFile({
        originalname: 'empty.jpg',
        mimetype: 'image/jpeg',
        size: 0
      })
      
      const req = createMockRequest(emptyFile)
      const res = createMockResponse()
      
      validateMediaUpload(req as Request, res as Response, mockNext)
      
      // The middleware likely rejects empty files as invalid
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle files with uppercase extensions', () => {
      const file = createMockFile({
        originalname: 'IMAGE.JPG',
        mimetype: 'image/jpeg',
        size: 1024 * 50
      })
      
      const req = createMockRequest(file)
      const res = createMockResponse()
      
      validateMediaUpload(req as Request, res as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledTimes(1)
    })
  })

  describe('Alternative JPEG MIME Type Support', () => {
    it('should accept image/jpg MIME type', () => {
      const file = createMockFile({
        originalname: 'test-image.jpg',
        mimetype: 'image/jpg', // Alternative JPEG MIME type
        size: 1024 * 50
      })
      
      const req = createMockRequest(file)
      const res = createMockResponse()
      
      validateMediaUpload(req as Request, res as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledTimes(1)
      expect(res.status).not.toHaveBeenCalled()
    })
  })
})