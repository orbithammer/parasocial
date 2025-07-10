// backend/src/controllers/__tests__/PostController.test.ts
// Version: 1.1 - Fixed import path to use correct relative path without .js extension
// Changes: Updated import to use '../PostController' instead of incorrect path

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PostController } from '../PostController'

describe('PostController', () => {
  let postController: PostController
  let mockPostRepository: any
  let mockUserRepository: any
  let mockReq: any
  let mockRes: any

  const mockUser = {
    id: 'user123',
    username: 'testuser',
    displayName: 'Test User'
  }

  const mockPost = {
    id: 'post123',
    content: 'Test post content',
    contentWarning: null,
    isScheduled: false,
    scheduledFor: null,
    isPublished: true,
    publishedAt: new Date('2024-01-01T12:00:00Z'),
    authorId: 'user123',
    author: mockUser
  }

  beforeEach(() => {
    // Mock PostRepository
    mockPostRepository = {
      create: vi.fn(),
      findManyWithPagination: vi.fn(),
      findByIdWithAuthorAndMedia: vi.fn(),
      findById: vi.fn(),
      delete: vi.fn(),
      findManyByAuthorId: vi.fn()
    }

    // Mock UserRepository
    mockUserRepository = {
      findByUsername: vi.fn()
    }

    // Mock Express request object
    mockReq = {
      body: {},
      query: {},
      params: {},
      user: { id: 'user123', username: 'testuser' }
    }

    // Mock Express response object
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }

    // Create controller instance
    postController = new PostController(mockPostRepository, mockUserRepository)
  })

  /**
   * Clean up after each test to prevent memory leaks
   */
  afterEach(() => {
    // Clear all mocks to prevent state leakage between tests
    vi.clearAllMocks()
    
    // Reset mock implementations
    if (mockPostRepository) {
      Object.keys(mockPostRepository).forEach(key => {
        if (vi.isMockFunction(mockPostRepository[key])) {
          mockPostRepository[key].mockReset()
        }
      })
    }
    
    if (mockUserRepository) {
      Object.keys(mockUserRepository).forEach(key => {
        if (vi.isMockFunction(mockUserRepository[key])) {
          mockUserRepository[key].mockReset()
        }
      })
    }

    // Clear response mocks
    if (mockRes.status && vi.isMockFunction(mockRes.status)) {
      mockRes.status.mockReset()
    }
    if (mockRes.json && vi.isMockFunction(mockRes.json)) {
      mockRes.json.mockReset()
    }

    // Clear references to prevent memory leaks
    postController = null as any
    mockPostRepository = null
    mockUserRepository = null
    mockReq = null
    mockRes = null
  })

  describe('createPost', () => {
    const validPostData = {
      content: 'This is a test post with enough content to be valid',
      contentWarning: null,
      isScheduled: false
    }

    describe('Successful Post Creation', () => {
      it('should create a new post successfully', async () => {
        mockReq.body = validPostData
        mockPostRepository.create.mockResolvedValue(mockPost)

        await postController.createPost(mockReq, mockRes)

        expect(mockPostRepository.create).toHaveBeenCalledWith({
          content: validPostData.content,
          contentWarning: null,
          isScheduled: false,
          scheduledFor: null,
          isPublished: true,
          publishedAt: expect.any(Date),
          authorId: 'user123'
        })

        expect(mockRes.status).toHaveBeenCalledWith(201)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: { post: mockPost }
        })
      })

      it('should create scheduled post successfully', async () => {
        const futureDate = new Date(Date.now() + 86400000) // 24 hours from now
        const scheduledPostData = {
          content: 'This will be posted later',
          isScheduled: true,
          scheduledFor: futureDate.toISOString()
        }

        const scheduledPost = {
          ...mockPost,
          isScheduled: true,
          scheduledFor: futureDate,
          isPublished: false,
          publishedAt: null
        }

        mockReq.body = scheduledPostData
        mockPostRepository.create.mockResolvedValue(scheduledPost)

        await postController.createPost(mockReq, mockRes)

        expect(mockPostRepository.create).toHaveBeenCalledWith({
          content: scheduledPostData.content,
          contentWarning: null,
          isScheduled: true,
          scheduledFor: futureDate,
          isPublished: false,
          publishedAt: null,
          authorId: 'user123'
        })

        expect(mockRes.status).toHaveBeenCalledWith(201)
      })

      it('should handle content warning properly', async () => {
        const postWithWarning = {
          content: 'This post has a content warning',
          contentWarning: 'Sensitive topic discussion'
        }

        const postResult = { ...mockPost, contentWarning: 'Sensitive topic discussion' }

        mockReq.body = postWithWarning
        mockPostRepository.create.mockResolvedValue(postResult)

        await postController.createPost(mockReq, mockRes)

        expect(mockPostRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            contentWarning: 'Sensitive topic discussion'
          })
        )

        expect(mockRes.status).toHaveBeenCalledWith(201)
      })
    })

    describe('Input Validation', () => {
      it('should reject posts with empty content', async () => {
        mockReq.body = { content: '' }

        await postController.createPost(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Post content is required'
        })
      })

      it('should reject posts with only whitespace content', async () => {
        mockReq.body = { content: '   \n\t   ' }

        await postController.createPost(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Post content is required'
        })
      })

      it('should reject posts exceeding character limit', async () => {
        mockReq.body = { content: 'a'.repeat(5001) }

        await postController.createPost(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Post content cannot exceed 5000 characters'
        })
      })

      it('should reject scheduled posts without scheduledFor date', async () => {
        mockReq.body = {
          content: 'Test content',
          isScheduled: true
        }

        await postController.createPost(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Scheduled posts must include scheduledFor date'
        })
      })

      it('should reject scheduled posts with past dates', async () => {
        const pastDate = new Date(Date.now() - 86400000) // 24 hours ago
        mockReq.body = {
          content: 'Test content',
          isScheduled: true,
          scheduledFor: pastDate.toISOString()
        }

        await postController.createPost(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Scheduled date must be in the future'
        })
      })
    })

    describe('Server Errors', () => {
      it('should handle database errors gracefully', async () => {
        mockReq.body = validPostData
        mockPostRepository.create.mockRejectedValue(new Error('Database connection failed'))

        await postController.createPost(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to create post',
          message: 'Database connection failed'
        })
      })
    })
  })

  describe('getPosts', () => {
    const mockPosts = [
      { ...mockPost, id: 'post1', authorId: 'user456' },
      { ...mockPost, id: 'post2', authorId: 'user789' }
    ]

    describe('Successful Post Retrieval', () => {
      it('should return public posts with pagination', async () => {
        mockReq.query = { page: '1', limit: '10' }
        mockPostRepository.findManyWithPagination.mockResolvedValue({
          posts: mockPosts,
          total: 2,
          page: 1,
          limit: 10,
          hasNext: false
        })

        await postController.getPosts(mockReq, mockRes)

        expect(mockPostRepository.findManyWithPagination).toHaveBeenCalledWith({
          page: 1,
          limit: 10,
          excludeAuthorId: undefined,
          published: true
        })

        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: {
            posts: mockPosts,
            pagination: {
              total: 2,
              page: 1,
              limit: 10,
              hasNext: false
            }
          }
        })
      })

      it('should filter out current user own posts when authenticated', async () => {
        mockReq.user = { id: 'user123' }
        mockReq.query = {}

        await postController.getPosts(mockReq, mockRes)

        expect(mockPostRepository.findManyWithPagination).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          excludeAuthorId: 'user123',
          published: true
        })
      })

      it('should handle pagination parameters correctly', async () => {
        mockReq.query = { page: '2', limit: '5' }

        await postController.getPosts(mockReq, mockRes)

        expect(mockPostRepository.findManyWithPagination).toHaveBeenCalledWith({
          page: 2,
          limit: 5,
          excludeAuthorId: undefined,
          published: true
        })
      })

      it('should handle invalid pagination parameters', async () => {
        mockReq.query = { page: 'invalid', limit: '-5' }

        await postController.getPosts(mockReq, mockRes)

        expect(mockPostRepository.findManyWithPagination).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          excludeAuthorId: undefined,
          published: true
        })
      })
    })

    describe('Server Errors', () => {
      it('should handle database errors gracefully', async () => {
        mockPostRepository.findManyWithPagination.mockRejectedValue(new Error('Database connection failed'))

        await postController.getPosts(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to retrieve posts'
        })
      })
    })
  })

  describe('getPostById', () => {
    describe('Successful Post Retrieval', () => {
      it('should return post when found and published', async () => {
        mockReq.params = { id: 'post123' }
        mockPostRepository.findByIdWithAuthorAndMedia.mockResolvedValue(mockPost)

        await postController.getPostById(mockReq, mockRes)

        expect(mockPostRepository.findByIdWithAuthorAndMedia).toHaveBeenCalledWith('post123')
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: { post: mockPost }
        })
      })

      it('should return unpublished post when author is viewing', async () => {
        const draftPost = { ...mockPost, isPublished: false, publishedAt: null }
        mockReq.params = { id: 'post123' }
        mockReq.user = { id: 'user123' } // Same as author
        mockPostRepository.findByIdWithAuthorAndMedia.mockResolvedValue(draftPost)

        await postController.getPostById(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: { post: draftPost }
        })
      })
    })

    describe('Access Control', () => {
      it('should return 404 for unpublished post when not the author', async () => {
        const draftPost = { ...mockPost, isPublished: false, authorId: 'user456' }
        mockReq.params = { id: 'post123' }
        mockReq.user = { id: 'user123' } // Different from author
        mockPostRepository.findByIdWithAuthorAndMedia.mockResolvedValue(draftPost)

        await postController.getPostById(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(404)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Post not found'
        })
      })

      it('should return 404 when post does not exist', async () => {
        mockReq.params = { id: 'nonexistent' }
        mockPostRepository.findByIdWithAuthorAndMedia.mockResolvedValue(null)

        await postController.getPostById(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(404)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Post not found'
        })
      })
    })

    describe('Input Validation', () => {
      it('should return 400 when post ID is missing', async () => {
        mockReq.params = {}

        await postController.getPostById(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Post ID is required'
        })
      })
    })
  })

  describe('deletePost', () => {
    describe('Successful Post Deletion', () => {
      it('should delete own post successfully', async () => {
        mockReq.params = { id: 'post123' }
        mockReq.user = { id: 'user123' }
        mockPostRepository.findById.mockResolvedValue(mockPost)
        mockPostRepository.delete.mockResolvedValue(mockPost)

        await postController.deletePost(mockReq, mockRes)

        expect(mockPostRepository.delete).toHaveBeenCalledWith('post123')
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Post deleted successfully'
        })
      })
    })

    describe('Access Control', () => {
      it('should return 403 when trying to delete another user post', async () => {
        const otherUserPost = { ...mockPost, authorId: 'user456' }
        mockReq.params = { id: 'post123' }
        mockReq.user = { id: 'user123' } // Different from author
        mockPostRepository.findById.mockResolvedValue(otherUserPost)

        await postController.deletePost(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(403)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'You can only delete your own posts'
        })
      })

      it('should return 404 when post does not exist', async () => {
        mockReq.params = { id: 'nonexistent' }
        mockReq.user = { id: 'user123' }
        mockPostRepository.findById.mockResolvedValue(null)

        await postController.deletePost(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(404)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Post not found'
        })
      })
    })
  })

  describe('getUserPosts', () => {
    describe('Successful User Posts Retrieval', () => {
      it('should return user posts with pagination', async () => {
        mockReq.params = { username: 'testuser' }
        mockReq.query = { page: '1', limit: '10' }
        mockUserRepository.findByUsername.mockResolvedValue(mockUser)
        mockPostRepository.findManyByAuthorId.mockResolvedValue({
          posts: [mockPost],
          total: 1,
          page: 1,
          limit: 10,
          hasNext: false
        })

        await postController.getUserPosts(mockReq, mockRes)

        expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser')
        expect(mockPostRepository.findManyByAuthorId).toHaveBeenCalledWith('user123', {
          page: 1,
          limit: 10,
          published: true
        })

        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: {
            posts: [mockPost],
            user: mockUser,
            pagination: {
              total: 1,
              page: 1,
              limit: 10,
              hasNext: false
            }
          }
        })
      })

      it('should return 404 when user does not exist', async () => {
        mockReq.params = { username: 'nonexistent' }
        mockUserRepository.findByUsername.mockResolvedValue(null)

        await postController.getUserPosts(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(404)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'User not found'
        })
      })
    })
  })
})