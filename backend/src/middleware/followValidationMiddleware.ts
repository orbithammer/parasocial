// src/middleware/followValidationMiddleware.ts
// Version: 1.0.0
// Initial implementation of follow validation middleware

import { Request, Response, NextFunction } from 'express'

// Interface for follow request validation
interface FollowRequest extends Request {
  body: {
    actorId?: string
    followType?: 'local' | 'remote'
  }
  params: {
    username: string
  }
  user?: {
    id: string
    email: string
    username: string
  }
}

// Validation error types
export enum FollowValidationError {
  INVALID_USERNAME = 'INVALID_USERNAME',
  INVALID_ACTOR_ID = 'INVALID_ACTOR_ID',
  MISSING_AUTHENTICATION = 'MISSING_AUTHENTICATION',
  SELF_FOLLOW_ATTEMPT = 'SELF_FOLLOW_ATTEMPT',
  INVALID_FOLLOW_TYPE = 'INVALID_FOLLOW_TYPE'
}

// Username validation regex - alphanumeric and underscores, 3-30 chars
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/

// ActivityPub actor ID validation regex - basic URL format
const ACTOR_ID_REGEX = /^https?:\/\/.+\/.+$/

// Validate username parameter in follow requests
export const validateUsernameParam = (
  req: FollowRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const { username } = req.params

  // Check if username exists
  if (!username) {
    res.status(400).json({
      success: false,
      error: {
        code: FollowValidationError.INVALID_USERNAME,
        message: 'Username parameter is required'
      }
    })
    return
  }

  // Validate username format
  if (!USERNAME_REGEX.test(username)) {
    res.status(400).json({
      success: false,
      error: {
        code: FollowValidationError.INVALID_USERNAME,
        message: 'Username must be 3-30 characters, alphanumeric and underscores only'
      }
    })
    return
  }

  next()
}

// Validate follow request body and authentication
export const validateFollowRequest = (
  req: FollowRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const { actorId, followType } = req.body
  const { username } = req.params
  const authenticatedUser = req.user

  // Check if either authenticated user or actorId is provided
  if (!authenticatedUser && !actorId) {
    res.status(401).json({
      success: false,
      error: {
        code: FollowValidationError.MISSING_AUTHENTICATION,
        message: 'Authentication required or actorId must be provided'
      }
    })
    return
  }

  // Validate actorId format if provided
  if (actorId && !ACTOR_ID_REGEX.test(actorId)) {
    res.status(400).json({
      success: false,
      error: {
        code: FollowValidationError.INVALID_ACTOR_ID,
        message: 'Invalid ActivityPub actor ID format'
      }
    })
    return
  }

  // Validate followType if provided
  if (followType && !['local', 'remote'].includes(followType)) {
    res.status(400).json({
      success: false,
      error: {
        code: FollowValidationError.INVALID_FOLLOW_TYPE,
        message: 'Follow type must be either "local" or "remote"'
      }
    })
    return
  }

  // Prevent self-follow attempts for authenticated users
  if (authenticatedUser && authenticatedUser.username === username) {
    res.status(409).json({
      success: false,
      error: {
        code: FollowValidationError.SELF_FOLLOW_ATTEMPT,
        message: 'Users cannot follow themselves'
      }
    })
    return
  }

  next()
}

// Validate unfollow request - requires authentication
export const validateUnfollowRequest = (
  req: FollowRequest, 
  res: Response, 
  next: NextFunction
): void => {
  const { username } = req.params
  const authenticatedUser = req.user

  // Authentication is required for unfollow
  if (!authenticatedUser) {
    res.status(401).json({
      success: false,
      error: {
        code: FollowValidationError.MISSING_AUTHENTICATION,
        message: 'Authentication required for unfollow operation'
      }
    })
    return
  }

  // Prevent self-unfollow attempts
  if (authenticatedUser.username === username) {
    res.status(409).json({
      success: false,
      error: {
        code: FollowValidationError.SELF_FOLLOW_ATTEMPT,
        message: 'Users cannot unfollow themselves'
      }
    })
    return
  }

  next()
}

// Combined validation middleware for follow endpoints
export const validateFollowEndpoint = [
  validateUsernameParam,
  validateFollowRequest
]

// Combined validation middleware for unfollow endpoints
export const validateUnfollowEndpoint = [
  validateUsernameParam,
  validateUnfollowRequest
]

// Validate follower list requests
export const validateFollowerListRequest = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  const { username } = req.params
  const { page, limit } = req.query

  // Validate username
  if (!username || !USERNAME_REGEX.test(username)) {
    res.status(400).json({
      success: false,
      error: {
        code: FollowValidationError.INVALID_USERNAME,
        message: 'Valid username parameter is required'
      }
    })
    return
  }

  // Validate pagination parameters if provided
  if (page && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PAGINATION',
        message: 'Page must be a positive integer'
      }
    })
    return
  }

  if (limit && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PAGINATION',
        message: 'Limit must be a positive integer between 1 and 100'
      }
    })
    return
  }

  next()
}

// Export default validation middleware
export default {
  validateUsernameParam,
  validateFollowRequest,
  validateUnfollowRequest,
  validateFollowEndpoint,
  validateUnfollowEndpoint,
  validateFollowerListRequest,
  FollowValidationError
}