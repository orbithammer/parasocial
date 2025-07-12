// src/middleware/postValidationMiddleware.ts
// Version: 1.0.0
// Initial implementation of post validation middleware

import { Request, Response, NextFunction } from 'express'

// Interface for post request validation
interface PostRequest extends Request {
  body: {
    content?: string
    contentWarning?: string
    isPublished?: boolean
    scheduledFor?: string
    mediaIds?: string[]
    activityId?: string
  }
  params: {
    postId?: string
    username?: string
  }
  user?: {
    id: string
    email: string
    username: string
  }
}

// Post validation error types
export enum PostValidationError {
  INVALID_POST_ID = 'INVALID_POST_ID',
  INVALID_CONTENT = 'INVALID_CONTENT',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  INVALID_CONTENT_WARNING = 'INVALID_CONTENT_WARNING',
  INVALID_SCHEDULE_DATE = 'INVALID_SCHEDULE_DATE',
  INVALID_MEDIA_IDS = 'INVALID_MEDIA_IDS',
  TOO_MANY_MEDIA_ATTACHMENTS = 'TOO_MANY_MEDIA_ATTACHMENTS',
  INVALID_ACTIVITY_ID = 'INVALID_ACTIVITY_ID',
  MISSING_AUTHENTICATION = 'MISSING_AUTHENTICATION',
  INVALID_PAGINATION = 'INVALID_PAGINATION',
  EMPTY_POST_CONTENT = 'EMPTY_POST_CONTENT'
}

// Constants for validation
const MAX_CONTENT_LENGTH = 5000
const MAX_CONTENT_WARNING_LENGTH = 280
const MAX_MEDIA_ATTACHMENTS = 4
const POST_ID_REGEX = /^[a-zA-Z0-9_-]+$/
const ACTIVITY_ID_REGEX = /^https?:\/\/.+$/

// Validate post ID parameter
export const validatePostIdParam = (
  req: PostRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const { postId } = req.params

  if (!postId) {
    res.status(400).json({
      success: false,
      error: {
        code: PostValidationError.INVALID_POST_ID,
        message: 'Post ID parameter is required'
      }
    })
    return
  }

  if (!POST_ID_REGEX.test(postId)) {
    res.status(400).json({
      success: false,
      error: {
        code: PostValidationError.INVALID_POST_ID,
        message: 'Invalid post ID format'
      }
    })
    return
  }

  next()
}

// Validate post creation request
export const validatePostCreation = (
  req: PostRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const { 
    content, 
    contentWarning, 
    isPublished, 
    scheduledFor, 
    mediaIds, 
    activityId 
  } = req.body

  // Check authentication
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: PostValidationError.MISSING_AUTHENTICATION,
        message: 'Authentication required for post creation'
      }
    })
    return
  }

  // Validate content
  if (content !== undefined) {
    if (typeof content !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.INVALID_CONTENT,
          message: 'Content must be a string'
        }
      })
      return
    }

    if (content.trim().length === 0 && (!mediaIds || mediaIds.length === 0)) {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.EMPTY_POST_CONTENT,
          message: 'Post must have content or media attachments'
        }
      })
      return
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.CONTENT_TOO_LONG,
          message: `Content cannot exceed ${MAX_CONTENT_LENGTH} characters`
        }
      })
      return
    }
  }

  // Validate content warning
  if (contentWarning !== undefined) {
    if (typeof contentWarning !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.INVALID_CONTENT_WARNING,
          message: 'Content warning must be a string'
        }
      })
      return
    }

    if (contentWarning.length > MAX_CONTENT_WARNING_LENGTH) {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.INVALID_CONTENT_WARNING,
          message: `Content warning cannot exceed ${MAX_CONTENT_WARNING_LENGTH} characters`
        }
      })
      return
    }
  }

  // Validate scheduled date
  if (scheduledFor !== undefined) {
    if (typeof scheduledFor !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.INVALID_SCHEDULE_DATE,
          message: 'Scheduled date must be a valid ISO string'
        }
      })
      return
    }

    const scheduledDate = new Date(scheduledFor)
    if (isNaN(scheduledDate.getTime())) {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.INVALID_SCHEDULE_DATE,
          message: 'Invalid scheduled date format'
        }
      })
      return
    }

    if (scheduledDate <= new Date()) {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.INVALID_SCHEDULE_DATE,
          message: 'Scheduled date must be in the future'
        }
      })
      return
    }
  }

  // Validate media IDs
  if (mediaIds !== undefined) {
    if (!Array.isArray(mediaIds)) {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.INVALID_MEDIA_IDS,
          message: 'Media IDs must be an array'
        }
      })
      return
    }

    if (mediaIds.length > MAX_MEDIA_ATTACHMENTS) {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.TOO_MANY_MEDIA_ATTACHMENTS,
          message: `Cannot attach more than ${MAX_MEDIA_ATTACHMENTS} media files`
        }
      })
      return
    }

    for (const mediaId of mediaIds) {
      if (typeof mediaId !== 'string' || !POST_ID_REGEX.test(mediaId)) {
        res.status(400).json({
          success: false,
          error: {
            code: PostValidationError.INVALID_MEDIA_IDS,
            message: 'Invalid media ID format'
          }
        })
        return
      }
    }
  }

  // Validate ActivityPub activity ID
  if (activityId !== undefined) {
    if (typeof activityId !== 'string' || !ACTIVITY_ID_REGEX.test(activityId)) {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.INVALID_ACTIVITY_ID,
          message: 'Invalid ActivityPub activity ID format'
        }
      })
      return
    }
  }

  // Validate published status
  if (isPublished !== undefined && typeof isPublished !== 'boolean') {
    res.status(400).json({
      success: false,
      error: {
        code: PostValidationError.INVALID_CONTENT,
        message: 'isPublished must be a boolean value'
      }
    })
    return
  }

  next()
}

// Validate post update request
export const validatePostUpdate = (
  req: PostRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const { content, contentWarning, isPublished, scheduledFor } = req.body

  // Check authentication
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: PostValidationError.MISSING_AUTHENTICATION,
        message: 'Authentication required for post updates'
      }
    })
    return
  }

  // Validate content if provided
  if (content !== undefined) {
    if (typeof content !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.INVALID_CONTENT,
          message: 'Content must be a string'
        }
      })
      return
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.CONTENT_TOO_LONG,
          message: `Content cannot exceed ${MAX_CONTENT_LENGTH} characters`
        }
      })
      return
    }
  }

  // Validate content warning if provided
  if (contentWarning !== undefined) {
    if (typeof contentWarning !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.INVALID_CONTENT_WARNING,
          message: 'Content warning must be a string'
        }
      })
      return
    }

    if (contentWarning.length > MAX_CONTENT_WARNING_LENGTH) {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.INVALID_CONTENT_WARNING,
          message: `Content warning cannot exceed ${MAX_CONTENT_WARNING_LENGTH} characters`
        }
      })
      return
    }
  }

  // Validate scheduled date if provided
  if (scheduledFor !== undefined) {
    if (scheduledFor !== null && typeof scheduledFor !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: PostValidationError.INVALID_SCHEDULE_DATE,
          message: 'Scheduled date must be a valid ISO string or null'
        }
      })
      return
    }

    if (scheduledFor !== null) {
      const scheduledDate = new Date(scheduledFor)
      if (isNaN(scheduledDate.getTime())) {
        res.status(400).json({
          success: false,
          error: {
            code: PostValidationError.INVALID_SCHEDULE_DATE,
            message: 'Invalid scheduled date format'
          }
        })
        return
      }

      if (scheduledDate <= new Date()) {
        res.status(400).json({
          success: false,
          error: {
            code: PostValidationError.INVALID_SCHEDULE_DATE,
            message: 'Scheduled date must be in the future'
          }
        })
        return
      }
    }
  }

  // Validate published status if provided
  if (isPublished !== undefined && typeof isPublished !== 'boolean') {
    res.status(400).json({
      success: false,
      error: {
        code: PostValidationError.INVALID_CONTENT,
        message: 'isPublished must be a boolean value'
      }
    })
    return
  }

  next()
}

// Validate post list query parameters
export const validatePostListQuery = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  const { page, limit, authorId, includeScheduled, hasContentWarning } = req.query

  // Validate page parameter
  if (page && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
    res.status(400).json({
      success: false,
      error: {
        code: PostValidationError.INVALID_PAGINATION,
        message: 'Page must be a positive integer'
      }
    })
    return
  }

  // Validate limit parameter
  if (limit && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    res.status(400).json({
      success: false,
      error: {
        code: PostValidationError.INVALID_PAGINATION,
        message: 'Limit must be a positive integer between 1 and 100'
      }
    })
    return
  }

  // Validate author ID if provided
  if (authorId && (typeof authorId !== 'string' || !POST_ID_REGEX.test(authorId as string))) {
    res.status(400).json({
      success: false,
      error: {
        code: PostValidationError.INVALID_POST_ID,
        message: 'Invalid author ID format'
      }
    })
    return
  }

  // Validate boolean query parameters
  if (includeScheduled && !['true', 'false'].includes(includeScheduled as string)) {
    res.status(400).json({
      success: false,
      error: {
        code: PostValidationError.INVALID_PAGINATION,
        message: 'includeScheduled must be true or false'
      }
    })
    return
  }

  if (hasContentWarning && !['true', 'false'].includes(hasContentWarning as string)) {
    res.status(400).json({
      success: false,
      error: {
        code: PostValidationError.INVALID_PAGINATION,
        message: 'hasContentWarning must be true or false'
      }
    })
    return
  }

  next()
}

// Combined validation middleware for post creation
export const validatePostCreationEndpoint = [
  validatePostCreation
]

// Combined validation middleware for post updates
export const validatePostUpdateEndpoint = [
  validatePostIdParam,
  validatePostUpdate
]

// Combined validation middleware for post deletion
export const validatePostDeletionEndpoint = [
  validatePostIdParam,
  (req: PostRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: PostValidationError.MISSING_AUTHENTICATION,
          message: 'Authentication required for post deletion'
        }
      })
      return
    }
    next()
  }
]

// Export default validation middleware
export default {
  validatePostIdParam,
  validatePostCreation,
  validatePostUpdate,
  validatePostListQuery,
  validatePostCreationEndpoint,
  validatePostUpdateEndpoint,
  validatePostDeletionEndpoint,
  PostValidationError
}