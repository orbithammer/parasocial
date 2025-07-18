// backend/src/routes/follows.ts
// Version: 1.2.1 - Fixed unused parameter warnings
// Changed: Prefixed unused req parameters with underscore (_req) in NOT_IMPLEMENTED endpoints

import { Router, Request, Response, NextFunction } from 'express'
import { FollowController } from '../controllers/FollowController'

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
interface FollowsRouterDependencies {
  followController: FollowController
  authMiddleware: MiddlewareFunction
  optionalAuthMiddleware: MiddlewareFunction
}

/**
 * Create follows router with dependency injection
 * Mounts under /api/v1/follows prefix
 * @param dependencies - Injected dependencies
 * @returns Configured Express router
 */
export function createFollowsRouter(dependencies: FollowsRouterDependencies): Router {
  const { followController, authMiddleware, optionalAuthMiddleware } = dependencies
  const router = Router()

  // ============================================================================
  // CORE FOLLOW/UNFOLLOW OPERATIONS
  // ============================================================================

  /**
   * POST /follows
   * Follow a user by username or user ID
   * Body: { username?: string, userId?: string, actorId?: string }
   * Supports both authenticated ParaSocial users and external ActivityPub actors
   */
  router.post('/', optionalAuthMiddleware, async (_req: Request, res: Response) => {
    // This would need a different method in controller or adapter
    // For now, redirect to username-based endpoint
    res.status(501).json({
      success: false,
      error: 'Use POST /users/:username/follow instead',
      code: 'NOT_IMPLEMENTED'
    })
  })

  /**
   * DELETE /follows
   * Unfollow a user by username or user ID
   * Body: { username?: string, userId?: string }
   * Requires authentication
   */
  router.delete('/', authMiddleware, async (_req: Request, res: Response) => {
    // This would need a different method in controller or adapter
    // For now, redirect to username-based endpoint
    res.status(501).json({
      success: false,
      error: 'Use DELETE /users/:username/follow instead',
      code: 'NOT_IMPLEMENTED'
    })
  })

  // ============================================================================
  // FOLLOW STATUS AND BULK CHECKING
  // ============================================================================

  /**
   * POST /follows/check
   * Check follow status between two users
   * Body: { follower: "username", target: "username" }
   * Public endpoint
   */
  router.post('/check', async (req: Request, res: Response) => {
    const { follower } = req.body

    if (!follower) {
      res.status(400).json({
        success: false,
        error: 'Follower username is required',
        code: 'MISSING_FOLLOWER'
      })
      return
    }

    // Type assert the request and add username to params
    const typedReq = {
      ...req,
      params: { ...req.params, username: follower }
    } as UsernameParamsRequest

    await followController.checkFollowStatus(typedReq, res)
  })

  /**
   * POST /follows/check-bulk
   * Bulk check follow status
   * Body: { follower: "username", usernames: ["user1", "user2", "user3"] }
   * Public endpoint
   */
  router.post('/check-bulk', async (req: Request, res: Response) => {
    const { follower } = req.body

    if (!follower) {
      res.status(400).json({
        success: false,
        error: 'Follower username is required',
        code: 'MISSING_FOLLOWER'
      })
      return
    }

    // Type assert the request and add username to params
    const typedReq = {
      ...req,
      params: { ...req.params, username: follower }
    } as UsernameParamsRequest

    await followController.bulkCheckFollowing(typedReq, res)
  })

  // ============================================================================
  // USER-SPECIFIC ENDPOINTS (Redirect to user routes)
  // ============================================================================

  /**
   * GET /follows/followers/:username
   * Get followers for a specific user
   * Redirects to /users/:username/followers for consistency
   */
  router.get('/followers/:username', async (req: Request, res: Response) => {
    // Type assert the request to include username parameter
    const typedReq = req as UsernameParamsRequest
    await followController.getUserFollowers(typedReq, res)
  })

  /**
   * GET /follows/following/:username
   * Get users that a specific user is following
   * Redirects to /users/:username/following for consistency
   */
  router.get('/following/:username', async (req: Request, res: Response) => {
    // Type assert the request to include username parameter
    const typedReq = req as UsernameParamsRequest
    await followController.getUserFollowing(typedReq, res)
  })

  /**
   * GET /follows/stats/:username
   * Get follow statistics for a user
   * Redirects to /users/:username/stats for consistency
   */
  router.get('/stats/:username', async (req: Request, res: Response) => {
    // Type assert the request to include username parameter
    const typedReq = req as UsernameParamsRequest
    await followController.getUserFollowStats(typedReq, res)
  })

  /**
   * GET /follows/recent/:username
   * Get recent followers for a user
   * Requires authentication and user can only view their own recent followers
   */
  router.get('/recent/:username', authMiddleware, async (req: Request, res: Response) => {
    // Type assert the request to include username parameter
    const typedReq = req as UsernameParamsRequest
    await followController.getRecentFollowers(typedReq, res)
  })

  return router
}