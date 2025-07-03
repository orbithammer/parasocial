// backend/src/middleware/mediaModerationValidationMiddleware.ts
// Version: 1.5
// Updated report description error message to match test expectations - added "Report" prefix

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for validating media upload requests
 * Supports images and videos with size and type restrictions
 */
const mediaUploadSchema = z.object({
  altText: z.string()
    .max(200, 'Alt text must be 200 characters or less')
    .optional()
})

/**
 * Schema for validating content report creation
 * Supports reporting users or posts with required description
 */
const reportSchema = z.object({
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
    .min(10, 'Report description must be at least 10 characters')
    .max(1000, 'Description must be 1000 characters or less'),
  reportedUserId: z.string().optional(),
  reportedPostId: z.string().optional()
}).refine(
  (data) => data.reportedUserId || data.reportedPostId,
  {
    message: 'Either reportedUserId or reportedPostId must be provided',
    path: ['reportedUserId']
  }
).refine(
  (data) => !(data.reportedUserId && data.reportedPostId),
  {
    message: 'Cannot report both a user and a post in the same report',
    path: ['reportedUserId']
  }
)

/**
 * Schema for validating user blocking requests
 */
const blockUserSchema = z.object({
  blockedUserId: z.string()
    .min(1, 'User ID is required'),
  reason: z.string()
    .min(5, 'Block reason must be at least 5 characters')
    .max(500, 'Block reason must be 500 characters or less')
    .optional()
})

/**
 * Schema for validating username parameters in URL paths
 */
const usernameParamSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(50, 'Username must be 50 characters or less')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
})

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Middleware to validate media file uploads
 * Checks file type, size, and optional metadata
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

    // Validate file type
    if (!allowedTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: `File type ${req.file.mimetype} is not supported. Allowed types: ${allowedTypes.join(', ')}`
        }
      })
      return
    }

    // Validate file size based on type
    const isImage = allowedImageTypes.includes(req.file.mimetype)
    const sizeLimit = isImage ? maxImageSize : maxFileSize
    
    if (req.file.size > sizeLimit) {
      const sizeLimitMB = sizeLimit / (1024 * 1024)
      res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size ${(req.file.size / (1024 * 1024)).toFixed(1)}MB exceeds limit of ${sizeLimitMB}MB for ${isImage ? 'images' : 'videos'}`
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
            message: 'Invalid upload metadata',
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
 * Updated function name from validateReport to validateCreateReport
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
          code: 'INVALID_USERNAME',
          message: error.errors[0].message
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