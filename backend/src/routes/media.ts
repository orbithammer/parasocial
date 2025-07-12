// backend\src\routes\media.ts
// Version: 1.4
// Changed: Removed unused ParamsDictionary import to fix TypeScript error

import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import rateLimit from 'express-rate-limit'

// Types for dependency injection
interface MediaRouterConfig {
  authMiddleware: (req: Request, res: Response, next: NextFunction) => void
}

// Rate limiting for media uploads
const mediaUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 uploads per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many upload attempts. Please try again later.',
      details: []
    }
  },
  standardHeaders: true,
  legacyHeaders: false
})

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (_req, file, cb) {
    // Generate unique filename with timestamp and original name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

// File filter for allowed file types
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow images and videos
  const allowedMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('INVALID_FILE_TYPE'))
  }
}

// Configure multer upload
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1 // Only allow single file uploads
  },
  fileFilter: fileFilter
})

// Validation middleware for media uploads
const validateMediaUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'No file provided',
        details: [{ field: 'file', message: 'File is required' }]
      }
    })
  }
  return next()
}

// Route handlers
const uploadSingleHandler = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: 'No file uploaded',
        details: []
      }
    })
  }

  // Generate file URL
  const baseUrl = process.env['BASE_URL'] || `http://localhost:${process.env['PORT'] || 5000}`
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`

  return res.status(201).json({
    success: true,
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: fileUrl
    }
  })
}

const getMediaHandler = (_req: Request<{ filename: string }>, res: Response) => {
  // This handler is currently disabled as per the comment in the original
  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Media metadata endpoint is disabled',
      details: []
    }
  })
}

const deleteFileHandler = async (req: Request<{ filename: string }>, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params
    
    // Security check for path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid filename',
          details: [{ field: 'filename', message: 'Filename contains invalid characters' }]
        }
      })
    }

    const filePath = path.join(process.cwd(), 'uploads', filename)
    
    try {
      await fs.unlink(filePath)
      return res.status(200).json({
        success: true,
        message: 'File deleted successfully'
      })
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'File not found',
            details: []
          }
        })
      }
      throw error
    }
  } catch (error) {
    return next(error)
  }
}

// Error handling middleware for multer errors
const handleMulterError = (error: any, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File too large',
          details: [{ field: 'file', message: 'File size exceeds 50MB limit' }]
        }
      })
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Too many files',
          details: [{ field: 'file', message: 'Only one file allowed per upload' }]
        }
      })
    }
  }
  
  if (error.message === 'INVALID_FILE_TYPE') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid file type',
        details: [{ field: 'file', message: 'Only images and videos are allowed' }]
      }
    })
  }

  return next(error)
}

/**
 * Create media router with dependency injection
 */
export function createMediaRouter(config: MediaRouterConfig): Router {
  const router = Router()
  
  // Apply rate limiting to all media routes
  router.use(mediaUploadRateLimit)
  
  // Apply authentication to all routes
  router.use(config.authMiddleware)

  // Single file upload endpoint with validation
  router.post('/upload', 
    upload.single('file'), 
    handleMulterError,
    validateMediaUpload,
    uploadSingleHandler
  )

  // Get media metadata endpoint (disabled)
  router.get('/:filename', getMediaHandler)

  // Delete media endpoint (by filename until schema is updated)
  router.delete('/:filename', deleteFileHandler)

  return router
}

// Default export for backward compatibility
const router = Router()

// Apply rate limiting to all media routes
router.use(mediaUploadRateLimit)

// Route definitions with properly typed handlers
router.post('/upload', 
  upload.single('file'), 
  handleMulterError,
  validateMediaUpload,
  uploadSingleHandler
)

router.get('/:filename', getMediaHandler)
router.delete('/:filename', deleteFileHandler)

export default router