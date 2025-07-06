// backend/src/routes/users.ts
// Version: 1.2.0 - Fixed TypeScript error on line 124
// Changed: Corrected blockUser/unblockUser to use UserController instead of FollowController

import { Router, Request, Response, NextFunction } from 'express'
import { UserController } from '../controllers/UserController'
import { PostController } from '../controllers/PostController'
import { FollowController } from '../controllers/FollowController'

/**
 * Middleware function type
 */
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>

/**
 * Dependencies interface for dependency injection
 */
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
  const { 
    userController, 
    postController, 
    followController, 
    authMiddleware, 
    optionalAuthMiddleware 
  } = dependencies
  
  const router = Router()

  // ============================================================================
  // USER PROFILE OPERATIONS - UserController
  // ============================================================================

  /**
   * GET /users/:username
   * Get user profile by username
   * Optional authentication for additional user data
   */
  router.get('/:username', optionalAuthMiddleware, async (req: Request, res: Response) => {
    await userController.getUserProfile(req, res)
  })

  // ============================================================================
  // USER BLOCKING OPERATIONS - UserController
  // ============================================================================

  /**
   * POST /users/:username/block
   * Block a user
   * Requires authentication
   */
  router.post('/:username/block', authMiddleware, async (req: Request, res: Response) => {
    // ✅ FIXED: Use userController instead of followController
    await userController.blockUser(req, res)
  })

  /**
   * DELETE /users/:username/block
   * Unblock a user
   * Requires authentication
   */
  router.delete('/:username/block', authMiddleware, async (req: Request, res: Response) => {
    // ✅ FIXED: Use userController instead of followController
    await userController.unblockUser(req, res)
  })

  // ============================================================================
  // FOLLOW OPERATIONS - FollowController
  // ============================================================================

  /**
   * POST /users/:username/follow
   * Follow a user
   * Optional authentication (supports ActivityPub actors)
   */
  router.post('/:username/follow', optionalAuthMiddleware, async (req: Request, res: Response) => {
    await followController.followUser(req, res)
  })

  /**
   * DELETE /users/:username/follow
   * Unfollow a user
   * Requires authentication
   */
  router.delete('/:username/follow', authMiddleware, async (req: Request, res: Response) => {
    await followController.unfollowUser(req, res)
  })

  /**
   * GET /users/:username/followers
   * Get user's followers
   * Optional authentication for privacy settings
   */
  router.get('/:username/followers', optionalAuthMiddleware, async (req: Request, res: Response) => {
    await followController.getUserFollowers(req, res)
  })

  /**
   * GET /users/:username/following
   * Get users that this user is following
   * Optional authentication for privacy settings
   */
  router.get('/:username/following', optionalAuthMiddleware, async (req: Request, res: Response) => {
    await followController.getUserFollowing(req, res)
  })

  /**
   * GET /users/:username/stats
   * Get user's follow statistics
   * Public endpoint
   */
  router.get('/:username/stats', async (req: Request, res: Response) => {
    await followController.getUserFollowStats(req, res)
  })

  // ============================================================================
  // POST OPERATIONS - PostController
  // ============================================================================

  /**
   * GET /users/:username/posts
   * Get posts by a specific user
   * Optional authentication for draft access
   */
  router.get('/:username/posts', optionalAuthMiddleware, async (req: Request, res: Response) => {
    await postController.getUserPosts(req, res)
  })

  return router
}