// backend/src/routes/posts.js
// Express routes for post operations

import { Router } from 'express'

/**
 * Create posts router with dependency injection
 * @param {Object} dependencies - Injected dependencies
 * @param {PostController} dependencies.postController - Post controller instance
 * @param {Function} dependencies.authMiddleware - Authentication middleware
 * @param {Function} dependencies.optionalAuthMiddleware - Optional auth middleware
 * @returns {Router} Configured Express router
 */
export function createPostsRouter(dependencies) {
  const { postController, authMiddleware, optionalAuthMiddleware } = dependencies
  const router = Router()

  /**
   * GET /posts
   * Get public feed of all posts
   * Optional authentication (to filter out user's own posts)
   */
  router.get('/', optionalAuthMiddleware, async (req, res) => {
    await postController.getPosts(req, res)
  })

  /**
   * POST /posts
   * Create a new post
   * Requires authentication
   */
  router.post('/', authMiddleware, async (req, res) => {
    await postController.createPost(req, res)
  })

  /**
   * GET /posts/:id
   * Get specific post by ID
   * Optional authentication (for draft access)
   */
  router.get('/:id', optionalAuthMiddleware, async (req, res) => {
    await postController.getPostById(req, res)
  })

  /**
   * DELETE /posts/:id
   * Delete own post
   * Requires authentication
   */
  router.delete('/:id', authMiddleware, async (req, res) => {
    await postController.deletePost(req, res)
  })

  return router
}