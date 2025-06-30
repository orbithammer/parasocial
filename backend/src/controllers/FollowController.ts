// backend/src/controllers/FollowController.ts
// Complete HTTP controller for follow/unfollow operations with proper error handling and response formatting

import { Request, Response } from 'express'
import { FollowService } from '../services/FollowService'
import { UserRepository } from '../repositories/UserRepository'

// Extend Express Request to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

// Pagination options interface
interface PaginationOptions {
  offset: number
  limit: number
}

/**
 * FollowController class
 * Handles HTTP requests for follow/unfollow operations
 * Coordinates between HTTP layer and FollowService business logic
 */
export class FollowController {
  constructor(
    private followService: FollowService,
    private userRepository: UserRepository
  ) {}

  /**
   * Follow a user
   * POST /users/:username/follow
   * Supports both authenticated ParaSocial users and external ActivityPub actors
   */
  async followUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { actorId } = req.body // Optional ActivityPub actor ID for federated follows

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'MISSING_USERNAME'
        })
        return
      }

      // Find the user to follow by username
      const userToFollow = await this.userRepository.findByUsername(username)
      if (!userToFollow) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Determine follower ID - could be authenticated user or external actor
      let followerId: string
      let isExternalFollow = false

      if (req.user) {
        // Authenticated ParaSocial user
        followerId = req.user.id
      } else if (actorId) {
        // External ActivityPub follow
        followerId = actorId
        isExternalFollow = true
      } else {
        res.status(401).json({
          success: false,
          error: 'Either authentication or actorId is required',
          code: 'NO_FOLLOWER_IDENTITY'
        })
        return
      }

      // Use FollowService to create the follow relationship
      const result = await this.followService.followUser({
        followerId,
        followedId: userToFollow.id,
        actorId: isExternalFollow ? actorId : undefined
      })

      // Handle service result
      if (!result.success) {
        const statusCode = this.getStatusCodeFromError(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        })
        return
      }

      // Success response
      res.status(201).json({
        success: true,
        data: result.data,
        message: `Successfully followed ${username}`
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create follow relationship',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Unfollow a user
   * DELETE /users/:username/follow
   * Requires authentication
   */
  async unfollowUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'MISSING_USERNAME'
        })
        return
      }

      // Require authentication for unfollowing
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required to unfollow',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      // Find the user to unfollow by username
      const userToUnfollow = await this.userRepository.findByUsername(username)
      if (!userToUnfollow) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Use FollowService to remove the follow relationship
      const result = await this.followService.unfollowUser({
        followerId: req.user.id,
        followedId: userToUnfollow.id
      })

      // Handle service result
      if (!result.success) {
        const statusCode = this.getStatusCodeFromError(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        })
        return
      }

      // Success response
      res.status(200).json({
        success: true,
        data: result.data,
        message: `Successfully unfollowed ${username}`
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to remove follow relationship',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get user's followers list
   * GET /users/:username/followers
   * Public endpoint with pagination
   */
  async getUserFollowers(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { offset, limit } = req.query

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'MISSING_USERNAME'
        })
        return
      }

      // Find user by username
      const user = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Parse pagination parameters
      const paginationOptions = this.parsePaginationParams(offset, limit)

      // Get followers using FollowService
      const result = await this.followService.getFollowers(user.id, paginationOptions)

      // Handle service result
      if (!result.success) {
        const statusCode = this.getStatusCodeFromError(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        })
        return
      }

      // Success response
      res.status(200).json({
        success: true,
        data: result.data
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve followers',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get users that a specific user is following
   * GET /users/:username/following
   * Public endpoint with pagination
   */
  async getUserFollowing(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { offset, limit } = req.query

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'MISSING_USERNAME'
        })
        return
      }

      // Find user by username
      const user = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Parse pagination parameters
      const paginationOptions = this.parsePaginationParams(offset, limit)

      // Get following list using FollowService
      const result = await this.followService.getFollowing(user.id, paginationOptions)

      // Handle service result
      if (!result.success) {
        const statusCode = this.getStatusCodeFromError(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        })
        return
      }

      // Success response
      res.status(200).json({
        success: true,
        data: result.data
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve following list',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get follow statistics for a user
   * GET /users/:username/stats
   * Public endpoint
   */
  async getUserFollowStats(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'MISSING_USERNAME'
        })
        return
      }

      // Find user by username
      const user = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Get follow statistics using FollowService
      const result = await this.followService.getFollowStats(user.id)

      // Handle service result
      if (!result.success) {
        const statusCode = this.getStatusCodeFromError(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        })
        return
      }

      // Success response with username included
      res.status(200).json({
        success: true,
        data: {
          ...result.data,
          username: user.username
        }
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve follow statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Parse pagination parameters from query string
   * @param offset - Offset query parameter
   * @param limit - Limit query parameter
   * @returns Parsed pagination options with defaults
   */
  private parsePaginationParams(offset: any, limit: any): PaginationOptions {
    const parsedOffset = offset ? parseInt(offset as string, 10) : 0
    const parsedLimit = limit ? parseInt(limit as string, 10) : 20

    return {
      offset: Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset),
      limit: Math.min(100, Math.max(1, isNaN(parsedLimit) ? 20 : parsedLimit))
    }
  }

  /**
   * Map service error codes to HTTP status codes
   * @param errorCode - Service error code
   * @returns Appropriate HTTP status code
   */
  private getStatusCodeFromError(errorCode?: string): number {
    switch (errorCode) {
      case 'USER_NOT_FOUND':
        return 404
      case 'ALREADY_FOLLOWING':
        return 409
      case 'NOT_FOLLOWING':
        return 404
      case 'SELF_FOLLOW_ERROR':
        return 400
      case 'USER_INACTIVE':
        return 403
      case 'INVALID_ACTOR_ID':
        return 400
      case 'VALIDATION_ERROR':
        return 400
      case 'AUTHENTICATION_REQUIRED':
        return 401
      case 'AUTHORIZATION_FAILED':
        return 403
      default:
        return 500
    }
  }
}