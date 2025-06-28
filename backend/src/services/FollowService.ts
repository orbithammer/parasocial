// backend/src/services/FollowService.ts
// Business logic service for follow/unfollow operations with validation and error handling

import { z } from 'zod'
import { FollowRepository } from '../repositories/FollowRepository'
import { UserRepository } from '../repositories/UserRepository'

/**
 * Validation result interface
 */
interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: z.ZodError
}

/**
 * Follow request data interface
 */
interface FollowRequestData {
  followerId: string
  followedId: string
  actorId?: string | null
}

/**
 * Unfollow request data interface  
 */
interface UnfollowRequestData {
  followerId: string
  followedId: string
}

/**
 * Pagination options interface
 */
interface PaginationOptions {
  offset?: number
  limit?: number
}

/**
 * Follow service result interface
 */
interface FollowServiceResult<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

/**
 * Follow statistics interface
 */
interface FollowStats {
  followerCount: number
  followingCount: number
}

/**
 * Follow relationship interface
 * Matches the actual Prisma return type from FollowRepository
 */
interface FollowRelationship {
  id: string
  followerId: string
  followedId: string
  actorId: string | null
  isAccepted: boolean
  createdAt: Date
  followed: {
    id: string
    username: string
    displayName: string | null  // Fixed: displayName can be null in database
    avatar: string | null
    isVerified: boolean
  }
}

/**
 * FollowService class
 * Handles business logic for follow/unfollow operations including validation,
 * rate limiting, and coordination between repositories
 */
export class FollowService {
  // Validation schemas using Zod
  private readonly followRequestSchema = z.object({
    followerId: z.string()
      .min(1, 'Follower ID is required')
      .max(255, 'Follower ID too long'),
    followedId: z.string()
      .min(1, 'Followed user ID is required')
      .max(255, 'Followed user ID too long'),
    actorId: z.string()
      .url('Actor ID must be a valid URL')
      .optional()
      .nullable()
  })

  private readonly unfollowRequestSchema = z.object({
    followerId: z.string()
      .min(1, 'Follower ID is required')
      .max(255, 'Follower ID too long'),
    followedId: z.string()
      .min(1, 'Followed user ID is required')  
      .max(255, 'Followed user ID too long')
  })

  private readonly paginationSchema = z.object({
    offset: z.number()
      .int('Offset must be an integer')
      .min(0, 'Offset must be non-negative')
      .optional(),
    limit: z.number()
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .optional()
  })

  constructor(
    private followRepository: FollowRepository,
    private userRepository: UserRepository
  ) {}

  /**
   * Create a follow relationship with comprehensive validation
   * @param requestData - Follow request data
   * @returns Promise<FollowServiceResult<FollowRelationship>>
   */
  async followUser(requestData: FollowRequestData): Promise<FollowServiceResult<FollowRelationship>> {
    try {
      // Validate input data
      const validation = this.validateFollowRequest(requestData)
      if (!validation.success) {
        return {
          success: false,
          error: 'Invalid follow request data',
          code: 'VALIDATION_ERROR'
        }
      }

      const { followerId, followedId, actorId } = validation.data!

      // Business rule: Users cannot follow themselves
      if (followerId === followedId) {
        return {
          success: false,
          error: 'Users cannot follow themselves',
          code: 'SELF_FOLLOW_ERROR'
        }
      }

      // Verify the followed user exists and is active
      const followedUser = await this.userRepository.findById(followedId)
      if (!followedUser) {
        return {
          success: false,
          error: 'User to follow not found',
          code: 'USER_NOT_FOUND'
        }
      }

      if (!followedUser.isActive) {
        return {
          success: false,
          error: 'Cannot follow inactive user',
          code: 'USER_INACTIVE'
        }
      }

      // Check if follow relationship already exists
      const existingFollow = await this.followRepository.findByFollowerAndFollowed(followerId, followedId)
      if (existingFollow) {
        return {
          success: false,
          error: 'Already following this user',
          code: 'ALREADY_FOLLOWING'
        }
      }

      // For ActivityPub follows, validate the actor ID format
      if (actorId) {
        if (!this.isValidActivityPubActor(actorId)) {
          return {
            success: false,
            error: 'Invalid ActivityPub actor ID format',
            code: 'INVALID_ACTOR_ID'
          }
        }
      }

      // Create the follow relationship
      const follow = await this.followRepository.create({
        followerId,
        followedId,
        actorId
      })

      return {
        success: true,
        data: follow
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to create follow relationship',
        code: 'INTERNAL_ERROR'
      }
    }
  }

  /**
   * Remove a follow relationship (unfollow)
   * @param requestData - Unfollow request data
   * @returns Promise<FollowServiceResult<FollowRelationship>>
   */
  async unfollowUser(requestData: UnfollowRequestData): Promise<FollowServiceResult<FollowRelationship | null>> {
    try {
      // Validate input data
      const validation = this.validateUnfollowRequest(requestData)
      if (!validation.success) {
        return {
          success: false,
          error: 'Invalid unfollow request data',
          code: 'VALIDATION_ERROR'
        }
      }

      const { followerId, followedId } = validation.data!

      // Check if follow relationship exists
      const existingFollow = await this.followRepository.findByFollowerAndFollowed(followerId, followedId)
      if (!existingFollow) {
        return {
          success: false,
          error: 'Follow relationship does not exist',
          code: 'NOT_FOLLOWING'
        }
      }

      // Delete the follow relationship
      const deletedFollow = await this.followRepository.deleteByFollowerAndFollowed(followerId, followedId)

      return {
        success: true,
        data: deletedFollow
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to remove follow relationship',
        code: 'INTERNAL_ERROR'
      }
    }
  }

  /**
   * Get followers for a user with pagination
   * @param userId - User ID to get followers for
   * @param paginationOptions - Pagination options
   * @returns Promise<FollowServiceResult>
   */
  async getFollowers(userId: string, paginationOptions: PaginationOptions = {}): Promise<FollowServiceResult> {
    try {
      // Validate user ID
      if (!userId || typeof userId !== 'string') {
        return {
          success: false,
          error: 'Valid user ID is required',
          code: 'INVALID_USER_ID'
        }
      }

      // Validate pagination options
      const paginationValidation = this.validatePaginationOptions(paginationOptions)
      if (!paginationValidation.success) {
        return {
          success: false,
          error: 'Invalid pagination options',
          code: 'VALIDATION_ERROR'
        }
      }

      // Verify user exists
      const user = await this.userRepository.findById(userId)
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      }

      // Get followers with pagination
      const result = await this.followRepository.findFollowersByUserId(userId, paginationValidation.data)

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve followers',
        code: 'INTERNAL_ERROR'
      }
    }
  }

  /**
   * Get users that a specific user is following
   * @param userId - User ID to get following list for
   * @param paginationOptions - Pagination options
   * @returns Promise<FollowServiceResult>
   */
  async getFollowing(userId: string, paginationOptions: PaginationOptions = {}): Promise<FollowServiceResult> {
    try {
      // Validate user ID
      if (!userId || typeof userId !== 'string') {
        return {
          success: false,
          error: 'Valid user ID is required',
          code: 'INVALID_USER_ID'
        }
      }

      // Validate pagination options
      const paginationValidation = this.validatePaginationOptions(paginationOptions)
      if (!paginationValidation.success) {
        return {
          success: false,
          error: 'Invalid pagination options',
          code: 'VALIDATION_ERROR'
        }
      }

      // Get following list with pagination
      const result = await this.followRepository.findFollowingByUserId(userId, paginationValidation.data)

      return {
        success: true,
        data: result
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve following list',
        code: 'INTERNAL_ERROR'
      }
    }
  }

  /**
   * Get follow statistics for a user
   * @param userId - User ID to get stats for
   * @returns Promise<FollowServiceResult<FollowStats>>
   */
  async getFollowStats(userId: string): Promise<FollowServiceResult<FollowStats>> {
    try {
      // Validate user ID
      if (!userId || typeof userId !== 'string') {
        return {
          success: false,
          error: 'Valid user ID is required',
          code: 'INVALID_USER_ID'
        }
      }

      // Verify user exists
      const user = await this.userRepository.findById(userId)
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        }
      }

      // Get follow statistics
      const stats = await this.followRepository.getFollowStats(userId)

      return {
        success: true,
        data: stats
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve follow statistics',
        code: 'INTERNAL_ERROR'
      }
    }
  }

  /**
   * Check if one user follows another
   * @param followerId - Follower ID or actor ID
   * @param followedId - Followed user ID
   * @returns Promise<FollowServiceResult<boolean>>
   */
  async checkFollowStatus(followerId: string, followedId: string): Promise<FollowServiceResult<boolean>> {
    try {
      // Validate input
      if (!followerId || !followedId || typeof followerId !== 'string' || typeof followedId !== 'string') {
        return {
          success: false,
          error: 'Valid follower and followed user IDs are required',
          code: 'INVALID_PARAMETERS'
        }
      }

      // Check follow status
      const isFollowing = await this.followRepository.isFollowing(followerId, followedId)

      return {
        success: true,
        data: isFollowing
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to check follow status',
        code: 'INTERNAL_ERROR'
      }
    }
  }

  /**
   * Bulk check follow status for multiple users (for efficient UI updates)
   * @param followerId - Follower ID or actor ID
   * @param userIds - Array of user IDs to check
   * @returns Promise<FollowServiceResult<Record<string, boolean>>>
   */
  async bulkCheckFollowing(followerId: string, userIds: string[]): Promise<FollowServiceResult<Record<string, boolean>>> {
    try {
      // Validate input
      if (!followerId || typeof followerId !== 'string') {
        return {
          success: false,
          error: 'Valid follower ID is required',
          code: 'INVALID_FOLLOWER_ID'
        }
      }

      if (!Array.isArray(userIds)) {
        return {
          success: false,
          error: 'User IDs must be an array',
          code: 'INVALID_USER_IDS'
        }
      }

      // Limit bulk check size for performance
      if (userIds.length > 100) {
        return {
          success: false,
          error: 'Cannot check more than 100 users at once',
          code: 'TOO_MANY_USERS'
        }
      }

      // Validate all user IDs are strings
      const invalidIds = userIds.filter(id => !id || typeof id !== 'string')
      if (invalidIds.length > 0) {
        return {
          success: false,
          error: 'All user IDs must be valid strings',
          code: 'INVALID_USER_IDS'
        }
      }

      // Perform bulk check
      const followMap = await this.followRepository.bulkCheckFollowing(followerId, userIds)

      return {
        success: true,
        data: followMap
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to perform bulk follow check',
        code: 'INTERNAL_ERROR'
      }
    }
  }

  /**
   * Get recent followers for notifications
   * @param userId - User ID to get recent followers for
   * @param limit - Number of recent followers to return (default: 10, max: 50)
   * @returns Promise<FollowServiceResult>
   */
  async getRecentFollowers(userId: string, limit: number = 10): Promise<FollowServiceResult> {
    try {
      // Validate user ID
      if (!userId || typeof userId !== 'string') {
        return {
          success: false,
          error: 'Valid user ID is required',
          code: 'INVALID_USER_ID'
        }
      }

      // Validate and constrain limit
      const validLimit = Math.max(1, Math.min(50, Math.floor(limit)))

      // Get recent followers
      const recentFollowers = await this.followRepository.findRecentFollowers(userId, validLimit)

      return {
        success: true,
        data: recentFollowers
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to retrieve recent followers',
        code: 'INTERNAL_ERROR'
      }
    }
  }

  /**
   * Validate follow request data
   * @param data - Data to validate
   * @returns ValidationResult<FollowRequestData>
   */
  private validateFollowRequest(data: unknown): ValidationResult<FollowRequestData> {
    try {
      const validatedData = this.followRequestSchema.parse(data)
      return {
        success: true,
        data: validatedData
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof z.ZodError ? error : undefined
      }
    }
  }

  /**
   * Validate unfollow request data
   * @param data - Data to validate
   * @returns ValidationResult<UnfollowRequestData>
   */
  private validateUnfollowRequest(data: unknown): ValidationResult<UnfollowRequestData> {
    try {
      const validatedData = this.unfollowRequestSchema.parse(data)
      return {
        success: true,
        data: validatedData
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof z.ZodError ? error : undefined
      }
    }
  }

  /**
   * Validate pagination options
   * @param data - Data to validate
   * @returns ValidationResult<PaginationOptions>
   */
  private validatePaginationOptions(data: unknown): ValidationResult<PaginationOptions> {
    try {
      const validatedData = this.paginationSchema.parse(data)
      return {
        success: true,
        data: validatedData
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof z.ZodError ? error : undefined
      }
    }
  }

  /**
   * Validate ActivityPub actor ID format
   * @param actorId - Actor ID to validate
   * @returns boolean - True if valid ActivityPub actor format
   */
  private isValidActivityPubActor(actorId: string): boolean {
    try {
      const url = new URL(actorId)
      
      // Must be HTTPS for security
      if (url.protocol !== 'https:') {
        return false
      }

      // Must have a proper domain
      if (!url.hostname || url.hostname.length < 3) {
        return false
      }

      // Must have a path (ActivityPub actors have paths like /users/username)
      if (!url.pathname || url.pathname === '/') {
        return false
      }

      return true
    } catch {
      return false
    }
  }
}