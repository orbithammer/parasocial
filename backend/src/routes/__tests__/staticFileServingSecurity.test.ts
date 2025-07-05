// backend/src/routes/__tests__/staticFileServingSecurity.test.ts
// Version: 2.0
// REWRITTEN: Focus on realistic security threats and proper static file serving

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import path from 'path'
import fs from 'fs'
import { createSecureStaticFileHandler } from '../../middleware/staticFileSecurityMiddleware'

/**
 * Create test Express app with static file serving middleware
 * Uses the same security middleware as the main app
 */
function createTestAppWithStaticSecurity(): express.Application {
  const app = express()
  
  // Add JSON parsing middleware (needed for error responses)
  app.use(express.json())
  
  // Use the same secure static file handler as the main app
  const uploadsPath = path.join(process.cwd(), 'test-uploads')
  app.use('/uploads', ...createSecureStaticFileHandler(uploadsPath))
  
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
  
  try {
    if (fs.existsSync(testUploadsDir)) {
      // Remove all files in test directory
      const files = fs.readdirSync(testUploadsDir)
      files.forEach(file => {
        const filePath = path.join(testUploadsDir, file)
        try {
          fs.unlinkSync(filePath)
        } catch (error) {
          // Ignore file deletion errors in tests
          console.warn(`Warning: Could not delete test file ${filePath}`)
        }
      })
      
      // Remove test directory
      try {
        fs.rmdirSync(testUploadsDir)
      } catch (error) {
        // Ignore directory deletion errors in tests
        console.warn(`Warning: Could not delete test directory ${testUploadsDir}`)
      }
    }
  } catch (error) {
    // Ignore cleanup errors in tests
    console.warn(`Warning: Test cleanup failed:`, error)
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

  describe('URL Encoded Path Traversal Protection', () => {
    it('should block URL encoded path traversal attempts', async () => {
      // Test various URL encoded path traversal techniques
      const maliciousPaths = [
        '/uploads/..%2F..%2F..%2Fetc%2Fpasswd',
        '/uploads/%2e%2e%2f%2e%2e%2f%2e%2e%2f/etc/passwd',
        '/uploads/%2E%2E%2F%2E%2E%2F/etc/passwd'
      ]
      
      // Test each malicious path
      for (const maliciousPath of maliciousPaths) {
        const response = await request(app)
          .get(maliciousPath)
          .expect(400)
        
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
    
    it('should block URL encoded backslashes', async () => {
      const response = await request(app)
        .get('/uploads/%5c%5c%2e%2e%5c%5c%2e%2e')
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
  })

  describe('Tilde Path Protection', () => {
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
  })

  describe('Null Byte Protection', () => {
    it('should block null byte injection attempts', async () => {
      const response = await request(app)
        .get('/uploads/file.txt%00.php')
        .expect(400)
      
      expect(response.body.error.code).toBe('INVALID_PATH')
    })
  })

  describe('Legitimate File Access', () => {
    it('should allow legitimate file access', async () => {
      // Create test file
      createTestFile('legitimate-image.jpg', 'fake image content')
      
      // Request legitimate file
      const response = await request(app)
        .get('/uploads/legitimate-image.jpg')
        .expect(200)
      
      // Verify file content is served (use response.text for string content)
      expect(response.text).toBe('fake image content')
      
      // Verify security headers are present
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(response.headers['content-disposition']).toBe('inline')
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
      
      // Verify security response format
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'DOTFILE_ACCESS_DENIED',
          message: 'Access to dotfiles is not allowed'
        }
      })
    })
    
    it('should deny access to files starting with dot', async () => {
      // Test various dotfile patterns
      const dotfiles = ['.env', '.config', '.secret', '.htaccess']
      
      for (const dotfile of dotfiles) {
        createTestFile(dotfile, 'sensitive content')
        
        // Should deny access to all dotfiles
        const response = await request(app)
          .get(`/uploads/${dotfile}`)
          .expect(403)
        
        expect(response.body.error.code).toBe('DOTFILE_ACCESS_DENIED')
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

  describe('Express Auto-Fixed Patterns (Informational)', () => {
    it('should demonstrate Express auto-normalization of basic traversal', async () => {
      // These patterns are auto-normalized by Express (good security!)
      // We test them to document the behavior
      const expressFixedPatterns = [
        '/uploads/../../../etc/passwd',  // → normalized to safe path
        '/uploads\\..\\..\\windows'      // → normalized to safe path  
      ]
      
      for (const pattern of expressFixedPatterns) {
        const response = await request(app)
          .get(pattern)
          .expect(404)  // File not found after normalization (correct behavior)
        
        console.log(`ℹ️  Express auto-normalized: ${pattern}`)
      }
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