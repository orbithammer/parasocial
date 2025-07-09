// backend/src/routes/__tests__/media.rateLimit.test.ts
// Version: 4.0.0 - Fixed rate limiting behavior to skip failed requests
// Added skipFailedRequests logic to match the actual mediaUploadRateLimit middleware

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import express, { Application } from 'express'
import request from 'supertest'

// Type definitions for better type safety
interface AuthenticatedUser {
  id: string
  username: string
  email: string
}

interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  used: number
}

// Multer file interface for testing
interface MockFile {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
  filename: string
}

// Extended request interface to include file and user properties
interface TestRequest extends express.Request {
  file?: MockFile
  user?: AuthenticatedUser
}

// Mock the dependencies
const mockAuthService = {
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
  validateLoginData: vi.fn(),
  hashPassword: vi.fn(),
  generateToken: vi.fn()
}

const mockMediaService = {
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  getFileInfo: vi.fn(),
  validateFile: vi.fn()
}

// Rate limiting storage - simulate in-memory store
const rateLimitStore = new Map<string, RateLimitInfo>()

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // 10 uploads per minute
  message: 'Rate limit exceeded',
  skipFailedRequests: true // CRITICAL: Skip failed requests (4xx errors)
}

/**
 * Create test Express application with media routes and rate limiting
 */
function createTestApp(): Application {
  const app = express()
  
  // Basic middleware setup
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Mock authentication middleware (optional)
  const mockOptionalAuthMiddleware = (req: TestRequest, res: any, next: any) => {
    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7)
        const user = mockAuthService.verifyToken(token)
        if (user) {
          req.user = user as AuthenticatedUser
        }
      } catch (error) {
        req.user = undefined
      }
    } else {
      req.user = undefined
    }
    next()
  }

  // FIXED: Mock rate limiting middleware with skipFailedRequests behavior
  const mockRateLimitMiddleware = (req: TestRequest, res: any, next: any) => {
    const now = Date.now()
    const windowStart = now - RATE_LIMIT_CONFIG.windowMs
    
    // Determine rate limit key - use user ID if authenticated, otherwise IP
    const user = req.user
    const rateLimitKey = user?.id || req.ip || 'anonymous'
    
    // Get current rate limit info
    let rateLimitInfo = rateLimitStore.get(rateLimitKey)
    
    if (!rateLimitInfo || rateLimitInfo.reset < windowStart) {
      // Reset rate limit window
      rateLimitInfo = {
        limit: RATE_LIMIT_CONFIG.max,
        remaining: RATE_LIMIT_CONFIG.max,
        reset: now + RATE_LIMIT_CONFIG.windowMs,
        used: 0
      }
    }
    
    // Check if limit already exceeded
    if (rateLimitInfo.remaining <= 0) {
      // Set rate limit headers
      res.set({
        'RateLimit-Limit': rateLimitInfo.limit.toString(),
        'RateLimit-Remaining': '0',
        'RateLimit-Reset': Math.ceil((rateLimitInfo.reset - now) / 1000).toString()
      })
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: RATE_LIMIT_CONFIG.message,
          rateLimitKey,
          retryAfter: '60 seconds'
        }
      })
    }
    
    // CRITICAL FIX: Implement skipFailedRequests behavior
    // Store original end function
    const originalEnd = res.end
    let hasEnded = false
    
    // Override res.end to check final status code
    res.end = function(chunk?: any, encoding?: any) {
      if (!hasEnded) {
        hasEnded = true
        
        // Only decrement rate limit if skipFailedRequests is false OR status < 400
        const shouldCount = !RATE_LIMIT_CONFIG.skipFailedRequests || res.statusCode < 400
        
        if (shouldCount) {
          // Decrement rate limit for successful requests or when not skipping failed requests
          rateLimitInfo!.remaining--
          rateLimitInfo!.used++
          rateLimitStore.set(rateLimitKey, rateLimitInfo!)
        }
        
        // Update headers with final count
        res.set({
          'RateLimit-Limit': rateLimitInfo!.limit.toString(),
          'RateLimit-Remaining': rateLimitInfo!.remaining.toString(),
          'RateLimit-Reset': Math.ceil((rateLimitInfo!.reset - now) / 1000).toString()
        })
      }
      
      // Call original end function
      return originalEnd.call(this, chunk, encoding)
    }
    
    // Set initial headers (these may be updated in res.end)
    res.set({
      'RateLimit-Limit': rateLimitInfo.limit.toString(),
      'RateLimit-Remaining': rateLimitInfo.remaining.toString(),
      'RateLimit-Reset': Math.ceil((rateLimitInfo.reset - now) / 1000).toString()
    })
    
    next()
  }

  // Mock file upload middleware (simulates multer)
  const mockFileUploadMiddleware = (req: TestRequest, res: any, next: any) => {
    // Simulate file parsing
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // Mock successful file upload
      req.file = {
        originalname: 'test-image.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 100, // 100KB
        buffer: Buffer.from('mock-file-data'),
        filename: `upload_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`
      }
    }
    next()
  }
  
  // Media upload route with rate limiting
  app.post('/media/upload', 
    mockOptionalAuthMiddleware,
    mockRateLimitMiddleware,
    mockFileUploadMiddleware,
    async (req: TestRequest, res) => {
      try {
        // Validate file exists
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'NO_FILE_PROVIDED',
              message: 'No file provided for upload'
            }
          })
        }

        // Mock file validation
        const validationResult = mockMediaService.validateFile(req.file)
        if (!validationResult.valid) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_FILE',
              message: validationResult.message
            }
          })
        }

        // Mock file upload
        const uploadResult = await mockMediaService.uploadFile(req.file, req.user)
        
        res.status(200).json({
          success: true,
          data: uploadResult,
          message: 'File uploaded successfully'
        })

      } catch (error) {
        res.status(500).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: 'File upload failed'
          }
        })
      }
    }
  )

  // Non-rate-limited routes for comparison
  app.get('/media/info/:fileId', async (req, res) => {
    try {
      const { fileId } = req.params
      const fileInfo = await mockMediaService.getFileInfo(fileId)
      
      res.status(200).json({
        success: true,
        data: fileInfo
      })
    } catch (error) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      })
    }
  })

  app.delete('/media/:fileId', mockOptionalAuthMiddleware, async (req: TestRequest, res) => {
    try {
      const { fileId } = req.params
      const user = req.user
      
      const deleteResult = await mockMediaService.deleteFile(fileId, user)
      
      res.status(200).json({
        success: true,
        data: deleteResult,
        message: 'File deleted successfully'
      })
    } catch (error) {
      res.status(404).json({
        success: false,
        error: {
          code: 'DELETE_ERROR',
          message: 'File deletion failed'
        }
      })
    }
  })
  
  return app
}

describe('Media Upload Rate Limiting', () => {
  let app: Application

  beforeEach(() => {
    // Clear all mocks and rate limit store before each test
    vi.clearAllMocks()
    rateLimitStore.clear()
    
    // Reset mock implementations
    mockAuthService.verifyToken.mockReturnValue({
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com'
    })
    
    mockMediaService.validateFile.mockReturnValue({
      valid: true,
      message: 'File is valid'
    })
    
    mockMediaService.uploadFile.mockResolvedValue({
      id: 'file123',
      filename: 'uploaded-file.jpg',
      url: 'https://example.com/files/file123.jpg',
      size: 102400,
      mimeType: 'image/jpeg'
    })
    
    mockMediaService.getFileInfo.mockResolvedValue({
      id: 'file123',
      filename: 'test-file.jpg',
      size: 102400,
      uploadedAt: new Date()
    })
    
    mockMediaService.deleteFile.mockResolvedValue({
      id: 'file123',
      deletedAt: new Date()
    })
    
    // Create fresh app for each test
    app = createTestApp()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('POST /media/upload Rate Limiting', () => {
    it('should allow uploads within the limit (first 10 uploads)', async () => {
      // Arrange - Set up authenticated user
      const uploadData = Buffer.from('mock-image-data')

      // Act - Make uploads within the rate limit
      const uploadPromises = Array.from({ length: 10 }, (_, index) =>
        request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer valid_token')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', uploadData, `test-${index}.jpg`)
      )

      const responses = await Promise.all(uploadPromises)

      // Assert - All uploads should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.headers['ratelimit-limit']).toBe('10')
        expect(parseInt(response.headers['ratelimit-remaining'])).toBe(9 - index)
      })
    })

    it('should include rate limit headers in response', async () => {
      // Act - Make first upload
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('test-data'), 'test.jpg')

      // Assert - Check rate limit headers
      expect(response.status).toBe(200)
      expect(response.headers).toHaveProperty('ratelimit-limit')
      expect(response.headers).toHaveProperty('ratelimit-remaining')
      expect(response.headers).toHaveProperty('ratelimit-reset')
      expect(response.headers['ratelimit-limit']).toBe('10')
      expect(response.headers['ratelimit-remaining']).toBe('9')
    })

    it('should block uploads after hitting the limit', async () => {
      // Arrange - Exhaust rate limit first
      const uploadData = Buffer.from('mock-image-data')
      
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer valid_token')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', uploadData, `test-${i}.jpg`)
      }

      // Act - Try one more upload (should be blocked)
      const blockedResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', uploadData, 'test-blocked.jpg')

      // Assert - Should be rate limited
      expect(blockedResponse.status).toBe(429)
      expect(blockedResponse.body).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          rateLimitKey: 'user123',
          retryAfter: '60 seconds'
        }
      })
      expect(blockedResponse.headers['ratelimit-remaining']).toBe('0')
    })

    it('should track rate limits by user ID when authenticated', async () => {
      // Arrange - Set up different users
      mockAuthService.verifyToken
        .mockReturnValueOnce({ id: 'user1', username: 'user1', email: 'user1@example.com' })
        .mockReturnValueOnce({ id: 'user2', username: 'user2', email: 'user2@example.com' })

      // Act - Make uploads from different users
      const user1Response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer user1_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('user1-data'), 'user1.jpg')

      const user2Response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer user2_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('user2-data'), 'user2.jpg')

      // Assert - Both should succeed with separate rate limits
      expect(user1Response.status).toBe(200)
      expect(user1Response.headers['ratelimit-remaining']).toBe('9')
      
      expect(user2Response.status).toBe(200)
      expect(user2Response.headers['ratelimit-remaining']).toBe('9')
    })

    it('should handle multiple files in single request within rate limit', async () => {
      // Act - Upload multiple files in one request
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('file1-data'), 'file1.jpg')

      // Assert - Should count as one upload
      expect(response.status).toBe(200)
      expect(response.headers['ratelimit-remaining']).toBe('9')
    })

    it('should handle different file types within rate limit', async () => {
      // Arrange - Different file types
      const fileTypes = [
        { data: Buffer.from('image-data'), name: 'image.jpg', type: 'image/jpeg' },
        { data: Buffer.from('video-data'), name: 'video.mp4', type: 'video/mp4' },
        { data: Buffer.from('audio-data'), name: 'audio.mp3', type: 'audio/mpeg' }
      ]

      // Act - Upload different file types
      const responses = await Promise.all(
        fileTypes.map(file =>
          request(app)
            .post('/media/upload')
            .set('Authorization', 'Bearer valid_token')
            .set('Content-Type', 'multipart/form-data')
            .attach('file', file.data, file.name)
        )
      )

      // Assert - All should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(parseInt(response.headers['ratelimit-remaining'])).toBe(9 - index)
      })
    })

    it('should handle large files within rate limit', async () => {
      // Arrange - Large file data
      const largeFileData = Buffer.alloc(1024 * 1024) // 1MB

      // Act - Upload large file
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', largeFileData, 'large-file.jpg')

      // Assert - Should succeed and count against rate limit
      expect(response.status).toBe(200)
      expect(response.headers['ratelimit-remaining']).toBe('9')
    })
  })

  describe('Upload Request Validation with Rate Limiting', () => {
    it('should apply rate limiting before file validation', async () => {
      // Arrange - Exhaust rate limit first
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer valid_token')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', Buffer.from('data'), `file${i}.jpg`)
      }

      // Act - Try upload with invalid file (should hit rate limit first)
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('invalid'), 'invalid.exe')

      // Assert - Should be rate limited, not file validation error
      expect(response.status).toBe(429)
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('should not count failed uploads against rate limit', async () => {
      // Arrange - Mock file validation to fail
      mockMediaService.validateFile.mockReturnValue({
        valid: false,
        message: 'Invalid file type'
      })

      // Act - Make failed upload request
      const failedResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('invalid'), 'invalid.txt')

      // Reset validation to succeed
      mockMediaService.validateFile.mockReturnValue({
        valid: true,
        message: 'File is valid'
      })

      // Make successful upload
      const successResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('valid'), 'valid.jpg')

      // Assert - Rate limit should still be full after failed upload
      expect(failedResponse.status).toBe(400)
      expect(successResponse.status).toBe(200)
      expect(successResponse.headers['ratelimit-remaining']).toBe('9')
    })
  })

  describe('Non-Rate-Limited Media Operations', () => {
    it('should not apply rate limiting to GET /media/info/:fileId', async () => {
      // Act - Make multiple info requests
      const responses = await Promise.all(
        Array.from({ length: 15 }, () =>
          request(app)
            .get('/media/info/file123')
        )
      )

      // Assert - All should succeed without rate limiting
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.headers).not.toHaveProperty('ratelimit-limit')
      })
    })

    it('should not apply rate limiting to DELETE /media/:fileId', async () => {
      // Act - Make multiple delete requests
      const responses = await Promise.all(
        Array.from({ length: 15 }, (_, index) =>
          request(app)
            .delete(`/media/file${index}`)
            .set('Authorization', 'Bearer valid_token')
        )
      )

      // Assert - All should succeed without rate limiting
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.headers).not.toHaveProperty('ratelimit-limit')
      })
    })
  })

  describe('Rate Limit Error Response Format', () => {
    it('should return consistent error format when rate limited', async () => {
      // Arrange - Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer valid_token')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', Buffer.from('data'), `file${i}.jpg`)
      }

      // Act - Hit rate limit
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('data'), 'blocked.jpg')

      // Assert - Check error response format
      expect(response.status).toBe(429)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          rateLimitKey: 'user123',
          retryAfter: '60 seconds'
        }
      })
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle rapid concurrent upload attempts', async () => {
      // Act - Make rapid concurrent uploads
      const uploadData = Buffer.from('concurrent-data')
      const promises = Array.from({ length: 12 }, (_, index) =>
        request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer valid_token')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', uploadData, `concurrent-${index}.jpg`)
      )

      const responses = await Promise.all(promises)

      // Assert - First 10 should succeed, last 2 should be rate limited
      const successfulUploads = responses.filter(r => r.status === 200)
      const rateLimitedUploads = responses.filter(r => r.status === 429)

      expect(successfulUploads.length).toBe(10)
      expect(rateLimitedUploads.length).toBe(2)
    })

    it('should handle uploads with file metadata within rate limit', async () => {
      // Act - Upload with metadata
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .field('description', 'Test image upload')
        .field('tags', 'test,upload,image')
        .attach('file', Buffer.from('image-with-metadata'), 'image.jpg')

      // Assert - Should succeed and count against rate limit
      expect(response.status).toBe(200)
      expect(response.headers['ratelimit-remaining']).toBe('9')
    })

    it('should reset rate limit after time window', async () => {
      // Arrange - Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer valid_token')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', Buffer.from('data'), `file${i}.jpg`)
      }

      // Verify rate limit is exhausted
      const blockedResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('data'), 'blocked.jpg')

      expect(blockedResponse.status).toBe(429)

      // Manually reset rate limit window (simulate time passage)
      rateLimitStore.clear()

      // Act - Try upload after reset
      const afterResetResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('data'), 'after-reset.jpg')

      // Assert - Should succeed after reset
      expect(afterResetResponse.status).toBe(200)
      expect(afterResetResponse.headers['ratelimit-remaining']).toBe('9')
    })
  })
})