// backend/src/middleware/__tests__/pathTraversalFix.test.ts
// Version: 2.0
// REWRITTEN: Focus only on threats that Express doesn't auto-fix

import { describe, it, expect, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createGlobalSecurityMiddleware } from '../staticFileSecurityMiddleware'

/**
 * Create minimal test app to test realistic security threats
 */
function createMinimalTestApp(): express.Application {
  const app = express()
  
  // Add JSON parsing middleware
  app.use(express.json())
  
  // Add our global security middleware
  app.use(createGlobalSecurityMiddleware())
  
  // Add a simple test route that should only be reached if security passes
  app.get('*', (req: express.Request, res: express.Response) => {
    res.status(200).json({ 
      message: 'Security passed',
      originalUrl: req.originalUrl,
      path: req.path 
    })
  })
  
  return app
}

describe('Path Traversal Detection Fix', () => {
  let app: express.Application
  
  beforeEach(() => {
    app = createMinimalTestApp()
  })

  describe('URL Encoded Path Traversal Detection', () => {
    it('should block URL encoded double dots', async () => {
      const response = await request(app)
        .get('/uploads/..%2F..%2F..%2Fetc%2Fpasswd')
        .expect(400)
      
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    })
    
    it('should block mixed URL encoding', async () => {
      const response = await request(app)
        .get('/uploads/%2e%2e%2f%2e%2e%2f%2e%2e%2f/etc/passwd')
        .expect(400)
      
      expect(response.body.error.code).toBe('INVALID_PATH')
    })
    
    it('should block URL encoded backslashes', async () => {
      const response = await request(app)
        .get('/uploads/%5c%5c%2e%2e%5c%5c%2e%2e')
        .expect(400)
      
      expect(response.body.error.code).toBe('INVALID_PATH')
    })
  })

  describe('Tilde Path Detection', () => {
    it('should block tilde home directory access', async () => {
      const response = await request(app)
        .get('/uploads/~/sensitive-file.txt')
        .expect(400)
      
      expect(response.body.error.code).toBe('INVALID_PATH')
    })
    
    it('should block various tilde patterns', async () => {
      const tildeAttacks = [
        '/uploads/~/.ssh/id_rsa',
        '/uploads/~root/.bash_history'
      ]
      
      for (const attack of tildeAttacks) {
        const response = await request(app)
          .get(attack)
          .expect(400)
        
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
  })

  describe('Null Byte Detection', () => {
    it('should block null byte injection', async () => {
      const response = await request(app)
        .get('/uploads/file.txt%00.php')
        .expect(400)
      
      expect(response.body.error.code).toBe('INVALID_PATH')
    })
  })

  describe('Legitimate Paths Should Pass', () => {
    it('should allow normal file paths', async () => {
      const response = await request(app)
        .get('/uploads/image.jpg')
        .expect(200)
      
      expect(response.body.message).toBe('Security passed')
    })
    
    it('should allow files with single dots in names', async () => {
      const response = await request(app)
        .get('/uploads/my.file.name.txt')
        .expect(200)
      
      expect(response.body.message).toBe('Security passed')
    })
    
    it('should allow subdirectory access', async () => {
      const response = await request(app)
        .get('/uploads/subfolder/file.txt')
        .expect(200)
      
      expect(response.body.message).toBe('Security passed')
    })
  })
})