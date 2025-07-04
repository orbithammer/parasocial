// backend/src/middleware/staticFileSecurityMiddleware.ts
// Version: 4.0
// CRITICAL FIX: Corrected logic errors in pattern detection and middleware ordering

import express from 'express'
import * as pathModule from 'path'

/**
 * Global security middleware that detects and blocks path traversal attempts
 * This runs first and only catches path traversal - NOT dotfiles
 */
export function createGlobalSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const originalUrl = req.originalUrl || req.url || ''
    
    console.log('\n=== GLOBAL SECURITY MIDDLEWARE ===')
    console.log('Original URL:', JSON.stringify(originalUrl))
    
    // 1. Check for basic double dots (but not single dots which are normal)
    if (originalUrl.includes('..')) {
      console.log('BLOCKING: Double dots detected')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // 2. Check for URL encoded dots (%2e, %2E) - but be more specific
    if (/%2e%2e/i.test(originalUrl) || /%2E%2E/i.test(originalUrl)) {
      console.log('BLOCKING: URL encoded double dots detected')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // 3. Check for URL encoded forward slashes in suspicious patterns
    if (/%2f/i.test(originalUrl) && originalUrl.includes('..')) {
      console.log('BLOCKING: URL encoded slashes with traversal detected')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // 4. Check for backslashes (Windows path traversal)
    if (originalUrl.includes('\\')) {
      console.log('BLOCKING: Backslashes detected')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // 5. Check for URL encoded backslashes (%5c, %5C)
    if (/%5c/i.test(originalUrl)) {
      console.log('BLOCKING: URL encoded backslashes detected')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // 6. Check for tilde paths (~)
    if (originalUrl.includes('~')) {
      console.log('BLOCKING: Tilde paths detected')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // 7. Check for dangerous system file patterns (but not dotfiles in general)
    if (/etc\/passwd/i.test(originalUrl) || 
        /windows\/system32/i.test(originalUrl) ||
        /\.ssh\//i.test(originalUrl)) {
      console.log('BLOCKING: Dangerous system file pattern detected')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // 8. Check for null bytes
    if (originalUrl.includes('%00') || originalUrl.includes('\x00')) {
      console.log('BLOCKING: Null bytes detected')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // 9. Check for URL encoded traversal patterns
    const decodedUrl = decodeURIComponent(originalUrl)
    if (decodedUrl !== originalUrl && decodedUrl.includes('..')) {
      console.log('BLOCKING: Decoded URL contains path traversal')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    console.log('ALLOWING: URL passed global security checks')
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
 * Create secure static file handler with comprehensive security
 * Returns array of middleware: [global security, local security, static file serving]
 */
export function createSecureStaticFileHandler(uploadsPath: string): express.RequestHandler[] {
  return [
    // Global security middleware (path traversal protection)
    createGlobalSecurityMiddleware(),
    
    // Local security middleware (dotfile protection)  
    createLocalSecurityMiddleware(),
    
    // Express static file serving with security options
    express.static(uploadsPath, {
      // Security options
      dotfiles: 'ignore',    // Never serve dotfiles (backup protection)
      index: false,          // Don't serve index files
      redirect: false,       // Don't redirect trailing slashes
      
      // Custom headers for all served files
      setHeaders: (res: express.Response, filePath: string) => {
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-Frame-Options', 'SAMEORIGIN')
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'")
        
        // Content disposition based on file type
        const ext = pathModule.extname(filePath).toLowerCase()
        
        // Files that should be displayed inline (safe for browsers)
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
          res.setHeader('Content-Disposition', 'inline')
        } else if (['.mp4', '.webm', '.mov', '.avi'].includes(ext)) {
          res.setHeader('Content-Disposition', 'inline')
        } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
          res.setHeader('Content-Disposition', 'inline')
        } else {
          // All other file types - force download for security
          res.setHeader('Content-Disposition', 'attachment')
        }
      }
    })
  ]
}