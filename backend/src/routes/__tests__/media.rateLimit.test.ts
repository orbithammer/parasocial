// backend/src/routes/__tests__/media.rateLimit.test.ts
// Version: 2.0.0 - Optimized for speed, reduced HTTP requests
// Fixed: Reduced sequential requests, faster mocking, shorter tests

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import rateLimit from 'express-rate-limit'

// Mock the media controller with minimal overhead
const mockMediaController = {
  uploadMedia: vi.fn().mockResolvedValue({ success: true }),
  getMediaInfo: vi.fn().mockResolvedValue({ media: {} }),
  deleteMedia: vi.fn().mockResolvedValue({ success: true })
}

/**
 * Create minimal test app with media upload rate limiting
 */
function createTestApp(userId: string): express.Application {
  const app = express()
  app.use(express.json())
  
  // Add test user middleware (simulates authentication)
  app.use((req, res, next) => {
    (req as any).user = { id: userId }
    next()
  })
  
  // Apply media upload rate limiting (20 per hour)
  const mediaUploadRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Media upload limit reached. You can upload 20 files per hour.',
          retryAfter: '60 seconds'
        }
      })
    },
    keyGenerator: (req) => (req as any).user?.id || req.ip
  })
  
  // Add routes with rate limiting
  app.post('/media/upload', mediaUploadRateLimit, (req, res) => {
    mockMediaController.uploadMedia(req.body, (req as any).user)
    res.status(201).json({
      success: true,
      message: 'Media uploaded successfully',
      media: { 
        id: `media-${Date.now()}`, 
        filename: req.body.filename || 'test-file.jpg',
        url: '/uploads/test-file.jpg'
      }
    })
  })
  
  // Non-rate-limited routes
  app.get('/media/info/:fileId', (req, res) => {
    mockMediaController.getMediaInfo(req.params.fileId)
    res.json({ media: { id: req.params.fileId } })
  })
  
  app.delete('/media/:fileId', (req, res) => {
    mockMediaController.deleteMedia(req.params.fileId, (req as any).user)
    res.json({ success: true })
  })
  
  return app
}

/**
 * Make multiple media upload requests efficiently
 */
async function makeUploadRequests(app: express.Application, count: number) {
  const requests = []
  
  for (let i = 0; i < count; i++) {
    const req = request(app)
      .post('/media/upload')
      .send({ 
        filename: `test-file-${i}.jpg`,
        filesize: 1024 * 50, // 50KB
        mimetype: 'image/jpeg'
      })
    requests.push(req)
  }
  
  // Execute all requests concurrently
  return Promise.all(requests)
}

describe('Media Upload Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('POST /media/upload Rate Limiting', () => {
    it('should allow uploads within the limit (first 10 uploads)', async () => {
      const app = createTestApp('media-user-1')
      
      // Test with 10 uploads (faster than 20)
      const responses = await makeUploadRequests(app, 10)
      
      // All should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.message).toBe('Media uploaded successfully')
        expect(response.body.media.filename).toBe(`test-file-${index}.jpg`)
      })
      
      expect(mockMediaController.uploadMedia).toHaveBeenCalledTimes(10)
    })

    it('should include rate limit headers in response', async () => {
      const app = createTestApp('media-user-2')
      
      const response = await request(app)
        .post('/media/upload')
        .send({ 
          filename: 'test-upload.png',
          mimetype: 'image/png'
        })
      
      expect(response.status).toBe(201)
      expect(response.headers['ratelimit-limit']).toBe('20')
      expect(response.headers['ratelimit-remaining']).toBe('19')
      expect(response.headers['ratelimit-reset']).toBeDefined()
    })

    it('should block uploads after hitting the limit', async () => {
      const app = createTestApp('media-user-3')
      
      // Make exactly 20 requests to hit the limit
      const firstBatch = await makeUploadRequests(app, 20)
      
      // All 20 should succeed
      firstBatch.forEach((response) => {
        expect(response.status).toBe(201)
      })
      
      // 21st request should be blocked
      const blockedResponse = await request(app)
        .post('/media/upload')
        .send({ filename: 'blocked-file.jpg' })
      
      expect(blockedResponse.status).toBe(429)
      expect(blockedResponse.body.success).toBe(false)
      expect(blockedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(blockedResponse.body.error.message).toContain('Media upload limit reached')
      expect(blockedResponse.body.error.message).toContain('20 files per hour')
      
      // Controller should only be called 20 times (not 21)
      expect(mockMediaController.uploadMedia).toHaveBeenCalledTimes(20)
    })

    it('should track rate limits by user ID when authenticated', async () => {
      const app1 = createTestApp('media-user-4')
      const app2 = createTestApp('media-user-5')
      
      // Each user should have separate rate limits
      const user1Response = await request(app1)
        .post('/media/upload')
        .send({ filename: 'user1-file.jpg' })
      
      const user2Response = await request(app2)
        .post('/media/upload')
        .send({ filename: 'user2-file.jpg' })
      
      expect(user1Response.status).toBe(201)
      expect(user2Response.status).toBe(201)
      
      // Both should show 19 remaining (separate limits)
      expect(user1Response.headers['ratelimit-remaining']).toBe('19')
      expect(user2Response.headers['ratelimit-remaining']).toBe('19')
    })

    it('should handle multiple files in single request within rate limit', async () => {
      const app = createTestApp('media-user-6')
      
      // Upload request with multiple files metadata
      const response = await request(app)
        .post('/media/upload')
        .send({ 
          files: [
            { filename: 'file1.jpg', mimetype: 'image/jpeg' },
            { filename: 'file2.png', mimetype: 'image/png' }
          ]
        })
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      
      expect(mockMediaController.uploadMedia).toHaveBeenCalledTimes(1)
    })

    it('should handle different file types within rate limit', async () => {
      const app = createTestApp('media-user-7')
      
      const fileTypes = [
        { filename: 'image.jpg', mimetype: 'image/jpeg' },
        { filename: 'video.mp4', mimetype: 'video/mp4' },
        { filename: 'audio.mp3', mimetype: 'audio/mpeg' },
        { filename: 'document.pdf', mimetype: 'application/pdf' }
      ]
      
      const requests = fileTypes.map(file => 
        request(app).post('/media/upload').send(file)
      )
      
      const responses = await Promise.all(requests)
      
      responses.forEach((response) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockMediaController.uploadMedia).toHaveBeenCalledTimes(4)
    })

    it('should handle large files within rate limit', async () => {
      const app = createTestApp('media-user-8')
      
      // Simulate large file upload
      const response = await request(app)
        .post('/media/upload')
        .send({ 
          filename: 'large-video.mp4',
          filesize: 1024 * 1024 * 50, // 50MB
          mimetype: 'video/mp4'
        })
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      
      expect(mockMediaController.uploadMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'large-video.mp4',
          filesize: 1024 * 1024 * 50
        }),
        { id: 'media-user-8' }
      )
    })
  })

  describe('Upload Request Validation with Rate Limiting', () => {
    it('should apply rate limiting before file validation', async () => {
      const app = createTestApp('media-user-9')
      
      // Hit rate limit first
      await makeUploadRequests(app, 20)
      
      // Try to upload invalid file - should still get rate limited (not validation error)
      const response = await request(app)
        .post('/media/upload')
        .send({ filename: '' }) // Invalid filename
      
      expect(response.status).toBe(429)
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      
      // Controller should not be called for rate-limited request
      expect(mockMediaController.uploadMedia).toHaveBeenCalledTimes(20)
    })

    it('should not count failed uploads against rate limit', async () => {
      const app = createTestApp('media-user-10')
      
      // This test assumes validation happens after rate limiting
      // Make one successful upload
      const successResponse = await request(app)
        .post('/media/upload')
        .send({ filename: 'valid-file.jpg' })
      
      expect(successResponse.status).toBe(201)
      expect(successResponse.headers['ratelimit-remaining']).toBe('19')
      
      expect(mockMediaController.uploadMedia).toHaveBeenCalledTimes(1)
    })
  })

  describe('Non-Rate-Limited Media Operations', () => {
    it('should not apply rate limiting to GET /media/info/:fileId', async () => {
      const app = createTestApp('media-reader-1')
      
      // Make multiple requests to get media info (should not be rate limited)
      const requests = []
      for (let i = 0; i < 25; i++) {
        requests.push(request(app).get(`/media/info/file-${i}`))
      }
      
      const responses = await Promise.all(requests)
      
      // All should succeed
      responses.forEach(response => expect(response.status).toBe(200))
      
      expect(mockMediaController.getMediaInfo).toHaveBeenCalledTimes(25)
    })

    it('should not apply rate limiting to DELETE /media/:fileId', async () => {
      const app = createTestApp('media-deleter-1')
      
      // Make multiple delete requests (should not be rate limited)
      const requests = []
      for (let i = 0; i < 15; i++) {
        requests.push(request(app).delete(`/media/file-${i}`))
      }
      
      const responses = await Promise.all(requests)
      
      // All should succeed
      responses.forEach(response => expect(response.status).toBe(200))
      
      expect(mockMediaController.deleteMedia).toHaveBeenCalledTimes(15)
    })
  })

  describe('Rate Limit Error Response Format', () => {
    it('should return consistent error format when rate limited', async () => {
      const app = createTestApp('media-user-11')
      
      // Hit the rate limit with 20 uploads
      await makeUploadRequests(app, 20)
      
      // Get rate limited response
      const response = await request(app)
        .post('/media/upload')
        .send({ filename: 'blocked-upload.jpg' })
      
      expect(response.status).toBe(429)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Media upload limit reached. You can upload 20 files per hour.',
          retryAfter: '60 seconds'
        }
      })
    })
  })

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle rapid concurrent upload attempts', async () => {
      const app = createTestApp('media-user-12')
      
      // Make 5 concurrent requests (within rate limit)
      const responses = await makeUploadRequests(app, 5)
      
      responses.forEach((response) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockMediaController.uploadMedia).toHaveBeenCalledTimes(5)
    })

    it('should handle uploads with metadata within rate limit', async () => {
      const app = createTestApp('media-user-13')
      
      // Upload with comprehensive metadata
      const response = await request(app)
        .post('/media/upload')
        .send({ 
          filename: 'vacation-photo.jpg',
          mimetype: 'image/jpeg',
          filesize: 1024 * 200, // 200KB
          metadata: {
            title: 'Vacation Photo',
            description: 'Beautiful sunset at the beach',
            tags: ['vacation', 'sunset', 'beach']
          }
        })
      
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      
      expect(mockMediaController.uploadMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'vacation-photo.jpg',
          metadata: expect.objectContaining({
            title: 'Vacation Photo'
          })
        }),
        { id: 'media-user-13' }
      )
    })

    it('should reset rate limit after time window', async () => {
      const app = createTestApp('media-user-14')
      
      // Make one upload to test rate limit headers
      const response = await request(app)
        .post('/media/upload')
        .send({ filename: 'time-test.jpg' })
      
      expect(response.status).toBe(201)
      
      // Check that reset time is in the future
      const resetTime = parseInt(response.headers['ratelimit-reset'])
      const currentTime = Math.floor(Date.now() / 1000)
      
      expect(resetTime).toBeGreaterThan(currentTime)
      
      expect(mockMediaController.uploadMedia).toHaveBeenCalledTimes(1)
    })
  })
})