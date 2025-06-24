// backend/src/routes/users.js
// Express routes for user operations including follow/unfollow

import { Router } from 'express'

/**
 * Create users router with dependency injection
 * @param {Object} dependencies - Injected dependencies
 * @param {UserController} dependencies.userController - User controller instance
 * @param {PostController} dependencies.postController - Post controller instance
 * @param {Function} dependencies.authMiddleware - Authentication middleware
 * @param {Function} dependencies.optionalAuthMiddleware - Optional auth middleware
 * @returns {Router} Configured Express router
 */
export function createUsersRouter(dependencies) {
  const { userController, postController, authMiddleware, optionalAuthMiddleware } = dependencies
  const router = Router()

  /**
   * GET /users/:username
   * Get user profile by username
   * Public endpoint
   */
  router.get('/:username', async (req, res) => {
    await userController.getUserProfile(req, res)
  })

  /**
   * GET /users/:username/posts
   * Get posts by specific user
   * Public endpoint
   */
  router.get('/:username/posts', async (req, res) => {
    await postController.getUserPosts(req, res)
  })

  /**
   * POST /users/:username/follow
   * Follow a user
   * Supports both authenticated ParaSocial users and external ActivityPub actors
   */
  router.post('/:username/follow', optionalAuthMiddleware, async (req, res) => {
    await userController.followUser(req, res)
  })

  /**
   * DELETE /users/:username/follow
   * Unfollow a user
   * Requires authentication
   */
  router.delete('/:username/follow', authMiddleware, async (req, res) => {
    await userController.unfollowUser(req, res)
  })

  /**
   * GET /users/:username/followers
   * Get user's followers
   * Requires authentication and can only view own followers
   */
  router.get('/:username/followers', authMiddleware, async (req, res) => {
    await userController.getUserFollowers(req, res)
  })

  /**
   * POST /users/:username/block
   * Block a follower
   * Requires authentication
   */
  router.post('/:username/block', authMiddleware, async (req, res) => {
    await userController.blockUser(req, res)
  })

  /**
   * DELETE /users/:username/block
   * Unblock a user
   * Requires authentication
   */
  router.delete('/:username/block', authMiddleware, async (req, res) => {
    await userController.unblockUser(req, res)
  })

  return router
}