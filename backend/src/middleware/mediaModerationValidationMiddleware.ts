// backend/src/middleware/mediaModerationValidationMiddleware.ts
// Version: 1.2
// Fixed file size validation message, error response format, and TypeScript interface compatibility

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

/**
 * Extended Request interface to include multer file upload
 * Uses Express.Multer.File type to avoid conflicts
 */
interface FileUploadRequest extends Request {
  file?: Express.Multer.File
}

/**
 * Validation schema for media upload
 */
const mediaUploadSchema = z.object({
  altText: z.string()
    .trim()
    .max(1000, 'Alt text must be less than 1000 characters')
    .optional()
    .or(z.literal(''))
})

/**
 * Validation schema for file upload requirements
 * Fixed size validation message to be accurate
 */
const fileValidationSchema = z.object({
  mimetype: z.string()
    .refine(type => {
      const allowedTypes = [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm'
      ]
      return allowedTypes.includes(type)
    }, {
      message: 'File type not supported. Use JPEG, PNG, GIF, WEBP, MP4, or WEBM'
    }),
  size: z.number()
    .max(10 * 1024 * 1024, 'File size must be 10MB or less') // Fixed: accurate message
    .min(1, 'File cannot be empty')
})

/**
 * Validation schema for report creation
 */
const createReportSchema = z.object({
  type: z.enum([
    'HARASSMENT',
    'SPAM', 
    'MISINFORMATION',
    'INAPPROPRIATE_CONTENT',
    'COPYRIGHT',
    'OTHER'
  ], {
    errorMap: () => ({ message: 'Report type must be one of: HARASSMENT, SPAM, MISINFORMATION, INAPPROPRIATE_CONTENT, COPYRIGHT, OTHER' })
  }),
  description: z.string()
    .trim()
    .min(10, 'Report description must be at least 10 characters')
    .max(1000, 'Report description must be less than 1000 characters'),
  reportedUserId: z.string()
    .min(1, 'Reported user ID cannot be empty')
    .max(255, 'User ID too long')
    .optional(),
  reportedPostId: z.string()
    .min(1, 'Reported post ID cannot be empty')
    .max(255, 'Post ID too long')
    .optional()
}).refine(data => {
  // Must report either a user or a post, not both or neither
  const hasUserId = data.reportedUserId && data.reportedUserId.length > 0
  const hasPostId = data.reportedPostId && data.reportedPostId.length > 0
  return (hasUserId && !hasPostId) || (!hasUserId && hasPostId)
}, {
  message: 'Must report either a user or a post, not both',
  path: ['reportedUserId', 'reportedPostId']
})

/**
 * Validation schema for blocking a user
 */
const blockUserSchema = z.object({
  reason: z.string()
    .trim()
    .max(500, 'Block reason must be less than 500 characters')
    .optional()
    .or(z.literal(''))
})

/**
 * Validation schema for username parameter
 */
const usernameParamSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
})

/**
 * Middleware to validate media upload request
 * Fixed to match test expectations for error responses
 */
export const validateMediaUpload = (req: FileUploadRequest, res: Response, next: NextFunction): void => {
  try {
    // Validate the file exists
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'File is required for upload'
        }
      })
      return
    }

    // Validate file properties
    const fileValidation = fileValidationSchema.parse({
      mimetype: req.file.mimetype,
      size: req.file.size
    })

    // Validate optional body data (like altText)
    const bodyValidation = mediaUploadSchema.parse(req.body)
    req.body = bodyValidation

    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Check for specific validation errors to provide appropriate responses
      const sizeError = error.errors.find(err => err.path.includes('size'))
      const typeError = error.errors.find(err => err.path.includes('mimetype'))
      
      if (typeError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'File type not supported. Use JPEG, PNG, GIF, WEBP, MP4, or WEBM'
          }
        })
        return
      }
      
      if (sizeError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'File size exceeds 10MB limit'
          }
        })
        return
      }
      
      // General validation error response
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid media upload data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        }
      })
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during validation'
        }
      })
    }
  }
}

/**
 * Middleware to validate report creation data
 */
export const validateCreateReport = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validatedData = createReportSchema.parse(req.body)
    req.body = validatedData
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid report data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        }
      })
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during validation'
        }
      })
    }
  }
}

/**
 * Middleware to validate user blocking data
 */
export const validateBlockUser = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validatedData = blockUserSchema.parse(req.body)
    req.body = validatedData
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid block user data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        }
      })
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during validation'
        }
      })
    }
  }
}

/**
 * Middleware to validate username parameter
 */
export const validateUsernameParam = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validatedData = usernameParamSchema.parse(req.params)
    req.params = validatedData
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid username parameter',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        }
      })
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during validation'
        }
      })
    }
  }
}