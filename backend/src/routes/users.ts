// backend/src/routes/users.ts
// Express routes for user operations including follow/unfollow using TypeScript

import { Router, Request, Response, NextFunction } from 'express'
import { UserController } from '../controllers/UserController'
import { PostController } from '../controllers/PostController'

// Middleware function type
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>

// Dependencies interface for dependency injection
interface UsersRouterDependencies {
  userController: UserController
  postController: PostController
  authMiddleware: MiddlewareFunction
  optionalAuthMiddleware: MiddlewareFunction
}

/**
 * Create users router with dependency injection
 * @param dependencies - Injected dependencies
 * @returns Configured Express router
 */
export function createUsersRouter(dependencies: UsersRouterDependencies): Router {
  const { userController, postController, authMiddleware, optionalAuthMiddleware } = dependencies
  const router = Router()

  /**
   * GET /users/:username
   * Get user profile by username
   * Public endpoint
   */
  router.get('/:username', async (req: Request, res: Response) => {
    await userController.getUserProfile(req, res)
  })

  /**
   * GET /users/:username/posts
   * Get posts by specific user
   * Public endpoint
   */
  router.get('/:username/posts', async (req: Request, res: Response) => {
    await postController.getUserPosts(req, res)
  })

  /**
   * POST /users/:username/follow
   * Follow a user
   * Supports both authenticated ParaSocial users and external ActivityPub actors
   */
  router.post('/:username/follow', optionalAuthMiddleware, async (req: Request, res: Response) => {
    await userController.followUser(req, res)
  })

  /**
   * DELETE /users/:username/follow
   * Unfollow a user
   * Requires authentication
   */
  router.delete('/:username/follow', authMiddleware, async (req: Request, res: Response) => {
    await userController.unfollowUser(req, res)
  })

  /**
   * GET /users/:username/followers
   * Get user's followers
   * Requires authentication and can only view own followers
   */
  router.get('/:username/followers', authMiddleware, async (req: Request, res: Response) => {
    await userController.getUserFollowers(req, res)
  })

  /**
   * POST /users/:username/block
   * Block a follower
   * Requires authentication
   */
  router.post('/:username/block', authMiddleware, async (req: Request, res: Response) => {
    await userController.blockUser(req, res)
  })

  /**
   * DELETE /users/:username/block
   * Unblock a user
   * Requires authentication
   */
  router.delete('/:username/block', authMiddleware, async (req: Request, res: Response) => {
    await userController.unblockUser(req, res)
  })

  return router
}