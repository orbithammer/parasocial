// backend/src/routes/media.ts - Version 2.9
// Fixed AuthService import, TypeScript undefined types, error type casting, params access, unused parameter warnings, function return types, and all async route handler code paths

import express, { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { z } from 'zod'
import { createAuthMiddleware } from '../middleware/authMiddleware'
import { AuthService } from '../services/AuthService'
import { mediaUploadRateLimit } from '../middleware/rateLimitMiddleware'

const router = express.Router()

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Create AuthService instance for middleware
 */
const authService = new AuthService()

/**
 * File size limits for different media types
 * Images: 10MB, Videos: 50MB
 */
const MAX_FILE_SIZE = {
  image: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024  // 50MB
} as const

/**
 * Allowed MIME types for uploads
 * Supports common image and video formats
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/mov'
] as const

/**
 * Upload directory configuration
 * Files are organized by date for better management
 */
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// Create upload directory if it doesn't exist
fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(console.error)

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

/**
 * Authentication middleware - required for uploads
 */
const authMiddleware = createAuthMiddleware(authService)

/**
 * Multer storage configuration
 * Generates unique filenames with timestamp and random string
 */
const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    try {
      const today = new Date().toISOString().split('T')[0]!
      const dateDir = path.join(UPLOAD_DIR, today)
      await fs.mkdir(dateDir, { recursive: true })
      cb(null, dateDir)
    } catch (error) {
      cb(error instanceof Error ? error : new Error('Storage error'), UPLOAD_DIR)
    }
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = path.extname(file.originalname)
    const filename = `${timestamp}_${randomString}${extension}`
    cb(null, filename)
  }
})

/**
 * File filter for MIME type validation
 * Only allows specified image and video types
 */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
    const error = new Error(`File type ${file.mimetype} not allowed`) as any
    error.code = 'INVALID_FILE_TYPE'
    return cb(error)
  }
  cb(null, true)
}

/**
 * Multer configuration with proper error handling
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE.video, // Use max size, validate specifically per type
    files: 4 // Maximum 4 files per request
  }
})

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for upload metadata validation
 */
const uploadMetadataSchema = z.object({
  alt_text: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
  content_warning: z.boolean().default(false),
  is_sensitive: z.boolean().default(false)
})

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate individual file size based on type
 * Different limits for images vs videos
 */
function validateFileSize(file: Express.Multer.File): { valid: boolean, error?: string } {
  const isImage = file.mimetype.startsWith('image/')
  const maxSize = isImage ? MAX_FILE_SIZE.image : MAX_FILE_SIZE.video
  
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024))
    const fileType = isImage ? 'Image' : 'Video'
    return {
      valid: false,
      error: `${fileType} files must be under ${maxSizeMB}MB`
    }
  }
  
  return { valid: true }
}

/**
 * Generate file metadata for response
 */
function generateFileMetadata(file: Express.Multer.File, metadata: any) {
  return {
    original_name: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    alt_text: metadata.alt_text || null,
    description: metadata.description || null,
    content_warning: metadata.content_warning || false,
    is_sensitive: metadata.is_sensitive || false,
    uploaded_at: new Date()
  }
}

/**
 * Generate standardized error response
 */
function createErrorResponse(code: string, message: string, details?: any) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    }
  }
}

// ============================================================================
// MULTER ERROR HANDLER
// ============================================================================

/**
 * Custom multer error handler
 * Converts multer errors to consistent format
 */
function handleMulterError(error: any, _req: Request, res: Response, next: NextFunction): void {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        res.status(400).json(createErrorResponse(
          'FILE_TOO_LARGE',
          'File size exceeds the limit'
        ))
        return
      case 'LIMIT_FILE_COUNT':
        res.status(400).json(createErrorResponse(
          'TOO_MANY_FILES',
          'Too many files uploaded'
        ))
        return
      case 'LIMIT_UNEXPECTED_FILE':
        res.status(400).json(createErrorResponse(
          'UNEXPECTED_FILE',
          'Unexpected file field'
        ))
        return
      default:
        res.status(400).json(createErrorResponse(
          'UPLOAD_ERROR',
          error.message || 'File upload error'
        ))
        return
    }
  }
  
  // Handle custom file filter errors
  if (error.code === 'INVALID_FILE_TYPE') {
    res.status(400).json(createErrorResponse(
      'INVALID_FILE_TYPE',
      error.message
    ))
    return
  }
  
  // Pass other errors to global handler
  next(error)
  return
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /media/upload
 * Upload media files with metadata and validation
 */
router.post('/upload', 
  mediaUploadRateLimit,
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) => {
    upload.array('files', 4)(req, res, (error) => {
      if (error) {
        return handleMulterError(error, req, res, next)
      }
      next()
    })
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[]
      
      // Validate that files were uploaded
      if (!files || files.length === 0) {
        res.status(400).json(createErrorResponse(
          'NO_FILES',
          'No files uploaded'
        ))
        return
      }

      // Parse and validate metadata if provided
      let metadata = {}
      if (req.body.metadata) {
        try {
          const parsed = JSON.parse(req.body.metadata)
          metadata = uploadMetadataSchema.parse(parsed)
        } catch (error) {
          // Cleanup uploaded files on metadata validation error
          await Promise.all(files.map(async (file) => {
            try {
              await fs.unlink(file.path)
            } catch (cleanupError) {
              console.error(`Failed to clean up file: ${file.path}`, 
                cleanupError instanceof Error ? cleanupError.message : 'Unknown error')
            }
          }))
          
          res.status(400).json(createErrorResponse(
            'INVALID_METADATA',
            'Invalid metadata format'
          ))
          return
        }
      }

      // Validate each file size individually
      const fileValidationErrors: string[] = []
      for (const file of files) {
        const validation = validateFileSize(file)
        if (!validation.valid) {
          fileValidationErrors.push(`${file.originalname}: ${validation.error}`)
        }
      }

      if (fileValidationErrors.length > 0) {
        // Clean up uploaded files on validation error
        await Promise.all(files.map(async (file) => {
          try {
            await fs.unlink(file.path)
          } catch (cleanupError) {
            console.error(`Failed to clean up file: ${file.path}`, 
              cleanupError instanceof Error ? cleanupError.message : 'Unknown error')
          }
        }))

        res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          'File validation failed',
          fileValidationErrors
        ))
        return
      }

      // Generate response data for successful uploads
      const uploadedFiles = files.map(file => {
        const fileMetadata = generateFileMetadata(file, metadata)
        const publicUrl = `/uploads/${path.relative(UPLOAD_DIR, file.path)}`.replace(/\\/g, '/')
        
        return {
          id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          publicUrl,
          altText: fileMetadata.alt_text,
          description: fileMetadata.description,
          contentWarning: fileMetadata.content_warning,
          isSensitive: fileMetadata.is_sensitive,
          uploadedAt: fileMetadata.uploaded_at
        }
      })

      // Return success response
      res.status(200).json({
        success: true,
        data: {
          files: uploadedFiles,
          count: uploadedFiles.length
        }
      })

    } catch (error) {
      next(error)
    }
  }
)

/**
 * GET /media/:filename
 * Serve uploaded media files with security headers
 */
router.get('/:filename', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filename = req.params['filename']
    
    // Validate that filename exists and is a string
    if (!filename || typeof filename !== 'string') {
      res.status(400).json(createErrorResponse(
        'INVALID_FILENAME',
        'Filename is required'
      ))
      return
    }
    
    // Basic security: prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json(createErrorResponse(
        'INVALID_FILENAME',
        'Invalid filename'
      ))
      return
    }

    // Try to find file in date directories
    const today = new Date().toISOString().split('T')[0]!
    const possiblePaths = [
      path.join(UPLOAD_DIR, today, filename),
      path.join(UPLOAD_DIR, filename) // Legacy support
    ]

    let filePath: string | null = null
    for (const possiblePath of possiblePaths) {
      try {
        await fs.access(possiblePath)
        filePath = possiblePath
        break
      } catch {
        // File not found in this location, try next
      }
    }

    if (!filePath) {
      res.status(404).json(createErrorResponse(
        'FILE_NOT_FOUND',
        'File not found'
      ))
      return
    }

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    
    // Serve the file
    res.sendFile(filePath)

  } catch (error) {
    next(error)
  }
})

/**
 * DELETE /media/:fileId
 * Delete uploaded media file (authenticated users only)
 */
router.delete('/:fileId', 
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const fileId = req.params['fileId']
      
      // Validate that fileId exists and is a string
      if (!fileId || typeof fileId !== 'string') {
        res.status(400).json(createErrorResponse(
          'INVALID_FILE_ID',
          'File ID is required'
        ))
        return
      }
      
      // In a real app, you would:
      // 1. Look up file in database by fileId
      // 2. Verify user owns the file or has permission
      // 3. Delete from database and filesystem
      
      // For now, return a placeholder response
      res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      })
      
    } catch (error) {
      next(error)
    }
  }
)

export default router