// backend/src/middleware/__tests__/pathTraversalFix.test.ts
// Version: 2.0
// UPDATED: Tests now account for Express automatic path normalization

import { describe, it, expect, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createBulletproofSecurityMiddleware } from '../bulletproofSecurityMiddleware'

/**
 * Create test app that handles Express path normalization reality
 */
function createRealisticTestApp(): express.Application {
  const app = express()
  
  // Add JSON parsing middleware
  app.use(express.json())
  
  // Add our security middleware (catches what Express doesn't handle)
  app.use(createBulletproofSecurityMiddleware())
  
  // Add route to simulate file serving behavior
  app.get('/uploads/*', (req: express.Request, res: express.Response) => {
    // This simulates static file serving
    res.status(200).json({ 
      message: 'File served',
      path: req.path,
      originalUrl: req.originalUrl
    })
  })
  
  // Add route to catch attempts to access system files
  app.get('/etc/*', (req: express.Request, res: express.Response) => {
    // This would be a security breach - accessing system files
    res.status(200).json({ 
      message: 'SECURITY BREACH: System file accessed!',
      path: req.path,
      warning: 'This should be blocked by security middleware'
    })
  })
  
  // Catch-all for other requests
  app.get('*', (req: express.Request, res: express.Response) => {
    res.status(404).json({ 
      message: 'File not found',
      path: req.path
    })
  })
  
  return app
}

describe('Path Traversal Detection - Express-Aware Version', () => {
  let app: express.Application
  
  beforeEach(() => {
    app = createRealisticTestApp()
  })

  describe('Express Built-in Protection (Informational)', () => {
    it('should show that Express auto-normalizes basic path traversal', async () => {
      // Express automatically converts /uploads/../../../etc/passwd to /etc/passwd
      // This is actually GOOD security behavior by Express
      const response = await request(app)
        .get('/uploads/../../../etc/passwd')
      
      // The request becomes /etc/passwd - which hits our /etc/* route
      // Our middleware should detect this system file access attempt
      expect(response.status).toBe(400) // Should be blocked by security middleware
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    })
    
    it('should document what Express actually sends to middleware', async () => {
      // Let's create a logging middleware to see what Express sends
      const logApp = express()
      
      logApp.use((req, res) => {
        res.json({
          originalUrl: req.originalUrl,
          url: req.url,
          path: req.path,
          note: 'This is what Express actually sends to middleware'
        })
      })
      
      const response = await request(logApp)
        .get('/uploads/../../../etc/passwd')
      
      // Document the Express behavior
      console.log('📋 Express URL Normalization:')
      console.log('  What we sent:', '/uploads/../../../etc/passwd')
      console.log('  What Express provides:', response.body)
      
      // Express should normalize this to /etc/passwd
      expect(response.body.path).toBe('/etc/passwd')
    })
  })

  describe('Real Security Threats (What We Need to Block)', () => {
    it('should block URL-encoded path traversal that bypasses Express', async () => {
      // These patterns might bypass Express normalization
      const encodedTraversalAttempts = [
        '/uploads/%2e%2e%2f%2e%2e%2f%2e%2e%2f/etc/passwd',
        '/uploads/..%2F..%2F..%2F/etc/passwd',
        '/uploads/%2E%2E%2F%2E%2E%2F/etc/passwd'
      ]
      
      for (const attempt of encodedTraversalAttempts) {
        const response = await request(app)
          .get(attempt)
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
    
    it('should block direct system file access attempts', async () => {
      // After Express normalization, these become direct system file requests
      // Our middleware should detect and block access to system directories
      const systemPaths = [
        '/etc/passwd',
        '/etc/shadow', 
        '/proc/version',
        '/root/.ssh/id_rsa'
      ]
      
      for (const systemPath of systemPaths) {
        const response = await request(app)
          .get(systemPath)
          .expect(400)
        
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
    
    it('should block Windows-style path traversal', async () => {
      const windowsPaths = [
        '/uploads/..\\..\\..\\windows\\system32',
        '/uploads/file.txt\\..\\..\\system.ini'
      ]
      
      for (const windowsPath of windowsPaths) {
        const response = await request(app)
          .get(windowsPath)
          .expect(400)
        
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
    
    it('should block null byte injection attempts', async () => {
      const nullByteAttacks = [
        '/uploads/file.txt%00.php',
        '/uploads/image.jpg%00../../../etc/passwd'
      ]
      
      for (const attack of nullByteAttacks) {
        const response = await request(app)
          .get(attack)
          .expect(400)
        
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
  })

  describe('Legitimate Access (Should Work)', () => {
    it('should allow normal file access within uploads directory', async () => {
      const response = await request(app)
        .get('/uploads/image.jpg')
        .expect(200)
      
      expect(response.body.message).toBe('File served')
    })
    
    it('should allow subdirectory access within uploads', async () => {
      const response = await request(app)
        .get('/uploads/user123/profile.jpg')
        .expect(200)
      
      expect(response.body.message).toBe('File served')
    })
  })
})