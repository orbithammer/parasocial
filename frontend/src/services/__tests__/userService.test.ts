// frontend/src/services/__tests__/userService.test.ts
// Version: 1.0.5
// Fixed TypeScript error - Replaced Error with TestApiError for code property assignment

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  getUserProfile, 
  updateUserProfile, 
  getUserByUsername, 
  getUserById,
  uploadUserAvatar,
  getUserFollowers,
  getUserFollowing,
  getUserStats,
  blockUser,
  unblockUser
} from '../userService'
import * as api from '../../lib/api'

// Mock the API module
vi.mock('../../lib/api', () => ({
  get: vi.fn(),
  put: vi.fn(),
  post: vi.fn(),
  delete: vi.fn()
}))

// Type definitions for test data
interface User {
  id: string
  username: string
  email: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  isPrivate: boolean
  createdAt: string
  updatedAt: string
}

interface UserStats {
  followersCount: number
  followingCount: number
  postsCount: number
}

interface FollowUser {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  followedAt: string
}

interface PaginatedFollowResult {
  users: FollowUser[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

interface UpdateUserProfileData {
  displayName?: string
  bio?: string
  isPrivate?: boolean
}

interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

interface ApiError extends Error {
  status: number
  code?: string
}

// Custom error class for testing API errors
class TestApiError extends Error implements ApiError {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'TestApiError'
    this.status = status
    this.code = code
  }
}

// Type guard to check if error is an ApiError
function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error && 'code' in error
}

describe('userService', () => {
  // Setup mock functions
  const mockGet = vi.mocked(api.get)
  const mockPut = vi.mocked(api.put)
  const mockPost = vi.mocked(api.post)
  const mockDelete = vi.mocked(api.delete)

  // Test data fixtures
  const mockUser: User = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    bio: 'This is a test user bio',
    avatarUrl: 'https://example.com/avatar.jpg',
    isPrivate: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  const mockUserStats: UserStats = {
    followersCount: 50,
    followingCount: 25,
    postsCount: 100
  }

  const mockFollowUsers: FollowUser[] = [
    {
      id: 'user-456',
      username: 'follower1',
      displayName: 'Follower One',
      avatarUrl: 'https://example.com/follower1.jpg',
      followedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'user-789',
      username: 'follower2',
      displayName: 'Follower Two',
      avatarUrl: null,
      followedAt: '2024-01-02T00:00:00Z'
    }
  ]

  const mockPaginatedResult: PaginatedFollowResult = {
    users: mockFollowUsers,
    total: 50,
    page: 1,
    limit: 10,
    hasMore: true
  }

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Reset all mocks after each test
    vi.resetAllMocks()
  })

  describe('getUserProfile', () => {
    it('should fetch current user profile successfully', async () => {
      // Arrange
      const mockResponse: ApiResponse<User> = {
        data: mockUser,
        status: 200
      }
      mockGet.mockResolvedValue(mockResponse)
      const mockToken = 'jwt-token-123'

      // Act
      const result = await getUserProfile(mockToken)

      // Assert
      expect(mockGet).toHaveBeenCalledWith('/api/users/profile', {
        token: mockToken
      })
      expect(result).toEqual(mockUser)
    })

    it('should throw error when API call fails', async () => {
      // Arrange
      const mockError = new TestApiError('Network error', 500)
      mockGet.mockRejectedValue(mockError)
      const mockToken = 'invalid-token'

      // Act & Assert
      await expect(getUserProfile(mockToken)).rejects.toThrow('Network error')
      expect(mockGet).toHaveBeenCalledWith('/api/users/profile', {
        token: mockToken
      })
    })

    it('should handle unauthorized access', async () => {
      // Arrange
      const unauthorizedError = new TestApiError('Unauthorized', 401, 'AUTH_ERROR')
      mockGet.mockRejectedValue(unauthorizedError)
      const mockToken = 'expired-token'

      // Act & Assert
      await expect(getUserProfile(mockToken)).rejects.toThrow('Unauthorized')
      expect(mockGet).toHaveBeenCalledWith('/api/users/profile', {
        token: mockToken
      })
    })
  })

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      // Arrange
      const updateData: UpdateUserProfileData = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
        isPrivate: true
      }
      const updatedUser: User = { ...mockUser, ...updateData }
      const mockResponse: ApiResponse<User> = {
        data: updatedUser,
        status: 200
      }
      mockPut.mockResolvedValue(mockResponse)
      const mockToken = 'jwt-token-123'

      // Act
      const result = await updateUserProfile(updateData, mockToken)

      // Assert
      expect(mockPut).toHaveBeenCalledWith('/api/users/profile', updateData, {
        token: mockToken
      })
      expect(result).toEqual(updatedUser)
    })

    it('should handle validation errors', async () => {
      // Arrange
      const invalidData: UpdateUserProfileData = {
        displayName: '', // Invalid empty string
        bio: 'a'.repeat(501) // Too long bio
      }
      const validationError = new TestApiError('Validation failed', 400, 'VALIDATION_ERROR')
      mockPut.mockRejectedValue(validationError)
      const mockToken = 'jwt-token-123'

      // Act & Assert
      await expect(updateUserProfile(invalidData, mockToken)).rejects.toThrow('Validation failed')
      expect(mockPut).toHaveBeenCalledWith('/api/users/profile', invalidData, {
        token: mockToken
      })
    })
  })

  describe('getUserByUsername', () => {
    it('should fetch user by username successfully', async () => {
      // Arrange
      const username = 'testuser'
      const mockResponse: ApiResponse<User> = {
        data: mockUser,
        status: 200
      }
      mockGet.mockResolvedValue(mockResponse)

      // Act
      const result = await getUserByUsername(username)

      // Assert
      expect(mockGet).toHaveBeenCalledWith(`/api/users/${username}`)
      expect(result).toEqual(mockUser)
    })

    it('should handle user not found', async () => {
      // Arrange
      const username = 'nonexistentuser'
      const notFoundError = new TestApiError('User not found', 404, 'USER_NOT_FOUND')
      mockGet.mockRejectedValue(notFoundError)

      // Act & Assert
      await expect(getUserByUsername(username)).rejects.toThrow('User not found')
      expect(mockGet).toHaveBeenCalledWith(`/api/users/${username}`)
    })
  })

  describe('getUserById', () => {
    it('should fetch user by ID successfully', async () => {
      // Arrange
      const userId = 'user-123'
      const mockResponse: ApiResponse<User> = {
        data: mockUser,
        status: 200
      }
      mockGet.mockResolvedValue(mockResponse)

      // Act
      const result = await getUserById(userId)

      // Assert
      expect(mockGet).toHaveBeenCalledWith(`/api/users/id/${userId}`)
      expect(result).toEqual(mockUser)
    })

    it('should handle invalid user ID format', async () => {
      // Arrange
      const invalidUserId = 'invalid-id'
      const validationError = new TestApiError('Invalid user ID format', 400, 'VALIDATION_ERROR')
      mockGet.mockRejectedValue(validationError)

      // Act & Assert
      await expect(getUserById(invalidUserId)).rejects.toThrow('Invalid user ID format')
      expect(mockGet).toHaveBeenCalledWith(`/api/users/id/${invalidUserId}`)
    })
  })

  describe('uploadUserAvatar', () => {
    it('should upload avatar successfully', async () => {
      // Arrange
      const file = new File(['fake-image-data'], 'avatar.jpg', { type: 'image/jpeg' })
      const updatedUser: User = { ...mockUser, avatarUrl: 'https://example.com/new-avatar.jpg' }
      const mockResponse: ApiResponse<User> = {
        data: updatedUser,
        status: 200
      }
      mockPost.mockResolvedValue(mockResponse)
      const mockToken = 'jwt-token-123'

      // Act
      const result = await uploadUserAvatar(file, mockToken)

      // Assert
      expect(mockPost).toHaveBeenCalledWith('/api/users/avatar', expect.any(FormData), {
        token: mockToken,
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      expect(result).toEqual(updatedUser)
    })

    it('should handle file size exceeded error', async () => {
      // Arrange
      const largeFile = new File(['x'.repeat(10000000)], 'large-avatar.jpg', { type: 'image/jpeg' })
      const fileSizeError = new TestApiError('File size too large', 413, 'FILE_TOO_LARGE')
      mockPost.mockRejectedValue(fileSizeError)
      const mockToken = 'jwt-token-123'

      // Act & Assert
      await expect(uploadUserAvatar(largeFile, mockToken)).rejects.toThrow('File size too large')
      expect(mockPost).toHaveBeenCalledWith('/api/users/avatar', expect.any(FormData), {
        token: mockToken,
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    })

    it('should handle invalid file type error', async () => {
      // Arrange
      const invalidFile = new File(['fake-text-data'], 'document.txt', { type: 'text/plain' })
      const fileTypeError = new TestApiError('Invalid file type', 400, 'INVALID_FILE_TYPE')
      mockPost.mockRejectedValue(fileTypeError)
      const mockToken = 'jwt-token-123'

      // Act & Assert
      await expect(uploadUserAvatar(invalidFile, mockToken)).rejects.toThrow('Invalid file type')
      expect(mockPost).toHaveBeenCalledWith('/api/users/avatar', expect.any(FormData), {
        token: mockToken,
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    })
  })

  describe('getUserFollowers', () => {
    it('should fetch user followers successfully', async () => {
      // Arrange
      const username = 'testuser'
      const page = 1
      const limit = 10
      const mockResponse: ApiResponse<PaginatedFollowResult> = {
        data: mockPaginatedResult,
        status: 200
      }
      mockGet.mockResolvedValue(mockResponse)

      // Act
      const result = await getUserFollowers(username, page, limit)

      // Assert
      expect(mockGet).toHaveBeenCalledWith(`/api/users/${username}/followers?page=${page}&limit=${limit}`)
      expect(result).toEqual(mockPaginatedResult)
    })

    it('should handle empty followers list', async () => {
      // Arrange
      const username = 'newuser'
      const emptyResult: PaginatedFollowResult = {
        users: [],
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false
      }
      const mockResponse: ApiResponse<PaginatedFollowResult> = {
        data: emptyResult,
        status: 200
      }
      mockGet.mockResolvedValue(mockResponse)

      // Act
      const result = await getUserFollowers(username, 1, 10)

      // Assert
      expect(result).toEqual(emptyResult)
      expect(result.users).toHaveLength(0)
      expect(result.hasMore).toBe(false)
    })

    it('should handle private user followers when not authorized', async () => {
      // Arrange
      const username = 'privateuser'
      const forbiddenError = new TestApiError('Access denied to private user followers', 403, 'ACCESS_DENIED')
      mockGet.mockRejectedValue(forbiddenError)

      // Act & Assert
      await expect(getUserFollowers(username, 1, 10)).rejects.toThrow('Access denied to private user followers')
      expect(mockGet).toHaveBeenCalledWith(`/api/users/${username}/followers?page=1&limit=10`)
    })
  })

  describe('getUserFollowing', () => {
    it('should fetch user following successfully', async () => {
      // Arrange
      const username = 'testuser'
      const page = 1
      const limit = 10
      const mockResponse: ApiResponse<PaginatedFollowResult> = {
        data: mockPaginatedResult,
        status: 200
      }
      mockGet.mockResolvedValue(mockResponse)

      // Act
      const result = await getUserFollowing(username, page, limit)

      // Assert
      expect(mockGet).toHaveBeenCalledWith(`/api/users/${username}/following?page=${page}&limit=${limit}`)
      expect(result).toEqual(mockPaginatedResult)
    })

    it('should use default pagination parameters', async () => {
      // Arrange
      const username = 'testuser'
      const mockResponse: ApiResponse<PaginatedFollowResult> = {
        data: mockPaginatedResult,
        status: 200
      }
      mockGet.mockResolvedValue(mockResponse)

      // Act
      const result = await getUserFollowing(username)

      // Assert
      expect(mockGet).toHaveBeenCalledWith(`/api/users/${username}/following?page=1&limit=20`) // Default values
      expect(result).toEqual(mockPaginatedResult)
    })
  })

  describe('getUserStats', () => {
    it('should fetch user statistics successfully', async () => {
      // Arrange
      const username = 'testuser'
      const mockResponse: ApiResponse<UserStats> = {
        data: mockUserStats,
        status: 200
      }
      mockGet.mockResolvedValue(mockResponse)

      // Act
      const result = await getUserStats(username)

      // Assert
      expect(mockGet).toHaveBeenCalledWith(`/api/users/${username}/stats`)
      expect(result).toEqual(mockUserStats)
    })

    it('should handle stats for user with zero activity', async () => {
      // Arrange
      const username = 'inactiveuser'
      const zeroStats: UserStats = {
        followersCount: 0,
        followingCount: 0,
        postsCount: 0
      }
      const mockResponse: ApiResponse<UserStats> = {
        data: zeroStats,
        status: 200
      }
      mockGet.mockResolvedValue(mockResponse)

      // Act
      const result = await getUserStats(username)

      // Assert
      expect(result).toEqual(zeroStats)
      expect(result.followersCount).toBe(0)
      expect(result.followingCount).toBe(0)
      expect(result.postsCount).toBe(0)
    })
  })

  describe('blockUser', () => {
    it('should block user successfully', async () => {
      // Arrange
      const username = 'usertoblock'
      const mockResponse: ApiResponse<void> = {
        data: undefined,
        status: 200
      }
      mockPost.mockResolvedValue(mockResponse)
      const mockToken = 'jwt-token-123'

      // Act
      await blockUser(username, mockToken)

      // Assert
      expect(mockPost).toHaveBeenCalledWith(`/api/users/${username}/block`, {}, {
        token: mockToken
      })
      // blockUser should complete without error (void return)
    })

    it('should handle blocking already blocked user', async () => {
      // Arrange
      const username = 'alreadyblocked'
      const conflictError = new TestApiError('User is already blocked', 409, 'ALREADY_BLOCKED')
      mockPost.mockRejectedValue(conflictError)
      const mockToken = 'jwt-token-123'

      // Act & Assert
      await expect(blockUser(username, mockToken)).rejects.toThrow('User is already blocked')
      expect(mockPost).toHaveBeenCalledWith(`/api/users/${username}/block`, {}, {
        token: mockToken
      })
    })

    it('should handle blocking non-existent user', async () => {
      // Arrange
      const username = 'nonexistentuser'
      const notFoundError = new TestApiError('User not found', 404, 'USER_NOT_FOUND')
      mockPost.mockRejectedValue(notFoundError)
      const mockToken = 'jwt-token-123'

      // Act & Assert
      await expect(blockUser(username, mockToken)).rejects.toThrow('User not found')
      expect(mockPost).toHaveBeenCalledWith(`/api/users/${username}/block`, {}, {
        token: mockToken
      })
    })
  })

  describe('unblockUser', () => {
    it('should unblock user successfully', async () => {
      // Arrange
      const username = 'usertounblock'
      const mockResponse: ApiResponse<void> = {
        data: undefined,
        status: 200
      }
      mockDelete.mockResolvedValue(mockResponse)
      const mockToken = 'jwt-token-123'

      // Act
      await unblockUser(username, mockToken)

      // Assert
      expect(mockDelete).toHaveBeenCalledWith(`/api/users/${username}/block`, {
        token: mockToken
      })
      // unblockUser should complete without error (void return)
    })

    it('should handle unblocking user that was not blocked', async () => {
      // Arrange
      const username = 'neverblocked'
      const conflictError = new TestApiError('User is not blocked', 409, 'NOT_BLOCKED')
      mockDelete.mockRejectedValue(conflictError)
      const mockToken = 'jwt-token-123'

      // Act & Assert
      await expect(unblockUser(username, mockToken)).rejects.toThrow('User is not blocked')
      expect(mockDelete).toHaveBeenCalledWith(`/api/users/${username}/block`, {
        token: mockToken
      })
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle network timeouts', async () => {
      // Arrange - Fixed: Use TestApiError instead of Error for code property
      const timeoutError = new TestApiError('Request timeout', 408, 'NETWORK_ERROR')
      mockGet.mockRejectedValue(timeoutError)

      // Act & Assert
      await expect(getUserByUsername('testuser')).rejects.toThrow('Request timeout')
    })

    it('should handle malformed API responses', async () => {
      // Arrange
      const malformedData = { invalidData: 'not a user object' }
      const malformedResponse: ApiResponse<unknown> = {
        data: malformedData,
        status: 200
      }
      mockGet.mockResolvedValue(malformedResponse as ApiResponse<User>)

      // Act
      const result = await getUserByUsername('testuser')

      // Assert
      expect(result).toEqual(malformedData)
      // Note: The service should handle response validation, but we're testing the current behavior
    })

    it('should handle rate limiting errors', async () => {
      // Arrange - Fixed: Use TestApiError instead of Error for status property
      const rateLimitError = new TestApiError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED')
      mockGet.mockRejectedValue(rateLimitError)

      // Act & Assert
      await expect(getUserStats('testuser')).rejects.toThrow('Too many requests')
    })
  })
})

// frontend/src/services/__tests__/userService.test.ts
// Version: 1.0.5
// Fixed TypeScript error - Replaced Error with TestApiError for code property assignment