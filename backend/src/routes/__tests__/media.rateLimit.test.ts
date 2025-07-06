// backend/__tests__/routes/media.rateLimit.test.ts
// Version: 1.0.0 - Initial unit tests for media upload rate limiting
// Tests rate limiting on media uploads to prevent server resource abuse

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express, { Application } from 'express'
import request from 'supertest'
import { createMediaRouter } from '../media'
import path from 'path'
import fs from 'fs'

/**
 * Mock auth middleware for testing
 * @param userId - User ID for authenticated requests
 */
const createMockAuthMiddleware = (userId: string = 'uploader_123') => {
  return vi.fn().mockImplementation(async (req: any, res: any, next: any) => {
    req.user = {
      id: userId,
      email: `${userId}@example.com`,
      username: `user_${userId}`
    }
    next()
  })
}

/**
 * Create test Express application with media routes
 * @param userId - User ID for authenticated requests
 */
function createTestApp(userId: string = 'uploader_123'): Application {
  const app = express()
  
  // Basic middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Mount media routes with rate limiting
  app.use('/media', createMediaRouter({
    authMiddleware: createMockAuthMiddleware(userId)
  }))
  
  return app
}

/**
 * Create a test image file buffer for upload testing
 * @returns Buffer containing a minimal valid image
 */
function createTestImageBuffer(): Buffer {
  // Create a minimal 1x1 PNG image buffer
  // This is a valid PNG file with 1x1 transparent pixel
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // Width: 1, Height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // Bit depth: 8, Color type: 6 (RGBA)
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, // Compressed image data
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, // CRC
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
    0x42, 0x60, 0x82
  ])
  return pngData
}

/**
 * Helper function to make sequential upload requests
 * @param app - Express application
 * @param count - Number of upload requests to make
 * @param fileName - Name of the file to upload
 * @returns Array of response objects
 */
async function makeSequentialUploadRequests(
  app: Application,
  count: number,
  fileName: string = 'test-image.png'
): Promise<request.Response[]> {
  const responses: request.Response[] = []
  const imageBuffer = createTestImageBuffer()
  
  for (let i = 0; i < count; i++) {
    const response = await request(app)
      .post('/media/upload')
      .attach('files', imageBuffer, `${fileName}_${i}.png`)
    
    responses.push(response)
    
    // Small delay to ensure requests are processed sequentially
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  return responses
}

/**
 * Helper function to make a single upload request
 * @param app - Express application
 * @param fileName - Name of the file to upload
 * @param fileContent - File content buffer
 * @returns Response object
 */
async function makeSingleUploadRequest(
  app: Application,
  fileName: string = 'test-image.png',
  fileContent?: Buffer
): Promise<request.Response> {
  const imageBuffer = fileContent || createTestImageBuffer()
  
  return await request(app)
    .post('/media/upload')
    .attach('files', imageBuffer, fileName)
}

describe('Media Upload Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('POST /media/upload Rate Limiting', () => {
    it('should allow uploads within the limit (20 per hour)', async () => {
      const app = createTestApp('uploader_test_1')
      const responses = await makeSequentialUploadRequests(app, 20)
      
      // All 20 requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.message).toContain('Successfully uploaded')
        expect(response.body.data.upload_count).toBe(1)
      })
    })

    it('should block 21st upload with rate limit error', async () => {
      const app = createTestApp('uploader_test_2')
      const responses = await makeSequentialUploadRequests(app, 21)
      
      // First 20 should succeed
      for (let i = 0; i < 20; i++) {
        expect(responses[i].status).toBe(201)
        expect(responses[i].body.success).toBe(true)
      }
      
      // 21st request should be rate limited
      expect(responses[20].status).toBe(429)
      expect(responses[20].body.success).toBe(false)
      expect(responses[20].body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(responses[20].body.error.message).toContain('Media upload limit reached')
      expect(responses[20].body.error.message).toContain('20 files per hour')
    })

    it('should include rate limit headers in response', async () => {
      const app = createTestApp('uploader_test_3')
      const response = await makeSingleUploadRequest(app)
      
      expect(response.headers['ratelimit-limit']).toBeDefined()
      expect(response.headers['ratelimit-remaining']).toBeDefined()
      expect(response.headers['ratelimit-reset']).toBeDefined()
      
      // Should start with 19 remaining (20 total - 1 used)
      expect(response.headers['ratelimit-remaining']).toBe('19')
      expect(response.headers['ratelimit-limit']).toBe('20')
    })

    it('should track rate limits by user ID when authenticated', async () => {
      const user1App = createTestApp('uploader_rate_1')
      const user2App = createTestApp('uploader_rate_2')
      
      // User 1 makes 20 uploads (hits limit)
      const user1Responses = await makeSequentialUploadRequests(user1App, 21)
      
      // User 1's 21st upload should be rate limited
      expect(user1Responses[20].status).toBe(429)
      
      // User 2 should still be able to upload (separate rate limit)
      const user2Response = await makeSingleUploadRequest(user2App)
      
      expect(user2Response.status).toBe(201)
      expect(user2Response.body.success).toBe(true)
    })

    it('should handle multiple files in single request within rate limit', async () => {
      const app = createTestApp('uploader_test_4')
      const imageBuffer = createTestImageBuffer()
      
      // Upload 4 files in a single request (should count as 1 upload operation)
      const response = await request(app)
        .post('/media/upload')
        .attach('files', imageBuffer, 'image1.png')
        .attach('files', imageBuffer, 'image2.png')
        .attach('files', imageBuffer, 'image3.png')
        .attach('files', imageBuffer, 'image4.png')
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.upload_count).toBe(4)
      expect(response.body.data.files).toHaveLength(4)
      
      // Should still have 19 remaining uploads (not 16)
      expect(response.headers['ratelimit-remaining']).toBe('19')
    })

    it('should handle different file types within rate limit', async () => {
      const app = createTestApp('uploader_test_5')
      const imageBuffer = createTestImageBuffer()
      
      // Upload different file types
      const responses = await Promise.all([
        makeSingleUploadRequest(app, 'image.png', imageBuffer),
        makeSingleUploadRequest(app, 'photo.jpg', imageBuffer),
        makeSingleUploadRequest(app, 'graphic.gif', imageBuffer)
      ])
      
      responses.forEach(response => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })
    })

    it('should handle large files within rate limit', async () => {
      const app = createTestApp('uploader_test_6')
      
      // Create a larger test file (but still within size limits)
      const largerImageBuffer = Buffer.concat([
        createTestImageBuffer(),
        Buffer.alloc(1024 * 100) // Add 100KB of data
      ])
      
      const response = await makeSingleUploadRequest(app, 'large-image.png', largerImageBuffer)
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.files[0].size).toBeGreaterThan(1024 * 100)
    })
  })

  describe('Upload Request Validation with Rate Limiting', () => {
    it('should apply rate limiting before file validation', async () => {
      const app = createTestApp('validation_test_1')
      
      // First, hit the rate limit with valid uploads
      await makeSequentialUploadRequests(app, 20)
      
      // Then try to upload an invalid file - should still get rate limit error
      const invalidResponse = await request(app)
        .post('/media/upload')
        .send({ invalidField: 'no file attached' })
      
      expect(invalidResponse.status).toBe(429)
      expect(invalidResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
    })

    it('should not count failed uploads against rate limit', async () => {
      const app = createTestApp('validation_test_2')
      
      // Make a request without any files (should fail validation)
      const invalidResponse = await request(app)
        .post('/media/upload')
        .send({})
      
      expect(invalidResponse.status).toBe(400)
      expect(invalidResponse.body.error).toContain('No files uploaded')
      
      // Rate limit should not be affected
      const validResponse = await makeSingleUploadRequest(app)
      expect(validResponse.status).toBe(201)
      expect(validResponse.headers['ratelimit-remaining']).toBe('19') // Should still be 19, not 18
    })
  })

  describe('Non-Rate-Limited Media Operations', () => {
    it('should not apply rate limiting to GET /media/info/:fileId', async () => {
      const app = createTestApp('info_viewer')
      
      // Make many info requests - should not be rate limited
      const responses = []
      for (let i = 0; i < 30; i++) {
        const response = await request(app).get(`/media/info/file_${i}`)
        responses.push(response)
      }
      
      responses.forEach(response => {
        // Should return 501 (not implemented) but not be rate limited
        expect(response.status).toBe(501)
        expect(response.body.error).toContain('not yet implemented')
      })
    })

    it('should not apply rate limiting to DELETE /media/:fileId', async () => {
      const app = createTestApp('file_deleter')
      
      // Make many delete requests - should not be rate limited
      const responses = []
      for (let i = 0; i < 25; i++) {
        const response = await request(app).delete(`/media/file_${i}`)
        responses.push(response)
      }
      
      responses.forEach(response => {
        // Should return 501 (not implemented) but not be rate limited
        expect(response.status).toBe(501)
        expect(response.body.error).toContain('not yet implemented')
      })
    })
  })

  describe('Rate Limit Error Response Format', () => {
    it('should return consistent error format when rate limited', async () => {
      const app = createTestApp('error_format_test')
      
      // Hit the rate limit (make 20 uploads)
      await makeSequentialUploadRequests(app, 20)
      
      // Make one more request to trigger rate limit
      const response = await makeSingleUploadRequest(app)
      
      expect(response.status).toBe(429)
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: expect.stringContaining('Media upload limit reached'),
          retryAfter: '60 seconds'
        }
      })
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle rapid concurrent upload attempts', async () => {
      const app = createTestApp('concurrent_test')
      const imageBuffer = createTestImageBuffer()
      
      // Make 5 concurrent upload requests
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/media/upload')
            .attach('files', imageBuffer, `concurrent_${i}.png`)
        )
      }
      
      const responses = await Promise.all(promises)
      
      // All should succeed since they're within the rate limit
      responses.forEach(response => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })
    })

    it('should handle uploads with metadata within rate limit', async () => {
      const app = createTestApp('metadata_test')
      const imageBuffer = createTestImageBuffer()
      
      const metadata = {
        alt_text: 'Test image description',
        description: 'A test image for rate limiting',
        content_warning: false,
        is_sensitive: false
      }
      
      const response = await request(app)
        .post('/media/upload')
        .field('metadata', JSON.stringify(metadata))
        .attach('files', imageBuffer, 'test-with-metadata.png')
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.files[0].altText).toBe(metadata.alt_text)
    })

    it('should reset rate limit after time window', async () => {
      const app = createTestApp('reset_test')
      
      // This test would require time manipulation to be practical
      // For now, we just verify the rate limit headers indicate when reset occurs
      const response = await makeSingleUploadRequest(app)
      
      expect(response.headers['ratelimit-reset']).toBeDefined()
      
      // The reset time should be a Unix timestamp
      const resetTime = parseInt(response.headers['ratelimit-reset'])
      const currentTime = Math.floor(Date.now() / 1000)
      
      // Reset time should be in the future (within next hour)
      expect(resetTime).toBeGreaterThan(currentTime)
      expect(resetTime).toBeLessThanOrEqual(currentTime + 3600) // Within 1 hour
    })
  })
})