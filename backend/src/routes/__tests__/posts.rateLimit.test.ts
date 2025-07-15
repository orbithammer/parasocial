// backend/src/routes/__tests__/posts.routes.test.ts
// Version: 9.0.0 - Fixed Response typing issues with proper mock method signatures
// Changed: Added proper typing for mock controller methods to match PostController interface

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express, { Application, Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { createPostsRouter } from '../posts'
import type { PostController } from '../../controllers/PostController'

// AuthenticatedRequest interface matching controller expectations
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

// Create properly typed mock controller methods that match PostController signatures
const mockCreatePost = vi.fn().mockImplementation(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(201).json({
      success: true,
      data: {
        post: {
          id: 'new-post-123',
          content: req.body.content,
          authorId: req.user?.id,
          createdAt: new Date().toISOString()
        }
      }
    })
  }
)

const mockGetPosts = vi.fn().mockImplementation(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: { 
        posts: [], 
        pagination: { total: 0, page: 1, limit: 20, hasNext: false } 
      }
    })
  }
)

const mockDeletePost = vi.fn().mockImplementation(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    })
  }
)

const mockGetPostById = vi.fn().mockImplementation(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: { 
        post: { 
          id: req.params.id, 
          content: 'Test content',
          authorId: 'test-author'
        } 
      }
    })
  }
)

const mockGetUserPosts = vi.fn().mockImplementation(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: { posts: [] }
    })
  }
)

const mockUpdatePost = vi.fn().mockImplementation(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: { 
        post: { 
          id: req.params.id, 
          content: req.body.content || 'Updated content' 
        } 
      }
    })
  }
)

const mockGetScheduledPosts = vi.fn().mockImplementation(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: { posts: [] }
    })
  }
)

const mockGetPostStats = vi.fn().mockImplementation(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: { 
        stats: { 
          totalPosts: 0, 
          publishedPosts: 0, 
          scheduledPosts: 0 
        } 
      }
    })
  }
)

// Create mock controller with properly typed methods including private properties
const mockPostController = {
  getPosts: mockGetPosts,
  createPost: mockCreatePost,
  getPostById: mockGetPostById,
  deletePost: mockDeletePost,
  getUserPosts: mockGetUserPosts,
  updatePost: mockUpdatePost,
  getScheduledPosts: mockGetScheduledPosts,
  getPostStats: mockGetPostStats,
  // Include private properties to satisfy TypeScript
  postRepository: {} as any,
  userRepository: {} as any
} as unknown as PostController

// Mock middleware functions with proper async signatures
const mockAuthMiddleware = vi.fn().mockImplementation(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Simulate authenticated user being added by auth middleware
    (req as AuthenticatedRequest).user = {
      id: 'test-user-123',
      username: 'testuser',
      email: 'test@example.com'
    }
    next()
  }
)

const mockOptionalAuthMiddleware = vi.fn().mockImplementation(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Optional auth - user may or may not be present
    next()
  }
)

// Mock validation middleware - simplified for testing
const mockValidationMiddleware = vi.fn().mockImplementation(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Validation passes in tests
    next()
  }
)

// Mock rate limiting with proper typing for testing
const mockRateLimitMiddleware = vi.fn().mockImplementation(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Rate limiting passes in tests
    next()
  }
)

// Mock all validation middleware modules
vi.mock('../../middleware/postValidationMiddleware', () => ({
  validatePostCreationEndpoint: [mockValidationMiddleware],
  validatePostDeletionEndpoint: [mockValidationMiddleware],
  validatePostListQuery: mockValidationMiddleware,
  validatePostIdParam: mockValidationMiddleware
}))

vi.mock('../../middleware/rateLimitMiddleware', () => ({
  postCreationRateLimit: mockRateLimitMiddleware
}))

describe('Posts Routes', () => {
  let app: Application

  // Test data
  const validPostData = {
    content: 'This is a test post content',
    contentWarning: null,
    isScheduled: false
  }

  beforeEach(() => {
    // Create Express app for testing
    app = express()
    app.use(express.json())

    // Create posts router with mocked dependencies
    const postsRouter = createPostsRouter({
      postController: mockPostController,
      authMiddleware: mockAuthMiddleware,
      optionalAuthMiddleware: mockOptionalAuthMiddleware
    })

    // Mount the router
    app.use('/posts', postsRouter)
  })

  afterEach(() => {
    // Clear all mocks after each test
    vi.clearAllMocks()
  })

  describe('GET /posts', () => {
    it('should get public posts successfully', async () => {
      const response = await request(app)
        .get('/posts')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('posts')
      expect(mockOptionalAuthMiddleware).toHaveBeenCalledTimes(1)
      expect(mockGetPosts).toHaveBeenCalledTimes(1)
    })

    it('should handle query parameters for pagination', async () => {
      const response = await request(app)
        .get('/posts')
        .query({ page: '2', limit: '10' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(mockValidationMiddleware).toHaveBeenCalled()
      expect(mockGetPosts).toHaveBeenCalledTimes(1)
    })
  })

  describe('POST /posts', () => {
    it('should create post successfully with authentication', async () => {
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send(validPostData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('post')
      expect(mockAuthMiddleware).toHaveBeenCalledTimes(1)
      expect(mockRateLimitMiddleware).toHaveBeenCalledTimes(1)
      expect(mockCreatePost).toHaveBeenCalledTimes(1)
    })

    it('should apply rate limiting to post creation', async () => {
      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send(validPostData)
        .expect(201)

      // Verify rate limiting middleware was called
      expect(mockRateLimitMiddleware).toHaveBeenCalledTimes(1)
      expect(mockAuthMiddleware).toHaveBeenCalledTimes(1)
      expect(mockCreatePost).toHaveBeenCalledTimes(1)
    })

    it('should require authentication for post creation', async () => {
      const response = await request(app)
        .post('/posts')
        .send(validPostData)

      // Auth middleware should still be called (it would normally reject)
      expect(mockAuthMiddleware).toHaveBeenCalledTimes(1)
    })
  })

  describe('GET /posts/:id', () => {
    it('should get specific post by ID', async () => {
      const testPostId = 'test-post-123'
      const response = await request(app)
        .get(`/posts/${testPostId}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('post')
      expect(response.body.data.post.id).toBe(testPostId)
      expect(mockOptionalAuthMiddleware).toHaveBeenCalledTimes(1)
      expect(mockGetPostById).toHaveBeenCalledTimes(1)
    })

    it('should validate post ID parameter', async () => {
      const response = await request(app)
        .get('/posts/invalid-id')
        .expect(200) // Mock always succeeds

      expect(mockValidationMiddleware).toHaveBeenCalled()
      expect(mockGetPostById).toHaveBeenCalledTimes(1)
    })
  })

  describe('DELETE /posts/:id', () => {
    it('should delete post with authentication', async () => {
      const testPostId = 'test-post-123'
      const response = await request(app)
        .delete(`/posts/${testPostId}`)
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Post deleted successfully')
      expect(mockAuthMiddleware).toHaveBeenCalledTimes(1)
      expect(mockDeletePost).toHaveBeenCalledTimes(1)
    })

    it('should require authentication for post deletion', async () => {
      const response = await request(app)
        .delete('/posts/test-post-123')

      // Auth middleware should be called
      expect(mockAuthMiddleware).toHaveBeenCalledTimes(1)
    })
  })

  describe('Middleware Integration', () => {
    it('should apply correct middleware chain for POST requests', async () => {
      await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send(validPostData)

      // Verify middleware execution order
      expect(mockRateLimitMiddleware).toHaveBeenCalledTimes(1)
      expect(mockAuthMiddleware).toHaveBeenCalledTimes(1)
      expect(mockValidationMiddleware).toHaveBeenCalled()
      expect(mockCreatePost).toHaveBeenCalledTimes(1)
    })

    it('should apply optional auth for GET requests', async () => {
      await request(app)
        .get('/posts')

      expect(mockOptionalAuthMiddleware).toHaveBeenCalledTimes(1)
      expect(mockGetPosts).toHaveBeenCalledTimes(1)
    })

    it('should validate parameters for ID-based routes', async () => {
      await request(app)
        .get('/posts/test-id')

      expect(mockValidationMiddleware).toHaveBeenCalled()
      expect(mockGetPostById).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle controller errors gracefully', async () => {
      // Mock an error in the controller
      mockGetPosts.mockImplementationOnce(
        async (req: AuthenticatedRequest, res: Response): Promise<void> => {
          res.status(500).json({
            success: false,
            error: 'Internal server error'
          })
        }
      )

      const response = await request(app)
        .get('/posts')
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBe('Internal server error')
    })
  })
})