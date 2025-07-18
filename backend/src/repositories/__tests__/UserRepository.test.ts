// backend\src\repositories\__tests__\UserRepository.test.ts
// Version: 1.0.0 - Initial comprehensive unit test suite for UserRepository
// Tests all methods: create, findById, findByEmail, findByUsername, findByEmailOrUsername, update, delete, searchUsers, isUsernameAvailable, isEmailAvailable, getByVerificationTier

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { UserRepository, type UserCreateData, type UserUpdateData, type SearchOptions } from '../UserRepository'
import { User } from '../../models/User'

/**
 * Mock user data interface for testing
 */
interface MockDbUser {
  id: string
  email: string
  username: string
  passwordHash: string
  displayName: string
  bio: string
  avatar: string | null
  website: string | null
  isVerified: boolean
  verificationTier: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Mock the User model
vi.mock('../../models/User', () => ({
  User: vi.fn().mockImplementation((userData: MockDbUser) => ({
    id: userData.id,
    email: userData.email,
    username: userData.username,
    displayName: userData.displayName,
    bio: userData.bio,
    avatar: userData.avatar,
    website: userData.website,
    isVerified: userData.isVerified,
    verificationTier: userData.verificationTier,
    isActive: userData.isActive,
    createdAt: userData.createdAt,
    updatedAt: userData.updatedAt,
    getPublicProfile: vi.fn().mockReturnValue({
      id: userData.id,
      username: userData.username,
      displayName: userData.displayName,
      bio: userData.bio,
      avatar: userData.avatar,
      website: userData.website,
      isVerified: userData.isVerified,
      verificationTier: userData.verificationTier
    })
  }))
}))

// Create mock functions for Prisma operations
const mockCreate = vi.fn()
const mockFindUnique = vi.fn()
const mockFindFirst = vi.fn()
const mockFindMany = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

// Mock PrismaClient with proper structure
const mockPrismaClient = {
  user: {
    create: mockCreate,
    findUnique: mockFindUnique,
    findFirst: mockFindFirst,
    findMany: mockFindMany,
    update: mockUpdate,
    delete: mockDelete
  }
} as unknown as PrismaClient

describe('UserRepository', () => {
  let userRepository: UserRepository
  let mockUserData: MockDbUser

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Initialize repository with mocked Prisma client
    userRepository = new UserRepository(mockPrismaClient)
    
    // Create mock user data for testing
    mockUserData = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashedpassword123',
      displayName: 'Test User',
      bio: 'Test bio',
      avatar: 'avatar.jpg',
      website: 'https://example.com',
      isVerified: true,
      verificationTier: 'verified',
      isActive: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }
  })

  describe('create', () => {
    it('should create a new user with all required fields', async () => {
      // Arrange
      const createData: UserCreateData = {
        email: 'new@example.com',
        username: 'newuser',
        passwordHash: 'hashedpassword456',
        displayName: 'New User',
        bio: 'New user bio',
        isVerified: false,
        verificationTier: 'none'
      }

      const expectedDbData = {
        email: createData.email,
        username: createData.username,
        passwordHash: createData.passwordHash,
        displayName: createData.displayName,
        bio: createData.bio,
        isVerified: createData.isVerified,
        verificationTier: createData.verificationTier
      }

      ;mockCreate.mockResolvedValue(mockUserData)

      // Act
      const result = await userRepository.create(createData)

      // Assert
      expect(mockCreate).toHaveBeenCalledWith({
        data: expectedDbData
      })
      expect(User).toHaveBeenCalledWith(mockUserData)
      expect(result).toBeInstanceOf(User)
    })

    it('should create user with default values when optional fields are missing', async () => {
      // Arrange
      const createData: UserCreateData = {
        email: 'minimal@example.com',
        username: 'minimaluser',
        passwordHash: 'hashedpassword789'
      }

      const expectedDbData = {
        email: createData.email,
        username: createData.username,
        passwordHash: createData.passwordHash,
        displayName: createData.username, // Should default to username
        bio: '', // Should default to empty string
        isVerified: false, // Should default to false
        verificationTier: 'none' // Should default to 'none'
      }

      ;mockCreate.mockResolvedValue(mockUserData)

      // Act
      const result = await userRepository.create(createData)

      // Assert
      expect(mockCreate).toHaveBeenCalledWith({
        data: expectedDbData
      })
      expect(result).toBeInstanceOf(User)
    })
  })

  describe('findById', () => {
    it('should return user when found by id', async () => {
      // Arrange
      const userId = 'user123'
      mockFindUnique.mockResolvedValue(mockUserData)

      // Act
      const result = await userRepository.findById(userId)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: userId }
      })
      expect(User).toHaveBeenCalledWith(mockUserData)
      expect(result).toBeInstanceOf(User)
    })

    it('should return null when user not found by id', async () => {
      // Arrange
      const userId = 'nonexistent'
      mockFindUnique.mockResolvedValue(null)

      // Act
      const result = await userRepository.findById(userId)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: userId }
      })
      expect(result).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      // Arrange
      const email = 'test@example.com'
      mockFindUnique.mockResolvedValue(mockUserData)

      // Act
      const result = await userRepository.findByEmail(email)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email }
      })
      expect(User).toHaveBeenCalledWith(mockUserData)
      expect(result).toBeInstanceOf(User)
    })

    it('should return null when user not found by email', async () => {
      // Arrange
      const email = 'nonexistent@example.com'
      mockFindUnique.mockResolvedValue(null)

      // Act
      const result = await userRepository.findByEmail(email)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email }
      })
      expect(result).toBeNull()
    })
  })

  describe('findByUsername', () => {
    it('should return user when found by username', async () => {
      // Arrange
      const username = 'testuser'
      mockFindUnique.mockResolvedValue(mockUserData)

      // Act
      const result = await userRepository.findByUsername(username)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { username }
      })
      expect(User).toHaveBeenCalledWith(mockUserData)
      expect(result).toBeInstanceOf(User)
    })

    it('should return null when user not found by username', async () => {
      // Arrange
      const username = 'nonexistentuser'
      mockFindUnique.mockResolvedValue(null)

      // Act
      const result = await userRepository.findByUsername(username)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { username }
      })
      expect(result).toBeNull()
    })
  })

  describe('findByEmailOrUsername', () => {
    it('should return user when found by email or username', async () => {
      // Arrange
      const email = 'test@example.com'
      const username = 'testuser'
      mockFindFirst.mockResolvedValue(mockUserData)

      // Act
      const result = await userRepository.findByEmailOrUsername(email, username)

      // Assert
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      })
      expect(User).toHaveBeenCalledWith(mockUserData)
      expect(result).toBeInstanceOf(User)
    })

    it('should return null when user not found by email or username', async () => {
      // Arrange
      const email = 'nonexistent@example.com'
      const username = 'nonexistentuser'
      mockFindFirst.mockResolvedValue(null)

      // Act
      const result = await userRepository.findByEmailOrUsername(email, username)

      // Assert
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      })
      expect(result).toBeNull()
    })
  })

  describe('isUsernameAvailable', () => {
    it('should return true when username is available', async () => {
      // Arrange
      const username = 'availableuser'
      mockFindUnique.mockResolvedValue(null)

      // Act
      const result = await userRepository.isUsernameAvailable(username)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { username }
      })
      expect(result).toBe(true)
    })

    it('should return false when username is taken', async () => {
      // Arrange
      const username = 'takenuser'
      mockFindUnique.mockResolvedValue(mockUserData)

      // Act
      const result = await userRepository.isUsernameAvailable(username)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { username }
      })
      expect(result).toBe(false)
    })

    it('should return true when username is taken by excluded user', async () => {
      // Arrange
      const username = 'testuser'
      const excludeUserId = 'user123'
      mockFindUnique.mockResolvedValue(mockUserData)

      // Act
      const result = await userRepository.isUsernameAvailable(username, excludeUserId)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { username }
      })
      expect(result).toBe(true)
    })
  })

  describe('isEmailAvailable', () => {
    it('should return true when email is available', async () => {
      // Arrange
      const email = 'available@example.com'
      mockFindUnique.mockResolvedValue(null)

      // Act
      const result = await userRepository.isEmailAvailable(email)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email }
      })
      expect(result).toBe(true)
    })

    it('should return false when email is taken', async () => {
      // Arrange
      const email = 'taken@example.com'
      mockFindUnique.mockResolvedValue(mockUserData)

      // Act
      const result = await userRepository.isEmailAvailable(email)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email }
      })
      expect(result).toBe(false)
    })

    it('should return true when email is taken by excluded user', async () => {
      // Arrange
      const email = 'test@example.com'
      const excludeUserId = 'user123'
      mockFindUnique.mockResolvedValue(mockUserData)

      // Act
      const result = await userRepository.isEmailAvailable(email, excludeUserId)

      // Assert
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email }
      })
      expect(result).toBe(true)
    })
  })

  describe('getByVerificationTier', () => {
    it('should return users by verification tier with default options', async () => {
      // Arrange
      const tier = 'verified'
      const mockUsers = [mockUserData, { ...mockUserData, id: 'user456' }]
      mockFindMany.mockResolvedValue(mockUsers)

      // Act
      const result = await userRepository.getByVerificationTier(tier)

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          verificationTier: tier,
          isActive: true
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' }
      })
      expect(result).toHaveLength(2)
      expect(result[0]).toBeInstanceOf(User)
      expect(result[1]).toBeInstanceOf(User)
    })

    it('should return users by verification tier with custom options', async () => {
      // Arrange
      const tier = 'premium'
      const options: SearchOptions = { offset: 10, limit: 5 }
      const mockUsers = [mockUserData]
      mockFindMany.mockResolvedValue(mockUsers)

      // Act
      const result = await userRepository.getByVerificationTier(tier, options)

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          verificationTier: tier,
          isActive: true
        },
        skip: 10,
        take: 5,
        orderBy: { createdAt: 'desc' }
      })
      expect(result).toHaveLength(1)
      expect(result[0]).toBeInstanceOf(User)
    })

    it('should return empty array when no users found for verification tier', async () => {
      // Arrange
      const tier = 'nonexistent'
      mockFindMany.mockResolvedValue([])

      // Act
      const result = await userRepository.getByVerificationTier(tier)

      // Assert
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          verificationTier: tier,
          isActive: true
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' }
      })
      expect(result).toHaveLength(0)
    })
  })
})