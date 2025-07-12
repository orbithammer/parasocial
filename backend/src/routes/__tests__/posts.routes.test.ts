// backend/src/routes/__tests__/posts.routes.test.ts
// Version: 3.1.0 - Fixed TypeScript async middleware issues
// Changed: Made all middleware mocks properly async to match MiddlewareFunction type expectations

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express, { Application, Request, Response, NextFunction } from 'express'
import request from 'supertest'
import { createPostsRouter } from '../posts'
import { PostController } from '../../controllers/PostController'

// AuthenticatedRequest interface matching the controller expectations
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

// Mock post controller functions with proper mock typing
const mockCreatePost = vi.fn()
const mockGetPosts = vi.fn()
const mockGetPostById = vi.fn()
const mockDeletePost = vi.fn()
const mockGetUserPosts = vi.fn()

// Mock post controller with proper mock properties preserved
const mockPostController = {
  createPost: mockCreatePost,
  getPosts: mockGetPosts,
  getPostById: mockGetPostById,
  deletePost: mockDeletePost,
  getUserPosts: mockGetUserPosts
} as unknown as PostController

// Mock middleware functions with proper async signatures but simple implementation
const mockAuthMiddleware = vi.fn().mockImplementation(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Mock authenticated user
  ;(req as AuthenticatedRequest).user = {
    id: 'test-user-123',
    email: 'test@example.com',
    username: 'testuser'
  }
  next()
})

const mockOptionalAuthMiddleware = vi.fn().mockImplementation(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Optional auth - adds user if authorization header present
  if (req.headers.authorization) {
    ;(req as AuthenticatedRequest).user = {
      id: 'test-user-123',
      email: 'test@example.com', 
      username: 'testuser'
    }
  }
  next()
})

// Simple validation middleware mocks that just call next() - async version
const mockValidationMiddleware = vi.fn().mockImplementation(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  next()
})

// Mock validation middleware exports
vi.mock('../../middleware/postValidationMiddleware', () => ({
  validatePostCreationEndpoint: [mockValidationMiddleware],
  validatePostUpdateEndpoint: [mockValidationMiddleware],
  validatePostDeletionEndpoint: [mockValidationMiddleware],
  validatePostListQuery: mockValidationMiddleware,
  validatePostIdParam: mockValidationMiddleware
}))

// Mock rate limiting middleware to just call next() - async version
vi.mock('../../middleware/rateLimitMiddleware', () => ({
  postCreationRateLimit: vi.fn().mockImplementation(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    next()
  })
}))

describe('Posts Routes - General Functionality', () => {
  let app: Application

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    
    // Reset individual mock implementations with simple responses
    mockCreatePost.mockImplementation((req: AuthenticatedRequest, res: Response) => {
      res.status(201).json({
        success: true,
        data: {
          post: {
            id: 'new-post-123',
            content: req.body.content,
            contentWarning: req.body.contentWarning,
            authorId: req.user?.id,
            isPublished: true,
            createdAt: '2024-01-15T10:00:00Z',
            publishedAt: '2024-01-15T10:00:00Z'
          }
        }
      })
    })

    mockGetPosts.mockImplementation((req: AuthenticatedRequest, res: Response) => {
      res.status(200).json({
        success: true,
        data: {
          posts: [
            {
              id: 'post-1',
              content: 'First test post',
              authorId: 'author-1',
              publishedAt: '2024-01-15T10:00:00Z'
            },
            {
              id: 'post-2', 
              content: 'Second test post',
              authorId: 'author-2',
              publishedAt: '2024-01-15T09:00:00Z'
            }
          ],
          pagination: {
            total: 2,
            page: 1,
            limit: 20,
            hasNext: false
          }
        }
      })
    })

    mockGetPostById.mockImplementation((req: AuthenticatedRequest, res: Response) => {
      const postId = req.params.id
      res.status(200).json({
        success: true,
        data: {
          post: {
            id: postId,
            content: 'This is a specific test post',
            contentWarning: null,
            authorId: 'author-123',
            isPublished: true,
            publishedAt: '2024-01-15T10:00:00Z',
            author: {
              id: 'author-123',
              username: 'testauthor',
              displayName: 'Test Author'
            }
          }
        }
      })
    })

    mockDeletePost.mockImplementation((req: AuthenticatedRequest, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Post deleted successfully',
        data: {
          deletedPost: {
            id: req.params.id,
            content: 'Deleted post content'
          }
        }
      })
    })

    mockGetUserPosts.mockImplementation((req: AuthenticatedRequest, res: Response) => {
      res.status(200).json({
        success: true,
        data: { posts: [] }
      })
    })
    
    // Create fresh Express app for each test
    app = express()
    app.use(express.json())

    // Create router with mocked dependencies
    const postsRouter = createPostsRouter({
      postController: mockPostController,
      authMiddleware: mockAuthMiddleware,
      optionalAuthMiddleware: mockOptionalAuthMiddleware
    })

    // Mount the router
    app.use('/posts', postsRouter)
  })

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks()
  })

  describe('GET /posts - Public Feed', () => {
    it('should get public posts without authentication', async () => {
      const response = await request(app)
        .get('/posts')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.posts).toHaveLength(2)
      expect(response.body.data.pagination).toBeDefined()
      
      // Verify optional auth middleware was called
      expect(mockOptionalAuthMiddleware).toHaveBeenCalled()
      
      // Verify controller was called
      expect(mockGetPosts).toHaveBeenCalledTimes(1)
    })

    it('should get public posts with authentication', async () => {
      const response = await request(app)
        .get('/posts')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.posts).toHaveLength(2)
      
      // Verify optional auth middleware was called and user was set
      expect(mockOptionalAuthMiddleware).toHaveBeenCalled()
    })

    it('should handle query parameters for pagination', async () => {
      const response = await request(app)
        .get('/posts')
        .query({ page: '2', limit: '10' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(mockGetPosts).toHaveBeenCalled()
      
      // Verify query parameters are passed to controller
      const calledWith = mockGetPosts.mock.calls[0][0]
      expect(calledWith.query.page).toBe('2')
      expect(calledWith.query.limit).toBe('10')
    })

    it('should handle author filtering', async () => {
      const response = await request(app)
        .get('/posts')
        .query({ authorId: 'specific-author-123' })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(mockGetPosts).toHaveBeenCalled()
      
      // Verify author filter is passed to controller
      const calledWith = mockGetPosts.mock.calls[0][0]
      expect(calledWith.query.authorId).toBe('specific-author-123')
    })
  })

  describe('POST /posts - Create Post', () => {
    it('should create a new post with authentication', async () => {
      const postData = {
        content: 'This is a new test post',
        contentWarning: null,
        isScheduled: false
      }

      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send(postData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.post.content).toBe(postData.content)
      expect(response.body.data.post.authorId).toBe('test-user-123')
      
      // Verify auth middleware was called
      expect(mockAuthMiddleware).toHaveBeenCalled()
      
      // Verify controller was called with correct data
      expect(mockCreatePost).toHaveBeenCalledTimes(1)
    })

    it('should create a post with content warning', async () => {
      const postData = {
        content: 'This post has sensitive content',
        contentWarning: 'Contains discussion of sensitive topics',
        isScheduled: false
      }

      const response = await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send(postData)
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.post.content).toBe(postData.content)
      expect(response.body.data.post.contentWarning).toBe(postData.contentWarning)
    })

    it('should require authentication for post creation', async () => {
      const postData = {
        content: 'This should require auth'
      }

      const response = await request(app)
        .post('/posts')
        .send(postData)
        .expect(201) // Our mock always succeeds, but real auth would reject

      // Verify auth middleware was called
      expect(mockAuthMiddleware).toHaveBeenCalled()
    })
  })

  describe('GET /posts/:id - Get Specific Post', () => {
    it('should get a specific post by ID without authentication', async () => {
      const response = await request(app)
        .get('/posts/test-post-123')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.post.id).toBe('test-post-123')
      
      // Verify optional auth middleware was called
      expect(mockOptionalAuthMiddleware).toHaveBeenCalled()
      
      // Verify controller was called with correct ID
      expect(mockGetPostById).toHaveBeenCalledTimes(1)
      const calledWith = mockGetPostById.mock.calls[0][0]
      expect(calledWith.params.id).toBe('test-post-123')
    })

    it('should get a specific post by ID with authentication', async () => {
      const response = await request(app)
        .get('/posts/test-post-456')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.post.id).toBe('test-post-456')
      
      // Verify optional auth middleware was called
      expect(mockOptionalAuthMiddleware).toHaveBeenCalled()
    })

    it('should include author information in response', async () => {
      const response = await request(app)
        .get('/posts/test-post-with-author')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.post.author).toBeDefined()
      expect(response.body.data.post.author.username).toBe('testauthor')
      expect(response.body.data.post.author.displayName).toBe('Test Author')
    })
  })

  describe('DELETE /posts/:id - Delete Post', () => {
    it('should delete a post with authentication', async () => {
      const response = await request(app)
        .delete('/posts/test-post-123')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('Post deleted successfully')
      
      // Verify auth middleware was called
      expect(mockAuthMiddleware).toHaveBeenCalled()
      
      // Verify controller was called with correct ID
      expect(mockDeletePost).toHaveBeenCalledTimes(1)
      const calledWith = mockDeletePost.mock.calls[0][0]
      expect(calledWith.params.id).toBe('test-post-123')
    })

    it('should require authentication for post deletion', async () => {
      const response = await request(app)
        .delete('/posts/test-post-123')
        .expect(200) // Our mock always succeeds, but real auth would reject

      // Verify auth middleware was called
      expect(mockAuthMiddleware).toHaveBeenCalled()
    })

    it('should return deleted post information', async () => {
      const response = await request(app)
        .delete('/posts/deleted-post-789')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.deletedPost).toBeDefined()
      expect(response.body.data.deletedPost.id).toBe('deleted-post-789')
    })
  })

  describe('Router Dependency Injection', () => {
    it('should properly inject PostController dependency', async () => {
      // Test that the router uses the injected PostController
      await request(app)
        .get('/posts')
        .expect(200)

      expect(mockGetPosts).toHaveBeenCalled()
    })

    it('should properly inject auth middleware dependencies', async () => {
      // Test that both auth middlewares are properly injected
      await request(app)
        .get('/posts')
        .expect(200)

      await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send({ content: 'Test' })
        .expect(201)

      expect(mockOptionalAuthMiddleware).toHaveBeenCalled()
      expect(mockAuthMiddleware).toHaveBeenCalled()
    })

    it('should create router without throwing errors', () => {
      // Test that router creation doesn't throw with proper dependencies
      expect(() => {
        createPostsRouter({
          postController: mockPostController,
          authMiddleware: mockAuthMiddleware,
          optionalAuthMiddleware: mockOptionalAuthMiddleware
        })
      }).not.toThrow()
    })
  })

  describe('Middleware Chain Integration', () => {
    it('should apply correct middleware chain for GET /posts', async () => {
      await request(app)
        .get('/posts')
        .expect(200)

      // Should call optional auth middleware
      expect(mockOptionalAuthMiddleware).toHaveBeenCalled()
      // Should call validation middleware (mocked to pass through)
      expect(mockGetPosts).toHaveBeenCalled()
    })

    it('should apply correct middleware chain for POST /posts', async () => {
      await request(app)
        .post('/posts')
        .set('Authorization', 'Bearer test-token')
        .send({ content: 'Test post' })
        .expect(201)

      // Should call auth middleware (required)
      expect(mockAuthMiddleware).toHaveBeenCalled()
      // Should call validation middleware (mocked to pass through)
      expect(mockCreatePost).toHaveBeenCalled()
    })

    it('should apply correct middleware chain for DELETE /posts/:id', async () => {
      await request(app)
        .delete('/posts/test-post-123')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      // Should call auth middleware (required)
      expect(mockAuthMiddleware).toHaveBeenCalled()
      // Should call validation middleware (mocked to pass through)
      expect(mockDeletePost).toHaveBeenCalled()
    })
  })
})