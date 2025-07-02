// backend/src/routes/media.ts
// Version: 1.0
// Media upload route with multer configuration and file storage handling

import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { validateMediaUpload } from '../middleware/mediaModerationValidationMiddleware'
import { mediaUploadRateLimit } from '../middleware/rateLimitMiddleware'

const router = Router()

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads')

/**
 * Initialize uploads directory on startup
 * Creates directory structure if it doesn't exist
 */
async function initializeUploadsDirectory(): Promise<void> {
  try {
    await fs.access(uploadsDir)
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true })
    console.log('Created uploads directory:', uploadsDir)
  }
}

// Initialize directory when module loads
initializeUploadsDirectory().catch(console.error)

/**
 * Multer storage configuration
 * Handles file naming and storage location
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Ensure directory exists for each request
      await fs.access(uploadsDir)
      cb(null, uploadsDir)
    } catch {
      try {
        await fs.mkdir(uploadsDir, { recursive: true })
        cb(null, uploadsDir)
      } catch (error) {
        cb(error as Error, '')
      }
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: uuid + timestamp + original extension
    const uniqueId = uuidv4()
    const timestamp = Date.now()
    const extension = path.extname(file.originalname).toLowerCase()
    const filename = `${uniqueId}-${timestamp}${extension}`
    cb(null, filename)
  }
})

/**
 * Multer file filter for allowed file types
 * Validates file types at upload time (additional to validation middleware)
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    // Reject file with error
    const error = new Error('File type not supported. Use JPEG, PNG, GIF, WEBP, MP4, or WEBM') as any
    error.code = 'INVALID_FILE_TYPE'
    cb(error, false)
  }
}

/**
 * Multer configuration with file size limits and validation
 */
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only allow single file upload
  }
})

/**
 * Media upload endpoint
 * POST /media/upload
 * Handles file upload with validation and returns file metadata
 */
router.post('/upload', 
  mediaUploadRateLimit, // Apply rate limiting first
  upload.single('file'), // Handle file upload
  validateMediaUpload, // Validate request data
  async (req: Request, res: Response) => {
    try {
      // File should exist after multer and validation middleware
      const uploadedFile = req.file as Express.Multer.File
      
      if (!uploadedFile) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_UPLOAD_ERROR',
            message: 'File upload failed - no file received'
          }
        })
      }

      // Get optional alt text from validated request body
      const { altText } = req.body as { altText?: string }

      // Generate public URL for the uploaded file
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`
      const publicUrl = `${baseUrl}/uploads/${uploadedFile.filename}`

      // Prepare response data matching API documentation
      const mediaData = {
        id: path.parse(uploadedFile.filename).name, // Use filename without extension as ID
        url: publicUrl,
        filename: uploadedFile.filename,
        originalName: uploadedFile.originalname,
        mimeType: uploadedFile.mimetype,
        size: uploadedFile.size,
        altText: altText || null,
        uploadedAt: new Date().toISOString()
      }

      // Log successful upload for monitoring
      console.log(`Media uploaded successfully: ${uploadedFile.filename} (${uploadedFile.size} bytes)`)

      return res.status(201).json({
        success: true,
        data: mediaData
      })

    } catch (error) {
      console.error('Media upload error:', error)
      
      // Clean up uploaded file if it exists but processing failed
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path)
        } catch (cleanupError) {
          console.error('Failed to clean up uploaded file:', cleanupError)
        }
      }

      return res.status(500).json({
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
 * Error handler for multer-specific errors
 * Handles file size limits, file type errors, etc.
 */
router.use((error: any, req: Request, res: Response, next: any) => {
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

  // Handle custom file filter errors
  if (error.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_FILE_TYPE',
        message: error.message
      }
    })
  }

  // Pass other errors to global error handler
  next(error)
})

export default router