// backend/src/middleware/postValidationMiddleware.ts
// Version: 1.0
// Post validation middleware for create, update, and query operations

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

/**
 * Validation schema for creating a new post
 */
const createPostSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Post content cannot be empty')
    .max(2000, 'Post content must be less than 2000 characters'),
  contentWarning: z.string()
    .trim()
    .max(200, 'Content warning must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  isScheduled: z.boolean()
    .default(false),
  scheduledFor: z.string()
    .datetime('Invalid scheduled date format')
    .optional()
    .nullable(),
  isPublished: z.boolean()
    .default(true)
}).refine((data) => {
  // If scheduled, must have scheduledFor date
  if (data.isScheduled && !data.scheduledFor) {
    return false
  }
  // If scheduled, scheduledFor must be in the future
  if (data.scheduledFor) {
    const scheduledDate = new Date(data.scheduledFor)
    return scheduledDate > new Date()
  }
  return true
}, {
  message: 'Scheduled posts must have a future date',
  path: ['scheduledFor']
})

/**
 * Validation schema for updating a post
 */
const updatePostSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Post content cannot be empty')
    .max(2000, 'Post content must be less than 2000 characters')
    .optional(),
  contentWarning: z.string()
    .trim()
    .max(200, 'Content warning must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  isPublished: z.boolean()
    .optional()
})

/**
 * Validation schema for post query parameters
 */
const postQuerySchema = z.object({
  page: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 1)
    .refine(val => val >= 1 && val <= 1000, {
      message: 'Page must be between 1 and 1000'
    }),
  limit: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 20)
    .refine(val => val >= 1 && val <= 100, {
      message: 'Limit must be between 1 and 100'
    }),
  userId: z.string()
    .min(1, 'User ID cannot be empty')
    .max(255, 'User ID too long')
    .optional()
})

/**
 * Validation schema for post ID parameter
 */
const postIdSchema = z.object({
  id: z.string()
    .min(1, 'Post ID is required')
    .max(255, 'Post ID too long')
})

/**
 * Middleware to validate post creation data
 */
export const validateCreatePost = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validatedData = createPostSchema.parse(req.body)
    req.body = validatedData
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid post data',
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
 * Middleware to validate post update data
 */
export const validateUpdatePost = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validatedData = updatePostSchema.parse(req.body)
    req.body = validatedData
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid post update data',
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
 * Middleware to validate post query parameters
 */
export const validatePostQuery = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validatedQuery = postQuerySchema.parse(req.query)
    req.query = validatedQuery as any
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
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
 * Middleware to validate post ID parameter
 */
export const validatePostId = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validatedParams = postIdSchema.parse(req.params)
    req.params = validatedParams
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid post ID',
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