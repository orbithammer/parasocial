// backend/src/middleware/staticFileSecurityMiddleware.ts
// Version: 1.5
// Fixed: Capture raw URL before Express normalizes path traversal

import express from 'express'
import * as pathModule from 'path'
import { IncomingMessage } from 'http'

/**
 * Global security middleware to prevent path traversal attacks
 * Captures the raw URL before Express normalizes it
 */
export function createGlobalSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('\n=== GLOBAL SECURITY MIDDLEWARE EXECUTING ===')
    
    // CRITICAL: Get the raw URL from the HTTP request before Express normalization
    const rawUrl = (req as any).originalUrl || req.url || ''
    
    // Also try to get it from the raw HTTP request if available
    let httpRawUrl = ''
    if ((req as any).socket && (req as any).socket.parser) {
      // Try to access the raw HTTP request
      const httpReq = (req as any).socket.parser.incoming
      if (httpReq && httpReq.url) {
        httpRawUrl = httpReq.url
      }
    }
    
    // Try alternative method: access the raw request URL
    const nodeReq = req as any as IncomingMessage
    const nodeRawUrl = nodeReq.url || ''
    
    // Get Express-processed URLs for comparison
    const originalUrl = req.originalUrl || req.url || ''
    const url = req.url || ''
    const requestPath = req.path || ''
    
    console.log('URL Analysis:')
    console.log('  rawUrl (from req):', JSON.stringify(rawUrl))
    console.log('  httpRawUrl (from socket):', JSON.stringify(httpRawUrl))
    console.log('  nodeRawUrl (from IncomingMessage):', JSON.stringify(nodeRawUrl))
    console.log('  originalUrl (Express):', JSON.stringify(originalUrl))
    console.log('  url (Express):', JSON.stringify(url))
    console.log('  path (Express):', JSON.stringify(requestPath))
    
    // Use all available URL sources for security checking
    const urlsToAnalyze = [
      rawUrl,
      httpRawUrl, 
      nodeRawUrl,
      originalUrl,
      url,
      requestPath
    ].filter(u => u && u.length > 0) // Remove empty strings
    
    console.log('URLs to analyze:', urlsToAnalyze.map(u => JSON.stringify(u)))
    
    // Check if ANY URL variation involves uploads or traversal
    let hasUploads = false
    let hasTraversal = false
    
    for (const urlToCheck of urlsToAnalyze) {
      if (urlToCheck.includes('/uploads')) hasUploads = true
      if (urlToCheck.includes('..')) hasTraversal = true
    }
    
    console.log('Pattern Detection:')
    console.log('  hasUploads:', hasUploads)
    console.log('  hasTraversal:', hasTraversal)
    console.log('  shouldSkipSecurity:', !hasUploads && !hasTraversal)
    
    // If no URLs involve uploads or traversal, skip security checks
    if (!hasUploads && !hasTraversal) {
      console.log('SKIPPING: No URLs involve uploads or traversal patterns')
      return next()
    }
    
    console.log('APPLYING SECURITY: At least one URL involves uploads or traversal patterns')
    
    // Check each URL for malicious patterns
    for (let i = 0; i < urlsToAnalyze.length; i++) {
      const urlToCheck = urlsToAnalyze[i]
      
      // Decode URL to catch encoded attacks
      let decodedUrl = ''
      try {
        decodedUrl = decodeURIComponent(urlToCheck)
      } catch (error) {
        console.log(`[${i}] BLOCKING: URL decoding failed for "${urlToCheck}"`)
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PATH',
            message: 'Invalid file path'
          }
        })
      }
      
      // Check both original and decoded versions
      const versionsToCheck = [urlToCheck, decodedUrl]
      
      for (const version of versionsToCheck) {
        const lowerUrl = version.toLowerCase()
        console.log(`  [${i}] Checking: ${JSON.stringify(version)} (lower: ${JSON.stringify(lowerUrl)})`)
        
        // Check for path traversal (double dots)
        if (lowerUrl.includes('..')) {
          console.log(`  [${i}] BLOCKING: Found path traversal (..) in URL`)
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PATH',
              message: 'Invalid file path'
            }
          })
        }
        
        // Check for home directory access
        if (lowerUrl.includes('~')) {
          console.log(`  [${i}] BLOCKING: Found tilde (~) in URL`)
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_PATH',
              message: 'Invalid file path'
            }
          })
        }
        
        // Check for encoded traversal patterns
        const maliciousPatterns = ['%2e%2e', '%2f%2e%2e', '%5c', '\\']
        for (const pattern of maliciousPatterns) {
          if (lowerUrl.includes(pattern)) {
            console.log(`  [${i}] BLOCKING: Found encoded pattern "${pattern}" in URL`)
            return res.status(400).json({
              success: false,
              error: {
                code: 'INVALID_PATH',
                message: 'Invalid file path'
              }
            })
          }
        }
        
        console.log(`  [${i}] SAFE: No malicious patterns found in "${version}"`)
      }
    }
    
    console.log('ALLOWING: All URLs passed security checks')
    next()
  }
}

/**
 * Alternative approach: Raw HTTP middleware that runs before Express routing
 * This captures the URL before any Express processing
 */
export function createRawHttpSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Access the raw Node.js HTTP request
    const nodeReq = req as any as IncomingMessage
    const rawUrl = nodeReq.url || ''
    
    console.log('\n=== RAW HTTP SECURITY MIDDLEWARE ===')
    console.log('Raw HTTP URL:', JSON.stringify(rawUrl))
    
    // Basic security checks on raw URL
    if (rawUrl.includes('..') && (rawUrl.includes('/uploads') || rawUrl.includes('uploads'))) {
      console.log('BLOCKING: Raw URL contains path traversal targeting uploads')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    console.log('ALLOWING: Raw URL passed basic security check')
    next()
  }
}

/**
 * Local security middleware for dotfiles and additional upload-specific security
 * This runs only on /uploads routes after global security has passed
 */
function createLocalSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('\n=== LOCAL SECURITY MIDDLEWARE EXECUTING ===')
    
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