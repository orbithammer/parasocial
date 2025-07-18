// backend\src\controllers\__tests__\UserController.test.ts
// Version: 1.0.0 - Initial comprehensive unit test suite for UserController
// Tests all three methods: getUserProfile, blockUser, unblockUser with full error handling

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { Request, Response } from 'express'
import { UserController } from '../UserController'
import { UserRepository } from '../../repositories/UserRepository'
import { FollowRepository } from '../../repositories/FollowRepository'
import { BlockRepository } from '../../repositories/BlockRepository'
import { User } from '../../models/User'

/**
 * Mock authenticated request interface for testing
 */
interface MockAuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
  params: {
    username: string
  }
}

/**
 * Mock repository interfaces for testing
 */
interface MockUserRepository {
  findByUsername: MockedFunction<any>
}

interface MockFollowRepository {
  deleteByFollowerAndFollowed: MockedFunction<any>
}

interface MockBlockRepository {
  isBlocked: MockedFunction<any>
  create: MockedFunction<any>
  deleteByBlockerAndBlocked: MockedFunction<any>
}

/**
 * Mock response interface for testing
 */
interface MockResponse extends Partial<Response> {
  status: MockedFunction<any>
  json: MockedFunction<any>
}

describe('UserController', () => {
  let userController: UserController
  let mockUserRepository: MockUserRepository
  let mockFollowRepository: MockFollowRepository
  let mockBlockRepository: MockBlockRepository
  let mockRequest: MockAuthenticatedRequest
  let mockResponse: MockResponse

  /**
   * Set up fresh mocks before each test
   */
  beforeEach(() => {
    // Create mock repositories
    mockUserRepository = {
      findByUsername: vi.fn()
    }

    mockFollowRepository = {
      deleteByFollowerAndFollowed: vi.fn()
    }

    mockBlockRepository = {
      isBlocked: vi.fn(),
      create: vi.fn(),
      deleteByBlockerAndBlocked: vi.fn()
    }

    // Create controller instance with mocked dependencies
    userController = new UserController(
      mockUserRepository as unknown as UserRepository,
      mockFollowRepository as unknown as FollowRepository,
      mockBlockRepository as unknown as BlockRepository
    )

    // Create mock request object
    mockRequest = {
      params: { username: 'testuser' },
      user: {
        id: 'current-user-id',
        email: 'current@example.com',
        username: 'currentuser'
      }
    } as MockAuthenticatedRequest

    // Create mock response object with chainable methods
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    } as MockResponse
  })

  /**
   * Test getUserProfile method
   */
  describe('getUserProfile', () => {
    /**
     * Test successful profile retrieval with authentication
     */
    it('should return user profile with relationship context when authenticated', async () => {
      // Mock user object with getPublicProfile method
      const mockUser = {
        id: 'target-user-id',
        username: 'testuser',
        displayName: 'Test User',
        getPublicProfile: vi.fn().mockReturnValue({
          id: 'target-user-id',
          username: 'testuser',
          displayName: 'Test User',
          bio: 'Test bio',
          createdAt: new Date('2024-01-01')
        })
      }

      // Set up repository mocks
      mockUserRepository.findByUsername.mockResolvedValue(mockUser)
      mockBlockRepository.isBlocked
        .mockResolvedValueOnce(false) // isBlocked check
        .mockResolvedValueOnce(true)  // hasBlocked check

      await userController.getUserProfile(mockRequest, mockResponse as Response)

      // Verify repository calls
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser')
      expect(mockBlockRepository.isBlocked).toHaveBeenCalledTimes(2)
      expect(mockBlockRepository.isBlocked).toHaveBeenNthCalledWith(1, 'target-user-id', 'current-user-id')
      expect(mockBlockRepository.isBlocked).toHaveBeenNthCalledWith(2, 'current-user-id', 'target-user-id')

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'target-user-id',
            username: 'testuser',
            displayName: 'Test User',
            bio: 'Test bio',
            createdAt: new Date('2024-01-01')
          },
          relationshipContext: {
            isBlocked: false,
            hasBlocked: true,
            isOwnProfile: false
          }
        }
      })
    })

    /**
     * Test successful profile retrieval without authentication
     */
    it('should return user profile without relationship context when not authenticated', async () => {
      // Remove user from request to simulate unauthenticated request
      delete mockRequest.user

      const mockUser = {
        id: 'target-user-id',
        username: 'testuser',
        getPublicProfile: vi.fn().mockReturnValue({
          id: 'target-user-id',
          username: 'testuser',
          displayName: 'Test User'
        })
      }

      mockUserRepository.findByUsername.mockResolvedValue(mockUser)

      await userController.getUserProfile(mockRequest, mockResponse as Response)

      // Verify no blocking checks were made
      expect(mockBlockRepository.isBlocked).not.toHaveBeenCalled()

      // Verify response structure
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'target-user-id',
            username: 'testuser',
            displayName: 'Test User'
          }
        }
      })
    })

    /**
     * Test own profile detection
     */
    it('should detect when user is viewing their own profile', async () => {
      const mockUser = {
        id: 'current-user-id', // Same as request user
        username: 'testuser',
        getPublicProfile: vi.fn().mockReturnValue({
          id: 'current-user-id',
          username: 'testuser'
        })
      }

      mockUserRepository.findByUsername.mockResolvedValue(mockUser)
      mockBlockRepository.isBlocked.mockResolvedValue(false)

      await userController.getUserProfile(mockRequest, mockResponse as Response)

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'current-user-id',
            username: 'testuser'
          },
          relationshipContext: {
            isBlocked: false,
            hasBlocked: false,
            isOwnProfile: true
          }
        }
      })
    })

    /**
     * Test validation error for missing username
     */
    it('should return validation error when username is missing', async () => {
      mockRequest.params.username = ''

      await userController.getUserProfile(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username is required',
        code: 'VALIDATION_ERROR'
      })
      expect(mockUserRepository.findByUsername).not.toHaveBeenCalled()
    })

    /**
     * Test user not found error
     */
    it('should return 404 when user is not found', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(null)

      await userController.getUserProfile(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })
    })

    /**
     * Test graceful handling of relationship context errors
     */
    it('should continue when relationship context fails but log warning', async () => {
      const mockUser = {
        id: 'target-user-id',
        username: 'testuser',
        getPublicProfile: vi.fn().mockReturnValue({
          id: 'target-user-id',
          username: 'testuser'
        })
      }

      mockUserRepository.findByUsername.mockResolvedValue(mockUser)
      mockBlockRepository.isBlocked.mockRejectedValue(new Error('Database error'))

      // Spy on console.warn
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await userController.getUserProfile(mockRequest, mockResponse as Response)

      // Should still return successful response without relationship context
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: 'target-user-id',
            username: 'testuser'
          }
        }
      })

      // Should log warning
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get relationship context:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    /**
     * Test internal server error handling
     */
    it('should handle internal server errors', async () => {
      mockUserRepository.findByUsername.mockRejectedValue(new Error('Database connection failed'))

      await userController.getUserProfile(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: 'Database connection failed'
      })
    })
  })

  /**
   * Test blockUser method
   */
  describe('blockUser', () => {
    /**
     * Test successful user blocking
     */
    it('should successfully block a user', async () => {
      const mockTargetUser = {
        id: 'target-user-id',
        username: 'testuser',
        displayName: 'Test User'
      }

      mockUserRepository.findByUsername.mockResolvedValue(mockTargetUser)
      mockBlockRepository.isBlocked.mockResolvedValue(false) // Not already blocked
      mockBlockRepository.create.mockResolvedValue(undefined)
      mockFollowRepository.deleteByFollowerAndFollowed.mockResolvedValue(undefined)

      await userController.blockUser(mockRequest, mockResponse as Response)

      // Verify block creation
      expect(mockBlockRepository.create).toHaveBeenCalledWith({
        blockerId: 'current-user-id',
        blockedId: 'target-user-id'
      })

      // Verify follow relationships removal
      expect(mockFollowRepository.deleteByFollowerAndFollowed).toHaveBeenCalledTimes(2)
      expect(mockFollowRepository.deleteByFollowerAndFollowed).toHaveBeenNthCalledWith(1, 'current-user-id', 'target-user-id')
      expect(mockFollowRepository.deleteByFollowerAndFollowed).toHaveBeenNthCalledWith(2, 'target-user-id', 'current-user-id')

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully blocked testuser',
        data: {
          blockedUser: {
            id: 'target-user-id',
            username: 'testuser',
            displayName: 'Test User'
          }
        }
      })
    })

    /**
     * Test authentication required error
     */
    it('should return 401 when user is not authenticated', async () => {
      delete mockRequest.user

      await userController.blockUser(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      })
      expect(mockUserRepository.findByUsername).not.toHaveBeenCalled()
    })

    /**
     * Test validation error for missing username
     */
    it('should return validation error when username is missing', async () => {
      mockRequest.params.username = ''

      await userController.blockUser(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username is required',
        code: 'VALIDATION_ERROR'
      })
    })

    /**
     * Test self-blocking prevention
     */
    it('should prevent user from blocking themselves', async () => {
      const mockTargetUser = {
        id: 'current-user-id', // Same as authenticated user
        username: 'currentuser',
        displayName: 'Current User'
      }

      mockUserRepository.findByUsername.mockResolvedValue(mockTargetUser)

      await userController.blockUser(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot block yourself',
        code: 'SELF_BLOCK_ERROR'
      })
      expect(mockBlockRepository.create).not.toHaveBeenCalled()
    })

    /**
     * Test already blocked user
     */
    it('should return conflict when user is already blocked', async () => {
      const mockTargetUser = {
        id: 'target-user-id',
        username: 'testuser',
        displayName: 'Test User'
      }

      mockUserRepository.findByUsername.mockResolvedValue(mockTargetUser)
      mockBlockRepository.isBlocked.mockResolvedValue(true) // Already blocked

      await userController.blockUser(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(409)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User is already blocked',
        code: 'ALREADY_BLOCKED'
      })
      expect(mockBlockRepository.create).not.toHaveBeenCalled()
    })

    /**
     * Test graceful handling of follow removal errors
     */
    it('should continue blocking even if follow removal fails', async () => {
      const mockTargetUser = {
        id: 'target-user-id',
        username: 'testuser',
        displayName: 'Test User'
      }

      mockUserRepository.findByUsername.mockResolvedValue(mockTargetUser)
      mockBlockRepository.isBlocked.mockResolvedValue(false)
      mockBlockRepository.create.mockResolvedValue(undefined)
      mockFollowRepository.deleteByFollowerAndFollowed.mockRejectedValue(new Error('Follow removal failed'))

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await userController.blockUser(mockRequest, mockResponse as Response)

      // Should still succeed
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to remove follow relationships during block:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  /**
   * Test unblockUser method
   */
  describe('unblockUser', () => {
    /**
     * Test successful user unblocking
     */
    it('should successfully unblock a user', async () => {
      const mockTargetUser = {
        id: 'target-user-id',
        username: 'testuser',
        displayName: 'Test User'
      }

      mockUserRepository.findByUsername.mockResolvedValue(mockTargetUser)
      mockBlockRepository.isBlocked.mockResolvedValue(true) // Currently blocked
      mockBlockRepository.deleteByBlockerAndBlocked.mockResolvedValue(undefined)

      await userController.unblockUser(mockRequest, mockResponse as Response)

      expect(mockBlockRepository.deleteByBlockerAndBlocked).toHaveBeenCalledWith('current-user-id', 'target-user-id')

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Successfully unblocked testuser',
        data: {
          unblockedUser: {
            id: 'target-user-id',
            username: 'testuser',
            displayName: 'Test User'
          }
        }
      })
    })

    /**
     * Test authentication required error
     */
    it('should return 401 when user is not authenticated', async () => {
      delete mockRequest.user

      await userController.unblockUser(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'UNAUTHORIZED'
      })
    })

    /**
     * Test validation error for missing username
     */
    it('should return validation error when username is missing', async () => {
      mockRequest.params.username = ''

      await userController.unblockUser(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(400)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username is required',
        code: 'VALIDATION_ERROR'
      })
    })

    /**
     * Test user not found error
     */
    it('should return 404 when target user is not found', async () => {
      mockUserRepository.findByUsername.mockResolvedValue(null)

      await userController.unblockUser(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      })
    })

    /**
     * Test unblocking user that is not blocked
     */
    it('should return conflict when user is not currently blocked', async () => {
      const mockTargetUser = {
        id: 'target-user-id',
        username: 'testuser',
        displayName: 'Test User'
      }

      mockUserRepository.findByUsername.mockResolvedValue(mockTargetUser)
      mockBlockRepository.isBlocked.mockResolvedValue(false) // Not blocked

      await userController.unblockUser(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(409)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User is not currently blocked',
        code: 'NOT_BLOCKED'
      })
      expect(mockBlockRepository.deleteByBlockerAndBlocked).not.toHaveBeenCalled()
    })

    /**
     * Test internal server error handling
     */
    it('should handle internal server errors', async () => {
      mockUserRepository.findByUsername.mockRejectedValue(new Error('Database error'))

      await userController.unblockUser(mockRequest, mockResponse as Response)

      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: 'Database error'
      })
    })
  })
})