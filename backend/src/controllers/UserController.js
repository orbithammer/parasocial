// backend/src/controllers/UserController.js
// User management controller with profile and follow operations

/**
 * User controller class
 * Handles HTTP requests for user operations
 */
export class UserController {
  constructor(userRepository, followRepository, blockRepository) {
    this.userRepository = userRepository
    this.followRepository = followRepository
    this.blockRepository = blockRepository
  }

  /**
   * Get user profile by username
   * GET /users/:username
   */
  async getUserProfile(req, res) {
    try {
      const { username } = req.params

      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        })
      }

      // Find user with public profile information
      const user = await this.userRepository.findByUsernameWithCounts(username)

      if (!user || !user.isActive) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      res.json({
        success: true,
        data: user.getPublicProfile()
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user profile',
        message: error.message
      })
    }
  }

  /**
   * Follow a user
   * POST /users/:username/follow
   */
  async followUser(req, res) {
    try {
      const { username } = req.params
      const { actorId } = req.body

      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        })
      }

      // Find the user to follow
      const userToFollow = await this.userRepository.findByUsername(username)

      if (!userToFollow || !userToFollow.isActive) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      // Prevent self-following
      if (req.user && req.user.id === userToFollow.id) {
        return res.status(400).json({
          success: false,
          error: 'You cannot follow yourself'
        })
      }

      // Check if already following
      const existingFollow = await this.followRepository.findByFollowerAndFollowed(
        req.user?.id || actorId,
        userToFollow.id
      )

      if (existingFollow) {
        return res.status(409).json({
          success: false,
          error: 'Already following this user'
        })
      }

      // Check if the user has blocked the follower
      if (req.user) {
        const isBlocked = await this.blockRepository.findByBlockerAndBlocked(
          userToFollow.id,
          req.user.id
        )

        if (isBlocked) {
          return res.status(403).json({
            success: false,
            error: 'Cannot follow this user'
          })
        }
      }

      // Create follow relationship
      const followData = {
        followerId: req.user?.id,
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
        message: error.message
      })
    }
  }

  /**
   * Unfollow a user
   * DELETE /users/:username/follow
   */
  async unfollowUser(req, res) {
    try {
      const { username } = req.params

      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        })
      }

      // Find the user to unfollow
      const userToUnfollow = await this.userRepository.findByUsername(username)

      if (!userToUnfollow) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      // Find existing follow relationship
      const existingFollow = await this.followRepository.findByFollowerAndFollowed(
        req.user.id,
        userToUnfollow.id
      )

      if (!existingFollow) {
        return res.status(404).json({
          success: false,
          error: 'You are not following this user'
        })
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
        message: error.message
      })
    }
  }

  /**
   * Get user's followers
   * GET /users/:username/followers
   */
  async getUserFollowers(req, res) {
    try {
      const { username } = req.params

      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        })
      }

      // Find user
      const user = await this.userRepository.findByUsername(username)

      if (!user || !user.isActive) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      // Check if requesting user can view followers
      // Only the user themselves can see their full follower list
      const canViewFollowers = req.user && req.user.id === user.id

      if (!canViewFollowers) {
        return res.status(403).json({
          success: false,
          error: 'You can only view your own followers'
        })
      }

      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page) || 1)
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20))
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
        message: error.message
      })
    }
  }

  /**
   * Block a follower
   * POST /users/:username/block
   */
  async blockUser(req, res) {
    try {
      const { username } = req.params
      const { reason } = req.body

      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        })
      }

      // Find user to block
      const userToBlock = await this.userRepository.findByUsername(username)

      if (!userToBlock || !userToBlock.isActive) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      // Prevent self-blocking
      if (req.user.id === userToBlock.id) {
        return res.status(400).json({
          success: false,
          error: 'You cannot block yourself'
        })
      }

      // Check if already blocked
      const existingBlock = await this.blockRepository.findByBlockerAndBlocked(
        req.user.id,
        userToBlock.id
      )

      if (existingBlock) {
        return res.status(409).json({
          success: false,
          error: 'User is already blocked'
        })
      }

      // Create block relationship
      const blockData = {
        blockerId: req.user.id,
        blockedId: userToBlock.id,
        reason: reason || null
      }

      const newBlock = await this.blockRepository.create(blockData)

      // Remove any existing follow relationship
      const existingFollow = await this.followRepository.findByFollowerAndFollowed(
        userToBlock.id,
        req.user.id
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
        message: error.message
      })
    }
  }

  /**
   * Unblock a user
   * DELETE /users/:username/block
   */
  async unblockUser(req, res) {
    try {
      const { username } = req.params

      if (!username) {
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        })
      }

      // Find user to unblock
      const userToUnblock = await this.userRepository.findByUsername(username)

      if (!userToUnblock) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      // Find existing block relationship
      const existingBlock = await this.blockRepository.findByBlockerAndBlocked(
        req.user.id,
        userToUnblock.id
      )

      if (!existingBlock) {
        return res.status(404).json({
          success: false,
          error: 'User is not blocked'
        })
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
        message: error.message
      })
    }
  }
}