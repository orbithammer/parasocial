// backend/src/routes/__tests__/staticFileServingSecurity.test.ts
// Version: 1.0
// Unit tests for static file serving security features including path traversal protection

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import path from 'path'
import fs from 'fs'

/**
 * Create test Express app with static file serving middleware
 * Replicates the security middleware from app.ts for isolated testing
 */
function createTestAppWithStaticSecurity(): express.Application {
  const app = express()
  
  // Replicate the uploads static serving with security from app.ts
  const uploadsPath = path.join(process.cwd(), 'test-uploads')
  
  app.use('/uploads', 
    // Security middleware: Prevent directory traversal
    (req, res, next) => {
      if (req.path.includes('..') || req.path.includes('~')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      next()
    },
    // Serve static files with security headers
    express.static(uploadsPath, {
      // No cache in test environment
      maxAge: 0,
      // Security: Don't expose file system details
      dotfiles: 'deny',
      // Add security headers
      setHeaders: (res, filePath) => {
        // Prevent files from being executed as scripts
        res.setHeader('X-Content-Type-Options', 'nosniff')
        // Only allow files to be embedded in same origin
        res.setHeader('X-Frame-Options', 'SAMEORIGIN')
        
        // Set appropriate Content-Type based on file extension
        const ext = path.extname(filePath).toLowerCase()
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
          // Image files - allow inline display
          res.setHeader('Content-Disposition', 'inline')
        } else if (['.mp4', '.webm', '.mov'].includes(ext)) {
          // Video files - allow inline display
          res.setHeader('Content-Disposition', 'inline')
        } else {
          // Other files - force download for security
          res.setHeader('Content-Disposition', 'attachment')
        }
      }
    })
  )
  
  return app
}

/**
 * Create test file for static serving tests
 * @param filename - Name of file to create
 * @param content - Content to write to file
 */
function createTestFile(filename: string, content: string = 'test content'): void {
  const testUploadsDir = path.join(process.cwd(), 'test-uploads')
  const filePath = path.join(testUploadsDir, filename)
  
  // Ensure test uploads directory exists
  if (!fs.existsSync(testUploadsDir)) {
    fs.mkdirSync(testUploadsDir, { recursive: true })
  }
  
  // Write test file
  fs.writeFileSync(filePath, content)
}

/**
 * Clean up test files and directory
 */
function cleanupTestFiles(): void {
  const testUploadsDir = path.join(process.cwd(), 'test-uploads')
  
  if (fs.existsSync(testUploadsDir)) {
    // Remove all files in test directory
    const files = fs.readdirSync(testUploadsDir)
    files.forEach(file => {
      fs.unlinkSync(path.join(testUploadsDir, file))
    })
    
    // Remove test directory
    fs.rmdirSync(testUploadsDir)
  }
}

describe('Static File Serving Security', () => {
  let app: express.Application
  
  beforeEach(() => {
    // Create fresh app instance for each test
    app = createTestAppWithStaticSecurity()
    
    // Set test environment
    process.env.NODE_ENV = 'test'
  })
  
  afterEach(() => {
    // Clean up test files after each test
    cleanupTestFiles()
    
    // Clean up environment
    delete process.env.NODE_ENV
  })

  describe('Path Traversal Protection', () => {
    it('should block requests with double dots (..)', async () => {
      // Attempt directory traversal with double dots
      const response = await request(app)
        .get('/uploads/../../../etc/passwd')
        .expect(400)
      
      // Verify security response format
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    })
    
    it('should block requests with tilde (~)', async () => {
      // Attempt directory traversal with tilde
      const response = await request(app)
        .get('/uploads/~/sensitive-file.txt')
        .expect(400)
      
      // Verify security response format
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    })
    
    it('should block complex path traversal attempts', async () => {
      // Test various path traversal techniques
      const maliciousPaths = [
        '/uploads/../../../etc/passwd',
        '/uploads/..%2F..%2F..%2Fetc%2Fpasswd',
        '/uploads/~root/.ssh/id_rsa',
        '/uploads/....//....//etc//passwd',
        '/uploads/..\\..\\..\\windows\\system32',
      ]
      
      // Test each malicious path
      for (const maliciousPath of maliciousPaths) {
        const response = await request(app)
          .get(maliciousPath)
          .expect(400)
        
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
    
    it('should allow legitimate file access', async () => {
      // Create test file
      createTestFile('legitimate-image.jpg', 'fake image content')
      
      // Request legitimate file
      const response = await request(app)
        .get('/uploads/legitimate-image.jpg')
        .expect(200)
      
      // Verify file content is served
      expect(response.text).toBe('fake image content')
    })
    
    it('should allow files with dots in names but not path traversal', async () => {
      // Create test file with dots in name (legitimate)
      createTestFile('my.file.with.dots.txt', 'content with dots')
      
      // Should allow access to file with dots in filename
      const response = await request(app)
        .get('/uploads/my.file.with.dots.txt')
        .expect(200)
      
      expect(response.text).toBe('content with dots')
    })
  })

  describe('Security Headers', () => {
    it('should set X-Content-Type-Options header', async () => {
      // Create test file
      createTestFile('test-security.txt', 'security test')
      
      // Request file and check headers
      const response = await request(app)
        .get('/uploads/test-security.txt')
        .expect(200)
      
      // Verify security header is present
      expect(response.headers['x-content-type-options']).toBe('nosniff')
    })
    
    it('should set X-Frame-Options header', async () => {
      // Create test file
      createTestFile('test-frame.txt', 'frame test')
      
      // Request file and check headers
      const response = await request(app)
        .get('/uploads/test-frame.txt')
        .expect(200)
      
      // Verify frame options header is present
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
    })
    
    it('should set inline Content-Disposition for image files', async () => {
      // Test different image file types
      const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      
      for (const ext of imageTypes) {
        const filename = `test-image${ext}`
        createTestFile(filename, 'fake image content')
        
        const response = await request(app)
          .get(`/uploads/${filename}`)
          .expect(200)
        
        // Images should be displayed inline
        expect(response.headers['content-disposition']).toBe('inline')
      }
    })
    
    it('should set inline Content-Disposition for video files', async () => {
      // Test different video file types
      const videoTypes = ['.mp4', '.webm', '.mov']
      
      for (const ext of videoTypes) {
        const filename = `test-video${ext}`
        createTestFile(filename, 'fake video content')
        
        const response = await request(app)
          .get(`/uploads/${filename}`)
          .expect(200)
        
        // Videos should be displayed inline
        expect(response.headers['content-disposition']).toBe('inline')
      }
    })
    
    it('should set attachment Content-Disposition for other file types', async () => {
      // Test file types that should force download
      const otherTypes = ['.txt', '.pdf', '.doc', '.zip', '.exe']
      
      for (const ext of otherTypes) {
        const filename = `test-file${ext}`
        createTestFile(filename, 'file content')
        
        const response = await request(app)
          .get(`/uploads/${filename}`)
          .expect(200)
        
        // Other files should force download for security
        expect(response.headers['content-disposition']).toBe('attachment')
      }
    })
  })

  describe('Dotfiles Protection', () => {
    it('should deny access to dotfiles', async () => {
      // Create hidden file (dotfile)
      createTestFile('.hidden-config', 'sensitive configuration')
      
      // Attempt to access dotfile - should be denied
      const response = await request(app)
        .get('/uploads/.hidden-config')
        .expect(403)
    })
    
    it('should deny access to files starting with dot', async () => {
      // Test various dotfile patterns
      const dotfiles = ['.env', '.config', '.secret', '.htaccess']
      
      for (const dotfile of dotfiles) {
        createTestFile(dotfile, 'sensitive content')
        
        // Should deny access to all dotfiles
        await request(app)
          .get(`/uploads/${dotfile}`)
          .expect(403)
      }
    })
  })

  describe('File Not Found Handling', () => {
    it('should return 404 for non-existent files', async () => {
      // Request file that does not exist
      const response = await request(app)
        .get('/uploads/non-existent-file.jpg')
        .expect(404)
    })
    
    it('should return 404 for empty filename', async () => {
      // Request empty filename
      await request(app)
        .get('/uploads/')
        .expect(404)
    })
  })
})

/**
 * Export helper functions for use in other tests
 */
export {
  createTestAppWithStaticSecurity,
  createTestFile,
  cleanupTestFiles
}