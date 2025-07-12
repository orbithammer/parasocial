// backend/src/routes/posts.ts
// Version: 1.3.0 - Fixed TypeScript rate limiting middleware compatibility
// Changed: Added type cast for postCreationRateLimit to resolve RateLimitRequest vs Express Request type conflict

import { Router, Request, Response, NextFunction } from 'express'
import { PostController } from '../controllers/PostController'
import { postCreationRateLimit } from '../middleware/rateLimitMiddleware'
import { 
  validatePostCreationEndpoint,
  validatePostDeletionEndpoint,
  validatePostListQuery,
  validatePostIdParam
} from '../middleware/postValidationMiddleware'

// Middleware function type
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>

// Dependencies interface for dependency injection
interface PostsRouterDependencies {
  postController: PostController
  authMiddleware: MiddlewareFunction
  optionalAuthMiddleware: MiddlewareFunction
}

/**
 * Create posts router with dependency injection and validation middleware
 * @param dependencies - Injected dependencies
 * @returns Configured Express router
 */
export function createPostsRouter(dependencies: PostsRouterDependencies): Router {
  const { postController, authMiddleware, optionalAuthMiddleware } = dependencies
  const router = Router()

  /**
   * GET /posts
   * Get public feed of all posts with pagination and filtering
   * Optional authentication (to filter out blocked users)
   * Includes validation for query parameters
   */
  router.get('/', 
    optionalAuthMiddleware, 
    validatePostListQuery, 
    async (req: Request, res: Response) => {
      await postController.getPosts(req, res)
    }
  )

  // TODO: GET /posts/feed - getUserFeed method needs to be implemented in PostController first
  // This endpoint will provide personalized feeds based on user follows

  /**
   * POST /posts
   * Create a new post
   * Requires authentication and rate limiting
   * Includes full validation middleware
   * Note: Rate limiting middleware uses type cast to resolve RateLimitRequest vs Express Request compatibility
   */
  router.post('/', 
    postCreationRateLimit as any, // Type cast to resolve RateLimitRequest vs Request compatibility
    authMiddleware, 
    ...validatePostCreationEndpoint, 
    async (req: Request, res: Response) => {
      await postController.createPost(req, res)
    }
  )

  /**
   * GET /posts/:id
   * Get specific post by ID
   * Optional authentication (for draft access and privacy)
   * Includes ID parameter validation
   */
  router.get('/:id', 
    validatePostIdParam, 
    optionalAuthMiddleware, 
    async (req: Request, res: Response) => {
      await postController.getPostById(req, res)
    }
  )

  // TODO: PUT /posts/:id - updatePost method needs to be implemented in PostController first
  // This endpoint will allow users to edit their existing posts

  /**
   * DELETE /posts/:id
   * Delete own post
   * Requires authentication and ownership validation
   * Includes validation middleware for deletion
   */
  router.delete('/:id', 
    authMiddleware, 
    ...validatePostDeletionEndpoint, 
    async (req: Request, res: Response) => {
      await postController.deletePost(req, res)
    }
  )

  return router
}