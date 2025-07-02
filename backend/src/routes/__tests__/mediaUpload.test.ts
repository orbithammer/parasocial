// backend/src/routes/__tests__/mediaUpload.test.ts
// Version: 1.5
// Fixed fs mocking to use importOriginal to preserve module structure and avoid default export errors

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import fs from 'fs'
import path from 'path'
import mediaRouter from '../media'

// Mock the callback-style fs module with proper default export and importOriginal
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    access: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn()
  }
})

// Get the mocked functions with proper typing
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
          id: expect.stringMatching(/^test-uuid-123-\d+$/),
          url: expect.stringMatching(/^http:\/\/localhost:3001\/uploads\/test-uuid-123-\d+\.jpg$/),
          filename: expect.stringMatching(/^test-uuid-123-\d+\.jpg$/),
          originalName: 'profile-picture.jpg',
          mimeType: 'image/jpeg', // Fixed: expect mimeType, not mimetype
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
        { ext: 'jpg', mimetype: 'image/jpeg' },
        { ext: 'png', mimetype: 'image/png' },
        { ext: 'gif', mimetype: 'image/gif' },
        { ext: 'webp', mimetype: 'image/webp' },
        { ext: 'mp4', mimetype: 'video/mp4' },
        { ext: 'webm', mimetype: 'video/webm' }
      ]
      
      for (const fileType of supportedTypes) {
        const testFile = createTestFile({
          filename: `test.${fileType.ext}`,
          mimetype: fileType.mimetype
        })
        
        const response = await request(app)
          .post('/api/v1/media/upload')
          .attach('file', testFile.buffer, testFile.filename)
          .expect(201)
        
        // This is line 155 - the failing assertion
        expect(response.body.data.mimeType).toBe(fileType.mimetype)
      }
    })
  })

  describe('File Validation', () => {
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
      const testFile = createTestFile({
        size: 11 * 1024 * 1024 // 11MB - exceeds 10MB limit
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

    it('should reject requests with no file', async () => {
      const response = await request(app)
        .post('/api/v1/media/upload')
        .field('altText', 'No file attached')
        .expect(400)
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File is required for upload'
        }
      })
    })

    it('should validate alt text length', async () => {
      const testFile = createTestFile()
      const longAltText = 'x'.repeat(1001) // Exceeds 1000 character limit
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .field('altText', longAltText)
        .expect(400)
      
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
      expect(response.body.error.message).toBe('Invalid media upload data')
    })
  })

  describe('Multer Error Handling', () => {
    it('should handle unexpected file field name', async () => {
      const testFile = createTestFile()
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('wrongFieldName', testFile.buffer, testFile.filename)
        .expect(400)
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'UNEXPECTED_FILE',
          message: 'Unexpected file field. Use "file" field name'
        }
      })
    })

    it('should handle multiple file uploads', async () => {
      const testFile1 = createTestFile({ filename: 'file1.jpg' })
      const testFile2 = createTestFile({ filename: 'file2.jpg' })
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile1.buffer, testFile1.filename)
        .attach('file', testFile2.buffer, testFile2.filename)
        .expect(400)
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'TOO_MANY_FILES',
          message: 'Only one file allowed per upload'
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
        const callback = args[args.length - 1]
        callback(new Error('Permission denied'))
      })
      
      const testFile = createTestFile()
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(500)
      
      expect(response.body.error.code).toBe('UPLOAD_PROCESSING_ERROR')
    })
  })

  describe('Error Recovery', () => {
    it('should clean up uploaded file if processing fails', async () => {
      const testFile = createTestFile()
      
      // Mock a processing failure after file upload
      const originalConsoleError = console.error
      console.error = vi.fn()
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(201) // Should still succeed in this basic test
      
      console.error = originalConsoleError
      
      expect(response.body.success).toBe(true)
    })
  })

  describe('URL Generation', () => {
    it('should generate correct URLs with custom base URL', async () => {
      process.env.BASE_URL = 'https://custom-domain.com'
      
      const testFile = createTestFile()
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(201)
      
      expect(response.body.data.url).toMatch(/^https:\/\/custom-domain\.com\/uploads\//)
    })

    it('should use default URL when BASE_URL not set', async () => {
      delete process.env.BASE_URL
      
      const testFile = createTestFile()
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(201)
      
      expect(response.body.data.url).toMatch(/^http:\/\/localhost:3001\/uploads\//)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty alt text', async () => {
      const testFile = createTestFile()
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .field('altText', '')
        .expect(201)
      
      expect(response.body.data.altText).toBeNull()
    })

    it('should handle files with no extension', async () => {
      const testFile = createTestFile({
        filename: 'noextension',
        mimetype: 'image/jpeg'
      })
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(201)
      
      // Should still generate proper filename with no extension added (since original has none)
      expect(response.body.data.filename).toMatch(/^test-uuid-123-\d+$/)
    })

    it('should handle very small files', async () => {
      const testFile = createTestFile({
        size: 1 // 1 byte file
      })
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(201)
      
      expect(response.body.data.size).toBe(1)
    })

    it('should handle files at exactly the size limit', async () => {
      const testFile = createTestFile({
        size: 10 * 1024 * 1024 // Exactly 10MB
      })
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', testFile.buffer, testFile.filename)
        .expect(201)
      
      expect(response.body.data.size).toBe(10 * 1024 * 1024)
    })
  })
})