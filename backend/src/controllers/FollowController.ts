// backend/src/controllers/FollowController.ts
// v1.2 - Fixed followUser success status code from 200 to 201 to match test expectations
// Changed: Removed types/index import, defined all types locally, fixed User import

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

// Define the follow request interface that matches what FollowService expects
interface FollowRequestData {
  followerId: string  // Service requires non-null followerId
  followedId: string
  actorId?: string
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

// Define pagination parameters
interface PaginationParams {
  offset: number
  limit: number
}

// Define specific response types for better type safety
interface FollowStatsResponse {
  followerCount: number
  followingCount: number
}

interface FollowStatusResponse {
  isFollowing: boolean
  isRequested?: boolean
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

      // Determine follower ID - currently only supports authenticated users
      // TODO: Implement external ActivityPub follow support
      if (!req.user) {
        if (actorId) {
          // External ActivityPub follows not yet implemented
          res.status(501).json({
            success: false,
            error: 'External ActivityPub follows not yet implemented',
            code: 'NOT_IMPLEMENTED'
          })
          return
        } else {
          res.status(401).json({
            success: false,
            error: 'Authentication required',
            code: 'UNAUTHORIZED'
          })
          return
        }
      }

      // Prepare properly typed request for FollowService (authenticated users only)
      const followRequest: FollowRequestData = {
        followerId: req.user.id,
        followedId: userToFollow.id,
        // Only include actorId if provided for future ActivityPub integration
        ...(actorId && { actorId })
      }

      // Use FollowService to create the follow relationship
      const result: ServiceResponse = await this.followService.followUser(followRequest)

      if (!result.success) {
        // Map service error codes to HTTP status codes
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Follow operation failed',
          code: result.code
        })
        return
      }

      // Success response - Changed from 200 to 201 to indicate resource creation
      res.status(201).json({
        success: true,
        data: result.data,
        message: 'Successfully followed user'
      })

    } catch (error: unknown) {
      // Handle unexpected errors with proper typing
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: errorMessage,
        code: 'INTERNAL_ERROR'
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

      // Validate authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
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

      // Find the user to unfollow by username
      const userToUnfollow: User | null = await this.userRepository.findByUsername(username)
      if (!userToUnfollow) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Use FollowService to remove the follow relationship
      const result: ServiceResponse = await this.followService.unfollowUser({
        followerId: req.user.id,
        followedId: userToUnfollow.id
      })

      if (!result.success) {
        // Map service error codes to HTTP status codes
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Unfollow operation failed',
          code: result.code
        })
        return
      }

      // Success response
      res.status(200).json({
        success: true,
        data: result.data,
        message: 'Successfully unfollowed user'
      })

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: errorMessage,
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Get a user's followers with pagination
   * GET /users/:username/followers
   */
  async getUserFollowers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params as { username: string }
      const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string }

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Find the user by username to get their ID
      const user: User | null = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Parse and validate pagination parameters
      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))

      const pagination: PaginationParams = {
        offset: (pageNum - 1) * limitNum,
        limit: limitNum
      }

      const result: ServiceResponse = await this.followService.getFollowers(user.id, pagination)

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
        data: {
          isFollowing: result.data
        }
      })

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: errorMessage,
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Get user's follow statistics
   * GET /users/:username/stats
   */
  async getUserFollowStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params

      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Find the user by username to get their ID
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
          error: result.error || 'Failed to get follow statistics',
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
        details: errorMessage,
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Check follow status between users
   * GET /users/:username/follow-status
   */
  async checkFollowStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { follower } = req.query as { follower?: string }

      // Validate required parameters
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      if (!follower || typeof follower !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Follower username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Find both users
      const [targetUser, followerUser] = await Promise.all([
        this.userRepository.findByUsername(username),
        this.userRepository.findByUsername(follower)
      ])

      if (!targetUser) {
        res.status(400).json({
          success: false,
          error: 'Target user not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      if (!followerUser) {
        res.status(400).json({
          success: false,
          error: 'Follower user not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      const result: ServiceResponse<boolean> = await this.followService.checkFollowStatus(followerUser.id, targetUser.id)

      if (!result.success) {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Failed to check follow status',
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
        details: errorMessage,
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Bulk check if current user is following multiple users
   * POST /users/bulk-follow-check
   */
  async bulkCheckFollowing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { usernames } = req.body as { usernames?: string[] }

      // Validate required parameters
      if (!usernames || !Array.isArray(usernames)) {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      if (!req.user) {
        res.status(400).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        })
        return
      }

      const result: ServiceResponse = await this.followService.bulkCheckFollowing(req.user.id, usernames)

      if (!result.success) {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Failed to check follow status',
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
        details: errorMessage,
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Get recent followers for the authenticated user
   * GET /users/recent-followers
   */
  async getRecentFollowers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { limit = '10' } = req.query as { limit?: string }

      // Validate authentication
      if (!req.user) {
        res.status(400).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        })
        return
      }

      // Parse and validate limit parameter
      const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10))

      const result: ServiceResponse = await this.followService.getRecentFollowers(req.user.id, limitNum)

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
        details: errorMessage,
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Map service error codes to HTTP status codes
   * Centralizes status code mapping logic
   */
  private mapErrorCodeToStatus(code?: string): number {
    const errorCodeMap: Record<string, number> = {
      'VALIDATION_ERROR': 400,
      'MISSING_USERNAME': 400,
      'UNAUTHORIZED': 401,
      'FORBIDDEN': 403,
      'USER_NOT_FOUND': 404,
      'ALREADY_FOLLOWING': 409,
      'NOT_FOLLOWING': 409,
      'SELF_FOLLOW_ERROR': 409,
      'NO_FOLLOWER_IDENTITY': 409,
      'INTERNAL_ERROR': 500,
      'UNKNOWN_ERROR': 500
    }

    return errorCodeMap[code || 'UNKNOWN_ERROR'] || 500
  }
}