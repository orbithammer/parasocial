// backend/src/routes/media.ts
// Version: 1.5
// Fixed no file error response to match test expectations

import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { validateMediaUpload } from '../middleware/mediaModerationValidationMiddleware'
import { mediaUploadRateLimit } from '../middleware/rateLimitMiddleware'

const router = Router()

// Define uploads directory path
const uploadsDir = path.join(process.cwd(), 'uploads')

/**
 * Supported file types for media uploads
 */
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const SUPPORTED_FILE_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES]

/**
 * Initialize uploads directory on startup using callback-style fs
 * This ensures directory exists before any upload attempts
 */
function initializeUploadsDirectory(): void {
  fs.access(uploadsDir, (err) => {
    if (err) {
      // Directory doesn't exist, create it
      fs.mkdir(uploadsDir, { recursive: true }, (mkdirErr) => {
        if (mkdirErr) {
          console.error('Failed to create uploads directory:', mkdirErr)
        } else {
          console.log('Created uploads directory:', uploadsDir)
        }
      })
    } else {
      console.log('Uploads directory already exists:', uploadsDir)
    }
  })
}

// Initialize directory when module loads
initializeUploadsDirectory()

/**
 * Multer storage configuration using callback-style fs operations
 * This fixes the 500 error caused by async/await in multer callbacks
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use callback-style fs.access instead of async/await
    fs.access(uploadsDir, (err) => {
      if (err) {
        // Directory doesn't exist, create it
        fs.mkdir(uploadsDir, { recursive: true }, (mkdirErr) => {
          if (mkdirErr) {
            cb(mkdirErr, '')
          } else {
            cb(null, uploadsDir)
          }
        })
      } else {
        // Directory exists
        cb(null, uploadsDir)
      }
    })
  },
  filename: (req, file, cb) => {
    try {
      // Generate unique filename: uuid + timestamp + original extension
      const uniqueId = uuidv4()
      const timestamp = Date.now()
      const extension = path.extname(file.originalname).toLowerCase()
      const filename = `${uniqueId}-${timestamp}${extension}`
      cb(null, filename)
    } catch (error) {
      cb(error as Error, '')
    }
  }
})

/**
 * Custom multer error class for file type validation
 */
class FileTypeError extends Error {
  code: string
  
  constructor(message: string) {
    super(message)
    this.code = 'INVALID_FILE_TYPE'
    this.name = 'FileTypeError'
  }
}

/**
 * Multer file filter - validates file types and returns simple error codes
 * This handles file type validation at the multer level as expected by route tests
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check if file type is supported
  if (!SUPPORTED_FILE_TYPES.includes(file.mimetype)) {
    const error = new FileTypeError('File type not supported. Use JPEG, PNG, GIF, WEBP, MP4, or WEBM')
    cb(error)
    return
  }
  
  // File type is supported
  cb(null, true)
}

/**
 * Configure multer with storage, file filter, and limits
 * 10MB limit for file uploads with single file restriction
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only one file per upload
  }
})

/**
 * Generate the public URL for uploaded file
 * Uses BASE_URL environment variable or defaults to localhost
 */
function generateFileUrl(filename: string): string {
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`
  return `${baseUrl}/uploads/${filename}`
}

/**
 * POST /upload
 * Upload a single media file with optional metadata
 * Applies rate limiting and validation middleware
 */
router.post('/upload', 
  mediaUploadRateLimit,
  upload.single('file'),
  validateMediaUpload,
  async (req: Request, res: Response) => {
    try {
      // File should exist due to multer processing
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'File is required for upload'
          }
        })
      }

      // Extract alt text from request body (validated by middleware)
      const { altText } = req.body
      
      // Generate public URL for the uploaded file
      const fileUrl = generateFileUrl(req.file.filename!)

      // Return successful upload response with proper API format
      res.status(201).json({
        success: true,
        data: {
          id: uuidv4(), // Generate unique ID for database storage
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype, // Use camelCase to match API spec
          size: req.file.size,
          url: fileUrl,
          altText: altText || null,
          uploadedAt: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Upload processing error:', error)
      
      // Clean up uploaded file if processing fails (using callback-style)
      if (req.file?.path) {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Failed to clean up file:', unlinkErr)
          }
        })
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_PROCESSING_ERROR',
          message: 'Failed to process uploaded file'
        }
      })
    }
  }
)

/**
 * Error handling middleware specifically for multer errors
 * Must be defined after the upload route
 */
router.use((error: any, req: Request, res: Response, next: any) => {
  // Handle custom file type errors
  if (error instanceof FileTypeError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: error.message
      }
    })
  }
  
  // Handle standard multer errors
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 10MB limit'
          }
        })
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_FILES',
            message: 'Only one file allowed per upload'
          }
        })
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNEXPECTED_FILE',
            message: 'Unexpected file field. Use "file" field name'
          }
        })
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: 'File upload failed'
          }
        })
    }
  }

  // Pass other errors to global error handler
  next(error)
})

export default router