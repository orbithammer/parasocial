// backend/src/middleware/staticFileSecurityMiddleware.ts
// Version: 2.0
// COMPLETE FIX: Added comprehensive path traversal detection for all test patterns

import express from 'express'
import * as pathModule from 'path'
import { IncomingMessage } from 'http'

/**
 * Comprehensive path traversal detection middleware
 * Detects and blocks all forms of path traversal attacks including:
 * - Basic double dots (..)
 * - URL encoded variations (%2e%2e, %2f, etc.)
 * - Windows backslashes (\ and %5c)
 * - Tilde paths (~)
 * - Mixed encoding combinations
 */
export function createGlobalSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Get both the original URL and decoded version for comprehensive checking
    const originalUrl = req.originalUrl || req.url || ''
    const decodedUrl = decodeURIComponent(originalUrl)
    
    console.log('\n=== GLOBAL SECURITY MIDDLEWARE ===')
    console.log('Original URL:', JSON.stringify(originalUrl))
    console.log('Decoded URL:', JSON.stringify(decodedUrl))
    
    /**
     * Comprehensive path traversal patterns to detect
     */
    const pathTraversalPatterns = [
      // Basic double dots
      /\.\./,
      
      // URL encoded dots and slashes (case insensitive)
      /%2e/i,        // encoded dot (.)
      /%2f/i,        // encoded forward slash (/)
      /%5c/i,        // encoded backslash (\)
      
      // Windows backslash patterns
      /\\/,          // literal backslash
      
      // Tilde patterns (home directory access)
      /~/,
      
      // Double encoded patterns
      /%252e/i,      // double encoded dot
      /%252f/i,      // double encoded slash
      
      // Alternative encodings
      /%c0%ae/i,     // overlong UTF-8 encoding of dot
      /%c1%9c/i,     // overlong UTF-8 encoding of backslash
    ]
    
    /**
     * Check both original and decoded URLs for path traversal patterns
     */
    const urlsToCheck = [originalUrl, decodedUrl]
    
    for (const urlToCheck of urlsToCheck) {
      for (const pattern of pathTraversalPatterns) {
        if (pattern.test(urlToCheck)) {
          console.log(`BLOCKING: Path traversal detected with pattern ${pattern} in URL: ${JSON.stringify(urlToCheck)}`)
          
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PATH',
              message: 'Invalid file path'
            }
          })
        }
      }
    }
    
    /**
     * Additional security checks for specific dangerous patterns
     */
    const dangerousPatterns = [
      // Common system files
      /etc\/passwd/i,
      /windows\/system32/i,
      /\.ssh/i,
      /\.env/i,
      
      // Null bytes (should not appear in valid URLs)
      /%00/i,
      /\x00/,
      
      // Double slashes (can sometimes bypass filters)
      /\/\//,
    ]
    
    for (const urlToCheck of urlsToCheck) {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(urlToCheck)) {
          console.log(`BLOCKING: Dangerous pattern detected: ${pattern} in URL: ${JSON.stringify(urlToCheck)}`)
          
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PATH',
              message: 'Invalid file path'
            }
          })
        }
      }
    }
    
    console.log('ALLOWING: URL passed all security checks')
    next()
  }
}

/**
 * Local security middleware for dotfiles and upload-specific checks
 * This runs after global security and handles file-specific security
 */
function createLocalSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('\n=== LOCAL SECURITY MIDDLEWARE ===')
    
    // Extract filename from the request path
    const requestPath = req.path || req.url || ''
    const fileName = pathModule.basename(requestPath)
    
    console.log('Local Security Check:')
    console.log('  requestPath:', JSON.stringify(requestPath))
    console.log('  fileName:', JSON.stringify(fileName))
    
    // Block dotfiles (files starting with .)
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