// backend/tests/controllers/PostController.test.js
// Unit tests for PostController - HTTP request handlers for post operations

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PostController } from '../../src/controllers/PostController.js'

describe('PostController', () => {
  let postController
  let mockPostRepository
  let mockUserRepository
  let mockReq
  let mockRes

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
          data: mockPost
        })
      })

      it('should create scheduled post successfully', async () => {
        const futureDate = new Date(Date.now() + 86400000) // 24 hours from now
        const scheduledPostData = {
          content: 'This is a scheduled post',
          isScheduled: true,
          scheduledFor: futureDate.toISOString()
        }

        mockReq.body = scheduledPostData
        const scheduledPost = {
          ...mockPost,
          isScheduled: true,
          scheduledFor: futureDate,
          isPublished: false,
          publishedAt: null
        }
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
          ...validPostData,
          contentWarning: 'Contains sensitive content'
        }

        mockReq.body = postWithWarning
        mockPostRepository.create.mockResolvedValue({
          ...mockPost,
          contentWarning: 'Contains sensitive content'
        })

        await postController.createPost(mockReq, mockRes)

        expect(mockPostRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            contentWarning: 'Contains sensitive content'
          })
        )
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
        expect(mockPostRepository.create).not.toHaveBeenCalled()
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
        const mockResult = {
          posts: mockPosts,
          totalCount: 50
        }

        mockPostRepository.findManyWithPagination.mockResolvedValue(mockResult)

        await postController.getPosts(mockReq, mockRes)

        expect(mockPostRepository.findManyWithPagination).toHaveBeenCalledWith({
          offset: 0,
          limit: 20,
          includeAuthor: true,
          includeMedia: true,
          onlyPublished: true
        })

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: {
            posts: mockPosts,
            pagination: {
              currentPage: 1,
              totalPages: 3,
              totalPosts: 50,
              hasNext: true,
              hasPrev: false
            }
          }
        })
      })

      it('should filter out current user own posts when authenticated', async () => {
        const postsIncludingOwnPost = [
          { ...mockPost, id: 'post1', authorId: 'user123' }, // User's own post
          { ...mockPost, id: 'post2', authorId: 'user456' }
        ]

        const mockResult = {
          posts: postsIncludingOwnPost,
          totalCount: 2
        }

        mockPostRepository.findManyWithPagination.mockResolvedValue(mockResult)

        await postController.getPosts(mockReq, mockRes)

        // Should filter out the user's own post
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              posts: [{ ...mockPost, id: 'post2', authorId: 'user456' }]
            })
          })
        )
      })

      it('should handle pagination parameters correctly', async () => {
        mockReq.query = { page: '3', limit: '10' }

        mockPostRepository.findManyWithPagination.mockResolvedValue({
          posts: [],
          totalCount: 25
        })

        await postController.getPosts(mockReq, mockRes)

        expect(mockPostRepository.findManyWithPagination).toHaveBeenCalledWith({
          offset: 20, // (page 3 - 1) * limit 10
          limit: 10,
          includeAuthor: true,
          includeMedia: true,
          onlyPublished: true
        })
      })

      it('should handle invalid pagination parameters', async () => {
        mockReq.query = { page: 'invalid', limit: '100' } // limit should be capped at 50

        mockPostRepository.findManyWithPagination.mockResolvedValue({
          posts: [],
          totalCount: 0
        })

        await postController.getPosts(mockReq, mockRes)

        expect(mockPostRepository.findManyWithPagination).toHaveBeenCalledWith({
          offset: 0, // Should default to page 1
          limit: 50, // Should be capped at 50
          includeAuthor: true,
          includeMedia: true,
          onlyPublished: true
        })
      })
    })

    describe('Server Errors', () => {
      it('should handle database errors gracefully', async () => {
        mockPostRepository.findManyWithPagination.mockRejectedValue(new Error('Database error'))

        await postController.getPosts(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to fetch posts',
          message: 'Database error'
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
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockPost
        })
      })

      it('should return unpublished post when author is viewing', async () => {
        const unpublishedPost = { ...mockPost, isPublished: false }
        mockReq.params = { id: 'post123' }
        mockPostRepository.findByIdWithAuthorAndMedia.mockResolvedValue(unpublishedPost)

        await postController.getPostById(mockReq, mockRes)

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: unpublishedPost
        })
      })
    })

    describe('Access Control', () => {
      it('should return 404 for unpublished post when not the author', async () => {
        const unpublishedPost = { ...mockPost, isPublished: false, authorId: 'other-user' }
        mockReq.params = { id: 'post123' }
        mockPostRepository.findByIdWithAuthorAndMedia.mockResolvedValue(unpublishedPost)

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
        expect(mockPostRepository.findByIdWithAuthorAndMedia).not.toHaveBeenCalled()
      })
    })
  })

  describe('deletePost', () => {
    describe('Successful Post Deletion', () => {
      it('should delete own post successfully', async () => {
        mockReq.params = { id: 'post123' }
        mockPostRepository.findById.mockResolvedValue(mockPost)
        mockPostRepository.delete.mockResolvedValue(mockPost)

        await postController.deletePost(mockReq, mockRes)

        expect(mockPostRepository.findById).toHaveBeenCalledWith('post123')
        expect(mockPostRepository.delete).toHaveBeenCalledWith('post123')
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          message: 'Post deleted successfully'
        })
      })
    })

    describe('Access Control', () => {
      it('should return 403 when trying to delete another user post', async () => {
        const otherUserPost = { ...mockPost, authorId: 'other-user' }
        mockReq.params = { id: 'post123' }
        mockPostRepository.findById.mockResolvedValue(otherUserPost)

        await postController.deletePost(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(403)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'You can only delete your own posts'
        })
        expect(mockPostRepository.delete).not.toHaveBeenCalled()
      })

      it('should return 404 when post does not exist', async () => {
        mockReq.params = { id: 'nonexistent' }
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
        mockUserRepository.findByUsername.mockResolvedValue(mockUser)
        mockPostRepository.findManyByAuthorId.mockResolvedValue({
          posts: [mockPost],
          totalCount: 5
        })

        await postController.getUserPosts(mockReq, mockRes)

        expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser')
        expect(mockPostRepository.findManyByAuthorId).toHaveBeenCalledWith('user123', {
          offset: 0,
          limit: 20,
          includeAuthor: true,
          includeMedia: true,
          onlyPublished: true
        })

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: {
            posts: [mockPost],
            pagination: {
              currentPage: 1,
              totalPages: 1,
              totalPosts: 5,
              hasNext: false,
              hasPrev: false
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
        expect(mockPostRepository.findManyByAuthorId).not.toHaveBeenCalled()
      })
    })
  })
})