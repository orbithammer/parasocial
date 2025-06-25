// backend/src/controllers/UserController.ts
// User management controller with profile and follow operations using TypeScript

import { Request, Response } from 'express'
import { UserRepository } from '../repositories/UserRepository'
import { FollowRepository } from '../repositories/FollowRepository'
import { BlockRepository } from '../repositories/BlockRepository'

// Extend Express Request to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

/**
 * User controller class
 * Handles HTTP requests for user operations
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
   */
  async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params

      if (!username) {
        res.status(400).json({
          success: false,
          error: 'Username is required'
        })
        return
      }

      // Find user with public profile information
      const user = await this.userRepository.findByUsernameWithCounts(username)

      if (!user || !user.isActive) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        })
        return
      }

      res.json({
        success: true,
        data: user.getPublicProfile()
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Follow a user
   * POST /users/:username/follow
   */
  async followUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { actorId } = req.body

      if (!username) {
        res.status(400).json({
          success: false,
          error: 'Username is required'
        })
        return
      }

      // Find the user to follow
      const userToFollow = await this.userRepository.findByUsername(username)

      if (!userToFollow || !userToFollow.isActive) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        })
        return
      }

      // Prevent self-following
      if (req.user && req.user.id === userToFollow.id) {
        res.status(400).json({
          success: false,
          error: 'You cannot follow yourself'
        })
        return
      }

      // Determine follower ID (either authenticated user or external actor)
      const followerId = req.user?.id || actorId

      if (!followerId) {
        res.status(400).json({
          success: false,
          error: 'Follower identification required'
        })
        return
      }

      // Check if already following
      const existingFollow = await this.followRepository.findByFollowerAndFollowed(
        followerId,
        userToFollow.id
      )

      if (existingFollow) {
        res.status(409).json({
          success: false,
          error: 'Already following this user'
        })
        return
      }

      // Check if the user has blocked the follower
      if (req.user) {
        const isBlocked = await this.blockRepository.findByBlockerAndBlocked(
          userToFollow.id,
          req.user.id
        )

        if (isBlocked) {
          res.status(403).json({
            success: false,
            error: 'Cannot follow this user'
          })
          return
        }
      }

      // Create follow relationship
      const followData = {
        followerId: followerId,
        followedId: userToFollow.id,
        actorId: actorId || null
      }

      const newFollow = await this.followRepository.create(followData)

      res.status(201).json({
        success: true,
        data: {
          id: newFollow.id,
          followerId: newFollow.followerId,
          followedId: newFollow.followedId,
          actorId: newFollow.actorId,
          createdAt: newFollow.createdAt
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
   */
  async unfollowUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params

      if (!username) {
        res.status(400).json({
          success: false,
          error: 'Username is required'
        })
        return
      }

      // Find the user to unfollow
      const userToUnfollow = await this.userRepository.findByUsername(username)

      if (!userToUnfollow) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        })
        return
      }

      // Find existing follow relationship
      const existingFollow = await this.followRepository.findByFollowerAndFollowed(
        req.user!.id,
        userToUnfollow.id
      )

      if (!existingFollow) {
        res.status(404).json({
          success: false,
          error: 'You are not following this user'
        })
        return
      }

      // Delete follow relationship
      await this.followRepository.delete(existingFollow.id)

      res.json({
        success: true,
        message: 'Unfollowed successfully'
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
   * Get user's followers
   * GET /users/:username/followers
   */
  async getUserFollowers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params

      if (!username) {
        res.status(400).json({
          success: false,
          error: 'Username is required'
        })
        return
      }

      // Find user
      const user = await this.userRepository.findByUsername(username)

      if (!user || !user.isActive) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        })
        return
      }

      // Check if requesting user can view followers
      // Only the user themselves can see their full follower list
      const canViewFollowers = req.user && req.user.id === user.id

      if (!canViewFollowers) {
        res.status(403).json({
          success: false,
          error: 'You can only view your own followers'
        })
        return
      }

      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20))
      const offset = (page - 1) * limit

      // Get followers with pagination
      const result = await this.followRepository.findFollowersByUserId(user.id, {
        offset,
        limit
      })

      const totalPages = Math.ceil(result.totalCount / limit)

      res.json({
        success: true,
        data: {
          followers: result.followers,
          pagination: {
            currentPage: page,
            totalPages,
            totalPosts: result.totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch followers',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Block a follower
   * POST /users/:username/block
   */
  async blockUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const { reason } = req.body

      if (!username) {
        res.status(400).json({
          success: false,
          error: 'Username is required'
        })
        return
      }

      // Find user to block
      const userToBlock = await this.userRepository.findByUsername(username)

      if (!userToBlock || !userToBlock.isActive) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        })
        return
      }

      // Prevent self-blocking
      if (req.user!.id === userToBlock.id) {
        res.status(400).json({
          success: false,
          error: 'You cannot block yourself'
        })
        return
      }

      // Check if already blocked
      const existingBlock = await this.blockRepository.findByBlockerAndBlocked(
        req.user!.id,
        userToBlock.id
      )

      if (existingBlock) {
        res.status(409).json({
          success: false,
          error: 'User is already blocked'
        })
        return
      }

      // Create block relationship
      const blockData = {
        blockerId: req.user!.id,
        blockedId: userToBlock.id,
        reason: reason || null
      }

      const newBlock = await this.blockRepository.create(blockData)

      // Remove any existing follow relationship
      const existingFollow = await this.followRepository.findByFollowerAndFollowed(
        userToBlock.id,
        req.user!.id
      )

      if (existingFollow) {
        await this.followRepository.delete(existingFollow.id)
      }

      res.status(201).json({
        success: true,
        data: {
          id: newBlock.id,
          blockedUserId: userToBlock.id,
          reason: newBlock.reason,
          createdAt: newBlock.createdAt
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to block user',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Unblock a user
   * DELETE /users/:username/block
   */
  async unblockUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params

      if (!username) {
        res.status(400).json({
          success: false,
          error: 'Username is required'
        })
        return
      }

      // Find user to unblock
      const userToUnblock = await this.userRepository.findByUsername(username)

      if (!userToUnblock) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        })
        return
      }

      // Find existing block relationship
      const existingBlock = await this.blockRepository.findByBlockerAndBlocked(
        req.user!.id,
        userToUnblock.id
      )

      if (!existingBlock) {
        res.status(404).json({
          success: false,
          error: 'User is not blocked'
        })
        return
      }

      // Delete block relationship
      await this.blockRepository.delete(existingBlock.id)

      res.json({
        success: true,
        message: 'User unblocked successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to unblock user',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}