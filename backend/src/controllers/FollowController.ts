// backend/src/controllers/FollowController.ts
// Fixed FollowController with completed actorId logic

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
      // FIXED: Complete the ternary operator for actorId
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

      // Parse and validate pagination parameters only if provided
      const paginationOptions: any = {}
      
      if (offset !== undefined) {
        paginationOptions.offset = Math.max(0, parseInt(offset as string) || 0)
      }
      
      if (limit !== undefined) {
        paginationOptions.limit = Math.min(100, Math.max(1, parseInt(limit as string) || 20))
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
   * Map service error codes to HTTP status codes
   * Rewritten to be more explicit and fix test failures
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
    if (code === 'NO_FOLLOWER_IDENTITY') return 409
    if (code === 'ALREADY_FOLLOWING') return 409
    if (code === 'SELF_FOLLOW_ERROR') return 409
    if (code === 'UNKNOWN_ERROR') return 500

    // Default case for any unmapped error codes
    return 500
  }
}