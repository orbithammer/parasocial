// backend/src/controllers/PostController.ts
// Fixed PostController with correct method calls and response formats

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
   * Get public posts feed
   * GET /posts
   */
  async getPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Parse pagination parameters from query string
      const page = parseInt(req.query.page as string) || 1
      const limitParam = parseInt(req.query.limit as string) || 20
      
      // Cap limit at 50 to prevent excessive data requests
      const limit = Math.min(limitParam, 50)
      
      // Calculate offset for database query
      const offset = (page - 1) * limit

      // Call repository to get posts with pagination
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
      if (req.user) {
        posts = posts.filter(post => post.authorId !== req.user!.id)
      }

      // Calculate pagination information
      const totalPages = Math.ceil(totalCount / limit)
      const hasNext = page < totalPages
      const hasPrev = page > 1

      res.json({
        success: true,
        data: {
          posts,
          pagination: {
            currentPage: page,
            totalPages,
            totalPosts: totalCount,
            hasNext,
            hasPrev
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
   * Create a new post
   * POST /posts
   */
  async createPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
        return
      }

      const { content, contentWarning, isScheduled, scheduledFor } = req.body

      if (!content || content.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Post content is required'
        })
        return
      }

      // Check content length limit
      if (content.trim().length > 5000) {
        res.status(400).json({
          success: false,
          error: 'Post content cannot exceed 5000 characters'
        })
        return
      }

      // Validate scheduled post requirements
      if (isScheduled) {
        if (!scheduledFor) {
          res.status(400).json({
            success: false,
            error: 'Scheduled posts must include scheduledFor date'
          })
          return
        }

        const scheduledDate = new Date(scheduledFor)
        if (scheduledDate <= new Date()) {
          res.status(400).json({
            success: false,
            error: 'Scheduled date must be in the future'
          })
          return
        }
      }

      // Determine if post should be published immediately
      const willBePublished = !isScheduled

      const postData = {
        content: content.trim(),
        contentWarning: contentWarning || null,
        authorId: req.user.id,
        isScheduled: isScheduled || false,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        isPublished: willBePublished,
        // Set publishedAt to current date if publishing immediately, null if scheduled
        publishedAt: willBePublished ? new Date() : null
      }

      const newPost = await this.postRepository.create(postData)

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

      // Use findByIdWithAuthorAndMedia method as expected by tests
      const post = await this.postRepository.findByIdWithAuthorAndMedia(id)

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        })
        return
      }

      // Check if post is published or if user owns it
      if (!post.isPublished && (!req.user || req.user.id !== post.authorId)) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        })
        return
      }

      res.json({
        success: true,
        data: post  // Return post directly as expected by tests
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve post',
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
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
        return
      }

      const { id } = req.params

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Post ID is required'
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

      if (post.authorId !== req.user.id) {
        res.status(403).json({
          success: false,
          error: 'You can only delete your own posts'
        })
        return
      }

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
   * Get user's posts by username
   * GET /users/:username/posts
   */
  async getUserPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params
      const page = parseInt(req.query.page as string) || 1
      const limitParam = parseInt(req.query.limit as string) || 20
      const limit = Math.min(limitParam, 50)
      const offset = (page - 1) * limit

      // Find user by username
      const user = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        })
        return
      }

      // Get user's posts
      const result = await this.postRepository.findManyByAuthorId(user.id, {
        offset,
        limit,
        includeAuthor: true,
        includeMedia: true,
        onlyPublished: true
      })

      const totalPages = Math.ceil(result.totalCount / limit)
      const hasNext = page < totalPages
      const hasPrev = page > 1

      res.json({
        success: true,
        data: {
          posts: result.posts,
          pagination: {
            currentPage: page,
            totalPages,
            totalPosts: result.totalCount,
            hasNext,
            hasPrev
          }
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user posts',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}