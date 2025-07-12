// backend/src/routes/__tests__/mediaUpload.test.ts
// Version: 3.3.0
// Fixed supertest import to resolve TypeScript 'Test' not assignable to 'never' error
// Changed: Updated supertest import from namespace to default import

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
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
    it('should successfully delete uploaded file', async () => {
      // First upload a file
      const uploadResponse = await request(app)
        .post('/media/upload')
        .set('Authorization', 'Bearer valid-user-token')
        .attach('file', createTestImageBuffer(), 'delete-test.jpg')
        
      const filename = uploadResponse.body.data.filename
      
      // Then delete it
      const deleteResponse = await request(app)
        .delete(`/media/${filename}`)
        .set('Authorization', 'Bearer valid-user-token')
        
      expect(deleteResponse.status).toBe(200)
      expect(deleteResponse.body.success).toBe(true)
      expect(deleteResponse.body.data.filename).toBe(filename)
    })
    
    it('should reject deletion of non-existent file', async () => {
      const response = await request(app)
        .delete('/media/non-existent-file.jpg')
        .set('Authorization', 'Bearer valid-user-token')
        
      expect(response.status).toBe(404)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('FILE_NOT_FOUND')
    })
    
    it('should prevent path traversal in filename', async () => {
      const response = await request(app)
        .delete('/media/../../../etc/passwd')
        .set('Authorization', 'Bearer valid-user-token')
        
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // ============================================================================
  // SECURITY TESTS
  // ============================================================================
  
  describe('Security Features', () => {
    it('should sanitize malicious filenames during upload', async () => {
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