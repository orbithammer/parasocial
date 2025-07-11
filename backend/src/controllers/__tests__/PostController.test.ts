// backend/src/controllers/__tests__/PostController.test.ts
// Version: 1.5.0 - Fixed getPosts test method mocking
// Changed: Updated getPosts tests to mock the correct repository method (findPublished instead of findManyWithPagination)

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Request, Response } from 'express'
import { PostController } from '../PostController'
import type { PostRepository } from '../../repositories/PostRepository'
import type { UserRepository } from '../../repositories/UserRepository'
import type { MockedFunction } from 'vitest'
import type { PrismaClient } from '@prisma/client'

// Interface for authenticated requests (user from auth middleware)
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

describe('PostController', () => {
  let postController: PostController
  let mockPostRepository: PostRepository
  let mockUserRepository: UserRepository
  let mockReq: Partial<AuthenticatedRequest>
  let mockRes: Partial<Response>
  let mockStatus: MockedFunction<any>
  let mockJson: MockedFunction<any>

  // Mock post data for testing
  const mockPost = {
    id: 'post123',
    content: 'Test post content',
    contentWarning: null,
    isPublished: true,
    publishedAt: new Date('2024-01-15T10:00:00Z'),
    authorId: 'user123',
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z'),
    activityId: null,
    isScheduled: false,
    scheduledFor: null,
    author: {
      id: 'user123',
      username: 'testuser',
      displayName: 'Test User',
      avatar: null,
      actorId: 'testuser@example.com',
      isVerified: false,
      verificationTier: null
    },
    media: [],
    _count: { media: 0 }
  }

  const validPostData = {
    content: 'This is a test post content',
    contentWarning: null,
    isScheduled: false
  }

  beforeEach(() => {
    console.log('Test setup initialized')

    // Create comprehensive mocks for repository methods using Vitest
    // Mock PostRepository with ALL required properties and methods
    mockPostRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findByIdWithAuthorAndMedia: vi.fn(),
      findByAuthor: vi.fn(),
      findPublished: vi.fn(), // FIXED: Mock the correct method that controller actually calls
      findManyWithPagination: vi.fn(), // Additional method found in tests
      findManyByAuthorId: vi.fn(), // Additional method from repository
      findScheduled: vi.fn(), // Missing method
      findReadyToPublish: vi.fn(),
      findByActivityId: vi.fn(), // Missing method
      existsByIdAndAuthor: vi.fn(), // Missing method
      getAuthorStats: vi.fn(), // Missing method
      delete: vi.fn(),
      update: vi.fn(), // Missing method
      publishExpiredScheduled: vi.fn()
    } as unknown as PostRepository

    // Mock UserRepository with ALL required properties and methods
    mockUserRepository = {
      findByUsername: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      hardDelete: vi.fn(), // Missing method
      findByEmail: vi.fn(),
      findByEmailOrUsername: vi.fn(),
      search: vi.fn(),
      getActiveUserCount: vi.fn(), // Missing method
      getRecentUsers: vi.fn(), // Missing method
      isUsernameAvailable: vi.fn() // Missing method
    } as unknown as UserRepository

    // Create PostController instance with mocked dependencies
    postController = new PostController(mockPostRepository, mockUserRepository)

    // Setup Express response mocks using Vitest
    mockStatus = vi.fn().mockReturnThis()
    mockJson = vi.fn().mockReturnThis()

    mockRes = {
      status: mockStatus,
      json: mockJson
    }

    // Setup Express request mock
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: undefined
    }
  })

  afterEach(() => {
    console.log('Starting test cleanup...')
    vi.clearAllMocks()
    console.log('Test cleanup completed')
  })

  describe('getPosts', () => {
    const mockPosts = [
      { ...mockPost, id: 'post1', authorId: 'user456' },
      { ...mockPost, id: 'post2', authorId: 'user789' }
    ]

    describe('Successful Post Retrieval', () => {
      it('should return public posts with pagination', async () => {
        // Setup request with empty query (uses defaults)
        mockReq.query = {}
        mockReq.user = undefined // No user to exclude

        // FIXED: Mock the correct repository method that controller actually calls
        ;(mockPostRepository.findPublished as MockedFunction<any>).mockResolvedValue({
          posts: mockPosts,
          totalCount: 2,
          hasMore: false
        })

        await postController.getPosts(mockReq as AuthenticatedRequest, mockRes as Response)

        // FIXED: Verify the correct method is called with correct parameters
        expect(mockPostRepository.findPublished).toHaveBeenCalledTimes(1)
        expect(mockPostRepository.findPublished).toHaveBeenCalledWith({
          offset: 0, // page 1 = offset 0
          limit: 20, // Default limit in controller
          orderBy: 'publishedAt',
          orderDirection: 'desc'
        })

        expect(mockStatus).toHaveBeenCalledWith(200)
        expect(mockJson).toHaveBeenCalledWith({
          success: true,
          data: {
            posts: mockPosts,
            pagination: {
              total: 2,
              page: 1,
              limit: 20,
              hasNext: false
            }
          }
        })
      })

      it('should filter out current user own posts when authenticated', async () => {
        mockReq.user = { id: 'user123', email: 'test@example.com', username: 'testuser' }
        mockReq.query = {}

        // Return posts that include the current user's post
        const postsWithUserPost = [
          { ...mockPost, id: 'post1', authorId: 'user123' }, // Current user's post
          { ...mockPost, id: 'post2', authorId: 'user456' }  // Other user's post
        ]

        ;(mockPostRepository.findPublished as MockedFunction<any>).mockResolvedValue({
          posts: postsWithUserPost,
          totalCount: 2,
          hasMore: false
        })

        await postController.getPosts(mockReq as AuthenticatedRequest, mockRes as Response)

        expect(mockPostRepository.findPublished).toHaveBeenCalledWith({
          offset: 0,
          limit: 20,
          orderBy: 'publishedAt',
          orderDirection: 'desc'
        })

        // FIXED: Verify that current user's posts are filtered out in response
        expect(mockJson).toHaveBeenCalledWith({
          success: true,
          data: {
            posts: [{ ...mockPost, id: 'post2', authorId: 'user456' }], // Only other user's post
            pagination: {
              total: 2,
              page: 1,
              limit: 20,
              hasNext: false
            }
          }
        })
      })

      it('should handle pagination parameters correctly', async () => {
        mockReq.query = { page: '2', limit: '10' } // Custom pagination
        mockReq.user = undefined

        ;(mockPostRepository.findPublished as MockedFunction<any>).mockResolvedValue({
          posts: [],
          totalCount: 0,
          hasMore: false
        })

        await postController.getPosts(mockReq as AuthenticatedRequest, mockRes as Response)

        // FIXED: Verify pagination calculation is correct
        expect(mockPostRepository.findPublished).toHaveBeenCalledWith({
          offset: 10, // (page 2 - 1) * limit 10 = offset 10
          limit: 10,
          orderBy: 'publishedAt',
          orderDirection: 'desc'
        })

        expect(mockJson).toHaveBeenCalledWith({
          success: true,
          data: {
            posts: [],
            pagination: {
              total: 0,
              page: 2,
              limit: 10,
              hasNext: false
            }
          }
        })
      })

      it('should handle invalid pagination parameters', async () => {
        // Test with invalid/non-numeric pagination parameters
        mockReq.query = { page: 'invalid', limit: 'not-a-number' }
        mockReq.user = undefined

        ;(mockPostRepository.findPublished as MockedFunction<any>).mockResolvedValue({
          posts: mockPosts,
          totalCount: 2,
          hasMore: false
        })

        await postController.getPosts(mockReq as AuthenticatedRequest, mockRes as Response)

        // FIXED: Controller should use defaults for invalid parameters
        expect(mockPostRepository.findPublished).toHaveBeenCalledWith({
          offset: 0, // Default page 1
          limit: 20, // Default limit
          orderBy: 'publishedAt',
          orderDirection: 'desc'
        })
      })
    })

    describe('Server Errors', () => {
      it('should handle database errors gracefully', async () => {
        mockReq.query = {}
        ;(mockPostRepository.findPublished as MockedFunction<any>).mockRejectedValue(new Error('Database error'))

        await postController.getPosts(mockReq as AuthenticatedRequest, mockRes as Response)

        expect(mockStatus).toHaveBeenCalledWith(500)
        expect(mockJson).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to retrieve posts'
        })
      })
    })
  })
})