// backend/src/middleware/staticFileSecurityMiddleware.ts
// Version: 1.2
// Fixed: Applied security middleware globally to catch path traversal before route matching

import express from 'express'
import path from 'path'

/**
 * Global security middleware to prevent path traversal attacks
 * This middleware runs on ALL requests to catch traversal attempts before route matching
 */
export function createGlobalSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Only check requests that are targeting upload paths or contain traversal patterns
    const originalUrl = req.originalUrl || req.url
    const url = req.url
    const path = req.path
    
    // Check if this request is targeting uploads or contains suspicious patterns
    const isUploadsRequest = originalUrl.includes('/uploads') || url.includes('/uploads') || path.includes('/uploads')
    const containsTraversal = originalUrl.includes('..') || url.includes('..') || path.includes('..')
    
    // Only apply security checks to upload-related requests or requests with traversal patterns
    if (!isUploadsRequest && !containsTraversal) {
      return next()
    }
    
    console.log('=== GLOBAL SECURITY MIDDLEWARE DEBUG ===')
    console.log('req.originalUrl:', originalUrl)
    console.log('req.url:', url)
    console.log('req.path:', path)
    console.log('isUploadsRequest:', isUploadsRequest)
    console.log('containsTraversal:', containsTraversal)
    
    // Decode URLs to catch encoded attacks
    let decodedUrl = ''
    let decodedPath = ''
    
    try {
      decodedUrl = decodeURIComponent(originalUrl)
      decodedPath = decodeURIComponent(path)
      console.log('decodedUrl:', decodedUrl)
      console.log('decodedPath:', decodedPath)
    } catch (error) {
      console.log('URL decoding failed - likely malicious')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // All path variations to check
    const pathsToCheck = [originalUrl, url, path, decodedUrl, decodedPath]
    console.log('pathsToCheck:', pathsToCheck)
    
    // Path traversal detection for upload-related requests
    for (const pathToCheck of pathsToCheck) {
      if (!pathToCheck) continue
      
      const lowerPath = pathToCheck.toLowerCase()
      console.log(`Checking path: "${pathToCheck}" (lower: "${lowerPath}")`)
      
      // Check for double dots (the main path traversal indicator)
      if (lowerPath.includes('..')) {
        console.log('BLOCKED: Found double dots in path')
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // Check for tilde (home directory access)
      if (lowerPath.includes('~')) {
        console.log('BLOCKED: Found tilde in path')
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // Check for encoded traversal patterns
      const encodedPatterns = ['%2e%2e', '%2f%2e%2e', '%5c', '\\']
      for (const pattern of encodedPatterns) {
        if (lowerPath.includes(pattern)) {
          console.log(`BLOCKED: Found encoded pattern "${pattern}" in path`)
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
    
    console.log('PASSED: Request allowed through global security middleware')
    next()
  }
}

/**
 * Local security middleware for dotfiles and additional upload-specific security
 * This runs only on /uploads routes after global security has passed
 */
function createLocalSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('=== LOCAL SECURITY MIDDLEWARE DEBUG ===')
    console.log('req.url:', req.url)
    console.log('req.path:', req.path)
    
    // Extract filename from the request path
    const requestPath = req.path || req.url
    const fileName = path.basename(requestPath)
    
    console.log('fileName:', fileName)
    
    // Block dotfiles (files starting with .)
    if (fileName && fileName.startsWith('.')) {
      console.log('BLOCKED: Dotfile access denied')
      return res.status(403).json({
        success: false,
        error: {
          code: 'DOTFILE_ACCESS_DENIED',
          message: 'Access to dotfiles is not allowed'
        }
      })
    }
    
    console.log('PASSED: Request allowed through local security middleware')
    next()
  }
}

/**
 * Create secure static file handler with both global and local security
 * Returns array of middleware: [local security, static file serving]
 */
export function createSecureStaticFileHandler(uploadsPath: string): express.RequestHandler[] {
  return [
    // Local security middleware (for dotfiles and upload-specific checks)
    createLocalSecurityMiddleware(),
    
    // Express static file serving with security options
    express.static(uploadsPath, {
      // Security options
      dotfiles: 'ignore',    // Never serve dotfiles
      index: false,          // Don't serve index files
      redirect: false,       // Don't redirect trailing slashes
      
      // Custom headers for all served files
      setHeaders: (res: express.Response, filePath: string) => {
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-Frame-Options', 'SAMEORIGIN')
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'")
        
        // Content disposition based on file type
        const ext = path.extname(filePath).toLowerCase()
        
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