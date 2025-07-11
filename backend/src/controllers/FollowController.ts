// backend/src/controllers/FollowController.ts
// Version: 1.12.0
// Fixed response formats, method signatures, ActivityPub logic, and added getUserFollowing method

import { Request, Response } from 'express'
import { FollowService } from '../services/FollowService'
import { UserRepository } from '../repositories/UserRepository'
import { User } from '../models/User'

// Extend Express Request to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

// Define interface that matches FollowService expectations (non-nullable followerId)
interface FollowRequestData {
  followerId: string // Must be non-nullable for FollowService
  followedId: string
  actorId?: string | null
}

// Define the unfollow request interface that matches what FollowService expects
interface UnfollowRequestData {
  followerId: string
  followedId: string
}

// Define the service response interface
interface ServiceResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

// Define specific response types for better type safety
interface FollowStatsResponse {
  followerCount: number
  followingCount: number
}

export class FollowController {
  constructor(
    private followService: FollowService,
    private userRepository: UserRepository
  ) {}

  /**
   * Follow a user
   * POST /users/:username/follow
   */
  async followUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params as { username: string }
      const { actorId } = req.body as { actorId?: string }

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
      const userToFollow: User | null = await this.userRepository.findByUsername(username)
      if (!userToFollow) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Handle external ActivityPub follow support
      if (!req.user) {
        if (actorId) {
          // For ActivityPub external follows - use actorId as followerId for service compatibility
          const followRequest: FollowRequestData = {
            followerId: actorId, // Use actorId as followerId for external actors
            followedId: userToFollow.id,
            actorId
          }

          const result: ServiceResponse = await this.followService.followUser(followRequest)

          if (!result.success) {
            const statusCode = this.mapErrorCodeToStatus(result.code)
            res.status(statusCode).json({
              success: false,
              error: result.error || 'Failed to follow user',
              code: result.code
            })
            return
          }

          // Success response - wrap data in 'follow' property to match tests
          res.status(201).json({
            success: true,
            data: {
              follow: result.data
            }
          })
          return

        } else {
          // No authentication and no actorId provided
          res.status(409).json({
            success: false,
            error: 'Authentication required or ActivityPub actor ID must be provided',
            code: 'NO_FOLLOWER_IDENTITY'
          })
          return
        }
      }

      // For authenticated users - Normal local follow
      const followRequest: FollowRequestData = {
        followerId: req.user.id,
        followedId: userToFollow.id,
        actorId: actorId || null
      }

      const result: ServiceResponse = await this.followService.followUser(followRequest)

      if (!result.success) {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Failed to follow user',
          code: result.code
        })
        return
      }

      // Success response for authenticated follow - wrap data in 'follow' property to match tests
      res.status(201).json({
        success: true,
        data: {
          follow: result.data
        }
      })

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      // Match test expectations for exception handling
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: errorMessage
      })
    }
  }

  /**
   * Unfollow a user
   * DELETE /users/:username/follow
   */
  async unfollowUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params as { username: string }

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Check authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      // Find the user to unfollow
      const userToUnfollow: User | null = await this.userRepository.findByUsername(username)
      if (!userToUnfollow) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      const unfollowRequest: UnfollowRequestData = {
        followerId: req.user.id,
        followedId: userToUnfollow.id
      }

      const result: ServiceResponse = await this.followService.unfollowUser(unfollowRequest)

      if (!result.success) {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Failed to unfollow user',
          code: result.code
        })
        return
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Successfully unfollowed user'
        }
      })

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: errorMessage
      })
    }
  }

  /**
   * Get user's followers
   * GET /users/:username/followers
   */
  async getUserFollowers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params as { username: string }
      const page = parseInt((req.query['page'] as string) || '1') || 1
      const limit = Math.min(parseInt((req.query['limit'] as string) || '10') || 10, 50)

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Find the user
      const user: User | null = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      const paginationOptions = {
        offset: (page - 1) * limit,
        limit
      }

      const result: ServiceResponse = await this.followService.getFollowers(user.id, paginationOptions)

      if (!result.success) {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Failed to get followers',
          code: result.code
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data
      })

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: errorMessage
      })
    }
  }

  /**
   * Get user's following list
   * GET /users/:username/following
   */
  async getUserFollowing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params as { username: string }
      const page = parseInt((req.query['page'] as string) || '1') || 1
      const limit = Math.min(parseInt((req.query['limit'] as string) || '10') || 10, 50)

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Find the user
      const user: User | null = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      const paginationOptions = {
        offset: (page - 1) * limit,
        limit
      }

      const result: ServiceResponse = await this.followService.getFollowing(user.id, paginationOptions)

      if (!result.success) {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Failed to get following list',
          code: result.code
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data
      })

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: errorMessage
      })
    }
  }

  /**
   * Get user's follow stats
   * GET /users/:username/stats
   */
  async getUserFollowStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params as { username: string }

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Find the user
      const user: User | null = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      const result: ServiceResponse<FollowStatsResponse> = await this.followService.getFollowStats(user.id)

      if (!result.success) {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Failed to get follow stats',
          code: result.code
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data
      })

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: errorMessage
      })
    }
  }

  /**
   * Check follow status between users
   * GET /users/:username/follow-status
   */
  async checkFollowStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params as { username: string }

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Check authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      // Find the target user
      const targetUser: User | null = await this.userRepository.findByUsername(username)
      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      const result: ServiceResponse = await this.followService.checkFollowStatus(
        req.user.id,
        targetUser.id
      )

      if (!result.success) {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Failed to check follow status',
          code: result.code
        })
        return
      }

      // Return the result directly to match test expectations
      res.status(200).json({
        success: true,
        data: result.data
      })

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: errorMessage
      })
    }
  }

  /**
   * Bulk check following status for multiple users
   * POST /users/bulk-check-following
   */
  async bulkCheckFollowing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userIds } = req.body as { userIds: string[] }

      // Check authentication first
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      // Validate userIds array
      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'userIds must be an array',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      const result: ServiceResponse = await this.followService.bulkCheckFollowing(
        req.user.id,
        userIds
      )

      if (!result.success) {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Failed to bulk check following',
          code: result.code
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data
      })

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: errorMessage
      })
    }
  }

  /**
   * Get recent followers for authenticated user
   * GET /users/recent-followers
   */
  async getRecentFollowers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params as { username?: string }
      const limit = Math.min(parseInt((req.query['limit'] as string) || '10') || 10, 50)

      // Check authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        })
        return
      }

      // If username is provided and it's not the current user, return 403
      if (username && username !== req.user.username) {
        res.status(403).json({
          success: false,
          error: 'Can only view your own recent followers',
          code: 'FORBIDDEN'
        })
        return
      }

      const result: ServiceResponse = await this.followService.getRecentFollowers(req.user.id, limit)

      if (!result.success) {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Failed to get recent followers',
          code: result.code
        })
        return
      }

      res.status(200).json({
        success: true,
        data: result.data
      })

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: errorMessage
      })
    }
  }

  /**
   * Map error codes to HTTP status codes
   */
  private mapErrorCodeToStatus(code?: string): number {
    switch (code) {
      case 'VALIDATION_ERROR':
        return 400
      case 'AUTHENTICATION_REQUIRED':
        return 401
      case 'FORBIDDEN':
        return 403
      case 'USER_NOT_FOUND':
      case 'NOT_FOLLOWING':
        return 404
      case 'NO_FOLLOWER_IDENTITY':
      case 'ALREADY_FOLLOWING':
      case 'SELF_FOLLOW_ERROR':
        return 409
      case 'INTERNAL_ERROR':
      default:
        return 500
    }
  }
}