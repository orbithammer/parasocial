// backend/src/routes/__tests__/mediaUpload.test.ts
// Version: 1.7
// Fixed Vitest hoisting issue by creating mocks directly in factory function

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import mediaRouter from '../media'

// Mock the fs module with Vitest mock functions created in factory
vi.mock('fs', () => ({
  access: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
  // Preserve other fs methods as pass-through
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn()
  }
}))

// Import fs after mocking to get the mocked functions
import fs from 'fs'

// Get references to the mocked functions for test control
const mockFsAccess = vi.mocked(fs.access)
const mockFsMkdir = vi.mocked(fs.mkdir)
const mockFsUnlink = vi.mocked(fs.unlink)

// Mock uuid for predictable file naming in tests
vi.mock('uuid', () => ({
  v4: () => 'test-uuid-123'
}))

/**
 * Create test Express app with media routes
 * Includes necessary middleware for testing
 */
function createTestApp() {
  const app = express()
  
  // Parse JSON bodies for validation
  app.use(express.json())
  
  // Mount media routes
  app.use('/api/v1/media', mediaRouter)
  
  // Error handling middleware for testing
  app.use((error: any, req: express.Request, res: express.Response, next: any) => {
    res.status(500).json({
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: error.message
      }
    })
  })
  
  return app
}

/**
 * Create test file buffer for upload testing
 * Simulates different file types and sizes
 */
function createTestFile(options: {
  filename?: string
  mimetype?: string
  size?: number
} = {}) {
  const filename = options.filename || 'test-image.jpg'
  const mimetype = options.mimetype || 'image/jpeg'
  const size = options.size || 1024 // 1KB default
  
  // Create buffer of specified size
  const buffer = Buffer.alloc(size, 'test-data')
  
  return { filename, mimetype, buffer, size }
}

describe('Media Upload Route', () => {
  let app: express.Application
  
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Create fresh app instance
    app = createTestApp()
    
    // Mock callback-style fs operations to match our route implementation
    mockFsAccess.mockImplementation((path: any, callback: any) => {
      // Simulate directory exists by default
      callback(null)
    })
    
    // fs.mkdir has multiple signatures, handle both path+callback and path+options+callback
    mockFsMkdir.mockImplementation((...args: any[]) => {
      const callback = args[args.length - 1] // Last argument is always callback
      // Simulate successful directory creation
      callback(null)
    })
    
    mockFsUnlink.mockImplementation((path: any, callback: any) => {
      // Simulate successful file deletion
      callback(null)
    })
    
    // Mock environment variables
    process.env.BASE_URL = 'http://localhost:3001'
    process.env.PORT = '3001'
  })
  
  afterEach(() => {
    // Clean up environment variables
    delete process.env.BASE_URL
    delete process.env.PORT
  })

  describe('Successful File Upload', () => {
    it('should upload valid image file successfully', async () => {
      const testFile = createTestFile({
        filename: 'profile-picture.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 100 // 100KB
      })
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .field('altText', 'User profile picture')
        .expect(201)
      
      // Verify response structure matches API documentation
      expect(response.body).toEqual({
        success: true,
        data: {
          id: 'test-uuid-123', // Just the UUID, not with timestamp
          url: expect.stringMatching(/^http:\/\/localhost:3001\/uploads\/test-uuid-123-\d+\.jpg$/),
          filename: expect.stringMatching(/^test-uuid-123-\d+\.jpg$/),
          originalName: 'profile-picture.jpg',
          mimeType: 'image/jpeg',
          size: 1024 * 100,
          altText: 'User profile picture',
          uploadedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        }
      })
    })

    it('should upload file without alt text', async () => {
      const testFile = createTestFile()
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(201)
      
      expect(response.body.data.altText).toBeNull()
    })

    it('should handle all supported file types', async () => {
      const supportedTypes = [
        { ext: 'jpg', mime: 'image/jpeg' },
        { ext: 'png', mime: 'image/png' },
        { ext: 'gif', mime: 'image/gif' },
        { ext: 'webp', mime: 'image/webp' }
      ]
      
      for (const type of supportedTypes) {
        const testFile = createTestFile({
          filename: `test.${type.ext}`,
          mimetype: type.mime
        })
        
        const response = await request(app)
          .post('/api/v1/media/upload')
          .attach('file', testFile.buffer, testFile.filename)
          .expect(201)
        
        expect(response.body.data.mimeType).toBe(type.mime)
      }
    })
  })

  describe('File Validation', () => {
    it('should reject requests with no file', async () => {
      const response = await request(app)
        .post('/api/v1/media/upload')
        .expect(400)
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File is required for upload'
        }
      })
    })

    it('should reject unsupported file types', async () => {
      const testFile = createTestFile({
        filename: 'document.pdf',
        mimetype: 'application/pdf'
      })
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(400)
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File type not supported. Use JPEG, PNG, GIF, WEBP, MP4, or WEBM'
        }
      })
    })

    it('should reject files exceeding size limit', async () => {
      // Create file larger than 10MB limit
      const testFile = createTestFile({
        size: 11 * 1024 * 1024 // 11MB
      })
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(400)
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'File size exceeds 10MB limit'
        }
      })
    })

    it('should validate alt text length', async () => {
      const testFile = createTestFile()
      const longAltText = 'A'.repeat(201) // Exceed 200 char limit
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .field('altText', longAltText)
        .expect(400)
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid media upload data',
          details: expect.arrayContaining([
            expect.objectContaining({
              field: 'altText',
              message: 'Alt text must be 200 characters or less'
            })
          ])
        }
      })
    })
  })

  describe('Directory Management', () => {
    it('should create uploads directory if it does not exist', async () => {
      // Mock directory doesn't exist initially
      mockFsAccess.mockImplementation((path: any, callback: any) => {
        callback(new Error('Directory not found'))
      })
      
      const testFile = createTestFile()
      
      await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(201)
      
      // Verify directory creation was attempted
      expect(mockFsMkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads'),
        { recursive: true },
        expect.any(Function)
      )
    })

    it('should handle directory creation failure', async () => {
      // Mock both access and mkdir failures
      mockFsAccess.mockImplementation((path: any, callback: any) => {
        callback(new Error('Access denied'))
      })
      
      // Handle both mkdir signatures: (path, callback) and (path, options, callback)
      mockFsMkdir.mockImplementation((...args: any[]) => {
        const callback = args[args.length - 1] // Last argument is always callback
        callback(new Error('Permission denied'))
      })
      
      const testFile = createTestFile()
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(500)
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'UPLOAD_PROCESSING_ERROR',
          message: 'Failed to process uploaded file'
        }
      })
    })
  })

  describe('Error Recovery', () => {
    it('should clean up uploaded file if processing fails', async () => {
      // Mock successful upload but processing failure
      const testFile = createTestFile()
      
      // Mock a processing error after file upload
      vi.spyOn(global.Date.prototype, 'toISOString').mockImplementation(() => {
        throw new Error('Date processing failed')
      })
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(500)
      
      // Verify cleanup was attempted
      expect(mockFsUnlink).toHaveBeenCalled()
      
      // Restore Date mock
      vi.restoreAllMocks()
    })
  })

  describe('Edge Cases', () => {
    it('should handle files at exactly the size limit', async () => {
      // Create file at exactly 10MB
      const testFile = createTestFile({
        size: 10 * 1024 * 1024 // Exactly 10MB
      })
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(201)
      
      expect(response.body.data.size).toBe(10 * 1024 * 1024)
    })

    it('should handle files with no extension', async () => {
      const testFile = createTestFile({
        filename: 'imagefile', // No extension
        mimetype: 'image/jpeg'
      })
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(400)
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File type not supported. Use JPEG, PNG, GIF, WEBP, MP4, or WEBM'
        }
      })
    })

    it('should handle very small files', async () => {
      const testFile = createTestFile({
        size: 1 // 1 byte
      })
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(201)
      
      expect(response.body.data.size).toBe(1)
    })
  })
})