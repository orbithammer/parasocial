// backend/src/routes/posts.ts
// Version: 1.1.0 - Added rate limiting to post creation endpoint
// Changed: Applied postCreationRateLimit to prevent spam posting

import { Router, Request, Response, NextFunction } from 'express'
import { PostController } from '../controllers/PostController'
import { postCreationRateLimit } from '../middleware/rateLimitMiddleware' // ADDED: Import rate limiting

// Middleware function type
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>

// Dependencies interface for dependency injection
interface PostsRouterDependencies {
  postController: PostController
  authMiddleware: MiddlewareFunction
  optionalAuthMiddleware: MiddlewareFunction
}

/**
 * Create posts router with dependency injection
 * @param dependencies - Injected dependencies
 * @returns Configured Express router
 */
export function createPostsRouter(dependencies: PostsRouterDependencies): Router {
  const { postController, authMiddleware, optionalAuthMiddleware } = dependencies
  const router = Router()

  /**
   * GET /posts
   * Get public feed of all posts
   * Optional authentication (to filter out user's own posts)
   * No rate limiting needed for reading posts
   */
  router.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
    await postController.getPosts(req, res)
  })

  /**
   * POST /posts
   * Create a new post
   * Requires authentication
   * UPDATED: Added rate limiting to prevent spam posting (10 posts per hour)
   */
  router.post('/', postCreationRateLimit, authMiddleware, async (req: Request, res: Response) => {
    await postController.createPost(req, res)
  })

  /**
   * GET /posts/:id
   * Get specific post by ID
   * Optional authentication (for draft access)
   * No rate limiting needed for reading individual posts
   */
  router.get('/:id', optionalAuthMiddleware, async (req: Request, res: Response) => {
    await postController.getPostById(req, res)
  })

  /**
   * DELETE /posts/:id
   * Delete own post
   * Requires authentication
   * No rate limiting needed for deleting posts (users should be able to delete quickly if needed)
   */
  router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
    await postController.deletePost(req, res)
  })

  return router
}