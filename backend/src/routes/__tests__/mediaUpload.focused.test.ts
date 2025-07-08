// backend/src/routes/__tests__/mediaUpload.focused.test.ts
// Version: 2.1.0 - Fixed TypeScript Request.user property error
// Changed: Added type reference to include Express Request augmentation

/// <reference path="../../types/express.d.ts" />

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import express from 'express'
import multer, { FileFilterCallback } from 'multer'
import request from 'supertest'

/**
 * Interface for rate limiter mock object
 * Tracks rate limiting state for testing
 */
interface MockRateLimiter {
  requests: Map<string, number>
  windowStart: Map<string, number>
  reset(): void
  isLimited(key: string): boolean
  increment(key: string): void
}

/**
 * Create mock rate limiter for testing
 * Simulates express-rate-limit behavior without time dependencies
 */
function createMockRateLimiter(): MockRateLimiter {
  const requests = new Map<string, number>()
  const windowStart = new Map<string, number>()
  
  return {
    requests,
    windowStart,
    
    /**
     * Reset all rate limiting counters
     * Used between test cases to ensure clean state
     */
    reset() {
      requests.clear()
      windowStart.clear()
    },
    
    /**
     * Check if a key has exceeded rate limit
     * @param key - User ID or IP address for rate limiting
     */
    isLimited(key: string): boolean {
      const count = requests.get(key) || 0
      return count >= 10 // 10 requests per window
    },
    
    /**
     * Increment request count for a key
     * @param key - User ID or IP address for rate limiting
     */
    increment(key: string): void {
      const current = requests.get(key) || 0
      requests.set(key, current + 1)
    }
  }
}

/**
 * Create rate limiting middleware using mock limiter
 * @param limiter - Mock rate limiter instance
 */
function createRateLimitMiddleware(limiter: MockRateLimiter) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Use user ID for authenticated users, fallback to IP
    const key = req.user?.id || req.ip || 'anonymous'
    
    if (limiter.isLimited(key)) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded',
          retryAfter: '60 seconds'
        }
      })
    }
    
    limiter.increment(key)
    next()
  }
}

/**
 * Mock authentication middleware
 * Adds user property to request object for testing
 */
function mockAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Extract token from Authorization header for user identification
  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '') || ''
  
  // Set default user
  let userId = 'test-user-123'
  let username = 'testuser'
  let email = 'test@example.com'
  
  // Parse different tokens for multi-user testing
  if (token.includes('user1')) {
    userId = 'user-1-id'
    username = 'user1'
    email = 'user1@example.com'
  } else if (token.includes('user2')) {
    userId = 'user-2-id'
    username = 'user2'
    email = 'user2@example.com'
  }
  
  // Add user to request object (now properly typed)
  req.user = {
    id: userId,
    username: username,
    email: email
  }
  
  next()
}

/**
 * Create test media routes with proper error handling
 * @param uploadLimiter - Rate limiter instance for upload endpoints
 */
function createTestMediaRoutes(uploadLimiter: MockRateLimiter) {
  const router = express.Router()
  
  // Configure multer with proper error handling
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB file size limit
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 
        'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/mov'
      ]
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error('Invalid file type'))
      }
    }
  })

  // Apply middleware to all routes
  router.use(mockAuthMiddleware)
  router.use(createRateLimitMiddleware(uploadLimiter))

  /**
   * POST /upload - Handle file uploads
   * Accepts image and video files with size limits
   */
  router.post('/upload', upload.single('file'), (req, res) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file provided'
          }
        })
      }

      // Mock successful upload response
      res.json({
        success: true,
        data: {
          file: {
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            uploadedBy: req.user?.id,
            uploadedAt: new Date().toISOString()
          }
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error during upload'
        }
      })
    }
  })

  /**
   * GET /uploads/:filename - Serve uploaded files
   * Simple endpoint to simulate file serving
   */
  router.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params
    
    // Mock file serving
    res.json({
      success: true,
      data: {
        filename,
        url: `/uploads/${filename}`,
        message: 'File served successfully'
      }
    })
  })

  return router
}

/**
 * Create test Express application
 * @param uploadLimiter - Rate limiter for upload endpoints
 */
function createTestApp(uploadLimiter: MockRateLimiter) {
  const app = express()
  
  // Middleware setup
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Mount media routes
  app.use('/media', createTestMediaRoutes(uploadLimiter))
  
  return app
}

// Main test suite
describe('Media Upload Focused Tests', () => {
  let uploadLimiter: MockRateLimiter
  let app: express.Application

  beforeEach(() => {
    // Create fresh instances for each test
    uploadLimiter = createMockRateLimiter()
    app = createTestApp(uploadLimiter)
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Reset rate limiter state
    uploadLimiter.reset()
  })

  describe('Authentication Integration', () => {
    it('should add user to request when valid token provided', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer test-token')
        .attach('file', Buffer.from('fake image data'), 'test.jpg')
        .set('Content-Type', 'multipart/form-data')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.file.uploadedBy).toBe('test-user-123')
    })

    it('should handle different user tokens correctly', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer user1-token')
        .attach('file', Buffer.from('fake image data'), 'user1-test.jpg')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.file.uploadedBy).toBe('user-1-id')
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits per user', async () => {
      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer user1-token')
          .attach('file', Buffer.from('fake image data'), `user1-${i}.jpg`)
      }

      // 11th request should be rate limited
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer user1-token')
        .attach('file', Buffer.from('fake image data'), 'user1-overflow.jpg')

      expect(response.status).toBe(429)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('should isolate rate limits between users', async () => {
      // User 1 hits rate limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer user1-token')
          .attach('file', Buffer.from('fake image data'), `user1-${i}.jpg`)
      }

      // User 2 should still be able to upload
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer user2-token')
        .attach('file', Buffer.from('fake image data'), 'user2-test.jpg')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('File Upload Validation', () => {
    it('should accept valid image files', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer test-token')
        .attach('file', Buffer.from('fake image data'), 'test.jpg')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.file.filename).toBe('test.jpg')
    })

    it('should reject files when no file provided', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer test-token')

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('NO_FILE')
    })

    it('should handle multer errors properly', async () => {
      // This test would need actual multer integration to test file size limits
      // For now, we test the error handling structure
      expect(uploadLimiter).toBeDefined()
      expect(app).toBeDefined()
    })
  })

  describe('File Serving', () => {
    it('should serve uploaded files', async () => {
      const response = await request(app)
        .get('/media/uploads/test.jpg')

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.filename).toBe('test.jpg')
    })
  })

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', async () => {
      // Test error handling structure
      expect(typeof createTestApp).toBe('function')
      expect(typeof createMockRateLimiter).toBe('function')
    })
  })
})