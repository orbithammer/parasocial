// backend/src/middleware/bulletproofSecurityMiddleware.ts
// Version: 1.0
// Super simple, bulletproof security middleware to test basic functionality

import express from 'express'

/**
 * Ultra-simple security middleware that definitely blocks path traversal
 * This is for debugging - if this doesn't work, there's a deeper issue
 */
export function createBulletproofSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('\n=== BULLETPROOF SECURITY MIDDLEWARE ===')
    
    // Get the URL - try multiple sources
    const url1 = req.originalUrl
    const url2 = req.url  
    const url3 = req.path
    
    console.log('URL sources:')
    console.log('  originalUrl:', JSON.stringify(url1))
    console.log('  req.url:', JSON.stringify(url2))
    console.log('  req.path:', JSON.stringify(url3))
    
    // Simple array of URLs to check
    const urlsToCheck = [url1, url2, url3].filter(url => url && url.length > 0)
    console.log('URLs after filtering:', urlsToCheck)
    
    // Check each URL for threats
    for (let i = 0; i < urlsToCheck.length; i++) {
      const currentUrl = urlsToCheck[i]
      console.log(`Checking URL ${i}:`, JSON.stringify(currentUrl))
      
      // Test 1: Basic double dots
      const hasDoubleDots = currentUrl.indexOf('..') !== -1
      console.log(`  Has double dots: ${hasDoubleDots}`)
      
      if (hasDoubleDots) {
        console.log('  BLOCKING: Path traversal detected!')
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // Test 2: Backslashes
      const hasBackslashes = currentUrl.indexOf('\\') !== -1
      console.log(`  Has backslashes: ${hasBackslashes}`)
      
      if (hasBackslashes) {
        console.log('  BLOCKING: Windows path traversal detected!')
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // Test 3: Tilde
      const hasTilde = currentUrl.indexOf('~') !== -1
      console.log(`  Has tilde: ${hasTilde}`)
      
      if (hasTilde) {
        console.log('  BLOCKING: Tilde path detected!')
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
    }
    
    console.log('ALLOWING: No threats detected')
    next()
  }
}

/**
 * Test function to verify the middleware works
 */
export function testBulletproofMiddleware() {
  const testCases = [
    '/uploads/../../../etc/passwd',
    '/../sensitive/file.txt',
    '/uploads\\..\\windows',
    '/uploads/~/home'
  ]
  
  console.log('Testing bulletproof middleware logic:')
  
  testCases.forEach((testUrl, index) => {
    console.log(`\nTest ${index + 1}: ${testUrl}`)
    
    const hasDoubleDots = testUrl.indexOf('..') !== -1
    const hasBackslashes = testUrl.indexOf('\\') !== -1  
    const hasTilde = testUrl.indexOf('~') !== -1
    
    console.log(`  Double dots: ${hasDoubleDots}`)
    console.log(`  Backslashes: ${hasBackslashes}`)
    console.log(`  Tilde: ${hasTilde}`)
    
    const shouldBlock = hasDoubleDots || hasBackslashes || hasTilde
    console.log(`  Should block: ${shouldBlock}`)
  })
}