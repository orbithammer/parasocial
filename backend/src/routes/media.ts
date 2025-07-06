// backend/src/routes/media.ts
// Version: 1.2.0 - Updated to use dependency injection pattern like other routes
// Changed: Now uses dependency injection for authMiddleware instead of direct import

import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { mediaUploadRateLimit } from '../middleware/rateLimitMiddleware'
import { z } from 'zod'

// Middleware function type
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>

// Dependencies interface for dependency injection
interface MediaRouterDependencies {
  authMiddleware: MiddlewareFunction
}

/**
 * Create media router with dependency injection
 * @param dependencies - Injected dependencies
 * @returns Configured Express router
 */
export function createMediaRouter(dependencies: MediaRouterDependencies): Router {
  const { authMiddleware } = dependencies
  const router = Router()

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Allowed file types for media uploads
 * Supports common image and video formats
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime'
] as const

/**
 * File size limits in bytes
 * Images: 5MB max, Videos: 50MB max
 */
const MAX_FILE_SIZE = {
  image: 5 * 1024 * 1024, // 5MB
  video: 50 * 1024 * 1024 // 50MB
}

/**
 * Upload directory configuration
 * Creates organized folder structure by date and user
 */
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

// ============================================================================
// MULTER STORAGE CONFIGURATION
// ============================================================================

/**
 * Configure multer disk storage with organized file naming
 * Files are stored in /uploads/YYYY/MM/DD/userId/ structure
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Get authenticated user from middleware
      const userId = (req as any).user?.id
      if (!userId) {
        return cb(new Error('User not authenticated'), '')
      }

      // Create date-based directory structure
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      
      const uploadPath = path.join(UPLOAD_DIR, String(year), month, day, String(userId))
      
      // Ensure directory exists
      await fs.mkdir(uploadPath, { recursive: true })
      
      cb(null, uploadPath)
    } catch (error) {
      cb(error as Error, '')
    }
  },
  
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const extension = path.extname(file.originalname)
    const baseName = path.basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9]/g, '_') // Sanitize filename
      .substring(0, 20) // Limit length
    
    const filename = `${baseName}_${timestamp}_${randomString}${extension}`
    cb(null, filename)
  }
})

/**
 * File filter function to validate file types and sizes
 * Rejects files that don't meet criteria
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if file type is allowed
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
    return cb(new Error(`File type ${file.mimetype} not allowed`))
  }
  
  // Note: Size checking happens in multer limits, not here
  // This is just for MIME type validation
  cb(null, true)
}

/**
 * Configure multer with storage, file filter, and size limits
 * Different limits for images vs videos
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE.video, // Use max size, we'll validate specifically in route
    files: 4 // Maximum 4 files per request
  }
})

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Validation schema for upload metadata
 * Optional fields that can be sent with the upload
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
 * Images and videos have different size limits
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
 * Generate file metadata for database storage
 * Extracts useful information about uploaded files
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

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /media/upload
 * Upload media files with metadata
 * Supports multiple files, validation, and organized storage
 * UPDATED: Now uses centralized rate limiting (20 uploads per hour)
 */
router.post('/upload', 
  mediaUploadRateLimit, // UPDATED: Use centralized rate limiting
  authMiddleware,
  upload.array('files', 4), // Accept up to 4 files with field name 'files'
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[]
      
      // Validate that files were uploaded
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded',
          code: 'NO_FILES'
        })
      }

      // Validate metadata if provided
      let metadata = {}
      if (req.body.metadata) {
        try {
          const parsed = JSON.parse(req.body.metadata)
          metadata = uploadMetadataSchema.parse(parsed)
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid metadata format',
            code: 'INVALID_METADATA'
          })
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
        for (const file of files) {
          try {
            await fs.unlink(file.path)
          } catch (cleanupError) {
            console.error(`Failed to clean up file: ${file.path}`, cleanupError)
          }
        }

        return res.status(400).json({
          success: false,
          error: 'File validation failed',
          code: 'VALIDATION_ERROR',
          details: fileValidationErrors
        })
      }

      // Process successful uploads
      const uploadedFiles = files.map(file => {
        const fileMetadata = generateFileMetadata(file, metadata)
        
        return {
          id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          altText: fileMetadata.alt_text,
          description: fileMetadata.description,
          contentWarning: fileMetadata.content_warning,
          isSensitive: fileMetadata.is_sensitive,
          uploadedAt: fileMetadata.uploaded_at,
          // In production, this would be a proper URL
          publicUrl: `/uploads/${path.relative(UPLOAD_DIR, file.path)}`.replace(/\\/g, '/') || null
        }
      })

      // Success response with file information
      res.status(201).json({
        success: true,
        message: `Successfully uploaded ${files.length} file(s)`,
        data: {
          files: uploadedFiles,
          upload_count: files.length
        }
      })

    } catch (error) {
      console.error('Media upload error:', error)
      
      // Clean up any uploaded files on error
      if (req.files) {
        const files = req.files as Express.Multer.File[]
        for (const file of files) {
          try {
            await fs.unlink(file.path)
          } catch (cleanupError) {
            console.error(`Failed to clean up file: ${file.path}`, cleanupError)
          }
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during upload',
        code: 'UPLOAD_ERROR'
      })
    }
  }
)

/**
 * GET /media/info/:fileId
 * Get information about an uploaded file
 * Public endpoint for basic file metadata
 */
router.get('/info/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params
    
    // In a real implementation, you would query the database
    // For now, return a placeholder response
    res.status(501).json({
      success: false,
      error: 'File info endpoint not yet implemented',
      code: 'NOT_IMPLEMENTED'
    })
    
  } catch (error) {
    console.error('Media info error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

/**
 * DELETE /media/:fileId
 * Delete an uploaded file
 * Requires authentication and ownership validation
 */
router.delete('/:fileId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params
    
    // In a real implementation, you would:
    // 1. Verify file ownership
    // 2. Delete from filesystem
    // 3. Remove from database
    res.status(501).json({
      success: false,
      error: 'File deletion endpoint not yet implemented', 
      code: 'NOT_IMPLEMENTED'
    })
    
  } catch (error) {
    console.error('Media deletion error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    })
  }
})

  return router
}

/**
 * Export default router for backward compatibility
 * This allows importing as either named export or default
 * For new implementations, use createMediaRouter with dependency injection
 */
export default createMediaRouter