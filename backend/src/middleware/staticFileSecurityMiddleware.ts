// backend/src/middleware/staticFileSecurityMiddleware.ts
// Version: 1.1
// Fixed path traversal detection and improved security middleware

import express from 'express'
import path from 'path'

/**
 * Security middleware to prevent path traversal attacks and protect dotfiles
 * This middleware runs before express.static to catch malicious requests
 */
function createStaticFileSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // DEBUG: Log all request properties
    console.log('=== SECURITY MIDDLEWARE DEBUG ===')
    console.log('req.originalUrl:', req.originalUrl)
    console.log('req.url:', req.url)
    console.log('req.path:', req.path)
    console.log('req.baseUrl:', req.baseUrl)
    
    // Get all possible representations of the path
    const originalUrl = req.originalUrl || req.url
    const url = req.url
    const path = req.path
    
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
      // If URL decoding fails, it might be malicious
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
    
    // Simple but effective path traversal detection
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
      
      // Check for backslashes (Windows path traversal)
      if (pathToCheck.includes('\\')) {
        console.log('BLOCKED: Found backslash in path')
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // Check for encoded patterns that decode to dangerous characters
      if (lowerPath.includes('%2e') || lowerPath.includes('%5c')) {
        console.log('BLOCKED: Found encoded dangerous characters')
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
    }
    
    // Extract filename from the path for dotfile checking
    // Use the decoded path to get the actual filename
    const pathSegments = decodedPath.split('/')
    const fileName = pathSegments[pathSegments.length - 1]
    
    console.log('fileName:', fileName)
    
    // Check for dotfiles (files starting with .)
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
    
    console.log('PASSED: Request allowed through security middleware')
    // If all security checks pass, continue to next middleware
    next()
  }
}

/**
 * Create secure static file handler with security middleware
 * Returns array of middleware: [security, static file serving]
 */
export function createSecureStaticFileHandler(uploadsPath: string): express.RequestHandler[] {
  return [
    // Security middleware runs first to catch malicious requests
    createStaticFileSecurityMiddleware(),
    
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
          // Image files - display inline
          res.setHeader('Content-Disposition', 'inline')
        } else if (['.mp4', '.webm', '.mov', '.avi'].includes(ext)) {
          // Video files - display inline
          res.setHeader('Content-Disposition', 'inline')
        } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
          // Audio files - display inline
          res.setHeader('Content-Disposition', 'inline')
        } else {
          // All other file types - force download for security
          res.setHeader('Content-Disposition', 'attachment')
        }
      }
    })
  ]
}