// backend/src/routes/media.ts
// Media upload route with multer configuration and file handling
// Version: 1.0.0 - Initial implementation of media upload endpoint

import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { authMiddleware } from '../middleware/auth'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'

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
  
  // Determine if file is image or video for size checking
  const isImage = file.mimetype.startsWith('image/')
  const isVideo = file.mimetype.startsWith('video/')
  
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
// RATE LIMITING
// ============================================================================

/**
 * Rate limiting for media uploads
 * More restrictive than regular API endpoints due to resource intensity
 */
const mediaUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: {
    success: false,
    error: 'Too many uploads. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
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
 */
router.post('/upload', 
  mediaUploadRateLimit,
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
        // Clean up uploaded files if validation fails
        for (const file of files) {
          try {
            await fs.unlink(file.path)
          } catch (error) {
            console.error(`Failed to clean up file: ${file.path}`, error)
          }
        }
        
        return res.status(400).json({
          success: false,
          error: 'File validation failed',
          details: fileValidationErrors,
          code: 'FILE_VALIDATION_FAILED'
        })
      }

      // Generate metadata for each uploaded file
      const uploadedFiles = files.map(file => {
        const fileMetadata = generateFileMetadata(file, metadata)
        
        // Generate public URL for the file
        // In production, this would be your CDN or file server URL
        const publicUrl = `/uploads/${path.relative(UPLOAD_DIR, file.path)}`
        
        return {
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          ...fileMetadata,
          url: publicUrl,
          thumbnail_url: fileMetadata.mimetype.startsWith('image/') ? publicUrl : null
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

export default router