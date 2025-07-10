// backend/src/controllers/FollowController.ts
// Version 2.3 - Removed "any" types and added proper TypeScript typing
// Changed: Fixed followerId type handling, added proper service interfaces, removed all "any" casts

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

// Define specific response types for better type safety
interface FollowersResponse {
  followers: Array<{
    id: string
    followerId: string
    followedId: string
    createdAt: Date
    followed: {
      id: string
      username: string
      displayName: string | null
      avatar: string | null
      isVerified: boolean
    }
  }>
  totalCount: number
  hasMore: boolean
}

interface FollowStatsResponse {
  followerCount: number
  followingCount: number
}

interface BulkFollowStatusResponse {
  [userId: string]: boolean
}

interface RecentFollowersResponse {
  id: string
  followerId: string
  followedId: string
  createdAt: Date
  followed: {
    id: string
    username: string
    displayName: string | null
    avatar: string | null
    isVerified: boolean
  }
}[]

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

      // Success response
      res.status(200).json({
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
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Validate authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
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

      // Use FollowService to remove the follow relationship
      const result: ServiceResponse = await this.followService.unfollowUser({
        followerId: req.user.id,
        followedId: userToUnfollow.id
      })

      if (!result.success) {
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
   * Get user's followers
   * GET /users/:username/followers
   */
  async getUserFollowers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string }

      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Parse pagination parameters with validation
      const pageNum = parseInt(page, 10)
      const limitNum = parseInt(limit, 10)

      if (isNaN(pageNum) || pageNum < 1) {
        res.status(400).json({
          success: false,
          error: 'Invalid page parameter',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          success: false,
          error: 'Invalid limit parameter (1-100)',
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

      // Convert page-based pagination to offset-based for service
      const offset = (pageNum - 1) * limitNum
      const paginationOptions = {
        offset,
        limit: limitNum
      }

      const result: ServiceResponse<FollowersResponse> = await this.followService.getFollowers(user.id, paginationOptions)

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
        details: errorMessage,
        code: 'INTERNAL_ERROR'
      })
    }
  }

  /**
   * Get users that this user is following
   * GET /users/:username/following
   */
  async getUserFollowing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string }

      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      const pageNum = parseInt(page, 10)
      const limitNum = parseInt(limit, 10)

      if (isNaN(pageNum) || pageNum < 1) {
        res.status(400).json({
          success: false,
          error: 'Invalid page parameter',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        res.status(400).json({
          success: false,
          error: 'Invalid limit parameter (1-100)',
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

      // Convert page-based pagination to offset-based for service
      const offset = (pageNum - 1) * limitNum
      const paginationOptions = {
        offset,
        limit: limitNum
      }

      const result: ServiceResponse<FollowersResponse> = await this.followService.getFollowing(user.id, paginationOptions)

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

      // Find both users by username to get their IDs
      const [followerUser, followedUser] = await Promise.all([
        this.userRepository.findByUsername(follower),
        this.userRepository.findByUsername(username)
      ])

      if (!followerUser) {
        res.status(404).json({
          success: false,
          error: 'Follower user not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      if (!followedUser) {
        res.status(404).json({
          success: false,
          error: 'Followed user not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      const result: ServiceResponse<boolean> = await this.followService.checkFollowStatus(followerUser.id, followedUser.id)

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
   * Bulk check follow status for multiple users
   * POST /follows/check-bulk (via route adapter)
   */
  async bulkCheckFollowing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { usernames } = req.body as { usernames?: string[] }

      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      if (!Array.isArray(usernames) || usernames.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Array of usernames is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Validate that all usernames are strings
      const invalidUsernames = usernames.filter(u => typeof u !== 'string')
      if (invalidUsernames.length > 0) {
        res.status(400).json({
          success: false,
          error: 'All usernames must be strings',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Find the follower user by username
      const followerUser: User | null = await this.userRepository.findByUsername(username)
      if (!followerUser) {
        res.status(404).json({
          success: false,
          error: 'Follower user not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Find all the target users by username and get their IDs
      const targetUsers = await Promise.all(
        usernames.map(async (targetUsername) => {
          const user = await this.userRepository.findByUsername(targetUsername)
          return { username: targetUsername, user }
        })
      )

      // Filter out users that weren't found and get just the IDs
      const validTargetUsers = targetUsers.filter(({ user }) => user !== null)
      const userIds = validTargetUsers.map(({ user }) => user!.id)

      // Call service with user IDs
      const result: ServiceResponse<BulkFollowStatusResponse> = await this.followService.bulkCheckFollowing(followerUser.id, userIds)

      if (!result.success) {
        const statusCode = this.mapErrorCodeToStatus(result.code)
        res.status(statusCode).json({
          success: false,
          error: result.error || 'Failed to check follow status',
          code: result.code
        })
        return
      }

      // Convert the result back to username-based format for consistency
      const usernameBasedResult: Record<string, boolean> = {}
      if (result.data) {
        // Now result.data is properly typed as BulkFollowStatusResponse
        validTargetUsers.forEach(({ username: targetUsername, user }) => {
          if (user) {
            // Use nullish coalescing to handle undefined values safely
            usernameBasedResult[targetUsername] = result.data![user.id] ?? false
          }
        })

        // Add false entries for users that weren't found
        usernames.forEach(targetUsername => {
          if (!(targetUsername in usernameBasedResult)) {
            usernameBasedResult[targetUsername] = false
          }
        })
      }

      res.status(200).json({
        success: true,
        data: usernameBasedResult
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
   * Get recent followers for a user
   * GET /follows/recent/:username (via route adapter)
   */
  async getRecentFollowers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { limit = '10' } = req.query as { limit?: string }

      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Require authentication for recent followers
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        })
        return
      }

      // Users can only view their own recent followers
      if (req.user.username !== username) {
        res.status(403).json({
          success: false,
          error: 'Can only view your own recent followers',
          code: 'FORBIDDEN'
        })
        return
      }

      const limitNum = parseInt(limit, 10)
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
        res.status(400).json({
          success: false,
          error: 'Invalid limit parameter (1-50)',
          code: 'VALIDATION_ERROR'
        })
        return
      }

      // Call service with user ID and limit (service expects userId, limit)
      const result: ServiceResponse<RecentFollowersResponse> = await this.followService.getRecentFollowers(req.user.id, limitNum)

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