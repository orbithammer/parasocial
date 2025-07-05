// backend/src/middleware/staticFileSecurityMiddleware.ts
// Version: 1.0
// Static file security middleware with path traversal protection and security headers

import { Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs'

/**
 * Validate file path to prevent directory traversal attacks
 */
const validateFilePath = (filePath: string): boolean => {
  // Decode URL encoding first to catch encoded attacks
  const decodedPath = decodeURIComponent(filePath)
  
  // Check for path traversal patterns
  const dangerousPatterns = [
    /\.\./,           // Basic path traversal
    /[/\\]\./,        // Hidden files/folders
    /~[/\\]/,         // Home directory access
    /\x00/,           // Null bytes
    /[<>:"|?*]/       // Windows invalid chars
  ]
  
  return !dangerousPatterns.some(pattern => pattern.test(decodedPath))
}

/**
 * Determine appropriate Content-Disposition based on file type
 */
const getContentDisposition = (filename: string): string => {
  const ext = path.extname(filename).toLowerCase()
  
  // Files that should be displayed inline (safe to display in browser)
  const inlineExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.mp4', '.webm', '.mp3', '.wav', '.ogg',
    '.txt', '.json'
  ]
  
  return inlineExtensions.includes(ext) ? 'inline' : 'attachment'
}

/**
 * Set security headers for static file responses
 */
const setSecurityHeaders = (req: Request, res: Response, filename: string): void => {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')
  
  // Allow embedding for media files, prevent for others
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  
  // Set appropriate Content-Disposition
  const disposition = getContentDisposition(filename)
  res.setHeader('Content-Disposition', disposition)
  
  // Add cache control for better performance
  res.setHeader('Cache-Control', 'public, max-age=86400') // 24 hours
}

/**
 * Path traversal protection middleware
 */
const pathTraversalProtection = (req: Request, res: Response, next: NextFunction): void => {
  const requestedPath = req.path
  
  // Validate the requested path
  if (!validateFilePath(requestedPath)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PATH',
        message: 'Invalid file path'
      }
    })
    return
  }
  
  next()
}

/**
 * File existence and security check middleware
 */
const createFileSecurityHandler = (staticRoot: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestedFile = req.path
    const fullPath = path.join(staticRoot, requestedFile)
    
    // Ensure the resolved path is within the static directory
    const resolvedPath = path.resolve(fullPath)
    const resolvedRoot = path.resolve(staticRoot)
    
    if (!resolvedPath.startsWith(resolvedRoot)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
      return
    }
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found'
        }
      })
      return
    }
    
    // Set security headers
    const filename = path.basename(requestedFile)
    setSecurityHeaders(req, res, filename)
    
    next()
  }
}

/**
 * Create secure static file handler middleware array
 * @param staticRoot - Root directory for static files
 * @returns Array of middleware functions for secure static file serving
 */
export const createSecureStaticFileHandler = (staticRoot: string): Array<(req: Request, res: Response, next: NextFunction) => void> => {
  return [
    pathTraversalProtection,
    createFileSecurityHandler(staticRoot),
    // Express static middleware (this will actually serve the file)
    (req: Request, res: Response, next: NextFunction) => {
      const requestedFile = req.path
      const fullPath = path.join(staticRoot, requestedFile)
      
      // Serve the file directly
      res.sendFile(path.resolve(fullPath), (err) => {
        if (err) {
          res.status(404).json({
            success: false,
            error: {
              code: 'FILE_NOT_FOUND',
              message: 'File not found'
            }
          })
        }
      })
    }
  ]
}

/**
 * Global security middleware for all requests
 */
export const createGlobalSecurityMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Set global security headers
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Block requests with suspicious User-Agent patterns
    const userAgent = req.headers['user-agent'] || ''
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /burp/i
    ]
    
    if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
      res.status(403).json({
        success: false,
        error: {
          code: 'BLOCKED_REQUEST',
          message: 'Request blocked'
        }
      })
      return
    }
    
    next()
  }
}

/**
 * Enhanced request validation middleware
 */
export const createRequestValidationMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Validate Content-Length to prevent large requests
    const contentLength = req.headers['content-length']
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) { // 50MB limit
      res.status(413).json({
        success: false,
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: 'Request size exceeds limit'
        }
      })
      return
    }
    
    // Rate limiting headers (if using rate limiter)
    res.setHeader('X-RateLimit-Limit', '100')
    res.setHeader('X-RateLimit-Remaining', '99')
    
    next()
  }
}