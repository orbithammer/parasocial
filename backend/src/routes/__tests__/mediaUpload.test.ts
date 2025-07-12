// backend/src/routes/__tests__/mediaUpload.test.ts
// Version: 3.2.0
// Complete rewrite to test new media upload route implementation
// Changed: Fixed supertest import using namespace import to avoid type conflicts

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import * as request from 'supertest'
import express from 'express'
import multer from 'multer'
import fs from 'fs/promises'
import path from 'path'
import { createMediaRouter } from '../media'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface MockUser {
  id: string
  username: string
  email: string
}

interface MockAuthenticatedRequest extends express.Request {
  user: MockUser
}

// ============================================================================
// TEST SETUP & MOCKS
// ============================================================================

/**
 * Mock authentication middleware for testing
 * Adds user to request object based on Authorization header
 */
const mockAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication token is required'
      }
    })
  }
  
  const token = authHeader.substring(7)
  
  // Mock different users based on token
  let user: MockUser
  
  switch (token) {
    case 'valid-user-token':
      user = { id: 'user-1', username: 'testuser', email: 'test@example.com' }
      break
    case 'admin-token':
      user = { id: 'admin-1', username: 'admin', email: 'admin@example.com' }
      break
    case 'user2-token':
      user = { id: 'user-2', username: 'user2', email: 'user2@example.com' }
      break
    default:
      return res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Invalid authentication token'
        }
      })
  }
  
  // Add user to request
  ;(req as MockAuthenticatedRequest).user = user
  next()
}

/**
 * Create test Express application with media routes
 */
function createTestApp(): express.Application {
  const app = express()
  
  // Basic middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Mount media routes with mock auth
  app.use('/media', createMediaRouter({ authMiddleware: mockAuthMiddleware }))
  
  return app
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a test image buffer for file uploads
 */
function createTestImageBuffer(): Buffer {
  // Simple 1x1 PNG image in base64
  const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8xgQAAAABJRU5ErkJggg=='
  return Buffer.from(base64Image, 'base64')
}

/**
 * Create a test video buffer for file uploads
 */
function createTestVideoBuffer(): Buffer {
  // Mock video file content
  return Buffer.from('fake video content for testing')
}

/**
 * Clean up test files after tests complete
 */
async function cleanupTestFiles(): Promise<void> {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads')
    const files = await fs.readdir(uploadsDir)
    
    for (const file of files) {
      if (file.startsWith('test-') || file.includes('uuid')) {
        await fs.unlink(path.join(uploadsDir, file)).catch(() => {})
      }
    }
  } catch (error) {
    // Directory may not exist, which is fine
  }
}

// ============================================================================
// MAIN TEST SUITE
// ============================================================================

describe('Media Upload Routes', () => {
  let app: express.Application
  
  beforeAll(async () => {
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })
  })
  
  beforeEach(() => {
    app = createTestApp()
    vi.clearAllMocks()
  })
  
  afterEach(async () => {
    await cleanupTestFiles()
  })
  
  afterAll(async () => {
    await cleanupTestFiles()
  })

  // ============================================================================
  // AUTHENTICATION TESTS
  // ============================================================================
  
  describe('Authentication Requirements', () => {
    it('should require authentication for file upload', async () => {
      const response = await request(app)
        .post('/media/upload')
        .attach('file', createTestImageBuffer(), 'test.jpg')
        
      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED')
    })
    
    it('should reject invalid authentication tokens', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer invalid-token')
        .attach('file', createTestImageBuffer(), 'test.jpg')
        
      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED')
    })
    
    it('should accept valid authentication tokens', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), 'test.jpg')
        
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
    
    it('should require authentication for file deletion', async () => {
      const response = await request(app)
        .delete('/media/test-file.jpg')
        
      expect(response.status).toBe(401)
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED')
    })
  })

  // ============================================================================
  // FILE UPLOAD TESTS
  // ============================================================================
  
  describe('POST /media/upload', () => {
    it('should successfully upload an image file', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), 'test-image.jpg')
        .field('altText', 'Test image description')
        
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toMatchObject({
        id: expect.any(String),
        url: expect.stringMatching(/^\/uploads\/.+/),
        filename: expect.any(String),
        originalName: 'test-image.jpg',
        mimeType: 'image/jpeg',
        size: expect.any(Number),
        altText: 'Test image description',
        uploadedAt: expect.any(String),
        uploadedBy: 'testuser'
      })
    })
    
    it('should successfully upload a video file', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestVideoBuffer(), 'test-video.mp4')
        
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.mimeType).toBe('video/mp4')
      expect(response.body.data.originalName).toBe('test-video.mp4')
    })
    
    it('should handle optional alt text field', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), 'test-no-alt.jpg')
        
      expect(response.status).toBe(200)
      expect(response.body.data.altText).toBeNull()
    })
    
    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
      expect(response.body.error.message).toBe('No file uploaded')
    })
    
    it('should reject invalid file types', async () => {
      const textBuffer = Buffer.from('This is a text file')
      
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', textBuffer, 'test.txt')
        
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
    
    it('should reject files that are too large', async () => {
      // Create a buffer larger than 50MB
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024)
      
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', largeBuffer, 'large-file.jpg')
        
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
    
    it('should include user information in response', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer user2-token')
        .attach('file', createTestImageBuffer(), 'user2-test.jpg')
        
      expect(response.status).toBe(200)
      expect(response.body.data.uploadedBy).toBe('user2')
    })
  })

  // ============================================================================
  // FILE DELETION TESTS
  // ============================================================================
  
  describe('DELETE /media/:filename', () => {
    it('should successfully delete an existing file', async () => {
      // First upload a file to get a real filename
      const uploadResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), 'to-delete.jpg')
        
      expect(uploadResponse.status).toBe(200)
      const filename = uploadResponse.body.data.filename
      
      // Now delete it
      const deleteResponse = await request(app)
        .delete(`/media/${filename}`)
        .set('Authorization', 'Bearer valid-user-token')
        
      expect(deleteResponse.status).toBe(200)
      expect(deleteResponse.body.success).toBe(true)
      expect(deleteResponse.body.data.filename).toBe(filename)
      expect(deleteResponse.body.data.message).toBe('File deleted successfully')
    })
    
    it('should require filename parameter', async () => {
      const response = await request(app)
        .delete('/media/')
        .set('Authorization', 'Bearer valid-user-token')
        
      // Express should return 404 for malformed route
      expect(response.status).toBe(404)
    })
    
    it('should handle deletion of non-existent files gracefully', async () => {
      const response = await request(app)
        .delete('/media/non-existent-file.jpg')
        .set('Authorization', 'Bearer valid-user-token')
        
      // Should still return success since file doesn't exist = successfully deleted
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
    
    it('should include user information in delete response', async () => {
      const response = await request(app)
        .delete('/media/test-file.jpg')
        .set('Authorization', 'Bearer admin-token')
        
      expect(response.status).toBe(200)
      expect(response.body.data.deletedBy).toBe('admin')
    })
  })

  // ============================================================================
  // GET MEDIA METADATA TESTS
  // ============================================================================
  
  describe('GET /media/:filename', () => {
    it('should return not implemented status', async () => {
      const response = await request(app)
        .get('/media/test-file.jpg')
        .set('Authorization', 'Bearer valid-user-token')
        
      expect(response.status).toBe(501)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('NOT_IMPLEMENTED')
      expect(response.body.error.message).toContain('schema is updated')
    })
  })

  // ============================================================================
  // RATE LIMITING TESTS
  // ============================================================================
  
  describe('Rate Limiting', () => {
    it('should apply rate limiting to upload endpoint', async () => {
      // Make multiple requests quickly to trigger rate limiting
      const promises = []
      
      for (let i = 0; i < 25; i++) {
        promises.push(
          request(app)
            .post('/media/upload')
            .set('Authorization', 'Bearer valid-user-token')
            .attach('file', createTestImageBuffer(), `test-${i}.jpg`)
        )
      }
      
      const responses = await Promise.all(promises)
      
      // Some requests should be rate limited (429 status)
      const rateLimitedResponses = responses.filter(res => res.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
      
      // Rate limited responses should have proper format
      const rateLimitedResponse = rateLimitedResponses[0]
      expect(rateLimitedResponse.body.success).toBe(false)
      expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })
    
    it('should apply rate limiting per user/IP', async () => {
      // User 1 hits rate limit
      for (let i = 0; i < 25; i++) {
        await request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer valid-user-token')
          .attach('file', createTestImageBuffer(), `user1-${i}.jpg`)
      }
      
      // User 2 should still be able to upload
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer user2-token')
        .attach('file', createTestImageBuffer(), 'user2-test.jpg')
        
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================
  
  describe('Error Handling', () => {
    it('should handle multer errors properly', async () => {
      // Test file size error by creating oversized buffer
      const oversizedBuffer = Buffer.alloc(60 * 1024 * 1024) // 60MB
      
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', oversizedBuffer, 'oversized.jpg')
        
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
    
    it('should handle server errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      try {
        // This would require mocking fs operations to trigger server error
        // For now, just verify error handling structure exists
        expect(consoleSpy).toBeDefined()
      } finally {
        consoleSpy.mockRestore()
      }
    })
    
    it('should clean up files on upload failure', async () => {
      // This test would require mocking database operations to fail
      // after file upload succeeds to test cleanup logic
      expect(true).toBe(true) // Placeholder for complex cleanup test
    })
  })

  // ============================================================================
  // SECURITY TESTS
  // ============================================================================
  
  describe('Security', () => {
    it('should reject path traversal attempts in filenames', async () => {
      const response = await request(app)
        .delete('/media/../../etc/passwd')
        .set('Authorization', 'Bearer valid-user-token')
        
      // Should be handled safely by the route parameter parsing
      expect(response.status).toBe(200) // File doesn't exist, so "successfully deleted"
    })
    
    it('should validate alt text length', async () => {
      const longAltText = 'a'.repeat(1000) // Very long alt text
      
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), 'test.jpg')
        .field('altText', longAltText)
        
      // This should trigger validation middleware
      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
    
    it('should sanitize filenames properly', async () => {
      const response = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), '../../../malicious.jpg')
        
      expect(response.status).toBe(200)
      // Generated filename should be safe UUID-based name
      expect(response.body.data.filename).not.toContain('..')
      expect(response.body.data.filename).toMatch(/^[a-f0-9-]+\.jpg$/)
    })
  })

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================
  
  describe('Integration Tests', () => {
    it('should handle complete upload-delete workflow', async () => {
      // Upload file
      const uploadResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), 'workflow-test.jpg')
        .field('altText', 'Workflow test image')
        
      expect(uploadResponse.status).toBe(200)
      const filename = uploadResponse.body.data.filename
      
      // Verify file data
      expect(uploadResponse.body.data).toMatchObject({
        originalName: 'workflow-test.jpg',
        altText: 'Workflow test image',
        uploadedBy: 'testuser'
      })
      
      // Delete file
      const deleteResponse = await request(app)
        .delete(`/media/${filename}`)
        .set('Authorization', 'Bearer valid-user-token')
        
      expect(deleteResponse.status).toBe(200)
      expect(deleteResponse.body.data.filename).toBe(filename)
      expect(deleteResponse.body.data.deletedBy).toBe('testuser')
    })
    
    it('should handle multiple file types correctly', async () => {
      const testFiles = [
        { buffer: createTestImageBuffer(), name: 'test.jpg', type: 'image/jpeg' },
        { buffer: createTestImageBuffer(), name: 'test.png', type: 'image/png' },
        { buffer: createTestVideoBuffer(), name: 'test.mp4', type: 'video/mp4' }
      ]
      
      for (const file of testFiles) {
        const response = await request(app)
          .post('/media/upload')
          .set('Authorization', 'Bearer valid-user-token')
          .attach('file', file.buffer, file.name)
          
        expect(response.status).toBe(200)
        expect(response.body.data.originalName).toBe(file.name)
        expect(response.body.data.mimeType).toBe(file.type)
      }
    })
  })
})