// backend/src/middleware/expressAwareSecurityMiddleware.ts
// Version: 1.0
// Security middleware that works WITH Express path normalization

import express from 'express'
import * as path from 'path'

/**
 * Security middleware that handles Express's automatic path normalization
 * Focus: Block what Express DOESN'T handle automatically
 */
export function createExpressAwareSecurityMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('\n=== EXPRESS-AWARE SECURITY MIDDLEWARE ===')
    
    const originalUrl = req.originalUrl || ''
    const url = req.url || ''
    const pathOnly = req.path || ''
    
    console.log('Request analysis:')
    console.log('  originalUrl:', JSON.stringify(originalUrl))
    console.log('  req.url:', JSON.stringify(url))
    console.log('  req.path:', JSON.stringify(pathOnly))
    
    // SECURITY CHECK 1: Block direct system directory access
    // (These come from Express-normalized path traversal attempts)
    if (isSystemDirectoryAccess(pathOnly)) {
      console.log('🚨 BLOCKED: System directory access attempt!')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // SECURITY CHECK 2: Block URL-encoded traversal patterns
    // (These might bypass Express normalization)
    if (hasEncodedTraversalPatterns(originalUrl)) {
      console.log('🚨 BLOCKED: URL-encoded traversal detected!')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // SECURITY CHECK 3: Block Windows-style path traversal
    if (hasWindowsTraversalPatterns(originalUrl)) {
      console.log('🚨 BLOCKED: Windows traversal detected!')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // SECURITY CHECK 4: Block null byte injection
    if (hasNullByteInjection(originalUrl)) {
      console.log('🚨 BLOCKED: Null byte injection detected!')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    // SECURITY CHECK 5: Block dotfiles (files starting with .)
    if (isDotfileAccess(pathOnly)) {
      console.log('🚨 BLOCKED: Dotfile access detected!')
      return res.status(403).json({
        success: false,
        error: {
          code: 'DOTFILE_ACCESS_DENIED',
          message: 'Access to dotfiles is not allowed'
        }
      })
    }
    
    console.log('✅ ALLOWED: All security checks passed')
    next()
  }
}

/**
 * Check if the path (after Express normalization) points to system directories
 * This catches path traversal attempts that Express normalized
 */
function isSystemDirectoryAccess(pathOnly: string): boolean {
  const dangerousPaths = [
    '/etc/',
    '/proc/',
    '/sys/',
    '/dev/',
    '/root/',
    '/home/',
    '/usr/local/',
    '/var/log/',
    '/boot/',
    '/tmp/',
    '/opt/'
  ]
  
  // Check if path starts with any dangerous system directory
  const isDangerous = dangerousPaths.some(dangerous => pathOnly.startsWith(dangerous))
  
  if (isDangerous) {
    console.log(`  ❌ System directory access: ${pathOnly}`)
    return true
  }
  
  // Check for specific sensitive files
  const sensitiveFiles = [
    '/etc/passwd',
    '/etc/shadow',
    '/etc/hosts',
    '/proc/version',
    '/proc/cpuinfo'
  ]
  
  const isSensitiveFile = sensitiveFiles.includes(pathOnly)
  
  if (isSensitiveFile) {
    console.log(`  ❌ Sensitive file access: ${pathOnly}`)
    return true
  }
  
  return false
}

/**
 * Check for URL-encoded path traversal patterns that might bypass Express
 */
function hasEncodedTraversalPatterns(url: string): boolean {
  const lowerUrl = url.toLowerCase()
  
  const encodedPatterns = [
    '%2e%2e',      // URL encoded ..
    '%2E%2E',      // URL encoded .. (uppercase)
    '%252e%252e',  // Double URL encoded ..
    '..%2f',       // .. followed by encoded /
    '%2e%2e%2f',   // Fully encoded ../
    '..%5c',       // .. followed by encoded \
    '%2e%2e%5c',   // Fully encoded ..\
    '%2e%2e/',     // Mixed encoding
    '../%2e%2e'    // Mixed encoding
  ]
  
  for (const pattern of encodedPatterns) {
    if (lowerUrl.includes(pattern)) {
      console.log(`  ❌ Encoded traversal pattern: ${pattern}`)
      return true
    }
  }
  
  return false
}

/**
 * Check for Windows-style path traversal patterns
 */
function hasWindowsTraversalPatterns(url: string): boolean {
  const lowerUrl = url.toLowerCase()
  
  // Direct backslashes
  if (url.includes('\\')) {
    console.log('  ❌ Contains backslashes')
    return true
  }
  
  // URL-encoded backslashes
  if (lowerUrl.includes('%5c')) {
    console.log('  ❌ Contains encoded backslashes')
    return true
  }
  
  return false
}

/**
 * Check for null byte injection attempts
 */
function hasNullByteInjection(url: string): boolean {
  // URL-encoded null byte
  if (url.includes('%00')) {
    console.log('  ❌ Contains URL-encoded null byte')
    return true
  }
  
  // Actual null byte character
  if (url.includes('\0')) {
    console.log('  ❌ Contains null byte character')
    return true
  }
  
  return false
}

/**
 * Check for dotfile access attempts
 */
function isDotfileAccess(pathOnly: string): boolean {
  const pathParts = pathOnly.split('/')
  
  for (const part of pathParts) {
    // Check if any path segment is a dotfile (starts with . but isn't . or ..)
    if (part.startsWith('.') && part !== '.' && part !== '..' && part.length > 1) {
      console.log(`  ❌ Dotfile detected: ${part}`)
      return true
    }
  }
  
  return false
}

/**
 * Simple version for basic testing
 */
export function createSimpleExpressAwareMiddleware(): express.RequestHandler {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('\n=== SIMPLE EXPRESS-AWARE MIDDLEWARE ===')
    console.log('Path after Express normalization:', JSON.stringify(req.path))
    
    // Check if Express normalized a traversal attempt into a system directory access
    if (req.path.startsWith('/etc/') || req.path.startsWith('/proc/') || req.path.startsWith('/root/')) {
      console.log('BLOCKING: System directory access detected')
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PATH',
          message: 'Invalid file path'
        }
      })
    }
    
    console.log('ALLOWING: No system directory access detected')
    next()
  }
}