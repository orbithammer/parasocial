// backend/src/controllers/PostController.ts - Version 3.6.0
// Fixed validation issues for failed tests: Enhanced Zod schemas and validation logic
// Changed: Added proper numeric validation for query params, nullable support for contentWarning

import { Request, Response } from 'express'
import { z } from 'zod'
import { PostRepository } from '../repositories/PostRepository'

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
 * Note: Feed functionality will be implemented separately when FollowService integration is complete
 */
export class PostController {
  constructor(
    private postRepository: PostRepository
  ) {}

  /**
   * Get public posts feed with pagination and filtering
   * GET /posts
   */
  async getPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Note: User authentication is optional for public posts
      // In the future, could use req.user?.id for blocking/filtering features

      // Validate query parameters with Zod
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
      const limit = Math.min(parseInt(validatedQuery.limit), 50) // Max 50 posts per page
      const offset = (page - 1) * limit
      const authorId = validatedQuery.author

      // Build filter options for published posts
      const filterOptions: any = {
        offset,
        limit
      }

      // Add author filter if specified
      if (authorId) {
        filterOptions.authorId = authorId
      }

      // Get published posts using the correct repository method
      const result = await this.postRepository.findPublished(filterOptions)

      res.status(200).json({
        success: true,
        data: {
          posts: result.posts,
          pagination: {
            page,
            limit,
            totalCount: result.totalCount,
            hasMore: result.hasMore
          }
        }
      })

    } catch (error) {
      console.error('Error fetching posts:', error)
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
      // Fixed: Use bracket notation to access id parameter
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

      // Get post with author and media information using correct repository method
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
        data: {
          post
        }
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
   * Update an existing post
   * Only allows the post author to edit their own posts
   * PUT /posts/:id
   */
  async updatePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const postId = req.params['id']
      const userId = req.user?.id

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

      // Validate post ID parameter
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

      // Check if post exists using the updated findById method
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

      // Check if user owns the post
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

      // Extract update data from request body
      const { content, contentWarning, isScheduled, scheduledFor } = req.body

      // Validate required fields
      if (!content || content.trim().length === 0) {
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

      // Prepare update data
      const updateData = {
        content: content.trim(),
        contentWarning: contentWarning || null,
        isPublished: !isScheduled,
        scheduledFor: isScheduled && scheduledFor ? new Date(scheduledFor) : null,
        updatedAt: new Date()
      }

      // Update the post
      const updatedPost = await this.postRepository.update(postId, updateData)

      res.status(200).json({
        success: true,
        data: {
          post: updatedPost
        },
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
   * Delete a post (only by the author)
   * DELETE /posts/:id
   */
  async deletePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Fixed: Use bracket notation to access id parameter
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

      // Validate post ID parameter
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

      // Check if post exists and user owns it
      const existsAndOwned = await this.postRepository.existsByIdAndAuthor(postId, userId)
      if (!existsAndOwned) {
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
}