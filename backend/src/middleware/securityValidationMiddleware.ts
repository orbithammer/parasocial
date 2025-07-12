// src/middleware/securityValidationMiddleware.ts
// Version: 1.0.3
// Fixed TypeScript undefined object handling for string methods

import { Request, Response, NextFunction } from 'express'

// Interface for security request validation
interface SecurityRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

// Security validation error types
export enum SecurityValidationError {
  XSS_DETECTED = 'XSS_DETECTED',
  SQL_INJECTION_DETECTED = 'SQL_INJECTION_DETECTED',
  PATH_TRAVERSAL_DETECTED = 'PATH_TRAVERSAL_DETECTED',
  INVALID_CONTENT_TYPE = 'INVALID_CONTENT_TYPE',
  REQUEST_TOO_LARGE = 'REQUEST_TOO_LARGE',
  INVALID_USER_AGENT = 'INVALID_USER_AGENT',
  SUSPICIOUS_HEADER = 'SUSPICIOUS_HEADER',
  UNSAFE_FILE_TYPE = 'UNSAFE_FILE_TYPE',
  INVALID_ORIGIN = 'INVALID_ORIGIN',
  MALICIOUS_PAYLOAD = 'MALICIOUS_PAYLOAD'
}

// Security configuration
const SECURITY_CONFIG = {
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  allowedContentTypes: [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain'
  ],
  allowedFileExtensions: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.mp4', '.webm', '.mov', '.pdf', '.txt'
  ],
  blockedFileExtensions: [
    '.exe', '.bat', '.cmd', '.scr', '.pif',
    '.js', '.vbs', '.jar', '.php', '.asp'
  ]
}

// XSS detection patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<meta\b[^>]*>/gi,
  /data:text\/html/gi,
  /vbscript:/gi
]

// SQL injection detection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
  /(--|#|\/\*|\*\/)/gi,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
  /(\b(OR|AND)\b\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?)/gi,
  /(UNION\s+SELECT)/gi,
  /(\bINTO\s+OUTFILE\b)/gi,
  /(\bLOAD_FILE\b)/gi,
  /(\bCHAR\s*\(\s*\d+)/gi
]

// Path traversal detection patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\./gi,
  /%2e%2e/gi,
  /%252e%252e/gi,
  /\.%2f/gi,
  /%2f\./gi,
  /~\//gi,
  /%7e/gi
]

// Check string for XSS patterns
const containsXSS = (value: string): boolean => {
  return XSS_PATTERNS.some(pattern => pattern.test(value))
}

// Check string for SQL injection patterns
const containsSQLInjection = (value: string): boolean => {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value))
}

// Check string for path traversal patterns
const containsPathTraversal = (value: string): boolean => {
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(value))
}

// Recursively validate object for security threats
const validateObjectSecurity = (obj: unknown, path = ''): { isValid: boolean, error?: string, errorType?: SecurityValidationError } => {
  if (typeof obj === 'string') {
    if (containsXSS(obj)) {
      return { isValid: false, error: `XSS detected in ${path}`, errorType: SecurityValidationError.XSS_DETECTED }
    }
    if (containsSQLInjection(obj)) {
      return { isValid: false, error: `SQL injection detected in ${path}`, errorType: SecurityValidationError.SQL_INJECTION_DETECTED }
    }
    if (containsPathTraversal(obj)) {
      return { isValid: false, error: `Path traversal detected in ${path}`, errorType: SecurityValidationError.PATH_TRAVERSAL_DETECTED }
    }
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = validateObjectSecurity(obj[i], `${path}[${i}]`)
      if (!result.isValid) {
        return result
      }
    }
  }

  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key
      const result = validateObjectSecurity(value, currentPath)
      if (!result.isValid) {
        return result
      }
    }
  }

  return { isValid: true }
}

// Validate request content type
export const validateContentType = (
  req: SecurityRequest, 
  res: Response, 
  next: NextFunction
): void => {
  if (req.method === 'GET' || req.method === 'DELETE') {
    next()
    return
  }

  const contentType = req.get('Content-Type')
  if (!contentType) {
    res.status(400).json({
      success: false,
      error: {
        code: SecurityValidationError.INVALID_CONTENT_TYPE,
        message: 'Content-Type header is required'
      }
    })
    return
  }

  // Use non-null assertion since we've already checked above
  const baseContentType = contentType!.split(';')[0].trim()
  if (!SECURITY_CONFIG.allowedContentTypes.includes(baseContentType)) {
    res.status(400).json({
      success: false,
      error: {
        code: SecurityValidationError.INVALID_CONTENT_TYPE,
        message: 'Invalid content type'
      }
    })
    return
  }

  next()
}

// Validate request size
export const validateRequestSize = (
  req: SecurityRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const contentLength = req.get('Content-Length')
  if (contentLength && parseInt(contentLength) > SECURITY_CONFIG.maxRequestSize) {
    res.status(413).json({
      success: false,
      error: {
        code: SecurityValidationError.REQUEST_TOO_LARGE,
        message: 'Request entity too large'
      }
    })
    return
  }

  next()
}

// Validate user agent
export const validateUserAgent = (
  req: SecurityRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const userAgent = req.get('User-Agent')
  
  // Block completely missing user agent or suspicious patterns
  if (!userAgent || userAgent.length < 10 || userAgent.length > 512) {
    res.status(400).json({
      success: false,
      error: {
        code: SecurityValidationError.INVALID_USER_AGENT,
        message: 'Invalid or missing User-Agent header'
      }
    })
    return
  }

  // Block known malicious user agents
  const suspiciousPatterns = [
    /sqlmap/gi,
    /nikto/gi,
    /nmap/gi,
    /burpsuite/gi,
    /curl.*bot/gi
  ]

  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    res.status(403).json({
      success: false,
      error: {
        code: SecurityValidationError.INVALID_USER_AGENT,
        message: 'Blocked user agent'
      }
    })
    return
  }

  next()
}

// Validate headers for security threats
export const validateHeaders = (
  req: SecurityRequest, 
  res: Response, 
  next: NextFunction
): void => {
  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-host', 'x-real-ip']
  
  for (const header of suspiciousHeaders) {
    const value = req.get(header)
    if (value && typeof value === 'string' && containsXSS(value)) {
      res.status(400).json({
        success: false,
        error: {
          code: SecurityValidationError.SUSPICIOUS_HEADER,
          message: `Malicious content detected in ${header} header`
        }
      })
      return
    }
  }

  next()
}

// Validate request body for security threats
export const validateRequestBody = (
  req: SecurityRequest, 
  res: Response, 
  next: NextFunction
): void => {
  if (!req.body || Object.keys(req.body).length === 0) {
    next()
    return
  }

  const validation = validateObjectSecurity(req.body, 'body')
  if (!validation.isValid) {
    res.status(400).json({
      success: false,
      error: {
        code: validation.errorType || SecurityValidationError.MALICIOUS_PAYLOAD,
        message: validation.error || 'Malicious content detected in request body'
      }
    })
    return
  }

  next()
}

// Validate query parameters for security threats
export const validateQueryParams = (
  req: SecurityRequest, 
  res: Response, 
  next: NextFunction
): void => {
  if (!req.query || Object.keys(req.query).length === 0) {
    next()
    return
  }

  const validation = validateObjectSecurity(req.query, 'query')
  if (!validation.isValid) {
    res.status(400).json({
      success: false,
      error: {
        code: validation.errorType || SecurityValidationError.MALICIOUS_PAYLOAD,
        message: validation.error || 'Malicious content detected in query parameters'
      }
    })
    return
  }

  next()
}

// Validate URL parameters for security threats
export const validateUrlParams = (
  req: SecurityRequest, 
  res: Response, 
  next: NextFunction
): void => {
  if (!req.params || Object.keys(req.params).length === 0) {
    next()
    return
  }

  const validation = validateObjectSecurity(req.params, 'params')
  if (!validation.isValid) {
    res.status(400).json({
      success: false,
      error: {
        code: validation.errorType || SecurityValidationError.MALICIOUS_PAYLOAD,
        message: validation.error || 'Malicious content detected in URL parameters'
      }
    })
    return
  }

  next()
}

// Validate file uploads
export const validateFileUpload = (
  req: SecurityRequest, 
  res: Response, 
  next: NextFunction
): void => {
  if (!req.file && (!req.files || (Array.isArray(req.files) && req.files.length === 0))) {
    next()
    return
  }

  const files = req.file ? [req.file] : (Array.isArray(req.files) ? req.files : Object.values(req.files as Record<string, Express.Multer.File[]>).flat())

  for (const file of files) {
    if (file && typeof file === 'object' && 'originalname' in file) {
      const multerFile = file as Express.Multer.File
      const filename = multerFile.originalname
      const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))

      // Check for blocked file extensions
      if (SECURITY_CONFIG.blockedFileExtensions.includes(extension)) {
        res.status(400).json({
          success: false,
          error: {
            code: SecurityValidationError.UNSAFE_FILE_TYPE,
            message: `File type ${extension} is not allowed`
          }
        })
        return
      }

      // Check filename for path traversal
      if (containsPathTraversal(filename)) {
        res.status(400).json({
          success: false,
          error: {
            code: SecurityValidationError.PATH_TRAVERSAL_DETECTED,
            message: 'Path traversal detected in filename'
          }
        })
        return
      }
    }
  }

  next()
}

// Combined basic security validation middleware
export const basicSecurityValidation = [
  validateContentType,
  validateRequestSize,
  validateUserAgent,
  validateHeaders
]

// Combined comprehensive security validation middleware
export const comprehensiveSecurityValidation = [
  validateContentType,
  validateRequestSize,
  validateUserAgent,
  validateHeaders,
  validateRequestBody,
  validateQueryParams,
  validateUrlParams
]

// Security validation for file uploads
export const fileUploadSecurityValidation = [
  validateContentType,
  validateRequestSize,
  validateFileUpload
]

// Export default security validation middleware
export default {
  validateContentType,
  validateRequestSize,
  validateUserAgent,
  validateHeaders,
  validateRequestBody,
  validateQueryParams,
  validateUrlParams,
  validateFileUpload,
  basicSecurityValidation,
  comprehensiveSecurityValidation,
  fileUploadSecurityValidation,
  SecurityValidationError
}