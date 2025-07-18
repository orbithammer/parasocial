// backend/src/controllers/PostController.ts
// Version: 3.8.0 - Added missing createPost, getPostById, and deletePost methods
// Changed: Added all missing methods required by posts router, restored createPostSchema

import { Request, Response } from 'express'
import { z } from 'zod'
import { PostRepository } from '../repositories/PostRepository'
import { UserRepository } from '../repositories/UserRepository'

/**
 * Interface for authenticated requests
 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

/**
 * Validation schema for post queries
 */
const postQuerySchema = z.object({
  page: z.string()
    .optional()
    .default('1')
    .refine((val) => {
      const num = parseInt(val)
      return !isNaN(num) && num > 0
    }, { message: 'Page must be a positive number' }),
  limit: z.string()
    .optional()
    .default('20')
    .refine((val) => {
      const num = parseInt(val)
      return !isNaN(num) && num > 0
    }, { message: 'Limit must be a positive number' }),
  author: z.string().optional(),
  includeContentWarning: z.enum(['true', 'false']).optional()
})

/**
 * Validation schema for post creation
 */
const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  contentWarning: z.string().max(500).optional().nullable(),
  isScheduled: z.boolean().default(false),
  scheduledFor: z.string().datetime().optional().nullable()
})

/**
 * Controller for handling post-related operations
 * Includes CRUD operations and post management
 */
export class PostController {
  constructor(
    private postRepository: PostRepository,
    private userRepository: UserRepository
  ) {}

  /**
   * Get public posts feed with pagination and filtering
   * GET /posts
   */
  async getPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate query parameters
      const queryValidation = postQuerySchema.safeParse(req.query)
      if (!queryValidation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: queryValidation.error.issues
          }
        })
        return
      }

      const validatedQuery = queryValidation.data
      const page = parseInt(validatedQuery.page)
      const limit = Math.min(parseInt(validatedQuery.limit), 50) // Enforce max limit of 50

      // Calculate pagination offset
      const offset = (page - 1) * limit

      // Get published posts
      const result = await this.postRepository.findPublished({
        offset,
        limit,
        ...(validatedQuery.author && { authorId: validatedQuery.author })
      })

      // Prepare pagination response
      const pagination = {
        page,
        limit,
        totalCount: result.totalCount,
        hasMore: result.totalCount > offset + result.posts.length
      }

      res.status(200).json({
        success: true,
        data: {
          posts: result.posts,
          pagination
        }
      })

    } catch (error) {
      console.error('Error getting posts:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve posts',
          details: []
        }
      })
    }
  }

  /**
   * Get posts by a specific user
   * GET /users/:username/posts
   */
  async getUserPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { username } = req.params as { username: string }

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Username is required',
            details: []
          }
        })
        return
      }

      // Find the user by username to get their ID
      const user = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            details: []
          }
        })
        return
      }

      // Validate query parameters
      const queryValidation = postQuerySchema.safeParse(req.query)
      if (!queryValidation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: queryValidation.error.issues
          }
        })
        return
      }

      const validatedQuery = queryValidation.data
      const page = parseInt(validatedQuery.page)
      const limit = Math.min(parseInt(validatedQuery.limit), 50) // Enforce max limit

      // Calculate pagination
      const offset = (page - 1) * limit

      // Get posts by the user's ID
      const result = await this.postRepository.findPublished({
        offset,
        limit,
        authorId: user.id
      })

      // Prepare pagination response
      const pagination = {
        page,
        limit,
        totalCount: result.totalCount,
        hasMore: result.totalCount > offset + result.posts.length
      }

      res.status(200).json({
        success: true,
        data: {
          posts: result.posts,
          pagination,
          author: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            isVerified: user.isVerified
          }
        }
      })

    } catch (error) {
      console.error('Error getting user posts:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user posts',
          details: []
        }
      })
    }
  }

  /**
   * Create a new post
   * POST /posts
   */
  async createPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to create posts',
            details: []
          }
        })
        return
      }

      // Validate request body
      const bodyValidation = createPostSchema.safeParse(req.body)
      if (!bodyValidation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid post data',
            details: bodyValidation.error.issues
          }
        })
        return
      }

      const validatedData = bodyValidation.data

      // Create post data
      const postData = {
        content: validatedData.content,
        contentWarning: validatedData.contentWarning || null,
        authorId: userId,
        isPublished: !validatedData.isScheduled,
        scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Create the post
      const newPost = await this.postRepository.create(postData)

      res.status(201).json({
        success: true,
        data: {
          post: newPost
        },
        message: 'Post created successfully'
      })

    } catch (error) {
      console.error('Error creating post:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create post',
          details: []
        }
      })
    }
  }

  /**
   * Get a specific post by ID
   * GET /posts/:id
   */
  async getPostById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const postId = req.params['id']
      const userId = req.user?.id

      if (!postId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Post ID is required',
            details: []
          }
        })
        return
      }

      // Get post with author and media information
      const post = await this.postRepository.findByIdWithAuthorAndMedia(postId)

      if (!post) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Post not found',
            details: []
          }
        })
        return
      }

      // Check if user can access this post (published or owned by user)
      if (!post.isPublished && post.authorId !== userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'This post is not publicly available',
            details: []
          }
        })
        return
      }

      res.status(200).json({
        success: true,
        data: { post }
      })

    } catch (error) {
      console.error('Error getting post by ID:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve post',
          details: []
        }
      })
    }
  }

  /**
   * Delete a post
   * DELETE /posts/:id
   */
  async deletePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const postId = req.params['id']
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to delete posts',
            details: []
          }
        })
        return
      }

      if (!postId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Post ID is required',
            details: []
          }
        })
        return
      }

      // Check if post exists and is owned by user
      const postExists = await this.postRepository.existsByIdAndAuthor(postId, userId)
      if (!postExists) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Post not found or you do not have permission to delete it',
            details: []
          }
        })
        return
      }

      // Delete the post
      await this.postRepository.delete(postId)

      res.status(200).json({
        success: true,
        message: 'Post deleted successfully'
      })

    } catch (error) {
      console.error('Error deleting post:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete post',
          details: []
        }
      })
    }
  }

  /**
   * Note: Additional methods like updatePost can be added here as needed.
   */
}