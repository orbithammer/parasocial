// backend/src/controllers/PostController.ts
// Version: 4.3.0 - Fixed unused variable warnings and optimized variable usage
// Changed: Removed unused variable warnings by optimizing variable declarations

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
 * Validation schema for post updates
 */
const updatePostSchema = z.object({
  content: z.string().min(1, 'Post content cannot be empty').max(5000).optional(),
  contentWarning: z.string().max(500).optional().nullable(),
  isPublished: z.boolean().optional()
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
            details: queryValidation.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        })
        return
      }

      const { page, limit, author, includeContentWarning } = queryValidation.data
      const pageNum = parseInt(page)
      const limitNum = parseInt(limit)
      const offset = (pageNum - 1) * limitNum

      // Prepare filter parameters - only include properties with actual values
      const baseParams = {
        offset,
        limit: limitNum
      }

      // Build filter object with only defined properties
      const filterParams = { ...baseParams }
      
      if (author) {
        Object.assign(filterParams, { authorId: author })
      }
      
      if (includeContentWarning === 'true') {
        Object.assign(filterParams, { hasContentWarning: true })
      } else if (includeContentWarning === 'false') {
        Object.assign(filterParams, { hasContentWarning: false })
      }

      // Get posts with pagination
      const posts = await this.postRepository.findPublished(filterParams)

      res.status(200).json({
        success: true,
        data: {
          posts,
          pagination: {
            page: pageNum,
            limit: limitNum,
            offset
          }
        }
      })

    } catch (error) {
      console.error('Error getting posts:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch posts',
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
      const validation = createPostSchema.safeParse(req.body)
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid post data',
            details: validation.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        })
        return
      }

      const { content, contentWarning, isScheduled, scheduledFor } = validation.data

      // Create post data
      const postData = {
        content,
        contentWarning: contentWarning || null,
        isScheduled: isScheduled || false,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        isPublished: !isScheduled,
        authorId: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Create the post
      const post = await this.postRepository.create(postData)

      res.status(201).json({
        success: true,
        data: { post },
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

      if (!postId || typeof postId !== 'string') {
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

      // Get post by ID
      const post = await this.postRepository.findByIdWithAuthorAndMedia?.(postId) || 
                   await this.postRepository.findById(postId)
      
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
      const userId = req.user?.id
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
   * Update a post
   * PUT /posts/:id
   */
  async updatePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const postId = req.params['id']
      const userId = req.user?.id

      // Check authentication
      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to update posts',
            details: []
          }
        })
        return
      }

      // Validate post ID
      if (!postId || typeof postId !== 'string') {
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

      // Validate request body
      const validation = updatePostSchema.safeParse(req.body)
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid update data',
            details: validation.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        })
        return
      }

      // Special validation for empty content
      if (validation.data.content !== undefined && validation.data.content.trim() === '') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Post content cannot be empty',
            details: []
          }
        })
        return
      }

      // Find the post and check ownership
      const existingPost = await this.postRepository.findById(postId)
      if (!existingPost) {
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

      // Check ownership
      if (existingPost.authorId !== userId) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only edit your own posts',
            details: []
          }
        })
        return
      }

      // Prepare update data - build object with only defined properties
      const baseUpdateData = {
        updatedAt: new Date(),
        scheduledFor: null as null,
        isPublished: validation.data.isPublished ?? true
      }

      // Build the final update object with only the properties that have values
      const updateData = { ...baseUpdateData }
      
      if (validation.data.content !== undefined) {
        Object.assign(updateData, { content: validation.data.content })
      }
      
      if (validation.data.contentWarning !== undefined) {
        Object.assign(updateData, { contentWarning: validation.data.contentWarning })
      }

      // Update the post
      const updatedPost = await this.postRepository.update(postId, updateData)

      res.status(200).json({
        success: true,
        data: { post: updatedPost },
        message: 'Post updated successfully'
      })

    } catch (error) {
      console.error('Error updating post:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update post',
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

      if (!postId || typeof postId !== 'string') {
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
   * Get posts by a specific user (for user profile pages)
   * This method may be used by other controllers like UserController
   */
  async getUserPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const username = req.params['username']

      // Validate username parameter
      if (!username || typeof username !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Username parameter is required',
            details: []
          }
        })
        return
      }

      // Find the user first
      const user = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
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

      // Calculate pagination parameters
      const offset = (page - 1) * limit

      // Build query parameters object
      const queryParams = {
        offset,
        limit,
        authorId: user.id
      }

      // Get posts by the user's ID with only required parameters
      const result = await this.postRepository.findPublished(queryParams)

      res.status(200).json({
        success: true,
        data: {
          posts: result.posts || result,
          pagination: {
            page,
            limit,
            offset
          },
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
}