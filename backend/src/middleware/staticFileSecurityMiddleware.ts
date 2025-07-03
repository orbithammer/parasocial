// backend/src/middleware/staticFileSecurityMiddleware.ts
// Version: 1.0
// Clean implementation with correct export name to fix TypeScript import error

import express from 'express'
import path from 'path'

/**
 * Security middleware to prevent path traversal attacks and protect dotfiles
 */
function createStaticFileSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Check for path traversal attempts
    const decodedPath = decodeURIComponent(req.path)
    
    // Path traversal patterns to block
    const dangerousPatterns = [
      '..',
      '~',
      '%2e%2e',
      '%2E%2E',
      '..%2f',
      '..%2F',
      '%2e%2e%2f',
      '%2E%2E%2F'
    ]
    
    // Check for dangerous patterns
    const hasDangerousPath = dangerousPatterns.some(pattern => 
      decodedPath.toLowerCase().includes(pattern.toLowerCase()) ||
      req.originalUrl.toLowerCase().includes(pattern.toLowerCase())
    )
    
    if (hasDangerousPath) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // Check for dotfiles
    const fileName = path.basename(decodedPath)
    if (fileName.startsWith('.')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'DOTFILE_ACCESS_DENIED',
          message: 'Access to dotfiles is not allowed'
        }
      })
    }
    
    next()
  }
}

/**
 * Create secure static file handler with security middleware
 * This is the main export that should be imported
 */
export function createSecureStaticFileHandler(uploadsPath: string): express.RequestHandler[] {
  return [
    // Security middleware first
    createStaticFileSecurityMiddleware(),
    
    // Static file serving with security options
    express.static(uploadsPath, {
      dotfiles: 'ignore',
      index: false,
      setHeaders: (res: express.Response, filePath: string) => {
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('X-Frame-Options', 'SAMEORIGIN')
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'")
        
        // Content disposition based on file type
        const ext = path.extname(filePath).toLowerCase()
        
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
          res.setHeader('Content-Disposition', 'inline')
        } else if (['.mp4', '.webm', '.mov', '.avi'].includes(ext)) {
          res.setHeader('Content-Disposition', 'inline')
        } else if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
          res.setHeader('Content-Disposition', 'inline')
        } else {
          res.setHeader('Content-Disposition', 'attachment')
        }
      }
    })
  ]
}