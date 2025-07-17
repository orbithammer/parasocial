// backend/src/controllers/PostController.ts - Version 3.0.0
// Complete PostController implementation with all CRUD operations and feed functionality
// Added: getUserFeed() and updatePost() methods to complete Phase 2 requirements

import { Request, Response } from 'express'
import { z } from 'zod'
import { PostRepository } from '../repositories/PostRepository'
import { UserRepository } from '../repositories/UserRepository'
import { FollowService } from '../services/FollowService'

/**
 * Interface for follow relationship objects
 */
interface FollowRelationship {
  id: string
  followerId: string
  followedId: string
  actorId: string | null
  isAccepted: boolean
  createdAt: Date
  followed?: {
    id: string
    username: string
    displayName: string
    avatar: string | null
    isVerified: boolean
  }
}

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
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  author: z.string().optional(),
  includeContentWarning: z.enum(['true', 'false']).optional()
})

/**
 * Validation schema for post creation
 */
const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  contentWarning: z.string().max(500).optional(),
  isScheduled: z.boolean().default(false),
  scheduledFor: z.string().datetime().optional()
})

/**
 * Controller for handling post-related operations
 * Includes CRUD operations, feed generation, and user-specific post management
 */
export class PostController {
  constructor(
    private postRepository: PostRepository,
    private userRepository: UserRepository,
    private followService: FollowService
  ) {}

  /**
   * Get public posts feed with pagination and filtering
   * GET /posts
   */
  async getPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id

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
      const limit = Math.min(parseInt(validatedQuery.limit), 50) // Max 50 posts per page
      const offset = (page - 1) * limit
      const authorId = validatedQuery.author

      // Build query options
      const queryOptions: any = {
        offset,
        limit,
        onlyPublished: true,
        includeAuthor: true,
        includeMedia: true
      }

      // Add author filter if specified
      if (authorId) {
        queryOptions.authorId = authorId
      }

      // Add content warning filter if specified
      if (validatedQuery.includeContentWarning !== undefined) {
        queryOptions.hasContentWarning = validatedQuery.includeContentWarning === 'true'
      }

      // Get posts from repository
      const result = await this.postRepository.findPublished(queryOptions)

      // Filter out current user's own posts if authenticated (unless specifically requesting author's posts)
      let { posts } = result
      const { totalCount, hasMore } = result

      if (userId && !authorId) {
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
   * Get personalized feed for authenticated user
   * Shows posts from users they follow, ordered by creation date
   * GET /posts/feed
   */
  async getUserFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required for personalized feed',
            details: []
          }
        })
        return
      }

      // Parse pagination parameters
      const page = parseInt(req.query['page'] as string) || 1
      const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 50) // Max 50 posts
      const offset = (page - 1) * limit

      // Get list of users that this user follows using FollowService
      const followingResult = await this.followService.getFollowing(userId, { offset: 0, limit: 1000 })
      
      if (!followingResult.success) {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to retrieve following list',
            details: []
          }
        })
        return
      }

      const followingList = followingResult.data?.following as FollowRelationship[] | undefined
      const followedUserIds = followingList?.map((follow: FollowRelationship) => follow.followedId) || []

      if (followedUserIds.length === 0) {
        // User doesn't follow anyone, return empty feed
        res.status(200).json({
          success: true,
          data: {
            posts: [],
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalPosts: 0,
              hasNext: false,
              hasPrev: false
            }
          }
        })
        return
      }

      // Get posts from followed users
      const posts = await this.postRepository.getPostsByUserIds(
        followedUserIds,
        limit,
        offset
      )

      // Get total count for pagination
      const totalPosts = await this.postRepository.countPostsByUserIds(followedUserIds)
      const totalPages = Math.ceil(totalPosts / limit)

      res.status(200).json({
        success: true,
        data: {
          posts,
          pagination: {
            currentPage: page,
            totalPages,
            totalPosts,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      })

    } catch (error) {
      console.error('Error getting user feed:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user feed',
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
      // Ensure user is authenticated
      if (!req.user) {
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
            details: validation.error.issues
          }
        })
        return
      }

      const { content, contentWarning, isScheduled, scheduledFor } = validation.data

      // Validate scheduled post logic
      if (isScheduled && !scheduledFor) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Scheduled posts must have a scheduled date',
            details: [{ field: 'scheduledFor', message: 'scheduledFor is required when isScheduled is true' }]
          }
        })
        return
      }

      // Validate scheduled date is in the future
      if (isScheduled && scheduledFor) {
        const scheduledDate = new Date(scheduledFor)
        if (scheduledDate <= new Date()) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Scheduled date must be in the future',
              details: [{ field: 'scheduledFor', message: 'Cannot schedule posts for past dates' }]
            }
          })
          return
        }
      }

      // Prepare post data
      const postData = {
        content: content.trim(),
        contentWarning: contentWarning?.trim() || null,
        isScheduled,
        scheduledFor: isScheduled ? new Date(scheduledFor!) : null,
        isPublished: !isScheduled, // Scheduled posts are not published immediately
        authorId: req.user.id
      }

      // Create the post
      const post = await this.postRepository.create(postData)

      res.status(201).json({
        success: true,
        data: { post },
        message: isScheduled ? 'Post scheduled successfully' : 'Post created successfully'
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
   * Get a specific post by ID with access control
   * GET /posts/:id
   */
  async getPostById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const postId = req.params['id']
      const userId = req.user?.id

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

      // Find the post with author and media information
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

      // Check if user can access unpublished posts (only author can see their drafts)
      if (!post.isPublished && post.authorId !== userId) {
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

      // Check if post exists
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
            message: 'Post content is required',
            details: [{ field: 'content', message: 'Content cannot be empty' }]
          }
        })
        return
      }

      // Validate content length (max 5000 characters)
      if (content.length > 5000) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Post content is too long',
            details: [{ field: 'content', message: 'Content must be 5000 characters or less' }]
          }
        })
        return
      }

      // Validate scheduled post logic
      if (isScheduled && !scheduledFor) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Scheduled posts must have a scheduled date',
            details: [{ field: 'scheduledFor', message: 'scheduledFor is required when isScheduled is true' }]
          }
        })
        return
      }

      // Validate scheduled date is in the future
      if (isScheduled && scheduledFor) {
        const scheduledDate = new Date(scheduledFor)
        if (scheduledDate <= new Date()) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Scheduled date must be in the future',
              details: [{ field: 'scheduledFor', message: 'Cannot schedule posts for past dates' }]
            }
          })
          return
        }
      }

      // Prepare update data
      const updateData = {
        content: content.trim(),
        contentWarning: contentWarning?.trim() || null,
        isScheduled: Boolean(isScheduled),
        scheduledFor: isScheduled ? new Date(scheduledFor) : null,
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
      const postId = req.params.id
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

  /**
   * Get posts by a specific user
   * GET /users/:username/posts
   */
  async getUserPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const username = req.params['username']
      const userId = req.user?.id

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

      // Find the user by username
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

      // Parse pagination parameters
      const page = parseInt(req.query['page'] as string) || 1
      const limit = Math.min(parseInt(req.query['limit'] as string) || 20, 50)
      const offset = (page - 1) * limit

      // Determine if user can see unpublished posts (only their own)
      const includeUnpublished = userId === user.id

      // Get user's posts
      const result = await this.postRepository.findByAuthor(user.id, {
        offset,
        limit,
        includeUnpublished
      })

      res.status(200).json({
        success: true,
        data: {
          posts: result.posts,
          pagination: {
            total: result.totalCount,
            page,
            limit,
            hasNext: result.hasMore
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
   * Get scheduled posts (admin/author only)
   * GET /posts/scheduled
   */
  async getScheduledPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
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

      // Get user's scheduled posts
      const result = await this.postRepository.findScheduled(req.user.id)

      res.status(200).json({
        success: true,
        data: {
          posts: result.posts,
          pagination: {
            total: result.totalCount,
            page: 1,
            limit: 20,
            hasNext: result.hasMore
          }
        }
      })
    } catch (error) {
      console.error('Error getting scheduled posts:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve scheduled posts',
          details: []
        }
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
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            details: []
          }
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
      console.error('Error getting post stats:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve post statistics',
          details: []
        }
      })
    }
  }
}