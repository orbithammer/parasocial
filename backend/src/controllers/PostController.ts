// src/controllers/PostController.ts
// Version: 1.4.0
// Fixed TypeScript type safety for req.params.id (string | undefined)

import { Request, Response } from 'express'
import { PostRepository } from '../repositories/PostRepository'
import { UserRepository } from '../repositories/UserRepository'

// Extend Express Request to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

/**
 * Post controller class
 * Handles HTTP requests for post operations using repositories directly
 */
export class PostController {
  constructor(
    private postRepository: PostRepository,
    private userRepository: UserRepository
  ) {}

  /**
   * Create a new post
   * POST /posts
   */
  async createPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { content, contentWarning, isScheduled, scheduledFor } = req.body
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
        return
      }

      // Prepare post data for repository
      const postData = {
        content,
        contentWarning: contentWarning || null,
        authorId: userId,
        isScheduled: isScheduled || false,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        isPublished: !isScheduled,
        publishedAt: !isScheduled ? new Date() : null
      }

      // Create the post using repository
      const post = await this.postRepository.create(postData)

      // Return response with post wrapped in data.post structure as expected by tests
      res.status(201).json({
        success: true,
        data: {
          post
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to create post',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get paginated list of published posts
   * GET /posts
   */
  async getPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Use bracket notation to access query parameters due to TypeScript ParsedQs typing
      const page = parseInt(req.query['page'] as string) || 1
      const limit = parseInt(req.query['limit'] as string) || 10
      const currentUserId = req.user?.id

      // Convert to offset for the actual repository method
      const offset = (page - 1) * limit

      // Use actual repository interface with offset/limit and onlyPublished
      const result = await this.postRepository.findManyWithPagination({
        offset,
        limit,
        includeAuthor: true,
        includeMedia: true,
        onlyPublished: true
      })

      let { posts } = result
      const { totalCount } = result

      // Filter out current user's own posts if authenticated  
      if (currentUserId) {
        posts = posts.filter(post => post.authorId !== currentUserId)
      }

      // Calculate pagination information for test compatibility
      const totalPages = Math.ceil(totalCount / limit)
      const hasNext = page < totalPages

      res.status(200).json({
        success: true,
        data: {
          posts,
          pagination: {
            total: totalCount, // Use totalCount from actual repository
            page,
            limit,
            hasNext
          }
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch posts',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get a specific post by ID
   * GET /posts/:id
   */
  async getPostById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const currentUserId = req.user?.id

      // Type guard: ensure id is defined
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Post ID is required'
        })
        return
      }

      // Use the method expected by tests with properly typed id
      const post = await this.postRepository.findByIdWithAuthorAndMedia(id)

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        })
        return
      }

      // Check if user can view this post (published or is author)
      if (!post.isPublished && post.authorId !== currentUserId) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        })
        return
      }

      res.status(200).json({
        success: true,
        data: {
          post
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve post'
      })
    }
  }

  /**
   * Delete a post
   * DELETE /posts/:id
   */
  async deletePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const userId = req.user?.id

      // Type guard: ensure id is defined
      if (!id || typeof id !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Post ID is required'
        })
        return
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
        return
      }

      // Check if post exists and user owns it
      const post = await this.postRepository.findById(id)

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        })
        return
      }

      if (post.authorId !== userId) {
        res.status(403).json({
          success: false,
          error: 'Not authorized to delete this post'
        })
        return
      }

      await this.postRepository.delete(id)

      res.status(200).json({
        success: true,
        message: 'Post deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete post'
      })
    }
  }

  /**
   * Get posts by a specific user
   * GET /users/:username/posts
   */
  async getUserPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      // Use bracket notation to access query parameters due to TypeScript ParsedQs typing
      const page = parseInt(req.query['page'] as string) || 1
      const limit = parseInt(req.query['limit'] as string) || 10

      // Type guard: ensure username is defined
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Username is required'
        })
        return
      }

      // First get user ID from username
      const user = await this.userRepository.findByUsername(username)
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        })
        return
      }

      // Convert to offset for the actual repository method
      const offset = (page - 1) * limit

      // Use actual repository interface with offset/limit
      const result = await this.postRepository.findManyByAuthorId(user.id, {
        offset,
        limit,
        includeAuthor: true,
        includeMedia: true,
        onlyPublished: true
      })

      res.status(200).json({
        success: true,
        data: result
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user posts'
      })
    }
  }
}