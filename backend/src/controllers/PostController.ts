// backend/src/controllers/PostController.ts
// Post management controller with CRUD operations for posts using TypeScript

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
 * Handles HTTP requests for post operations
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
      // Validate required fields
      const { content, contentWarning, isScheduled, scheduledFor } = req.body

      if (!content || content.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Post content is required'
        })
        return
      }

      if (content.length > 5000) {
        res.status(400).json({
          success: false,
          error: 'Post content cannot exceed 5000 characters'
        })
        return
      }

      // Validate scheduled post data
      if (isScheduled && !scheduledFor) {
        res.status(400).json({
          success: false,
          error: 'Scheduled posts must include scheduledFor date'
        })
        return
      }

      if (isScheduled && new Date(scheduledFor) <= new Date()) {
        res.status(400).json({
          success: false,
          error: 'Scheduled date must be in the future'
        })
        return
      }

      // Create post data
      const postData = {
        content: content.trim(),
        contentWarning: contentWarning?.trim() || null,
        isScheduled: Boolean(isScheduled),
        scheduledFor: isScheduled ? new Date(scheduledFor) : null,
        isPublished: !isScheduled,
        publishedAt: !isScheduled ? new Date() : null,
        authorId: req.user!.id
      }

      // Create the post
      const newPost = await this.postRepository.create(postData)

      // Return post with author information
      res.status(201).json({
        success: true,
        data: newPost
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
   * Get public feed of all posts
   * GET /posts
   */
  async getPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20))
      const offset = (page - 1) * limit

      // Get posts with pagination
      const result = await this.postRepository.findManyWithPagination({
        offset,
        limit,
        includeAuthor: true,
        includeMedia: true,
        onlyPublished: true
      })

      // Filter out current user's own posts if they're logged in
      let filteredPosts = result.posts
      if (req.user) {
        filteredPosts = result.posts.filter(post => post.authorId !== req.user!.id)
      }

      // Calculate adjusted pagination
      const totalPages = Math.ceil(result.totalCount / limit)

      res.json({
        success: true,
        data: {
          posts: filteredPosts,
          pagination: {
            currentPage: page,
            totalPages,
            totalPosts: result.totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1
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
   * Get specific post by ID
   * GET /posts/:id
   */
  async getPostById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Post ID is required'
        })
        return
      }

      // Find post with author and media
      const post = await this.postRepository.findByIdWithAuthorAndMedia(id)

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        })
        return
      }

      // Check if post is published (unless it's the author viewing)
      if (!post.isPublished && (!req.user || req.user.id !== post.authorId)) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        })
        return
      }

      res.json({
        success: true,
        data: post
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch post',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Delete own post
   * DELETE /posts/:id
   */
  async deletePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Post ID is required'
        })
        return
      }

      // Find post to verify ownership
      const post = await this.postRepository.findById(id)

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        })
        return
      }

      // Verify the user owns the post
      if (post.authorId !== req.user!.id) {
        res.status(403).json({
          success: false,
          error: 'You can only delete your own posts'
        })
        return
      }

      // Delete the post
      await this.postRepository.delete(id)

      res.json({
        success: true,
        message: 'Post deleted successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete post',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get posts by specific user
   * GET /users/:username/posts
   */
  async getUserPosts(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params

      if (!username) {
        res.status(400).json({
          success: false,
          error: 'Username is required'
        })
        return
      }

      // Find user first
      const user = await this.userRepository.findByUsername(username)

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        })
        return
      }

      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query.page as string) || 1)
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20))
      const offset = (page - 1) * limit

      // Get user's posts
      const result = await this.postRepository.findManyByAuthorId(user.id, {
        offset,
        limit,
        includeAuthor: true,
        includeMedia: true,
        onlyPublished: true
      })

      const totalPages = Math.ceil(result.totalCount / limit)

      res.json({
        success: true,
        data: {
          posts: result.posts,
          pagination: {
            currentPage: page,
            totalPages,
            totalPosts: result.totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user posts',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}