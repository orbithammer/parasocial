// backend/src/middleware/mediaModerationValidationMiddleware.ts
// Version: 1.1
// Fixed file type validation to use consistent VALIDATION_ERROR format with details array

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for validating media upload metadata
 * Alt text is optional for accessibility
 */
const mediaUploadSchema = z.object({
  altText: z.string()
    .max(200, 'Alt text must be less than 200 characters')
    .optional()
})

/**
 * Schema for validating content reports
 * Supports reporting both users and posts with validation rules
 */
const reportSchema = z.object({
  type: z.enum(['spam', 'harassment', 'inappropriate', 'copyright', 'other'], {
    errorMap: () => ({ message: 'Report type must be one of: spam, harassment, inappropriate, copyright, other' })
  }),
  description: z.string()
    .min(10, 'Report description must be at least 10 characters')
    .max(1000, 'Report description must be less than 1000 characters'),
  reportedUserId: z.string().optional(),
  reportedPostId: z.string().optional()
})
.refine(
  (data) => !(data.reportedUserId && data.reportedPostId),
  {
    message: 'Must report either a user or a post, not both',
    path: ['reportedUserId']
  }
)
.refine(
  (data) => !!(data.reportedUserId || data.reportedPostId),
  {
    message: 'Must specify either a user ID or post ID to report',
    path: ['reportedUserId']
  }
)

/**
 * Schema for validating user blocking requests
 */
const blockUserSchema = z.object({
  reason: z.string()
    .refine(
      (val) => val === '' || val.length >= 5,
      { message: 'Block reason must be at least 5 characters' }
    )
    .refine(
      (val) => val.length <= 500,
      { message: 'Block reason must be less than 500 characters' }
    )
    .optional()
})

/**
 * Schema for validating username parameters in URL paths
 */
const usernameParamSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
})

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Middleware to validate media file uploads
 * Checks file type, size, and optional metadata
 * FIXED: Now uses consistent VALIDATION_ERROR format for all validations
 */
export const validateMediaUpload = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Validate file presence
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

    // Define allowed file types and sizes
    const allowedImageTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ]
    
    const allowedVideoTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]
    
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes]
    const maxFileSize = 50 * 1024 * 1024 // 50MB
    const maxImageSize = 10 * 1024 * 1024 // 10MB for images

    // FIXED: Validate file type using consistent VALIDATION_ERROR format
    if (!allowedTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid media upload data',
          details: [{
            field: 'mimetype',
            message: 'File type not supported. Use JPEG, PNG, GIF, WEBP, MP4, or WEBM'
          }]
        }
      })
      return
    }

    // Validate file size based on type
    const isImage = allowedImageTypes.includes(req.file.mimetype)
    const sizeLimit = isImage ? maxImageSize : maxFileSize
    
    // Check for empty files
    if (req.file.size === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid media upload data',
          details: [{
            field: 'size',
            message: 'File cannot be empty'
          }]
        }
      })
      return
    }
    
    if (req.file.size > sizeLimit) {
      const sizeLimitMB = sizeLimit / (1024 * 1024)
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid media upload data',
          details: [{
            field: 'size',
            message: `File size must be less than ${sizeLimitMB}MB`
          }]
        }
      })
      return
    }

    // Validate request body (metadata)
    try {
      const validatedBody = mediaUploadSchema.parse(req.body)
      req.body = validatedBody
    } catch (error) {
      if (error instanceof z.ZodError) {
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
    }

    // All validations passed
    next()
  } catch (error) {
    // Catch any unexpected errors
    console.error('Media validation error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Internal server error during validation'
      }
    })
  }
}

/**
 * Middleware to validate content reports
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
    } else {
      // Handle internal server errors (non-validation errors)
      console.error('Report validation error:', error)
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
 * Middleware to validate user blocking requests
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
          message: 'Invalid block request',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }
      })
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Block validation failed'
        }
      })
    }
  }
}

/**
 * Middleware to validate username parameters
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
    } else {
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username validation failed'
        }
      })
    }
  }
}