// backend/src/controllers/FollowController.ts
// Version 2.1 - Fixed pagination parameter validation logic

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

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            follow: result.data,
            message: `Successfully started following ${username}`
          }
        })
      } else {
        // Map service error codes to HTTP status codes
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        })
      }
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
   * Requires authentication
   */
  async unfollowUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params

      // Require authentication for unfollow operations
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'MISSING_USERNAME'
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

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            message: `Successfully unfollowed ${username}`
          }
        })
      } else {
        // Map service error codes to HTTP status codes
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        })
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to unfollow user',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get followers for a user
   * GET /users/:username/followers
   * Public endpoint with pagination
   */
  async getUserFollowers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { offset, limit } = req.query // Don't provide defaults here

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'MISSING_USERNAME'
        })
        return
      }

      // Find the user by username
      const user = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Parse and validate pagination parameters only if provided and valid
      const paginationOptions: any = {}
      
      if (offset !== undefined) {
        const parsedOffset = parseInt(offset as string)
        if (!isNaN(parsedOffset) && parsedOffset >= 0) {
          paginationOptions.offset = parsedOffset
        }
      }
      
      if (limit !== undefined) {
        const parsedLimit = parseInt(limit as string)
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          paginationOptions.limit = Math.min(100, parsedLimit)
        }
      }

      // Get followers from service
      const result = await this.followService.getFollowers(user.id, paginationOptions)

      res.status(200).json({
        success: true,
        data: result.data || result // Extract data if service returns wrapped response
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get followers',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get users that a specific user follows
   * GET /users/:username/following
   * Public endpoint with pagination
   */
  async getUserFollowing(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      // Find the user by username
      const user = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Parse and validate pagination parameters only if provided and valid
      const paginationOptions: any = {}
      
      if (offset !== undefined) {
        const parsedOffset = parseInt(offset as string)
        if (!isNaN(parsedOffset) && parsedOffset >= 0) {
          paginationOptions.offset = parsedOffset
        }
      }
      
      if (limit !== undefined) {
        const parsedLimit = parseInt(limit as string)
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          paginationOptions.limit = Math.min(100, parsedLimit)
        }
      }

      // Get following from service
      const result = await this.followService.getFollowing(user.id, paginationOptions)

      res.status(200).json({
        success: true,
        data: result.data || result // Extract data if service returns wrapped response
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get following',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get follow statistics for a user
   * GET /users/:username/stats
   * Public endpoint
   */
  async getUserFollowStats(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      // Find the user by username
      const user = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Get follow stats from service
      const stats = await this.followService.getFollowStats(user.id)

      res.status(200).json({
        success: true,
        data: stats.data || stats // Just return the stats without adding username
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get follow stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Check follow status between two users
   * GET /users/:username/following/:targetUsername
   * Public endpoint
   */
  async checkFollowStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const followerUser = await this.userRepository.findByUsername(username)
      if (!followerUser) {
        res.status(404).json({
          success: false,
          error: 'Follower user not found',
          code: 'FOLLOWER_NOT_FOUND'
        })
        return
      }

      const targetUser = await this.userRepository.findByUsername(targetUsername)
      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: 'Target user not found',
          code: 'TARGET_NOT_FOUND'
        })
        return
      }

      // Check follow status
      const result = await this.followService.checkFollowStatus(followerUser.id, targetUser.id)

      if (result.success) {
        res.status(200).json({
          success: true,
          data: {
            isFollowing: result.data,
            follower: username,
            followed: targetUsername
          }
        })
      } else {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        })
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to check follow status',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Bulk check follow status for multiple users
   * POST /users/:username/following/check
   * Body: { usernames: ["user1", "user2", "user3"] }
   * Public endpoint
   */
  async bulkCheckFollowing(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      // Find the follower user
      const followerUser = await this.userRepository.findByUsername(username)
      if (!followerUser) {
        res.status(404).json({
          success: false,
          error: 'Follower user not found',
          code: 'FOLLOWER_NOT_FOUND'
        })
        return
      }

      // Convert usernames to user IDs
      const userIds: string[] = []
      for (const targetUsername of usernames) {
        const targetUser = await this.userRepository.findByUsername(targetUsername)
        if (targetUser) {
          userIds.push(targetUser.id)
        }
      }

      // Perform bulk check
      const result = await this.followService.bulkCheckFollowing(followerUser.id, userIds)

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        })
      } else {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        })
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk follow check',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get recent followers for a user
   * GET /users/:username/followers/recent
   * Requires authentication and user can only view their own recent followers
   */
  async getRecentFollowers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { limit } = req.query

      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'MISSING_USERNAME'
        })
        return
      }

      // Find the user by username
      const user = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Authorization: user can only view their own recent followers
      if (req.user.id !== user.id) {
        res.status(403).json({
          success: false,
          error: 'Can only view your own recent followers',
          code: 'FORBIDDEN'
        })
        return
      }

      // Parse limit parameter only if valid
      let parsedLimit = 10 // default
      if (limit) {
        const limitValue = parseInt(limit as string)
        if (!isNaN(limitValue) && limitValue > 0) {
          parsedLimit = Math.min(50, limitValue)
        }
      }

      // Get recent followers from service
      const result = await this.followService.getRecentFollowers(user.id, parsedLimit)

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data
        })
      } else {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        })
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get recent followers',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Map service error codes to HTTP status codes
   * Explicit mapping for each error code to fix test failures
   */
  private mapErrorCodeToStatus(code?: string): number {
    // Handle undefined/null cases first
    if (!code) {
      return 500
    }

    // Explicit mapping for each error code
    if (code === 'VALIDATION_ERROR') return 400
    if (code === 'AUTHENTICATION_REQUIRED') return 401
    if (code === 'FORBIDDEN') return 403
    if (code === 'USER_NOT_FOUND') return 404
    if (code === 'NOT_FOLLOWING') return 404
    if (code === 'FOLLOWER_NOT_FOUND') return 404
    if (code === 'TARGET_NOT_FOUND') return 404
    if (code === 'NO_FOLLOWER_IDENTITY') return 409
    if (code === 'ALREADY_FOLLOWING') return 409
    if (code === 'SELF_FOLLOW_ERROR') return 409
    if (code === 'UNKNOWN_ERROR') return 500

    // Default case for any unmapped error codes
    return 500
  }
}