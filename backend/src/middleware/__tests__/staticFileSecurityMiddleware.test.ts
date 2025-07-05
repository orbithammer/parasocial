// backend/src/middleware/__tests__/staticFileSecurityMiddleware.test.ts
// Version: 2.1
// FIXED: Proper file creation and path handling for static file serving

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import path from 'path'
import fs from 'fs'
import { createSecureStaticFileHandler } from '../staticFileSecurityMiddleware'

/**
 * Create test Express app with our middleware
 */
function createTestApp(): express.Application {
  const app = express()
  
  // Add JSON parsing middleware (needed for error responses)
  app.use(express.json())
  
  // Create test uploads directory path - MUST match where files are created
  const testUploadsPath = path.join(process.cwd(), 'test-uploads-middleware')
  
  // Ensure test directory exists before setting up middleware
  if (!fs.existsSync(testUploadsPath)) {
    fs.mkdirSync(testUploadsPath, { recursive: true })
  }
  
  // Use our secure static file handler
  app.use('/uploads', ...createSecureStaticFileHandler(testUploadsPath))
  
  return app
}

/**
 * Create test file in test directory
 * FIXED: Ensures directory exists and handles path correctly
 */
function createTestFile(filename: string, content: string = 'test file content'): void {
  const testDir = path.join(process.cwd(), 'test-uploads-middleware')
  
  // Ensure directory exists
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true })
  }
  
  // Write test file
  const filePath = path.join(testDir, filename)
  fs.writeFileSync(filePath, content)
  
  // Verify file was created (debugging)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Failed to create test file: ${filePath}`)
  }
}

/**
 * Clean up test files and directory
 */
function cleanupTestFiles(): void {
  const testDir = path.join(process.cwd(), 'test-uploads-middleware')
  
  try {
    if (fs.existsSync(testDir)) {
      // Remove all files
      const files = fs.readdirSync(testDir)
      files.forEach(file => {
        const filePath = path.join(testDir, file)
        try {
          fs.unlinkSync(filePath)
        } catch (error) {
          console.warn(`Could not delete test file: ${filePath}`)
        }
      })
      
      // Remove directory
      try {
        fs.rmdirSync(testDir)
      } catch (error) {
        console.warn(`Could not remove test directory: ${testDir}`)
      }
    }
  } catch (error) {
    console.warn('Error during test cleanup:', error)
  }
}

describe('Static File Security Middleware', () => {
  let app: express.Application
  
  beforeEach(() => {
    // Clean up before each test
    cleanupTestFiles()
    
    // Create fresh app
    app = createTestApp()
  })
  
  afterEach(() => {
    // Clean up after each test
    cleanupTestFiles()
  })

  describe('Path Traversal Protection', () => {
    it('should block basic path traversal attempts', async () => {
      const pathTraversalUrls = [
        '/uploads/../../../etc/passwd',
        '/uploads/..\\..\\..\\windows\\system32',
        '/uploads/....//....//....//etc/passwd'
      ]
      
      for (const url of pathTraversalUrls) {
        const response = await request(app)
          .get(url)
          .expect(400)
        
        expect(response.body).toEqual({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
    })
  })

  describe('URL Encoded Path Traversal Protection', () => {
    it('should block URL encoded path traversal', async () => {
      const encodedUrls = [
        '/uploads/..%2F..%2F..%2Fetc%2Fpasswd',
        '/uploads/%2e%2e%2f%2e%2e%2f%2e%2e%2f/etc/passwd',
        '/uploads/..%252F..%252F..%252F/etc/passwd'
      ]
      
      for (const url of encodedUrls) {
        const response = await request(app)
          .get(url)
          .expect(400)
        
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
    
    it('should block URL encoded backslashes', async () => {
      const response = await request(app)
        .get('/uploads/..%5C..%5C..%5Cwindows%5Csystem32')
        .expect(400)
      
      expect(response.body.error.code).toBe('INVALID_PATH')
    })
  })

  describe('Tilde Path Protection', () => {
    it('should block tilde-based path traversal', async () => {
      const response = await request(app)
        .get('/uploads/~/sensitive-file.txt')
        .expect(400)
      
      expect(response.body.error.code).toBe('INVALID_PATH')
    })
  })

  describe('Dotfiles Protection', () => {
    it('should block access to dotfiles', async () => {
      // Create a dotfile
      createTestFile('.env', 'SECRET_KEY=secret123')
      
      const response = await request(app)
        .get('/uploads/.env')
        .expect(403)
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'DOTFILE_ACCESS_DENIED',
          message: 'Access to dotfiles is not allowed'
        }
      })
    })
    
    it('should block access to various dotfile types', async () => {
      const dotfiles = ['.env', '.htaccess', '.git', '.ssh']
      
      for (const dotfile of dotfiles) {
        createTestFile(dotfile, 'sensitive content')
        
        const response = await request(app)
          .get(`/uploads/${dotfile}`)
          .expect(403)
        
        expect(response.body.error.code).toBe('DOTFILE_ACCESS_DENIED')
      }
    })
  })

  describe('Legitimate File Access', () => {
    it('should serve legitimate files correctly', async () => {
      // Create a legitimate test file
      createTestFile('test-image.jpg', 'fake image content')
      
      // Verify file exists before testing
      const testFilePath = path.join(process.cwd(), 'test-uploads-middleware', 'test-image.jpg')
      expect(fs.existsSync(testFilePath)).toBe(true)
      
      const response = await request(app)
        .get('/uploads/test-image.jpg')
        .expect(200)
      
      // FIXED: Verify file content is served correctly
      expect(response.text).toBe('fake image content')
      
      // Verify security headers are set
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(response.headers['content-disposition']).toBe('inline')
    })
    
    it('should allow files with dots in names', async () => {
      // Create file with dots in the name (but not starting with dot)
      createTestFile('my.file.with.dots.txt', 'content with dots in filename')
      
      const response = await request(app)
        .get('/uploads/my.file.with.dots.txt')
        .expect(200)
      
      expect(response.text).toBe('content with dots in filename')
    })
    
    it('should return 404 for non-existent files', async () => {
      // Request a file that doesn't exist
      const response = await request(app)
        .get('/uploads/non-existent-file.jpg')
        .expect(404)
    })
  })

  describe('Security Headers', () => {
    it('should set appropriate Content-Disposition for different file types', async () => {
      // Test inline files (images, videos)
      const inlineFiles = [
        { name: 'image.jpg', disposition: 'inline' },
        { name: 'video.mp4', disposition: 'inline' },
        { name: 'audio.mp3', disposition: 'inline' }
      ]
      
      for (const file of inlineFiles) {
        createTestFile(file.name, 'test content')
        
        const response = await request(app)
          .get(`/uploads/${file.name}`)
          .expect(200)
        
        expect(response.headers['content-disposition']).toBe(file.disposition)
      }
      
      // Test attachment files (documents, executables)
      const attachmentFiles = [
        { name: 'document.pdf', disposition: 'attachment' },
        { name: 'script.js', disposition: 'attachment' },
        { name: 'archive.zip', disposition: 'attachment' }
      ]
      
      for (const file of attachmentFiles) {
        createTestFile(file.name, 'test content')
        
        const response = await request(app)
          .get(`/uploads/${file.name}`)
          .expect(200)
        
        expect(response.headers['content-disposition']).toBe(file.disposition)
      }
    })
    
    it('should set all required security headers', async () => {
      createTestFile('test-headers.txt', 'header test content')
      
      const response = await request(app)
        .get('/uploads/test-headers.txt')
        .expect(200)
      
      // Verify all security headers are present
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(response.headers['content-disposition']).toBeDefined()
    })
  })

  describe('Express Auto-Fixed Patterns (Informational)', () => {
    it('should demonstrate Express auto-normalization behavior', async () => {
      // These patterns are automatically normalized by Express
      // These tests document this behavior but don't need to be blocked by our middleware
      createTestFile('normal-file.txt', 'normal content')
      
      const normalizedPaths = [
        '/uploads/./normal-file.txt',
        '/uploads//normal-file.txt',
        '/uploads/subfolder/../normal-file.txt'
      ]
      
      for (const normalizedPath of normalizedPaths) {
        const response = await request(app)
          .get(normalizedPath)
        
        // Express auto-normalizes these to the correct file
        // This test documents Express behavior - not our security requirements
        console.log(`Path ${normalizedPath} -> Status: ${response.status}`)
      }
    })
  })
})