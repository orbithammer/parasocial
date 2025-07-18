// backend/src/routes/users.ts
// Version: 1.0.1 - Fixed import names for follow validation middleware
// Changed: Corrected validateFollowRequestEndpoint to validateFollowRequest and validateUnfollowRequestEndpoint to validateUnfollowRequest

import { Router, Request, Response, NextFunction } from 'express'
import { UserController } from '../controllers/UserController'
import { PostController } from '../controllers/PostController'
import { FollowController } from '../controllers/FollowController'
import { followOperationsRateLimit } from '../middleware/rateLimitMiddleware'
import { 
  validateFollowRequest,
  validateUnfollowRequest
} from '../middleware/followValidationMiddleware'

// Middleware function type
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>

// Extend Express Request to include user from auth middleware and typed params
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

// Interface for requests with username parameter
interface UsernameParamsRequest extends AuthenticatedRequest {
  params: {
    username: string
    [key: string]: string
  }
}

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
 * Handles user profile, follow operations, and user posts
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
  // USER PROFILE OPERATIONS
  // ============================================================================

  /**
   * GET /users/:username
   * Get user profile by username
   * Optional authentication (to check relationship context)
   */
  router.get('/:username', 
    optionalAuthMiddleware, 
    async (req: Request, res: Response) => {
      // Type assert the request to include username parameter
      const typedReq = req as UsernameParamsRequest
      await userController.getUserProfile(typedReq, res)
    }
  )

  /**
   * GET /users/:username/posts
   * Get posts by a specific user
   * Optional authentication (to filter blocked content)
   */
  router.get('/:username/posts', 
    optionalAuthMiddleware, 
    async (req: Request, res: Response) => {
      // Type assert the request to include username parameter
      const typedReq = req as UsernameParamsRequest
      await postController.getUserPosts(typedReq, res)
    }
  )

  // ============================================================================
  // FOLLOW OPERATIONS
  // ============================================================================

  /**
   * POST /users/:username/follow
   * Follow a user
   * Optional authentication (supports both authenticated users and external ActivityPub actors)
   * Includes rate limiting and validation
   */
  router.post('/:username/follow', 
    followOperationsRateLimit as any, // Type cast for compatibility
    optionalAuthMiddleware,
    validateFollowRequest,
    async (req: Request, res: Response) => {
      // Type assert the request to include username parameter
      const typedReq = req as UsernameParamsRequest
      await followController.followUser(typedReq, res)
    }
  )

  /**
   * DELETE /users/:username/follow
   * Unfollow a user
   * Requires authentication
   * Includes rate limiting and validation
   */
  router.delete('/:username/follow', 
    followOperationsRateLimit as any, // Type cast for compatibility
    authMiddleware,
    validateUnfollowRequest,
    async (req: Request, res: Response) => {
      // Type assert the request to include username parameter
      const typedReq = req as UsernameParamsRequest
      await followController.unfollowUser(typedReq, res)
    }
  )

  /**
   * GET /users/:username/followers
   * Get followers list for a user
   * Public endpoint with optional pagination
   */
  router.get('/:username/followers', 
    async (req: Request, res: Response) => {
      // Type assert the request to include username parameter
      const typedReq = req as UsernameParamsRequest
      await followController.getUserFollowers(typedReq, res)
    }
  )

  /**
   * GET /users/:username/following
   * Get following list for a user
   * Public endpoint with optional pagination
   */
  router.get('/:username/following', 
    async (req: Request, res: Response) => {
      // Type assert the request to include username parameter
      const typedReq = req as UsernameParamsRequest
      await followController.getUserFollowing(typedReq, res)
    }
  )

  /**
   * GET /users/:username/stats
   * Get follow statistics for a user
   * Public endpoint
   */
  router.get('/:username/stats', 
    async (req: Request, res: Response) => {
      // Type assert the request to include username parameter
      const typedReq = req as UsernameParamsRequest
      await followController.getUserFollowStats(typedReq, res)
    }
  )

  // ============================================================================
  // BLOCK/UNBLOCK OPERATIONS
  // ============================================================================

  /**
   * POST /users/:username/block
   * Block a user
   * Requires authentication
   */
  router.post('/:username/block', 
    authMiddleware,
    async (req: Request, res: Response) => {
      // Type assert the request to include username parameter
      const typedReq = req as UsernameParamsRequest
      await userController.blockUser(typedReq, res)
    }
  )

  /**
   * DELETE /users/:username/block
   * Unblock a user
   * Requires authentication
   */
  router.delete('/:username/block', 
    authMiddleware,
    async (req: Request, res: Response) => {
      // Type assert the request to include username parameter
      const typedReq = req as UsernameParamsRequest
      await userController.unblockUser(typedReq, res)
    }
  )

  return router
}

/**
 * Export default router for backward compatibility
 * This allows importing as either named export or default
 */
export default createUsersRouter