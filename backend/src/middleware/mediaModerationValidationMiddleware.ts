// backend/src/middleware/mediaModerationValidationMiddleware.ts
// Version: 2.0
// Fixed validateMediaUpload to return detailed validation errors matching test expectations

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

/**
 * Interface for file upload requests using proper multer types
 */
interface FileUploadRequest extends Request {
  file?: Express.Multer.File
}

/**
 * Maximum file size: 10MB
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Supported file types for media uploads
 */
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm']
const SUPPORTED_FILE_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_VIDEO_TYPES]

/**
 * Validation schema for media upload body data
 */
const mediaUploadSchema = z.object({
  altText: z.string()
    .max(500, 'Alt text must be less than 500 characters')
    .optional()
    .or(z.literal(''))
})

/**
 * Validation schema for file properties
 */
const fileValidationSchema = z.object({
  mimetype: z.string()
    .refine(
      (type) => SUPPORTED_FILE_TYPES.includes(type),
      'File type not supported. Use JPEG, PNG, GIF, WEBP, MP4, or WEBM'
    ),
  size: z.number()
    .max(MAX_FILE_SIZE, 'File size must be less than 10MB')
    .min(1, 'File cannot be empty')
})

/**
 * Validation schema for report creation
 */
const reportSchema = z.object({
  type: z.enum(['spam', 'harassment', 'inappropriate_content', 'copyright', 'other'], {
    errorMap: () => ({ message: 'Invalid report type' })
  }),
  description: z.string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description must be less than 1000 characters'),
  reportedUserId: z.string().optional(),
  reportedPostId: z.string().optional()
}).refine((data) => {
  // Ensure exactly one of reportedUserId or reportedPostId is provided
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
 * Returns detailed validation errors matching test expectations
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
      // Return detailed validation error format that tests expect
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid media upload data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }
      })
      return
    }

    // Handle unexpected errors
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during validation'
      }
    })
  }
}

/**
 * Middleware to validate report creation request
 */
export const validateCreateReport = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validatedData = reportSchema.parse(req.body)
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
            message: err.message
          }))
        }
      })
      return
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during validation'
      }
    })
  }
}

/**
 * Middleware to validate user blocking request
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
            message: err.message
          }))
        }
      })
      return
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during validation'
      }
    })
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
            message: err.message
          }))
        }
      })
      return
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during validation'
      }
    })
  }
}