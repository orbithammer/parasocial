// backend/src/middleware/followValidationMiddleware.ts
// Version: 1.1
// Fixed validation middleware for follow/unfollow operations and follower management

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

/**
 * Validation schema for follow request
 */
const followRequestSchema = z.object({
  actorId: z.string()
    .url('Actor ID must be a valid URL')
    .refine(url => {
      try {
        const parsed = new URL(url)
        // Must be HTTPS for security in ActivityPub
        return parsed.protocol === 'https:' && parsed.hostname.length > 0
      } catch {
        return false
      }
    }, {
      message: 'Actor ID must be a valid HTTPS URL'
    })
    .optional()
    .nullable()
})

/**
 * Validation schema for follower query parameters
 */
const followerQuerySchema = z.object({
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
  includeInactive: z.string()
    .optional()
    .default('false')
    .transform(val => val === 'true')
})

/**
 * Validation schema for username parameter (reusable for follow endpoints)
 */
const usernameParamSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
})

/**
 * Validation schema for ActivityPub actor discovery
 */
const actorDiscoverySchema = z.object({
  resource: z.string({
    required_error: 'Resource parameter is required'
  })
    .min(1, 'Resource parameter is required')
    .refine(resource => {
      // Check for acct: format (acct:username@domain.com)
      const acctRegex = /^acct:[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      // Check for https URL format
      const httpsRegex = /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/.*$/
      
      return acctRegex.test(resource) || httpsRegex.test(resource)
    }, {
      message: 'Resource must be in acct:user@domain.com or https://domain.com/users/user format'
    })
})

/**
 * Middleware to validate follow request data
 */
export const validateFollowRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Validate username parameter
    const usernameValidation = usernameParamSchema.parse(req.params)
    req.params = usernameValidation

    // Validate optional body data (actorId for federation)
    const bodyValidation = followRequestSchema.parse(req.body || {})
    req.body = bodyValidation

    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid follow request data',
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
 * Middleware to validate unfollow request
 */
export const validateUnfollowRequest = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Validate username parameter
    const validatedParams = usernameParamSchema.parse(req.params)
    req.params = validatedParams

    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid unfollow request',
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
 * Middleware to validate follower list query parameters
 */
export const validateFollowerQuery = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Validate username parameter
    const usernameValidation = usernameParamSchema.parse(req.params)
    req.params = usernameValidation

    // Validate query parameters
    const queryValidation = followerQuerySchema.parse(req.query)
    req.query = queryValidation as any

    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid follower query parameters',
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
 * Middleware to validate WebFinger discovery requests (ActivityPub)
 */
export const validateWebFingerQuery = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const validatedQuery = actorDiscoverySchema.parse(req.query)
    req.query = validatedQuery as any

    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid WebFinger request',
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
 * Middleware to validate ActivityPub inbox requests
 */
export const validateActivityPubInbox = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Check Content-Type header for ActivityPub
    const contentType = req.headers['content-type']
    if (!contentType || !contentType.includes('application/activity+json')) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Content-Type must be application/activity+json for ActivityPub requests'
        }
      })
      return
    }

    // Validate username parameter first
    const validatedParams = usernameParamSchema.parse(req.params)
    req.params = validatedParams

    // Check if request body is a valid object FIRST before checking ActivityPub fields
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body must be a valid JSON object'
        }
      })
      return
    }

    // Validate required ActivityPub fields AFTER confirming it's an object
    const requiredFields = ['@context', 'type', 'actor']
    const missingFields = requiredFields.filter(field => !(field in req.body))
    
    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Missing required ActivityPub fields: ${missingFields.join(', ')}`
        }
      })
      return
    }

    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid ActivityPub inbox request',
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