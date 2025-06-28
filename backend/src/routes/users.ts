// backend/src/routes/users.ts
// Express 4.x compatible users router with FollowController integration

import { Router, Request, Response, NextFunction } from 'express'
import { UserController } from '../controllers/UserController'
import { PostController } from '../controllers/PostController'
import { FollowController } from '../controllers/FollowController'

// Middleware function type
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>

// Updated dependencies interface with FollowController
interface UsersRouterDependencies {
  userController: UserController
  postController: PostController
  followController: FollowController  // Added for consistent follow operations
  authMiddleware: MiddlewareFunction
  optionalAuthMiddleware: MiddlewareFunction
}

/**
 * Create users router with dependency injection
 * Uses FollowController for all follow-related operations (Express 4.x compatible)
 * @param dependencies - Injected dependencies including FollowController
 * @returns Configured Express router
 */
export function createUsersRouter(dependencies: UsersRouterDependencies): Router {
  const { 
    userController, 
    postController, 
    followController,  // Now using FollowController consistently
    authMiddleware, 
    optionalAuthMiddleware 
  } = dependencies
  
  const router = Router()

  // ============================================================================
  // USER PROFILE ROUTES
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
  // FOLLOW OPERATIONS (using FollowController consistently)
  // ============================================================================

  /**
   * POST /users/:username/follow
   * Follow a user
   * Supports both authenticated ParaSocial users and external ActivityPub actors
   * Uses FollowController for consistency
   */
  router.post('/:username/follow', optionalAuthMiddleware, async (req: Request, res: Response) => {
    await followController.followUser(req, res)
  })

  /**
   * DELETE /users/:username/follow
   * Unfollow a user
   * Requires authentication
   * Uses FollowController for consistency
   */
  router.delete('/:username/follow', authMiddleware, async (req: Request, res: Response) => {
    await followController.unfollowUser(req, res)
  })

  /**
   * GET /users/:username/followers
   * Get user's followers
   * Public endpoint - uses FollowController for consistency
   */
  router.get('/:username/followers', async (req: Request, res: Response) => {
    await followController.getUserFollowers(req, res)
  })

  /**
   * GET /users/:username/following
   * Get users that this user follows
   * Public endpoint - uses FollowController for consistency
   */
  router.get('/:username/following', async (req: Request, res: Response) => {
    await followController.getUserFollowing(req, res)
  })

  /**
   * GET /users/:username/stats
   * Get user's follow statistics (followers count, following count)
   * Public endpoint - handled by FollowController
   */
  router.get('/:username/stats', async (req: Request, res: Response) => {
    await followController.getUserFollowStats(req, res)
  })

  // ============================================================================
  // USER MANAGEMENT OPERATIONS (still using UserController)
  // ============================================================================

  /**
   * POST /users/:username/block
   * Block a user
   * Requires authentication - handled by UserController
   * Note: Blocking is user management, not follow management
   */
  router.post('/:username/block', authMiddleware, async (req: Request, res: Response) => {
    await userController.blockUser(req, res)
  })

  /**
   * DELETE /users/:username/block
   * Unblock a user
   * Requires authentication - handled by UserController
   * Note: Blocking is user management, not follow management
   */
  router.delete('/:username/block', authMiddleware, async (req: Request, res: Response) => {
    await userController.unblockUser(req, res)
  })

  return router
}