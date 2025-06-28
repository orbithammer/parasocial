// backend/src/routes/follows.ts
// Dedicated Express routes for follow/unfollow operations
// Alternative approach: separate router for follow-specific functionality

import { Router, Request, Response, NextFunction } from 'express'
import { FollowController } from '../controllers/FollowController'

// Middleware function type
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>

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
  router.post('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
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
  router.delete('/', authMiddleware, async (req: Request, res: Response) => {
    // This would need a different method in controller or adapter
    res.status(501).json({
      success: false,
      error: 'Use DELETE /users/:username/follow instead',
      code: 'NOT_IMPLEMENTED'
    })
  })

  // ============================================================================
  // FOLLOW STATUS CHECKING
  // ============================================================================

  /**
   * GET /follows/status
   * Check follow status between two users
   * Query: ?follower=username1&followed=username2
   * Public endpoint
   */
  router.get('/status', async (req: Request, res: Response) => {
    const { follower, followed } = req.query

    if (!follower || !followed) {
      res.status(400).json({
        success: false,
        error: 'Both follower and followed parameters are required',
        code: 'MISSING_PARAMETERS'
      })
      return
    }

    // Create mock request object with params for existing controller method
    const mockReq = {
      ...req,
      params: {
        username: follower as string,
        targetUsername: followed as string
      }
    }

    await followController.checkFollowStatus(mockReq as any, res)
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

    // Create mock request object for existing controller method
    const mockReq = {
      ...req,
      params: { username: follower }
    }

    await followController.bulkCheckFollowing(mockReq as any, res)
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
    const mockReq = {
      ...req,
      params: { username: req.params.username }
    }
    await followController.getUserFollowers(mockReq as any, res)
  })

  /**
   * GET /follows/following/:username
   * Get users that a specific user is following
   * Redirects to /users/:username/following for consistency
   */
  router.get('/following/:username', async (req: Request, res: Response) => {
    const mockReq = {
      ...req,
      params: { username: req.params.username }
    }
    await followController.getUserFollowing(mockReq as any, res)
  })

  /**
   * GET /follows/stats/:username
   * Get follow statistics for a user
   * Redirects to /users/:username/stats for consistency
   */
  router.get('/stats/:username', async (req: Request, res: Response) => {
    const mockReq = {
      ...req,
      params: { username: req.params.username }
    }
    await followController.getUserFollowStats(mockReq as any, res)
  })

  /**
   * GET /follows/recent/:username
   * Get recent followers for a user
   * Requires authentication and user can only view their own recent followers
   */
  router.get('/recent/:username', authMiddleware, async (req: Request, res: Response) => {
    const mockReq = {
      ...req,
      params: { username: req.params.username }
    }
    await followController.getRecentFollowers(mockReq as any, res)
  })

  return router
}