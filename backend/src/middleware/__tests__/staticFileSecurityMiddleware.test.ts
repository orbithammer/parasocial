// backend/src/middleware/__tests__/staticFileSecurityMiddleware.test.ts
// Version: 1.0
// Unit tests for the static file security middleware to verify path traversal protection

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  
  // Create test uploads directory path
  const testUploadsPath = path.join(process.cwd(), 'test-uploads-middleware')
  
  // Use our secure static file handler
  app.use('/uploads', ...createSecureStaticFileHandler(testUploadsPath))
  
  return app
}

/**
 * Create test file in test directory
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
        console.warn(`Could not delete test directory: ${testDir}`)
      }
    }
  } catch (error) {
    console.warn('Test cleanup failed:', error)
  }
}

describe('Static File Security Middleware', () => {
  let app: express.Application
  
  beforeEach(() => {
    app = createTestApp()
    process.env.NODE_ENV = 'test'
  })
  
  afterEach(() => {
    cleanupTestFiles()
    delete process.env.NODE_ENV
  })

  describe('Path Traversal Protection', () => {
    it('should block basic path traversal with double dots', async () => {
      const response = await request(app)
        .get('/uploads/../../../etc/passwd')
        .expect(400)
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    })
    
    it('should block URL encoded path traversal', async () => {
      const maliciousPaths = [
        '/uploads/%2e%2e%2f%2e%2e%2f%2e%2e%2f/etc/passwd',
        '/uploads/..%2F..%2F..%2F/etc/passwd',
        '/uploads/%2E%2E%2F%2E%2E%2F/etc/passwd'
      ]
      
      for (const maliciousPath of maliciousPaths) {
        const response = await request(app)
          .get(maliciousPath)
          .expect(400)
        
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
    
    it('should block tilde-based path traversal', async () => {
      const response = await request(app)
        .get('/uploads/~/sensitive-file.txt')
        .expect(400)
      
      expect(response.body.error.code).toBe('INVALID_PATH')
    })
    
    it('should block Windows-style path traversal', async () => {
      const windowsPaths = [
        '/uploads/..\\..\\..\\windows\\system32',
        '/uploads/%5c%5c%2e%2e%5c%5c%2e%2e'
      ]
      
      for (const windowsPath of windowsPaths) {
        const response = await request(app)
          .get(windowsPath)
          .expect(400)
        
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
  })

  describe('Dotfiles Protection', () => {
    it('should block access to dotfiles', async () => {
      // Create a dotfile
      createTestFile('.secret-config', 'sensitive data')
      
      const response = await request(app)
        .get('/uploads/.secret-config')
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
      
      const response = await request(app)
        .get('/uploads/test-image.jpg')
        .expect(200)
      
      // Verify file content
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
      // Test inline files (images, videos, audio)
      const inlineFiles = [
        { name: 'image.jpg', content: 'jpg content' },
        { name: 'video.mp4', content: 'mp4 content' },
        { name: 'audio.mp3', content: 'mp3 content' }
      ]
      
      for (const file of inlineFiles) {
        createTestFile(file.name, file.content)
        
        const response = await request(app)
          .get(`/uploads/${file.name}`)
          .expect(200)
        
        expect(response.headers['content-disposition']).toBe('inline')
      }
      
      // Test attachment files (other types)
      const attachmentFiles = [
        { name: 'document.pdf', content: 'pdf content' },
        { name: 'archive.zip', content: 'zip content' },
        { name: 'script.exe', content: 'exe content' }
      ]
      
      for (const file of attachmentFiles) {
        createTestFile(file.name, file.content)
        
        const response = await request(app)
          .get(`/uploads/${file.name}`)
          .expect(200)
        
        expect(response.headers['content-disposition']).toBe('attachment')
      }
    })
    
    it('should set all required security headers', async () => {
      createTestFile('security-test.txt', 'security test content')
      
      const response = await request(app)
        .get('/uploads/security-test.txt')
        .expect(200)
      
      // Verify all security headers are present
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(response.headers['content-security-policy']).toBe(
        "default-src 'none'; img-src 'self'; media-src 'self'"
      )
    })
  })
})

/**
 * Export test utilities for use in integration tests
 */
export {
  createTestApp,
  createTestFile,
  cleanupTestFiles
}