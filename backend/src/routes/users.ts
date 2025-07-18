// backend/src/controllers/PostController.ts
// Version: 3.7.0 - Added getUserPosts method and updated constructor
// Changed: Added UserRepository dependency and getUserPosts method to resolve TypeScript errors

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

  // ... rest of the existing methods (createPost, getPostById, deletePost, etc.)
}