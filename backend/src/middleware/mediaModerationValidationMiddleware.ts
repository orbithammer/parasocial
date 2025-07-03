// backend/src/middleware/mediaModerationValidationMiddleware.ts
// Version: 2.3
// Updated to only handle body validation - file type validation now handled by multer fileFilter

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

/**
 * Interface for file upload requests using proper multer types
 */
interface FileUploadRequest extends Request {
  file?: Express.Multer.File
}

/**
 * Validation schema for media upload body data
 */
const mediaUploadSchema = z.object({
  altText: z.string()
    .max(1000, 'Alt text must be less than 1000 characters')
    .optional()
    .or(z.literal(''))
})

/**
 * Validation schema for report creation
 */
const reportSchema = z.object({
  type: z.enum(['harassment', 'spam', 'misinformation', 'inappropriate_content', 'copyright', 'other'], {
    errorMap: () => ({ message: 'Report type must be one of: HARASSMENT, SPAM, MISINFORMATION, INAPPROPRIATE_CONTENT, COPYRIGHT, OTHER' })
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
 * Only handles body validation - file validation is handled by multer fileFilter
 */
export const validateMediaUpload = (req: FileUploadRequest, res: Response, next: NextFunction): void => {
  try {
    // File existence is handled by multer, just validate request body
    try {
      const bodyValidation = mediaUploadSchema.parse(req.body)
      req.body = bodyValidation
    } catch (bodyError) {
      if (bodyError instanceof z.ZodError) {
        // Return detailed validation error format for body validation
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid media upload data',
            details: bodyError.errors.map(err => ({
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
export const validateReport = (req: Request, res: Response, next: NextFunction): void => {
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
      res.status(500).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Report validation failed'
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