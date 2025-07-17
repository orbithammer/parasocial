// backend/src/controllers/__tests__/PostController.test.ts - Version 2.0.0
// Fixed constructor arguments: Updated to match PostController that only takes PostRepository
// Changed: Removed unused UserRepository and FollowService mocks, updated test setup

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response } from 'express'
import { PostController } from '../PostController'
import { PostRepository } from '../../repositories/PostRepository'

/**
 * Mock authenticated request interface
 */
interface MockAuthenticatedRequest extends Partial<Request> {
  user?: {
    id: string
    email: string
    username: string
  }
  params?: Record<string, string>
  query?: Record<string, string>
  body?: Record<string, unknown>
}

/**
 * Mock response interface
 */
interface MockResponse extends Partial<Response> {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
}

/**
 * Mock PostRepository interface
 */
interface MockPostRepository {
  findPublished: ReturnType<typeof vi.fn>
  findByIdWithAuthorAndMedia: ReturnType<typeof vi.fn>
  findById: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  existsByIdAndAuthor: ReturnType<typeof vi.fn>
}

describe('PostController', () => {
  let postController: PostController
  let mockPostRepository: MockPostRepository
  let mockReq: MockAuthenticatedRequest
  let mockRes: MockResponse

  // Mock post data for testing
  const mockPost = {
    id: 'post-123',
    content: 'Test post content',
    contentWarning: null,
    isPublished: true,
    publishedAt: new Date('2024-01-01T12:00:00Z'),
    authorId: 'user-456',
    author: {
      id: 'user-456',
      username: 'testuser',
      displayName: 'Test User',
      avatar: null,
      isVerified: false
    },
    media: [],
    _count: { media: 0 },
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z')
  }

  const mockPostsResult = {
    posts: [mockPost],
    totalCount: 1,
    hasMore: false
  }

  beforeEach(() => {
    // Create mock PostRepository
    mockPostRepository = {
      findPublished: vi.fn(),
      findByIdWithAuthorAndMedia: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      existsByIdAndAuthor: vi.fn()
    }

    // Create PostController with only PostRepository
    postController = new PostController(mockPostRepository as unknown as PostRepository)

    // Setup mock request and response
    mockReq = {
      user: undefined,
      params: {},
      query: {},
      body: {}
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }

    // Clear all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Test GET /posts - public posts feed
   */
  describe('getPosts()', () => {
    it('should successfully get public posts with default pagination', async () => {
      // Arrange
      mockPostRepository.findPublished.mockResolvedValue(mockPostsResult)
      mockReq.query = {}

      // Act
      await postController.getPosts(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockPostRepository.findPublished).toHaveBeenCalledWith({
        offset: 0,
        limit: 20
      })

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          posts: [mockPost],
          pagination: {
            page: 1,
            limit: 20,
            totalCount: 1,
            hasMore: false
          }
        }
      })
    })

    it('should handle custom pagination parameters', async () => {
      // Arrange
      mockPostRepository.findPublished.mockResolvedValue(mockPostsResult)
      mockReq.query = { page: '2', limit: '10' }

      // Act
      await postController.getPosts(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockPostRepository.findPublished).toHaveBeenCalledWith({
        offset: 10, // (page 2 - 1) * 10
        limit: 10
      })

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            pagination: expect.objectContaining({
              page: 2,
              limit: 10
            })
          })
        })
      )
    })

    it('should handle author filter', async () => {
      // Arrange
      mockPostRepository.findPublished.mockResolvedValue(mockPostsResult)
      mockReq.query = { author: 'testuser' }

      // Act
      await postController.getPosts(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockPostRepository.findPublished).toHaveBeenCalledWith({
        offset: 0,
        limit: 20,
        authorId: 'testuser'
      })
    })

    it('should return validation error for invalid query parameters', async () => {
      // Arrange
      mockReq.query = { page: 'invalid', limit: 'also-invalid' }

      // Act
      await postController.getPosts(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: expect.any(Array)
        }
      })

      expect(mockPostRepository.findPublished).not.toHaveBeenCalled()
    })

    it('should enforce maximum limit of 50 posts', async () => {
      // Arrange
      mockPostRepository.findPublished.mockResolvedValue(mockPostsResult)
      mockReq.query = { limit: '100' } // Requesting more than max

      // Act
      await postController.getPosts(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockPostRepository.findPublished).toHaveBeenCalledWith({
        offset: 0,
        limit: 50 // Should be capped at 50
      })
    })
  })

  /**
   * Test POST /posts - create new post
   */
  describe('createPost()', () => {
    beforeEach(() => {
      // Set up authenticated user for create operations
      mockReq.user = {
        id: 'user-456',
        email: 'test@example.com',
        username: 'testuser'
      }
    })

    it('should successfully create a new post', async () => {
      // Arrange
      const newPostData = {
        content: 'This is a new test post',
        contentWarning: null,
        isScheduled: false
      }
      mockReq.body = newPostData
      mockPostRepository.create.mockResolvedValue(mockPost)

      // Act
      await postController.createPost(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockPostRepository.create).toHaveBeenCalledWith({
        content: newPostData.content,
        contentWarning: null,
        authorId: 'user-456',
        isPublished: true,
        scheduledFor: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })

      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { post: mockPost },
        message: 'Post created successfully'
      })
    })

    it('should handle scheduled posts', async () => {
      // Arrange
      const scheduledDate = '2024-12-31T23:59:59Z'
      const scheduledPostData = {
        content: 'This is a scheduled post',
        isScheduled: true,
        scheduledFor: scheduledDate
      }
      mockReq.body = scheduledPostData
      mockPostRepository.create.mockResolvedValue(mockPost)

      // Act
      await postController.createPost(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockPostRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: scheduledPostData.content,
          isPublished: false, // Should be false for scheduled posts
          scheduledFor: new Date(scheduledDate)
        })
      )
    })

    it('should require authentication', async () => {
      // Arrange
      mockReq.user = undefined // No authenticated user
      mockReq.body = { content: 'Test post' }

      // Act
      await postController.createPost(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to create posts',
          details: []
        }
      })

      expect(mockPostRepository.create).not.toHaveBeenCalled()
    })

    it('should validate post content', async () => {
      // Arrange
      mockReq.body = { content: '' } // Empty content

      // Act
      await postController.createPost(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid post data',
          details: expect.any(Array)
        }
      })

      expect(mockPostRepository.create).not.toHaveBeenCalled()
    })
  })

  /**
   * Test GET /posts/:id - get specific post
   */
  describe('getPostById()', () => {
    it('should successfully get post by ID', async () => {
      // Arrange
      mockReq.params = { id: 'post-123' }
      mockPostRepository.findByIdWithAuthorAndMedia.mockResolvedValue(mockPost)

      // Act
      await postController.getPostById(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockPostRepository.findByIdWithAuthorAndMedia).toHaveBeenCalledWith('post-123')
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { post: mockPost }
      })
    })

    it('should return 404 for non-existent post', async () => {
      // Arrange
      mockReq.params = { id: 'non-existent' }
      mockPostRepository.findByIdWithAuthorAndMedia.mockResolvedValue(null)

      // Act
      await postController.getPostById(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Post not found',
          details: []
        }
      })
    })

    it('should prevent access to unpublished posts by non-authors', async () => {
      // Arrange
      const unpublishedPost = { ...mockPost, isPublished: false, authorId: 'different-user' }
      mockReq.params = { id: 'post-123' }
      mockReq.user = { id: 'user-456', email: 'test@example.com', username: 'testuser' }
      mockPostRepository.findByIdWithAuthorAndMedia.mockResolvedValue(unpublishedPost)

      // Act
      await postController.getPostById(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'This post is not publicly available',
          details: []
        }
      })
    })

    it('should allow authors to see their own unpublished posts', async () => {
      // Arrange
      const unpublishedPost = { ...mockPost, isPublished: false, authorId: 'user-456' }
      mockReq.params = { id: 'post-123' }
      mockReq.user = { id: 'user-456', email: 'test@example.com', username: 'testuser' }
      mockPostRepository.findByIdWithAuthorAndMedia.mockResolvedValue(unpublishedPost)

      // Act
      await postController.getPostById(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { post: unpublishedPost }
      })
    })
  })

  /**
   * Test DELETE /posts/:id - delete post
   */
  describe('deletePost()', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-456',
        email: 'test@example.com',
        username: 'testuser'
      }
    })

    it('should successfully delete owned post', async () => {
      // Arrange
      mockReq.params = { id: 'post-123' }
      mockPostRepository.existsByIdAndAuthor.mockResolvedValue(true)
      mockPostRepository.delete.mockResolvedValue(mockPost)

      // Act
      await postController.deletePost(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockPostRepository.existsByIdAndAuthor).toHaveBeenCalledWith('post-123', 'user-456')
      expect(mockPostRepository.delete).toHaveBeenCalledWith('post-123')
      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Post deleted successfully'
      })
    })

    it('should require authentication', async () => {
      // Arrange
      mockReq.user = undefined
      mockReq.params = { id: 'post-123' }

      // Act
      await postController.deletePost(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to delete posts',
          details: []
        }
      })

      expect(mockPostRepository.existsByIdAndAuthor).not.toHaveBeenCalled()
    })

    it('should prevent deletion of posts not owned by user', async () => {
      // Arrange
      mockReq.params = { id: 'post-123' }
      mockPostRepository.existsByIdAndAuthor.mockResolvedValue(false)

      // Act
      await postController.deletePost(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Post not found or you do not have permission to delete it',
          details: []
        }
      })

      expect(mockPostRepository.delete).not.toHaveBeenCalled()
    })
  })

  /**
   * Test PUT /posts/:id - update post
   */
  describe('updatePost()', () => {
    beforeEach(() => {
      mockReq.user = {
        id: 'user-456',
        email: 'test@example.com',
        username: 'testuser'
      }
    })

    it('should successfully update owned post', async () => {
      // Arrange
      mockReq.params = { id: 'post-123' }
      mockReq.body = {
        content: 'Updated post content',
        contentWarning: 'Updated warning'
      }
      mockPostRepository.findById.mockResolvedValue({ ...mockPost, authorId: 'user-456' })
      mockPostRepository.update.mockResolvedValue({ ...mockPost, content: 'Updated post content' })

      // Act
      await postController.updatePost(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockPostRepository.findById).toHaveBeenCalledWith('post-123')
      expect(mockPostRepository.update).toHaveBeenCalledWith('post-123', {
        content: 'Updated post content',
        contentWarning: 'Updated warning',
        isPublished: true,
        scheduledFor: null,
        updatedAt: expect.any(Date)
      })

      expect(mockRes.status).toHaveBeenCalledWith(200)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: { post: expect.any(Object) },
        message: 'Post updated successfully'
      })
    })

    it('should prevent updating posts not owned by user', async () => {
      // Arrange
      mockReq.params = { id: 'post-123' }
      mockReq.body = { content: 'Updated content' }
      mockPostRepository.findById.mockResolvedValue({ ...mockPost, authorId: 'different-user' })

      // Act
      await postController.updatePost(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You can only edit your own posts',
          details: []
        }
      })

      expect(mockPostRepository.update).not.toHaveBeenCalled()
    })

    it('should require authentication', async () => {
      // Arrange
      mockReq.user = undefined
      mockReq.params = { id: 'post-123' }
      mockReq.body = { content: 'Updated content' }

      // Act
      await postController.updatePost(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required to update posts',
          details: []
        }
      })

      expect(mockPostRepository.findById).not.toHaveBeenCalled()
    })

    it('should validate empty content', async () => {
      // Arrange
      mockReq.params = { id: 'post-123' }
      mockReq.body = { content: '' } // Empty content
      mockPostRepository.findById.mockResolvedValue({ ...mockPost, authorId: 'user-456' })

      // Act
      await postController.updatePost(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Post content cannot be empty',
          details: []
        }
      })

      expect(mockPostRepository.update).not.toHaveBeenCalled()
    })
  })

  /**
   * Test error handling
   */
  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      // Arrange
      mockPostRepository.findPublished.mockRejectedValue(new Error('Database connection failed'))
      mockReq.query = {}

      // Act
      await postController.getPosts(mockReq as Request, mockRes as Response)

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500)
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch posts',
          details: []
        }
      })
    })
  })
})