// backend/src/controllers/UserController.ts
// Version: 1.0.5 - Removed unused mapErrorCodeToStatus method
// Changed: Eliminated unused private method that was never called

import { Request, Response } from 'express'
import { UserRepository } from '../repositories/UserRepository'
import { FollowRepository } from '../repositories/FollowRepository'
import { BlockRepository } from '../repositories/BlockRepository'
import { User, PublicProfile } from '../models/User'

// Extend Express Request to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

// Define relationship context interface
interface RelationshipContext {
  isBlocked: boolean
  hasBlocked: boolean
  isOwnProfile: boolean
}

// Define extended profile response that includes relationship context
interface UserProfileResponse {
  user: PublicProfile
  relationshipContext?: RelationshipContext
}

/**
 * UserController handles user profile operations and user management
 * Includes profile retrieval, blocking/unblocking functionality
 */
export class UserController {
  constructor(
    private userRepository: UserRepository,
    private followRepository: FollowRepository,
    private blockRepository: BlockRepository
  ) {}

  /**
   * Get user profile by username
   * GET /users/:username
   * Public endpoint with optional authentication for additional data
   */
  async getUserProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params as { username: string }
      const currentUserId = req.user?.id

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
      const user: User | null = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Get user's public profile
      const profileData = user.getPublicProfile()

      // Prepare the response structure
      const response: UserProfileResponse = {
        user: profileData
      }

      // If requesting user is authenticated, check for additional context
      if (currentUserId) {
        try {
          // Check if current user is blocked by target user
          const isBlocked = await this.blockRepository.isBlocked(user.id, currentUserId)
          
          // Check if current user has blocked target user
          const hasBlocked = await this.blockRepository.isBlocked(currentUserId, user.id)

          // Add relationship context to response
          response.relationshipContext = {
            isBlocked,
            hasBlocked,
            isOwnProfile: currentUserId === user.id
          }
        } catch (contextError) {
          // Don't fail the request if relationship context fails
          console.warn('Failed to get relationship context:', contextError)
        }
      }

      res.status(200).json({
        success: true,
        data: response
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
   * Block a user
   * POST /users/:username/block
   * Requires authentication
   */
  async blockUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params as { username: string }
      const currentUserId = req.user?.id

      // Validate authentication
      if (!currentUserId) {
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

      // Find the user to block
      const targetUser: User | null = await this.userRepository.findByUsername(username)
      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Prevent self-blocking
      if (targetUser.id === currentUserId) {
        res.status(400).json({
          success: false,
          error: 'Cannot block yourself',
          code: 'SELF_BLOCK_ERROR'
        })
        return
      }

      // Check if already blocked
      const isAlreadyBlocked = await this.blockRepository.isBlocked(currentUserId, targetUser.id)
      if (isAlreadyBlocked) {
        res.status(409).json({
          success: false,
          error: 'User is already blocked',
          code: 'ALREADY_BLOCKED'
        })
        return
      }

      // Create the block relationship
      await this.blockRepository.create({
        blockerId: currentUserId,
        blockedId: targetUser.id
      })

      // Remove any existing follow relationships
      try {
        await this.followRepository.deleteByFollowerAndFollowed(currentUserId, targetUser.id)
        await this.followRepository.deleteByFollowerAndFollowed(targetUser.id, currentUserId)
      } catch (unfollowError) {
        // Don't fail the block if unfollow fails
        console.warn('Failed to remove follow relationships during block:', unfollowError)
      }

      res.status(200).json({
        success: true,
        message: `Successfully blocked ${targetUser.username}`,
        data: {
          blockedUser: {
            id: targetUser.id,
            username: targetUser.username,
            displayName: targetUser.displayName
          }
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
   * Unblock a user
   * DELETE /users/:username/block
   * Requires authentication
   */
  async unblockUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params as { username: string }
      const currentUserId = req.user?.id

      // Validate authentication
      if (!currentUserId) {
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

      // Find the user to unblock
      const targetUser: User | null = await this.userRepository.findByUsername(username)
      if (!targetUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        })
        return
      }

      // Check if currently blocked
      const isBlocked = await this.blockRepository.isBlocked(currentUserId, targetUser.id)
      if (!isBlocked) {
        res.status(409).json({
          success: false,
          error: 'User is not currently blocked',
          code: 'NOT_BLOCKED'
        })
        return
      }

      // Remove the block relationship
      await this.blockRepository.deleteByBlockerAndBlocked(currentUserId, targetUser.id)

      res.status(200).json({
        success: true,
        message: `Successfully unblocked ${targetUser.username}`,
        data: {
          unblockedUser: {
            id: targetUser.id,
            username: targetUser.username,
            displayName: targetUser.displayName
          }
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
}