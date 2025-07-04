// backend/src/middleware/__tests__/rawUrlTest.test.ts
// Version: 1.2
// FIXED: Added missing Vitest imports

import { describe, it, expect, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { createBulletproofSecurityMiddleware } from '../bulletproofSecurityMiddleware'

// Extend Express Request interface to include our custom property
declare global {
  namespace Express {
    interface Request {
      rawUrl?: string
    }
  }
}

/**
 * Create app with raw URL processing middleware
 */
function createRawUrlApp(): express.Application {
  const app = express()
  app.use(express.json())
  
  // Add middleware that captures raw URL BEFORE Express processes it
  app.use((req, res, next) => {
    console.log('\n=== RAW URL CAPTURE ===')
    console.log('Raw req.url (before processing):', JSON.stringify(req.url))
    console.log('Raw originalUrl:', JSON.stringify(req.originalUrl))
    
    // Store raw URL for security checking
    req.rawUrl = req.url
    next()
  })
  
  // Add our security middleware
  app.use(createBulletproofSecurityMiddleware())
  
  // Success route
  app.get('*', (req, res) => {
    res.status(200).json({ 
      message: 'Security passed!',
      processedUrl: req.url,
      rawUrl: req.rawUrl
    })
  })
  
  return app
}

describe('Raw URL Security Test', () => {
  let app: express.Application
  
  beforeEach(() => {
    app = createRawUrlApp()
  })

  it('should show what URLs Express actually receives', async () => {
    console.log('\n=== TESTING URL PROCESSING ===')
    
    // Test different path traversal patterns
    const testUrls = [
      '/uploads/../../../etc/passwd',
      '/uploads/..%2F..%2F..%2Fetc%2Fpasswd',  // URL encoded
      '/uploads\\..\\..\\windows',
      '/uploads/~/home'
    ]
    
    for (const testUrl of testUrls) {
      console.log(`\n--- Testing: ${testUrl} ---`)
      
      const response = await request(app)
        .get(testUrl)
      
      console.log(`Status: ${response.status}`)
      console.log(`Response:`, response.body)
    }
    
    // This test is just for observation
    expect(true).toBe(true)
  })
})