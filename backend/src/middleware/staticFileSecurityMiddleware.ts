// backend/src/middleware/staticFileSecurityMiddleware.ts
// Version: 5.0
// CRITICAL FIX: Completely rewritten to properly block path traversal attacks before static serving

import express from 'express'
import * as pathModule from 'path'

/**
 * Global security middleware that detects and blocks path traversal attempts
 * This runs first and catches path traversal attempts before any route matching
 * EXPORTED for use in app.ts and other files that expect this function
 */
export function createGlobalSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('\n=== GLOBAL SECURITY MIDDLEWARE ===')
    
    // Get all possible URL sources
    const originalUrl = req.originalUrl || ''
    const requestUrl = req.url || ''
    const requestPath = req.path || ''
    
    console.log('URL sources:')
    console.log('  originalUrl:', JSON.stringify(originalUrl))
    console.log('  req.url:', JSON.stringify(requestUrl))
    console.log('  req.path:', JSON.stringify(requestPath))
    
    // Create array of URLs to check (filter out empty strings)
    const urlsToCheck = [originalUrl, requestUrl, requestPath].filter(url => url && url.length > 0)
    console.log('URLs to check:', urlsToCheck.length, urlsToCheck)
    
    // Check each URL for security threats
    for (let i = 0; i < urlsToCheck.length; i++) {
      const currentUrl = urlsToCheck[i]
      console.log(`\nChecking URL ${i}:`, JSON.stringify(currentUrl))
      
      // 1. Check for double dots (path traversal) - using indexOf for reliability
      if (currentUrl.indexOf('..') !== -1) {
        console.log('BLOCKING: Path traversal (double dots) detected!')
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // 2. Check for backslashes (Windows path traversal)
      if (currentUrl.indexOf('\\') !== -1) {
        console.log('BLOCKING: Windows path traversal (backslashes) detected!')
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // 3. Check for tilde (home directory access)
      if (currentUrl.indexOf('~') !== -1) {
        console.log('BLOCKING: Tilde path detected!')
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // 4. Check for URL encoded double dots (%2e%2e, %2E%2E)
      if (/%2e%2e/i.test(currentUrl)) {
        console.log('BLOCKING: URL encoded double dots detected!')
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // 5. Check for URL encoded backslashes (%5c, %5C)
      if (/%5c/i.test(currentUrl)) {
        console.log('BLOCKING: URL encoded backslashes detected!')
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
    }
    
    console.log('ALLOWED: All URLs passed security validation')
    next()
  }
}

/**
 * Local security middleware for dotfile protection
 * This runs after global security and specifically handles dotfiles
 */
function createLocalSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('\n=== LOCAL SECURITY MIDDLEWARE ===')
    
    const requestPath = req.path || req.url || ''
    const fileName = pathModule.basename(requestPath)
    
    console.log('Local Security Check:')
    console.log('  requestPath:', JSON.stringify(requestPath))
    console.log('  fileName:', JSON.stringify(fileName))
    
    // Block dotfiles (files starting with .) - return 403 as expected by tests
    if (fileName && fileName.startsWith('.')) {
      console.log('BLOCKING: Dotfile access denied')
      return res.status(403).json({
        success: false,
        error: {
          code: 'DOTFILE_ACCESS_DENIED',
          message: 'Access to dotfiles is not allowed'
        }
      })
    }
    
    console.log('ALLOWING: Local security checks passed')
    next()
  }
}

/**
 * Creates a secure static file handler with all security middleware applied
 * This function returns an array of middleware that should be applied in order
 * EXPORTED for use in app.ts and test files that expect this function
 */
export function createSecureStaticFileHandler(uploadsPath: string): express.RequestHandler[] {
  console.log('Creating secure static file handler for path:', uploadsPath)
  
  return [
    // 1. First apply global security (blocks path traversal)
    createGlobalSecurityMiddleware(),
    
    // 2. Then apply local security (blocks dotfiles)
    createLocalSecurityMiddleware(),
    
    // 3. Add security headers before serving files
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Set security headers for file responses
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'SAMEORIGIN')
      
      // Set Content-Disposition based on file extension
      const requestPath = req.path || req.url || ''
      const extension = pathModule.extname(requestPath).toLowerCase()
      
      // Files that should be displayed inline (safe for browsers)
      const inlineExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mp3', '.wav', '.ogg']
      
      if (inlineExtensions.includes(extension)) {
        res.setHeader('Content-Disposition', 'inline')
      } else {
        // All other file types - force download for security
        res.setHeader('Content-Disposition', 'attachment')
      }
      
      next()
    },
    
    // 4. Finally serve static files (only if security checks pass)
    express.static(uploadsPath, {
      // Basic security options for express.static
      dotfiles: 'deny',  // Deny access to dotfiles (backup protection)
      index: false,      // Don't serve directory indexes
      redirect: false    // Don't redirect trailing slashes
    })
  ]
}

