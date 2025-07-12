// backend/src/controllers/PostController.ts
// Version: 1.0.0 - Complete PostController implementation
// Full controller implementation for post management operations

import { Request, Response } from 'express'
import type { PostRepository } from '../repositories/PostRepository'
import type { UserRepository } from '../repositories/UserRepository'
import { z } from 'zod'

// Interface for authenticated requests (user from auth middleware)
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

// Validation schemas
const createPostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(280, 'Content must be 280 characters or less'),
  contentWarning: z.string().optional().nullable(),
  isScheduled: z.boolean().optional().default(false),
  scheduledFor: z.string().datetime().optional().nullable(),
  isPublished: z.boolean().optional()
})

const updatePostSchema = z.object({
  content: z.string().min(1, 'Content is required').max(280, 'Content must be 280 characters or less').optional(),
  contentWarning: z.string().optional().nullable(),
  isPublished: z.boolean().optional()
})

const postQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  authorId: z.string().optional(),
  includeContentWarning: z.string().optional()
})

/**
 * PostController handles all post-related HTTP requests
 * Manages post creation, retrieval, updates, and deletion
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
      // Ensure user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
        return
      }

      // Validate request body
      const validationResult = createPostSchema.safeParse(req.body)
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.issues
        })
        return
      }

      const validatedData = validationResult.data

      // Prepare post data for creation
      const postData = {
        content: validatedData.content,
        contentWarning: validatedData.contentWarning || null,
        authorId: req.user.id,
        isScheduled: validatedData.isScheduled || false,
        scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : null,
        isPublished: validatedData.isScheduled ? false : (validatedData.isPublished ?? true),
        publishedAt: validatedData.isScheduled ? null : new Date()
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
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * Get paginated posts with proper parameter validation
   * GET /posts
   */
  async getPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Validate query parameters using the schema
      const queryValidation = postQuerySchema.safeParse(req.query)
      if (!queryValidation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: queryValidation.error.issues
        })
        return
      }

      const validatedQuery = queryValidation.data

      // Parse pagination parameters with defaults using validated data
      const page = parseInt(validatedQuery.page || '1') || 1
      const limit = parseInt(validatedQuery.limit || '20') || 20 // Default to 20 as expected by tests
      const authorId = validatedQuery.authorId
      const userId = req.user?.id

      // Calculate offset for repository
      const offset = (page - 1) * limit

      // Build repository query options
      const queryOptions: any = {
        offset,
        limit,
        orderBy: 'publishedAt',
        orderDirection: 'desc'
      }

      // Add author filter if specified
      if (authorId) {
        queryOptions.authorId = authorId
      }

      // Add content warning filter if specified
      if (validatedQuery.includeContentWarning !== undefined) {
        queryOptions.hasContentWarning = validatedQuery.includeContentWarning === 'true'
      }

      // Use the actual repository interface
      const result = await this.postRepository.findPublished(queryOptions)

      // Filter out current user's own posts if authenticated (as tests expect this behavior)
      let { posts } = result
      const { totalCount, hasMore } = result

      if (userId && !authorId) { // Only filter if not specifically requesting an author's posts
        posts = posts.filter(post => post.authorId !== userId)
      }

      res.status(200).json({
        success: true,
        data: {
          posts,
          pagination: {
            total: totalCount,
            page,
            limit,
            hasNext: hasMore
          }
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve posts'
      })
    }
  }

  /**
   * Get a specific post by ID with access control
   * GET /posts/:id
   */
  async getPostById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const postId = req.params['id'] // Use bracket notation for params
      const userId = req.user?.id

      // Validate post ID parameter
      if (!postId) {
        res.status(400).json({
          success: false,
          error: 'Post ID is required'
        })
        return
      }

      // Find the post with author and media information using the correct method
      const post = await this.postRepository.findByIdWithAuthorAndMedia(postId)

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        })
        return
      }

      // Check if user can access unpublished posts (only author can see their drafts)
      if (!post.isPublished && post.authorId !== userId) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        })
        return
      }

      res.status(200).json({
        success: true,
        data: { post }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve post',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * Update an existing post
   * PUT /posts/:id
   */
  async updatePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
        return
      }

      const postId = req.params['id']
      const userId = req.user.id

      // Validate post ID
      if (!postId) {
        res.status(400).json({
          success: false,
          error: 'Post ID is required'
        })
        return
      }

      // Validate request body
      const validationResult = updatePostSchema.safeParse(req.body)
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.issues
        })
        return
      }

      // Check if post exists and user owns it
      const postExists = await this.postRepository.existsByIdAndAuthor(postId, userId)
      if (!postExists) {
        res.status(404).json({
          success: false,
          error: 'Post not found or access denied'
        })
        return
      }

      // Update the post
      const validatedData = validationResult.data
      const updateData: any = { ...validatedData }

      // Set publishedAt if publishing for the first time
      if (validatedData.isPublished === true) {
        const existingPost = await this.postRepository.findById(postId)
        if (existingPost && !existingPost.isPublished) {
          updateData.publishedAt = new Date()
        }
      }

      const updatedPost = await this.postRepository.update(postId, updateData)

      res.status(200).json({
        success: true,
        data: { post: updatedPost }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to update post',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * Delete a post
   * DELETE /posts/:id
   */
  async deletePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
        return
      }

      const postId = req.params['id']
      const userId = req.user.id

      // Validate post ID
      if (!postId) {
        res.status(400).json({
          success: false,
          error: 'Post ID is required'
        })
        return
      }

      // Check if post exists and user owns it
      const postExists = await this.postRepository.existsByIdAndAuthor(postId, userId)
      if (!postExists) {
        res.status(404).json({
          success: false,
          error: 'Post not found or access denied'
        })
        return
      }

      // Delete the post
      const deletedPost = await this.postRepository.delete(postId)

      res.status(200).json({
        success: true,
        message: 'Post deleted successfully',
        data: { 
          deletedPost: {
            id: deletedPost.id,
            content: deletedPost.content
          }
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete post',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * Get posts by a specific user
   * GET /users/:username/posts
   */
  async getUserPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const username = req.params['username']
      const currentUserId = req.user?.id

      // Validate username parameter
      if (!username) {
        res.status(400).json({
          success: false,
          error: 'Username is required'
        })
        return
      }

      // Validate query parameters using the schema
      const queryValidation = postQuerySchema.safeParse(req.query)
      if (!queryValidation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: queryValidation.error.issues
        })
        return
      }

      const validatedQuery = queryValidation.data
      const page = parseInt(validatedQuery.page || '1') || 1
      const limit = parseInt(validatedQuery.limit || '20') || 20

      // Find the user by username
      const user = await this.userRepository.findByUsername(username)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        })
        return
      }

      // Calculate offset for pagination
      const offset = (page - 1) * limit

      // Determine what posts to show based on viewing user
      const isOwnProfile = currentUserId === user.id
      const postFilter: any = {
        offset,
        limit,
        orderBy: 'createdAt',
        orderDirection: 'desc'
      }

      // If viewing own profile, show all posts including drafts
      // If viewing others, only show published posts
      if (!isOwnProfile) {
        postFilter.isPublished = true
      }

      // Get user's posts
      const result = await this.postRepository.findByAuthor(user.id, postFilter)

      res.status(200).json({
        success: true,
        data: {
          posts: result.posts,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            isVerified: user.isVerified
          },
          pagination: {
            total: result.totalCount,
            page,
            limit,
            hasNext: result.hasMore
          }
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user posts',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * Get scheduled posts (admin/author only)
   * GET /posts/scheduled
   */
  async getScheduledPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
        return
      }

      // Validate query parameters using the schema (for potential future pagination)
      const queryValidation = postQuerySchema.safeParse(req.query)
      if (!queryValidation.success) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: queryValidation.error.issues
        })
        return
      }

      // Get user's scheduled posts - findScheduled only takes authorId string parameter
      const result = await this.postRepository.findScheduled(req.user.id)

      res.status(200).json({
        success: true,
        data: {
          posts: result.posts,
          pagination: {
            total: result.totalCount,
            page: 1, // Repository handles pagination internally
            limit: 20, // Repository uses default limit
            hasNext: result.hasMore
          }
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve scheduled posts',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }

  /**
   * Get post statistics for the current user
   * GET /posts/stats
   */
  async getPostStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
        return
      }

      // Get comprehensive stats for the user
      const stats = await this.postRepository.getAuthorStats(req.user.id)

      res.status(200).json({
        success: true,
        data: { stats }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve post statistics',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }
}