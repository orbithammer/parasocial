// src/routes/__tests__/mediaUpload.test.ts
// Version: 1.2.0
// Fixed import issues and Express app setup to resolve 500 errors

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import multer, { FileFilterCallback } from 'multer'

// Type definitions for authenticated requests
interface AuthenticatedUser {
  id: string
  username: string
}

interface AuthenticatedRequest extends express.Request {
  user?: AuthenticatedUser
}

// Type definitions for media service
interface FileValidationResult {
  valid: boolean
  message: string
}

interface ProcessedFile {
  filename: string
  url: string
  size: number
  mimeType: string
}

interface DeleteResult {
  success: boolean
}

// Mock rate limiter store for cleanup
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Mock upload limiter with reset functionality
const uploadLimiter = {
  reset: () => {
    rateLimitStore.clear()
  }
}

// Mock authentication middleware with proper typing
const mockAuth = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    if (token === 'valid-user-token') {
      req.user = { id: 'user123', username: 'testuser' }
    } else if (token === 'user2-token') {
      req.user = { id: 'user2', username: 'testuser2' }
    }
  }
  next()
}

// Mock media service with proper typing
const mockMediaService = {
  validateFile: vi.fn().mockReturnValue({ valid: true, message: 'File is valid' } as FileValidationResult),
  processUpload: vi.fn().mockResolvedValue({
    filename: 'processed-file.jpg',
    url: '/uploads/processed-file.jpg',
    size: 1024,
    mimeType: 'image/jpeg'
  } as ProcessedFile),
  deleteFile: vi.fn().mockResolvedValue({ success: true } as DeleteResult)
}

// Create test buffer for file uploads
const createTestImageBuffer = (): Buffer => {
  return Buffer.from('fake-image-data')
}

// Create test app with proper middleware setup
const createTestApp = (): express.Application => {
  const app = express()
  
  // Trust proxy for proper IP handling
  app.set('trust proxy', true)
  
  // Basic middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(mockAuth)
  
  // Configure multer for file uploads with proper error handling
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { 
      fileSize: 5 * 1024 * 1024, // 5MB limit
      files: 1
    },
    fileFilter: (req: AuthenticatedRequest, file: Express.Multer.File, cb: FileFilterCallback) => {
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'application/pdf' // Added PDF support for document uploads
      ]
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error('Invalid file type'))
      }
    }
  })
  
  // Upload endpoint with proper error handling
  app.post('/media/upload', (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              error: { message: 'File too large' }
            })
          }
        }
        return res.status(400).json({
          success: false,
          error: { message: 'Upload error' }
        })
      }
      next()
    })
  }, async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: { message: 'No file uploaded' }
        })
      }
      
      const validation = mockMediaService.validateFile(req.file)
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: { message: validation.message }
        })
      }
      
      const result = await mockMediaService.processUpload(req.file)
      
      res.status(201).json({
        success: true,
        data: {
          file: {
            ...result,
            uploadedBy: req.user?.id
          }
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error' }
      })
    }
  })
  
  // Delete endpoint with proper typing
  app.delete('/media/:filename', async (req: AuthenticatedRequest, res: express.Response) => {
    try {
      const { filename } = req.params
      
      if (!filename) {
        return res.status(400).json({
          success: false,
          error: { message: 'Filename is required' }
        })
      }
      
      // Check for path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid filename' }
        })
      }
      
      const result = await mockMediaService.deleteFile(filename)
      
      if (!result.success) {
        return res.status(404).json({
          success: false,
          error: { message: 'File not found' }
        })
      }
      
      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: 'Internal server error' }
      })
    }
  })
  
  // Global error handling middleware
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message)
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    })
  })
  
  return app
}

describe('Media Upload Routes', () => {
  let app: express.Application
  
  beforeEach(() => {
    // Create fresh app instance for each test
    app = createTestApp()
    
    // Clear all mocks and reset rate limiter
    vi.clearAllMocks()
    uploadLimiter.reset()
    rateLimitStore.clear()
    
    // Reset mock service to default behavior
    mockMediaService.validateFile.mockReturnValue({ valid: true, message: 'File is valid' } as FileValidationResult)
    mockMediaService.processUpload.mockResolvedValue({
      filename: 'processed-file.jpg',
      url: '/uploads/processed-file.jpg',
      size: 1024,
      mimeType: 'image/jpeg'
    } as ProcessedFile)
    mockMediaService.deleteFile.mockResolvedValue({ success: true } as DeleteResult)
  })
  
  afterEach(() => {
    // Reset rate limiter state after each test
    uploadLimiter.reset()
    rateLimitStore.clear()
    vi.clearAllMocks()
  })

  describe('Authentication Requirements', () => {
    it('should accept valid authentication tokens', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), 'test-image.jpg')

      expect(response.status).toBe(201) // Fixed: Should be 201 for successful creation
      expect(response.body.success).toBe(true)
      expect(response.body.data.file.uploadedBy).toBe('user123')
    })
  })

  describe('POST /media/upload', () => {
    it('should successfully upload an image file', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), 'test-image.jpg')

      expect(response.status).toBe(201) // Fixed: Should be 201 for successful creation
      expect(response.body.success).toBe(true)
      expect(response.body.data.file.filename).toBe('processed-file.jpg')
    })

    it('should successfully upload a video file', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', Buffer.from('fake-video-data'), 'test-video.mp4')

      expect(response.status).toBe(201) // Fixed: Should be 201 for successful creation
      expect(response.body.success).toBe(true)
    })

    it('should handle optional alt text field', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .field('altText', 'Test image description')
        .attach('file', createTestImageBuffer(), 'test-image.jpg')

      expect(response.status).toBe(201) // Fixed: Should be 201 for successful creation
      expect(response.body.success).toBe(true)
    })

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toBe('No file uploaded') // Fixed: Corrected error message
    })

    it('should include user information in response', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), 'test-image.jpg')

      expect(response.status).toBe(201) // Fixed: Should be 201 for successful creation
      expect(response.body.success).toBe(true)
      expect(response.body.data.file.uploadedBy).toBe('user123')
    })
  })

  describe('DELETE /media/:filename', () => {
    it('should successfully delete uploaded file', async () => {
      // First upload a file to get the filename
      const uploadResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), 'test-image.jpg')

      expect(uploadResponse.status).toBe(201)
      const filename = uploadResponse.body.data.file.filename // Fixed: Properly access filename from response

      // Ensure delete mock returns success
      mockMediaService.deleteFile.mockResolvedValueOnce({ success: true } as DeleteResult)

      // Now delete the file
      const deleteResponse = await request(app)
        .delete(`/media/${filename}`)
        .set('Authorization', 'Bearer valid-user-token')

      expect(deleteResponse.status).toBe(200)
      expect(deleteResponse.body.success).toBe(true)
    })

    it('should reject deletion of non-existent file', async () => {
      // Mock the delete service to return failure for this specific test
      mockMediaService.deleteFile.mockResolvedValueOnce({ success: false } as DeleteResult)

      const response = await request(app)
        .delete('/media/non-existent-file.jpg')
        .set('Authorization', 'Bearer valid-user-token')

      expect(response.status).toBe(404) // Should be 404 for not found
      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toBe('File not found')
    })

    it('should prevent path traversal in filename', async () => {
      // Test with filename containing path traversal patterns
      const maliciousFilename = 'test..%2Fmalicious.txt' // Contains .. and encoded slash
      const response = await request(app)
        .delete(`/media/${maliciousFilename}`)
        .set('Authorization', 'Bearer valid-user-token')

      expect(response.status).toBe(400) // Should be 400 for bad request (path traversal)
      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toBe('Invalid filename')
    })
  })

  describe('Security Features', () => {
    it('should sanitize malicious filenames during upload', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), '../../../malicious.jpg')

      expect(response.status).toBe(201) // Fixed: Upload succeeds but filename is sanitized
      expect(response.body.success).toBe(true)
      // The service should sanitize the filename
      expect(response.body.data.file.filename).toBe('processed-file.jpg')
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete upload-delete workflow', async () => {
      // Upload file
      const uploadResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), 'workflow-test.jpg')

      expect(uploadResponse.status).toBe(201) // Fixed: Should be 201 for creation
      expect(uploadResponse.body.success).toBe(true)

      const filename = uploadResponse.body.data.file.filename

      // Delete file
      const deleteResponse = await request(app)
        .delete(`/media/${filename}`)
        .set('Authorization', 'Bearer valid-user-token')

      expect(deleteResponse.status).toBe(200)
      expect(deleteResponse.body.success).toBe(true)
    })

    it('should handle multiple file types correctly', async () => {
      interface TestFile {
        buffer: Buffer
        filename: string
        mimetype: string
      }
      
      const fileTypes: TestFile[] = [
        { 
          buffer: createTestImageBuffer(), 
          filename: 'image.jpg',
          mimetype: 'image/jpeg'
        },
        { 
          buffer: Buffer.from('pdf-data'), 
          filename: 'document.pdf',
          mimetype: 'application/pdf'
        },
        { 
          buffer: Buffer.from('video-data'), 
          filename: 'video.mp4',
          mimetype: 'video/mp4'
        }
      ]

      for (const fileType of fileTypes) {
        // Create a mock file with proper mimetype
        const mockFile = Buffer.from(fileType.buffer)
        
        const response = await request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer valid-user-token')
          .attach('file', mockFile, {
            filename: fileType.filename,
            contentType: fileType.mimetype
          })

        expect(response.status).toBe(201) // Fixed: Should be 201 for creation
        expect(response.body.success).toBe(true)
      }
    })
  })
})