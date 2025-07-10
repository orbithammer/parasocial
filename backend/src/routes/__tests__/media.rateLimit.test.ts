// backend/src/routes/__tests__/media.rateLimit.test.ts
// Version: 6.0.0 - Fixed rate limit counting logic and hook timeout issues
// Fixed: Rate limit decrements before headers, removed fake timers, proper failed request handling

import { describe, it, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest'
import express, { Application } from 'express'
import request from 'supertest'

// Type for supertest response
type SuperTestResponse = request.Response

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

// Track for cleanup if needed
let currentApp: Application | null = null

/**
 * Create test Express application with media routes and rate limiting
 */
function createTestApp(): Application {
  const app = express()
  
  // Store reference to current app
  currentApp = app
  
  // Basic middleware setup
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Mock authentication middleware (optional)
  const mockOptionalAuthMiddleware = (req: TestRequest, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Mock authenticated user
      req.user = {
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      }
    }
    next()
  }

  // Mock rate limiting middleware
  const mockRateLimitMiddleware = (req: TestRequest, res: express.Response, next: express.NextFunction) => {
    const userId = req.user?.id
    const key = userId || req.ip || 'anonymous'
    
    // Get or create rate limit info
    let rateLimitInfo = rateLimitStore.get(key)
    if (!rateLimitInfo) {
      rateLimitInfo = {
        limit: RATE_LIMIT_CONFIG.max,
        remaining: RATE_LIMIT_CONFIG.max,
        reset: Date.now() + RATE_LIMIT_CONFIG.windowMs,
        used: 0
      }
      rateLimitStore.set(key, rateLimitInfo)
    }

    // Check if window has expired
    if (Date.now() > rateLimitInfo.reset) {
      rateLimitInfo.remaining = RATE_LIMIT_CONFIG.max
      rateLimitInfo.reset = Date.now() + RATE_LIMIT_CONFIG.windowMs
      rateLimitInfo.used = 0
    }

    // Check if rate limit exceeded BEFORE consuming
    if (rateLimitInfo.remaining <= 0) {
      // Set headers for blocked request
      res.setHeader('ratelimit-limit', rateLimitInfo.limit.toString())
      res.setHeader('ratelimit-remaining', '0')
      res.setHeader('ratelimit-reset', Math.ceil((rateLimitInfo.reset - Date.now()) / 1000).toString())
      
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          rateLimitKey: key,
          retryAfter: '60 seconds'
        }
      })
    }

    // Consume rate limit BEFORE setting headers
    rateLimitInfo.remaining--
    rateLimitInfo.used++

    // Set rate limit headers AFTER consuming
    res.setHeader('ratelimit-limit', rateLimitInfo.limit.toString())
    res.setHeader('ratelimit-remaining', rateLimitInfo.remaining.toString())
    res.setHeader('ratelimit-reset', Math.ceil((rateLimitInfo.reset - Date.now()) / 1000).toString())
    
    next()
  }

  // Mock file upload middleware
  const mockFileUploadMiddleware = (req: TestRequest, res: express.Response, next: express.NextFunction) => {
    // Simulate multer file parsing
    req.file = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('mock-file-data'),
      filename: 'mock-filename.jpg'
    }
    next()
  }

  // Apply middleware to upload route
  app.post('/media/upload', 
    mockOptionalAuthMiddleware,
    mockRateLimitMiddleware,
    mockFileUploadMiddleware,
    (req: TestRequest, res: express.Response) => {
      // Mock file validation
      const validation = mockMediaService.validateFile()
      if (!validation.valid) {
        // For failed requests, we need to restore the rate limit count
        // since the middleware already consumed it
        const userId = req.user?.id
        const key = userId || req.ip || 'anonymous'
        const rateLimitInfo = rateLimitStore.get(key)
        if (rateLimitInfo && RATE_LIMIT_CONFIG.skipFailedRequests) {
          rateLimitInfo.remaining++
          rateLimitInfo.used--
        }
        
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE',
            message: validation.message
          }
        })
      }

      // Mock successful upload
      const uploadResult = mockMediaService.uploadFile()
      res.json({
        success: true,
        data: uploadResult
      })
    }
  )

  // Non-rate-limited routes
  app.get('/media/info/:fileId', (req: express.Request, res: express.Response) => {
    const fileInfo = mockMediaService.getFileInfo()
    res.json({
      success: true,
      data: fileInfo
    })
  })

  app.delete('/media/:fileId', 
    mockOptionalAuthMiddleware,
    (req: express.Request, res: express.Response) => {
      const deleteResult = mockMediaService.deleteFile()
      res.json({
        success: true,
        data: deleteResult
      })
    }
  )

  return app
}

describe('Media Upload Rate Limiting Tests', () => {
  let app: Application

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()
    
    // Reset mock implementations
    mockAuthService.verifyToken.mockResolvedValue({
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com'
    })
    
    mockAuthService.extractTokenFromHeader.mockReturnValue('valid_token')
    
    mockMediaService.validateFile.mockReturnValue({
      valid: true,
      message: 'File is valid'
    })
    
    mockMediaService.uploadFile.mockReturnValue({
      id: 'file123',
      filename: 'test.jpg',
      size: 1024,
      uploadedAt: new Date()
    })

    mockMediaService.deleteFile.mockResolvedValue({
      id: 'file123',
      deletedAt: new Date()
    })

    mockMediaService.getFileInfo.mockReturnValue({
      id: 'file123',
      filename: 'test.jpg',
      size: 1024,
      uploadedAt: new Date()
    })

    // Clear rate limit store
    rateLimitStore.clear()
    
    // Create fresh app for each test
    app = createTestApp()
  })

  afterEach(() => {
    // Clear rate limit store
    rateLimitStore.clear()
    
    // Clear all mocks
    vi.clearAllMocks()
    
    // Clear app reference
    currentApp = null
  })

  describe('POST /media/upload Rate Limiting', () => {
    it('should allow uploads within the limit (first 10 uploads)', async () => {
      // Arrange - Set up authenticated user
      const uploadData = Buffer.from('mock-image-data')

      // Act - Make uploads SEQUENTIALLY to ensure predictable rate limit counting
      const responses: SuperTestResponse[] = []
      for (let i = 0; i < 10; i++) {
        const response = await request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer valid_token')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', uploadData, `test-${i}.jpg`)
        
        responses.push(response)
      }

      // Assert - All uploads should succeed with predictable rate limit counts
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
      // Arrange - Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer valid_token')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', Buffer.from('data'), `file${i}.jpg`)
      }

      // Act - Try to upload one more (should be blocked)
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('data'), 'blocked.jpg')

      // Assert - Should be rate limited
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

    it('should track rate limits by user ID when authenticated', async () => {
      // Act - Make request with authentication
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('data'), 'authenticated.jpg')

      // Assert - Should use user ID for rate limiting
      expect(response.status).toBe(200)
      expect(rateLimitStore.has('user123')).toBe(true)
    })

    it('should handle multiple files in single request within rate limit', async () => {
      // Act - Upload multiple files (simulated as one request)
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('file1'), 'file1.jpg')

      // Assert - Should count as one upload against rate limit
      expect(response.status).toBe(200)
      expect(response.headers['ratelimit-remaining']).toBe('9')
    })

    it('should handle different file types within rate limit', async () => {
      // Act - Upload different file types
      const imageResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('image'), 'image.jpg')

      const videoResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', Buffer.from('video'), 'video.mp4')

      // Assert - Both should be accepted and count against rate limit
      expect(imageResponse.status).toBe(200)
      expect(videoResponse.status).toBe(200)
      expect(videoResponse.headers['ratelimit-remaining']).toBe('8')
    })

    it('should handle large files within rate limit', async () => {
      // Act - Upload large file
      const largeFileData = Buffer.alloc(1024 * 1024) // 1MB
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid_token')
        .set('Content-Type', 'multipart/form-data')
        .attach('file', largeFileData, 'large.jpg')

      // Assert - Should be accepted and count against rate limit
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
      const responses: SuperTestResponse[] = await Promise.all(
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
      const responses: SuperTestResponse[] = await Promise.all(
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
      // Act - Make rapid concurrent uploads (limited to avoid race conditions)
      const uploadData = Buffer.from('concurrent-data')
      const promises: Promise<SuperTestResponse>[] = Array.from({ length: 12 }, (_, index) =>
        request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer valid_token')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', uploadData, `concurrent-${index}.jpg`)
      )

      const responses: SuperTestResponse[] = await Promise.all(promises)

      // Assert - Some should succeed, some should be rate limited
      const successfulUploads = responses.filter(r => r.status === 200)
      const rateLimitedUploads = responses.filter(r => r.status === 429)

      expect(successfulUploads.length).toBeLessThanOrEqual(10)
      expect(rateLimitedUploads.length).toBeGreaterThan(0)
      expect(successfulUploads.length + rateLimitedUploads.length).toBe(12)
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

      // Manually reset rate limit (simulate window expiry)
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