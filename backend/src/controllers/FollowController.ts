// backend/src/controllers/FollowController.ts
// Version 2.2 - Fixed error code consistency (MISSING_USERNAME -> VALIDATION_ERROR)
// Changed: Standardized validation error codes to match test expectations

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
          code: 'VALIDATION_ERROR'
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
      let followerId: string | null
      let isExternalFollow = false

      if (req.user) {
        // Authenticated ParaSocial user
        followerId = req.user.id
      } else if (actorId) {
        // External ActivityPub follow - followerId is null for external actors
        followerId = null
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
        followerId: followerId as any, // External follows pass null, service interface needs updating
        followedId: userToFollow.id,
        actorId: isExternalFollow ? actorId : null
      })

      if (result.success) {
        res.status(201).json({
          success: true,
          data: {
            follow: result.data
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

      // Check authentication
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
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Find the user to unfollow
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
        error: 'Failed to unfollow user',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get followers of a user
   * GET /users/:username/followers
   * Public endpoint with pagination
   */
  async getUserFollowers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { page, limit } = req.query

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
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

      // Parse pagination parameters with defaults
      const paginationOptions = {
        page: 1,
        limit: 20
      }
      
      if (page !== undefined) {
        const parsedPage = parseInt(page as string)
        if (!isNaN(parsedPage) && parsedPage > 0) {
          paginationOptions.page = parsedPage
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
      const { page, limit } = req.query

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
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

      // Parse pagination parameters with defaults
      const paginationOptions = {
        page: 1,
        limit: 20
      }
      
      if (page !== undefined) {
        const parsedPage = parseInt(page as string)
        if (!isNaN(parsedPage) && parsedPage > 0) {
          paginationOptions.page = parsedPage
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
          code: 'VALIDATION_ERROR'
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
   * Check follow status between authenticated user and target user
   * GET /users/:username/follow-status
   * Requires authentication
   */
  async checkFollowStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params

      // Check authentication first
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
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Find the target user
      const targetUser = await this.userRepository.findByUsername(username)
      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Check follow status between authenticated user and target user
      const result = await this.followService.checkFollowStatus(req.user.id, targetUser.id)

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
        error: 'Failed to check follow status',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Bulk check following status for multiple users
   * POST /users/bulk-check-following
   * Requires authentication
   */
  async bulkCheckFollowing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userIds } = req.body

      // Check authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      // Validate userIds parameter
      if (!Array.isArray(userIds)) {
        res.status(400).json({
          success: false,
          error: 'userIds must be an array',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Use FollowService to perform bulk check
      const result = await this.followService.bulkCheckFollowing(req.user.id, userIds)

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
   * Get recent followers for the authenticated user
   * GET /users/recent-followers
   * Requires authentication
   */
  async getRecentFollowers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      const { limit } = req.query

      // Parse limit parameter
      let parsedLimit = 10 // Default limit
      if (limit !== undefined) {
        const tempLimit = parseInt(limit as string)
        if (!isNaN(tempLimit) && tempLimit > 0) {
          parsedLimit = Math.min(50, tempLimit) // Max limit of 50
        }
      }

      // Get recent followers from service
      const result = await this.followService.getRecentFollowers(req.user.id, parsedLimit)

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