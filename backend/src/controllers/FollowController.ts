// backend/src/controllers/FollowController.ts
// HTTP controller for follow/unfollow operations with proper error handling and response formatting

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
        res.status(409).json({
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
        actorId: isExternalFollow ? actorId : null
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
        data: {
          follow: result.data,
          message: `Successfully started following ${username}`
        }
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to follow user',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Unfollow a user
   * DELETE /users/:username/follow
   * Requires authentication (for now - could support ActivityPub unfollows later)
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

      // Require authentication for unfollow
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
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
        data: {
          message: `Successfully unfollowed ${username}`
        }
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to unfollow user',
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

      // Success response
      res.status(200).json({
        success: true,
        data: result.data
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve follow statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Check if one user follows another
   * GET /users/:username/following/:targetUsername
   * Public endpoint for checking specific follow relationships
   */
  async checkFollowStatus(req: Request, res: Response): Promise<void> {
    try {
      const { username, targetUsername } = req.params

      // Validate parameters
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'MISSING_USERNAME'
        })
        return
      }

      if (!targetUsername || typeof targetUsername !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Target username is required',
          code: 'MISSING_TARGET_USERNAME'
        })
        return
      }

      // Find both users
      const [followerUser, followedUser] = await Promise.all([
        this.userRepository.findByUsername(username),
        this.userRepository.findByUsername(targetUsername)
      ])

      if (!followerUser) {
        res.status(404).json({
          success: false,
          error: 'Follower user not found',
          code: 'FOLLOWER_NOT_FOUND'
        })
        return
      }

      if (!followedUser) {
        res.status(404).json({
          success: false,
          error: 'Target user not found',
          code: 'TARGET_USER_NOT_FOUND'
        })
        return
      }

      // Check follow status using FollowService
      const result = await this.followService.checkFollowStatus(followerUser.id, followedUser.id)

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
        data: {
          isFollowing: result.data,
          follower: username,
          followed: targetUsername
        }
      })

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to check follow status',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Bulk check follow status for multiple users (for efficient UI updates)
   * POST /users/:username/following/check
   * Public endpoint with array of usernames in request body
   */
  async bulkCheckFollowing(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { usernames } = req.body

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'MISSING_USERNAME'
        })
        return
      }

      // Validate usernames array
      if (!Array.isArray(usernames)) {
        res.status(400).json({
          success: false,
          error: 'Usernames must be an array',
          code: 'INVALID_USERNAMES_FORMAT'
        })
        return
      }

      // Find follower user
      const followerUser = await this.userRepository.findByUsername(username)
      if (!followerUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Convert usernames to user IDs
      const userIds: string[] = []
      for (const targetUsername of usernames) {
        if (typeof targetUsername === 'string') {
          const targetUser = await this.userRepository.findByUsername(targetUsername)
          if (targetUser) {
            userIds.push(targetUser.id)
          }
        }
      }

      // Perform bulk check using FollowService
      const result = await this.followService.bulkCheckFollowing(followerUser.id, userIds)

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
        error: 'Failed to perform bulk follow check',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get recent followers for notifications
   * GET /users/:username/followers/recent
   * Requires authentication and user can only see their own recent followers
   */
  async getRecentFollowers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { limit } = req.query

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'MISSING_USERNAME'
        })
        return
      }

      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
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

      // Check authorization - users can only see their own recent followers
      if (req.user.id !== user.id) {
        res.status(403).json({
          success: false,
          error: 'Can only view your own recent followers',
          code: 'FORBIDDEN'
        })
        return
      }

      // Parse limit parameter
      const parsedLimit = limit ? parseInt(limit as string, 10) : 10

      // Get recent followers using FollowService
      const result = await this.followService.getRecentFollowers(user.id, parsedLimit)

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
        error: 'Failed to retrieve recent followers',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Parse pagination parameters from query string
   * @param offset - Offset query parameter
   * @param limit - Limit query parameter
   * @returns Parsed pagination options
   */
  private parsePaginationParams(offset: any, limit: any): { offset?: number; limit?: number } {
    const options: { offset?: number; limit?: number } = {}

    if (offset !== undefined) {
      const parsedOffset = parseInt(offset as string, 10)
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        options.offset = parsedOffset
      }
    }

    if (limit !== undefined) {
      const parsedLimit = parseInt(limit as string, 10)
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        options.limit = parsedLimit
      }
    }

    return options
  }

/**
 * Map service error codes to HTTP status codes
 * Updated to fix test failures for NOT_FOLLOWING and NO_FOLLOWER_IDENTITY
 */
private getStatusCodeFromError(errorCode?: string): number {
  switch (errorCode) {
    case 'VALIDATION_ERROR':
    case 'INVALID_USER_ID':
    case 'INVALID_PARAMETERS':
    case 'INVALID_FOLLOWER_ID':
    case 'INVALID_USER_IDS':
    case 'TOO_MANY_USERS':
      return 400 // Bad Request

    case 'AUTHENTICATION_REQUIRED':
      return 401 // Unauthorized

    case 'FORBIDDEN':
      return 403 // Forbidden

    case 'USER_NOT_FOUND':
    case 'FOLLOWER_NOT_FOUND':
    case 'TARGET_USER_NOT_FOUND':
    case 'NOT_FOLLOWING':  // Fixed: Changed from 409 to 404 - relationship doesn't exist
      return 404 // Not Found

    case 'SELF_FOLLOW_ERROR':
    case 'ALREADY_FOLLOWING':
    case 'NO_FOLLOWER_IDENTITY':  // Fixed: Changed from 400 to 409 - business rule conflict
    case 'USER_INACTIVE':
    case 'INVALID_ACTOR_ID':
      return 409 // Conflict

    case 'INTERNAL_ERROR':
    default:
      return 500 // Internal Server Error
  }
}
}