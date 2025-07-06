// backend/src/routes/users.ts
// Version: 1.1.0 - Added rate limiting to follow operations
// Changed: Applied followRateLimit to follow/unfollow endpoints to prevent automation abuse

import { Router, Request, Response, NextFunction } from 'express'
import { UserController } from '../controllers/UserController'
import { PostController } from '../controllers/PostController'
import { FollowController } from '../controllers/FollowController'
import { followRateLimit } from '../middleware/rateLimitMiddleware' // ADDED: Import rate limiting

// Middleware function type
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>

// Dependencies interface for dependency injection
interface UsersRouterDependencies {
  userController: UserController
  postController: PostController
  followController: FollowController
  authMiddleware: MiddlewareFunction
  optionalAuthMiddleware: MiddlewareFunction
}

/**
 * Create users router with dependency injection
 * @param dependencies - Injected dependencies
 * @returns Configured Express router
 */
export function createUsersRouter(dependencies: UsersRouterDependencies): Router {
  const { userController, postController, followController, authMiddleware, optionalAuthMiddleware } = dependencies
  const router = Router()

  // ============================================================================
  // USER PROFILE OPERATIONS (no rate limiting needed)
  // ============================================================================

  /**
   * GET /users/:username
   * Get user profile by username
   * Public endpoint - handled by UserController
   */
  router.get('/:username', async (req: Request, res: Response) => {
    await userController.getUserProfile(req, res)
  })

  /**
   * GET /users/:username/posts
   * Get posts by specific user
   * Public endpoint - handled by PostController
   */
  router.get('/:username/posts', async (req: Request, res: Response) => {
    await postController.getUserPosts(req, res)
  })

  // ============================================================================
  // FOLLOW OPERATIONS (with rate limiting)
  // ============================================================================

  /**
   * POST /users/:username/follow
   * Follow a user
   * Supports both authenticated ParaSocial users and external ActivityPub actors
   * Uses FollowController for consistency
   * UPDATED: Added rate limiting to prevent automation abuse (20 actions per hour)
   */
  router.post('/:username/follow', followRateLimit, optionalAuthMiddleware, async (req: Request, res: Response) => {
    await followController.followUser(req, res)
  })

  /**
   * DELETE /users/:username/follow
   * Unfollow a user
   * Requires authentication
   * Uses FollowController for consistency
   * UPDATED: Added rate limiting to prevent automation abuse (20 actions per hour)
   */
  router.delete('/:username/follow', followRateLimit, authMiddleware, async (req: Request, res: Response) => {
    await followController.unfollowUser(req, res)
  })

  // ============================================================================
  // FOLLOWER/FOLLOWING LISTS (no rate limiting needed for reading)
  // ============================================================================

  /**
   * GET /users/:username/followers
   * Get user's followers
   * Public endpoint - uses FollowController for consistency
   */
  router.get('/:username/followers', async (req: Request, res: Response) => {
    await followController.getFollowers(req, res)
  })

  /**
   * GET /users/:username/following
   * Get users that this user is following
   * Public endpoint - uses FollowController for consistency
   */
  router.get('/:username/following', async (req: Request, res: Response) => {
    await followController.getFollowing(req, res)
  })

  /**
   * GET /users/:username/stats
   * Get user's follow statistics (follower count, following count)
   * Public endpoint - uses FollowController for consistency
   */
  router.get('/:username/stats', async (req: Request, res: Response) => {
    await followController.getUserFollowStats(req, res)
  })

  // ============================================================================
  // BLOCKING OPERATIONS (no rate limiting needed - should be able to block quickly)
  // ============================================================================

  /**
   * POST /users/:username/block
   * Block a user
   * Requires authentication
   * Uses FollowController for consistency with follow operations
   */
  router.post('/:username/block', authMiddleware, async (req: Request, res: Response) => {
    await followController.blockUser(req, res)
  })

  /**
   * DELETE /users/:username/block
   * Unblock a user
   * Requires authentication
   * Uses FollowController for consistency with follow operations
   */
  router.delete('/:username/block', authMiddleware, async (req: Request, res: Response) => {
    await followController.unblockUser(req, res)
  })

  return router
}