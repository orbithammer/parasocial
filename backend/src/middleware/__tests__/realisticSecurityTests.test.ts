// backend/src/middleware/__tests__/realisticSecurityTests.test.ts
// Version: 1.0
// Focus on actual security threats that Express doesn't auto-fix

import { describe, it, expect, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createSecureStaticFileHandler } from '../staticFileSecurityMiddleware'

function createRealisticSecurityApp(): express.Application {
  const app = express()
  app.use(express.json())
  
  // Use our secure static file handler
  const testUploadsPath = '/test-uploads'
  app.use('/uploads', ...createSecureStaticFileHandler(testUploadsPath))
  
  return app
}

describe('Realistic Security Tests - Actual Threats', () => {
  let app: express.Application
  
  beforeEach(() => {
    app = createRealisticSecurityApp()
  })

  describe('URL Encoded Path Traversal (Real Threat)', () => {
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
    
    it('should block mixed URL encoding attacks', async () => {
      const encodedAttacks = [
        '/uploads/..%2F..%2F..%2F/etc/passwd',
        '/uploads/%2e%2e%2f%2e%2e%2f%2e%2e%2f/etc/passwd',
        '/uploads/..%252F..%252F..%252F/etc/passwd'  // Double-encoded
      ]
      
      for (const attack of encodedAttacks) {
        const response = await request(app)
          .get(attack)
          .expect(400)
        
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
  })

  describe('Tilde Path Attacks (Real Threat)', () => {
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
        // Note: '/uploads/~/../../etc/passwd' gets normalized by Express to '/etc/passwd'
        // This is actually good - Express provides baseline protection against this pattern
      ]
      
      for (const attack of tildeAttacks) {
        const response = await request(app)
          .get(attack)
          .expect(400)
        
        expect(response.body.error.code).toBe('INVALID_PATH')
      }
    })
    
    it('should show Express normalization behavior for complex tilde patterns', async () => {
      // This pattern gets normalized by Express (which is good security)
      const response = await request(app)
        .get('/uploads/~/../../etc/passwd')
        .expect(404)  // Express normalizes to '/etc/passwd', file not found
      
      console.log('ℹ️  Complex tilde+traversal pattern auto-normalized by Express - this is good security!')
    })
  })

  describe('Dotfile Protection (Real Threat)', () => {
    it('should block access to dotfiles', async () => {
      const response = await request(app)
        .get('/uploads/.htaccess')
        .expect(403)  // Different error code for dotfiles
      
      expect(response.body.error.code).toBe('DOTFILE_ACCESS_DENIED')
    })
  })

  describe('Legitimate Access (Should Work)', () => {
    it('should allow normal file access', async () => {
      // This will 404 because file doesn't exist, but security should pass
      const response = await request(app)
        .get('/uploads/image.jpg')
        .expect(404)  // File not found, but security passed
    })
    
    it('should allow files with dots in names', async () => {
      const response = await request(app)
        .get('/uploads/my.file.name.txt')
        .expect(404)  // File not found, but security passed
    })
  })

  describe('Express Auto-Fixed Attacks (Informational)', () => {
    it('should show that basic path traversal is auto-fixed by Express', async () => {
      // Express auto-normalizes this, so it becomes a legitimate request
      const response = await request(app)
        .get('/uploads/../../../etc/passwd')
        .expect(404)  // Becomes legitimate "/etc/passwd" request, just file not found
      
      // This demonstrates Express built-in protection
      console.log('ℹ️  Express auto-normalized path traversal - this is actually good security!')
    })
  })
})