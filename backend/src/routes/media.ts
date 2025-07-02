// backend/src/routes/media.ts
// Version: 1.1
// Added complete upload route handler and multer configuration to fix 500 errors

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
 * Multer file filter - accept all files and let validation middleware handle type checking
 * This avoids TypeScript callback issues and provides better error messages
 */
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept all files - validation middleware will handle file type checking
  cb(null, true)
}

/**
 * Configure multer with storage, file filter, and limits
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
      // File should exist due to validation middleware
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file uploaded'
          }
        })
      }

      // Extract alt text from request body (validated by middleware)
      const { altText } = req.body
      
      // Generate public URL for the uploaded file
      const fileUrl = generateFileUrl(req.file.filename!)

      // Return successful upload response
      res.status(201).json({
        success: true,
        data: {
          id: uuidv4(), // Generate unique ID for database storage
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          url: fileUrl,
          altText: altText || null,
          uploadedAt: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Upload processing error:', error)
      
      // Clean up uploaded file if processing fails
      if (req.file?.path) {
        try {
          await fs.unlink(req.file.path)
        } catch (cleanupError) {
          console.error('Failed to clean up file:', cleanupError)
        }
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