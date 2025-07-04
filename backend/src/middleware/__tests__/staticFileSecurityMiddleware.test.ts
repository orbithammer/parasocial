// backend/src/routes/__tests__/staticFileServingSecurity.test.ts
// Version: 3.0
// UPDATED: Tests now account for Express automatic path normalization

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import * as fs from 'fs'
import * as path from 'path'
import { createExpressAwareSecurityMiddleware } from '../../middleware/expressAwareSecurityMiddleware'

/**
 * Create test uploads directory and files for route testing
 */
function createTestFiles() {
  const uploadsDir = path.join(process.cwd(), 'test-uploads')
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
  
  // Create test files
  fs.writeFileSync(path.join(uploadsDir, 'test-image.jpg'), 'fake image content')
  fs.writeFileSync(path.join(uploadsDir, 'document.pdf'), 'fake pdf content')
  fs.writeFileSync(path.join(uploadsDir, 'video.mp4'), 'fake video content')
  fs.writeFileSync(path.join(uploadsDir, '.htaccess'), 'sensitive config')
  
  return uploadsDir
}

/**
 * Clean up test files
 */
function cleanupTestFiles() {
  const uploadsDir = path.join(process.cwd(), 'test-uploads')
  if (fs.existsSync(uploadsDir)) {
    fs.rmSync(uploadsDir, { recursive: true, force: true })
  }
}

/**
 * Create test app that simulates the real route setup
 */
function createRouteTestApp(): express.Application {
  const app = express()
  
  app.use(express.json())
  
  // Apply global security middleware first (like in real app)
  app.use(createExpressAwareSecurityMiddleware())
  
  // Serve static files with security headers (simulates real static route)
  const uploadsPath = path.join(process.cwd(), 'test-uploads')
  app.use('/uploads', (req, res, next) => {
    // Set security headers (like in real implementation)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    
    // Set Content-Disposition based on file type
    const ext = path.extname(req.path).toLowerCase()
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
      res.setHeader('Content-Disposition', 'inline')
    } else if (['.mp4', '.webm', '.ogg'].includes(ext)) {
      res.setHeader('Content-Disposition', 'inline') // Videos should be inline
    } else {
      res.setHeader('Content-Disposition', 'attachment')
    }
    
    next()
  }, express.static(uploadsPath))
  
  // Routes to catch system file access attempts (from normalized traversal)
  app.get('/etc/*', (req, res) => {
    res.status(200).json({ 
      message: 'SECURITY BREACH: System file accessed!',
      path: req.path
    })
  })
  
  app.get('/proc/*', (req, res) => {
    res.status(200).json({ 
      message: 'SECURITY BREACH: Proc file accessed!',
      path: req.path
    })
  })
  
  // Catch-all for other requests
  app.use((req, res) => {
    res.status(404).json({ message: 'File not found' })
  })
  
  return app
}

describe('Static File Serving Security - Route Level Tests', () => {
  let app: express.Application
  
  beforeEach(() => {
    app = createRouteTestApp()
    createTestFiles()
    process.env.NODE_ENV = 'test'
  })
  
  afterEach(() => {
    cleanupTestFiles()
    delete process.env.NODE_ENV
  })

  describe('Path Traversal Protection', () => {
    it('should block requests with double dots (..) after Express normalization', async () => {
      // Express converts /uploads/../../../etc/passwd to /etc/passwd
      // Our middleware should detect this system directory access
      const response = await request(app)
        .get('/uploads/../../../etc/passwd')
        .expect(400) // Should be blocked by security middleware
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_PATH', 
          message: 'Invalid file path'
        }
      })
    })
    
    it('should block complex path traversal attempts', async () => {
      const complexAttacks = [
        '/uploads/../../../etc/passwd',
        '/uploads/../../proc/version',
        '/uploads/../etc/shadow'
      ]
      
      for (const attack of complexAttacks) {
        const response = await request(app)
          .get(attack)
          .expect(400)
        
        expect(response.body.success).toBe(false)
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
    
    it('should allow legitimate file access', async () => {
      const response = await request(app)
        .get('/uploads/test-image.jpg')
        .expect(200)
      
      // Should return the actual file content
      expect(response.text).toBe('fake image content')
    })
  })

  describe('URL Encoding Attacks', () => {
    it('should block URL-encoded path traversal attempts', async () => {
      const encodedAttacks = [
        '/uploads/%2e%2e%2f%2e%2e%2f%2e%2e%2f/etc/passwd',
        '/uploads/..%2F..%2F..%2F/etc/passwd'
      ]
      
      for (const attack of encodedAttacks) {
        const response = await request(app)
          .get(attack)
          .expect(400)
        
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
  })

  describe('Dotfile Protection', () => {
    it('should block access to dotfiles', async () => {
      const response = await request(app)
        .get('/uploads/.htaccess')
        .expect(403)
      
      expect(response.body.error.code).toBe('DOTFILE_ACCESS_DENIED')
    })
  })

  describe('Security Headers', () => {
    it('should set all required security headers', async () => {
      const response = await request(app)
        .get('/uploads/test-image.jpg')
        .expect(200)
      
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('DENY')
      expect(response.headers['x-xss-protection']).toBe('1; mode=block')
    })
    
    it('should set inline Content-Disposition for video files', async () => {
      const response = await request(app)
        .get('/uploads/video.mp4')
        .expect(200)
      
      // Video files should have inline Content-Disposition
      expect(response.headers['content-disposition']).toBe('inline')
    })
    
    it('should set inline Content-Disposition for image files', async () => {
      const response = await request(app)
        .get('/uploads/test-image.jpg')
        .expect(200)
      
      // Image files should have inline Content-Disposition
      expect(response.headers['content-disposition']).toBe('inline')
    })
    
    it('should set attachment Content-Disposition for other files', async () => {
      const response = await request(app)
        .get('/uploads/document.pdf')
        .expect(200)
      
      // Other files should have attachment Content-Disposition
      expect(response.headers['content-disposition']).toBe('attachment')
    })
  })

  describe('Express Path Normalization Documentation', () => {
    it('should document Express automatic security behavior', async () => {
      console.log('\n📋 EXPRESS SECURITY BEHAVIOR:')
      console.log('1. Browser sends: /uploads/../../../etc/passwd')
      console.log('2. Express normalizes to: /etc/passwd')
      console.log('3. Our middleware detects system directory access')
      console.log('4. Request blocked with 400 status')
      
      // Verify this behavior
      const response = await request(app)
        .get('/uploads/../../../etc/passwd')
      
      expect(response.status).toBe(400)
      console.log('✅ Path traversal properly blocked by security middleware')
    })
    
    it('should show what legitimate requests look like', async () => {
      console.log('\n📋 LEGITIMATE REQUEST FLOW:')
      console.log('1. Browser sends: /uploads/test-image.jpg')
      console.log('2. Express passes through unchanged')
      console.log('3. Security middleware allows legitimate path')
      console.log('4. Static middleware serves file with headers')
      
      const response = await request(app)
        .get('/uploads/test-image.jpg')
      
      expect(response.status).toBe(200)
      expect(response.text).toBe('fake image content')
      console.log('✅ Legitimate file served successfully')
    })
  })
})