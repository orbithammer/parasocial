// backend/src/middleware/followValidationMiddleware.ts
// Version: 2.0
// Added validateWebFingerQuery function and fixed export naming

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
  INVALID_FOLLOW_TYPE = 'INVALID_FOLLOW_TYPE',
  INVALID_WEBFINGER_RESOURCE = 'INVALID_WEBFINGER_RESOURCE',
  MISSING_RESOURCE_PARAMETER = 'MISSING_RESOURCE_PARAMETER'
}

// Username validation regex - alphanumeric and underscores, 3-30 chars
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/

// ActivityPub actor ID validation regex - basic URL format
const ACTOR_ID_REGEX = /^https?:\/\/.+\/.+$/

// WebFinger resource validation regexes
const WEBFINGER_ACCT_REGEX = /^acct:[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const WEBFINGER_HTTPS_REGEX = /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/.+$/

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

// Validate WebFinger query parameters for ActivityPub discovery
export const validateWebFingerQuery = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { resource } = req.query

  // Check if resource parameter exists
  if (!resource || typeof resource !== 'string') {
    res.status(400).json({
      success: false,
      error: {
        code: FollowValidationError.MISSING_RESOURCE_PARAMETER,
        message: 'Resource parameter is required',
        details: [{
          field: 'resource',
          message: 'Resource parameter is required'
        }]
      }
    })
    return
  }

  // Validate resource format - must be either acct: or https: format
  const isValidAcct = WEBFINGER_ACCT_REGEX.test(resource)
  const isValidHttps = WEBFINGER_HTTPS_REGEX.test(resource)

  if (!isValidAcct && !isValidHttps) {
    res.status(400).json({
      success: false,
      error: {
        code: FollowValidationError.INVALID_WEBFINGER_RESOURCE,
        message: 'Invalid WebFinger resource format',
        details: [{
          field: 'resource',
          message: 'Resource must be in acct:user@domain.com or https://domain.com/users/user format'
        }]
      }
    })
    return
  }

  next()
}

// Validate follower list requests (renamed from validateFollowerListRequest to match test imports)
export const validateFollowerQuery = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  const { username } = req.params
  const { page, limit, includeInactive } = req.query

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

  // Validate page parameter if provided
  if (page !== undefined) {
    const pageNum = Number(page)
    if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > 1000) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAGINATION',
          message: 'Invalid pagination parameters',
          details: [{
            field: 'page',
            message: 'Page must be between 1 and 1000'
          }]
        }
      })
      return
    }
  }

  // Validate limit parameter if provided
  if (limit !== undefined) {
    const limitNum = Number(limit)
    if (!Number.isInteger(limitNum) || limitNum < 1 || limitNum > 100) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAGINATION',
          message: 'Invalid pagination parameters',
          details: [{
            field: 'limit',
            message: 'Limit must be between 1 and 100'
          }]
        }
      })
      return
    }
  }

  // includeInactive validation is handled by checking if it's 'true' string
  // No need to mutate req.query - let controller handle defaults and conversion

  next()
}

// Placeholder for ActivityPub inbox validation
export const validateActivityPubInbox = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // TODO: Implement ActivityPub inbox validation
  // This should validate incoming ActivityPub activities
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

// Export default validation middleware (keep existing export for backward compatibility)
export default {
  validateUsernameParam,
  validateFollowRequest,
  validateUnfollowRequest,
  validateFollowEndpoint,
  validateUnfollowEndpoint,
  validateFollowerQuery,
  validateWebFingerQuery,
  validateActivityPubInbox,
  FollowValidationError
}