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
    // Check all possible URL sources to catch path traversal attempts
    const originalUrl = req.originalUrl || ''
    const requestUrl = req.url || ''
    const requestPath = req.path || ''
    
    console.log('\n=== GLOBAL SECURITY MIDDLEWARE ===')
    console.log('originalUrl:', JSON.stringify(originalUrl))
    console.log('req.url:', JSON.stringify(requestUrl))
    console.log('req.path:', JSON.stringify(requestPath))
    
    // Check all URL variations for security threats
    const urlsToCheck = [originalUrl, requestUrl, requestPath]
    
    for (const urlToCheck of urlsToCheck) {
      // Block any path containing double dots (basic path traversal)
      if (urlToCheck.includes('..')) {
        console.log('BLOCKING: Double dots detected in:', JSON.stringify(urlToCheck))
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // Block URL encoded double dots (%2e%2e, %2E%2E)
      if (/%2e%2e/i.test(urlToCheck)) {
        console.log('BLOCKING: URL encoded double dots detected in:', JSON.stringify(urlToCheck))
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // Block backslashes (Windows path traversal)
      if (urlToCheck.includes('\\')) {
        console.log('BLOCKING: Backslashes detected in:', JSON.stringify(urlToCheck))
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // Block URL encoded backslashes (%5c, %5C)
      if (/%5c/i.test(urlToCheck)) {
        console.log('BLOCKING: URL encoded backslashes detected in:', JSON.stringify(urlToCheck))
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // Block tilde paths (home directory access)
      if (urlToCheck.includes('~')) {
        console.log('BLOCKING: Tilde paths detected in:', JSON.stringify(urlToCheck))
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
    }
    
    console.log('ALLOWED: All URLs passed global security validation')
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
    
    // 3. Finally serve static files with security options (only if security checks pass)
    express.static(uploadsPath, {
      // Security options for express.static
      dotfiles: 'deny',  // Deny access to dotfiles (backup protection)
      index: false,      // Don't serve directory indexes
      redirect: false,   // Don't redirect trailing slashes
      
      // Custom headers for all served files
      setHeaders: (res: express.Response, filePath: string) => {
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-Frame-Options', 'SAMEORIGIN')
        res.setHeader('Content-Disposition', 'inline')
        
        // Content Security Policy for media files
        const ext = pathModule.extname(filePath).toLowerCase()
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mp3', '.wav'].includes(ext)) {
          res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'")
        }
      }
    })
  ]
}