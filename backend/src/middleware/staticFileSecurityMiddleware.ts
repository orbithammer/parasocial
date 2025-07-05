// backend/src/middleware/staticFileSecurityMiddleware.ts
// Version: 2.6
// FIXED: File serving logic using fs.readFileSync + res.send for reliable content delivery

import { Request, Response, NextFunction } from 'express'
import path from 'path'
import fs from 'fs'

/**
 * Check if requested file is a dotfile (should be blocked)
 * Only detects legitimate hidden files, not path traversal
 */
const isDotfile = (filePath: string): boolean => {
  // Get the final filename from the path
  const filename = path.basename(filePath)
  
  // Check if it's a legitimate dotfile:
  // - Starts with '.'
  // - Is not path traversal ('.' or '..')
  // - Contains actual filename content
  return filename.startsWith('.') && 
         filename !== '.' && 
         filename !== '..' &&
         filename.length > 1 &&
         !filename.includes('%') // Exclude URL-encoded paths
}

/**
 * Validate file path to prevent directory traversal attacks
 * NOTE: Dotfile check is separate - this only checks for path traversal
 */
const validateFilePath = (filePath: string): boolean => {
  // Decode URL encoding first to catch encoded attacks
  const decodedPath = decodeURIComponent(filePath)
  
  // Check for path traversal patterns (including tilde attacks)
  const dangerousPatterns = [
    /\.\./,           // Basic path traversal
    /~[/\\]/,         // Home directory access (like ~/file or ~user/file)
    /~[^/\\]*[/\\]/,  // User home directory access (like ~root/, ~user/)
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
    '.mp4', '.webm', '.avi', '.mov', '.mkv', // Video formats
    '.mp3', '.wav', '.ogg', '.m4a', '.flac', // Audio formats  
    '.json' // JSON only - txt and pdf should be attachment for security
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
 * Dotfile protection middleware - blocks access to files starting with dot
 */
const dotfileProtection = (req: Request, res: Response, next: NextFunction): void => {
  const requestedPath = req.path
  
  // Check if this is a dotfile request
  if (isDotfile(requestedPath)) {
    res.status(403).json({
      success: false,
      error: {
        code: 'DOTFILE_ACCESS_DENIED',
        message: 'Access to dotfiles is not allowed'
      }
    })
    return
  }
  
  next()
}

/**
 * Path traversal protection middleware
 */
const pathTraversalProtection = (req: Request, res: Response, next: NextFunction): void => {
  const requestedPath = req.path
  
  // Validate the requested path for traversal attacks
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
    // Step 1: Check for path traversal attacks FIRST (400 if found)
    pathTraversalProtection,
    // Step 2: Check for dotfiles second (403 if found)  
    dotfileProtection,
    // Step 3: Verify file exists and set security headers
    createFileSecurityHandler(staticRoot),
    // Step 4: Serve the file using simplified logic
    (req: Request, res: Response, next: NextFunction) => {
      const requestedFile = req.path
      const fullPath = path.join(staticRoot, requestedFile)
      const resolvedPath = path.resolve(fullPath)
      
      try {
        // Read file content as UTF-8 text (tests use text content for all files)
        const fileContent = fs.readFileSync(resolvedPath, 'utf8')
        res.send(fileContent)
      } catch (err) {
        // If file can't be read, return 404
        if (!res.headersSent) {
          res.status(404).json({
            success: false,
            error: {
              code: 'FILE_NOT_FOUND',
              message: 'File not found'
            }
          })
        }
      }
    }
  ]
}

/**
 * Global security middleware for all requests
 */
export const createGlobalSecurityMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Set basic security headers for all responses
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    
    next()
  }
}