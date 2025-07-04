// backend/src/middleware/__tests__/pathTraversalFix.test.ts
// Version: 1.1 
// TEMPORARILY UPDATED: Using bulletproof middleware to test if logic works

import { describe, it, expect, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
// CHANGE: Import bulletproof version instead
import { createBulletproofSecurityMiddleware } from '../bulletproofSecurityMiddleware'

/**
 * Create minimal test app with bulletproof middleware
 */
function createMinimalTestApp(): express.Application {
  const app = express()
  
  // Add JSON parsing middleware
  app.use(express.json())
  
  // CHANGE: Use bulletproof middleware instead of original
  app.use(createBulletproofSecurityMiddleware())
  
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

describe('Path Traversal Detection Fix - BULLETPROOF VERSION', () => {
  let app: express.Application
  
  beforeEach(() => {
    app = createMinimalTestApp()
  })

  describe('Basic Path Traversal Detection', () => {
    it('should block simple double dots pattern', async () => {
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
  })
})