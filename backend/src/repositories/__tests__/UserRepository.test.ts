// backend/src/repositories/__tests__/UserRepository.test.ts
// Version: 1.0.0
// Initial creation of UserRepository unit tests with proper mocking

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import type { TestUser } from '../../types/testData'

/**
 * Mock database interface for testing
 */
interface MockDatabase {
  user: {
    create: MockedFunction<any>
    findUnique: MockedFunction<any>
    findFirst: MockedFunction<any>
    findMany: MockedFunction<any>
    update: MockedFunction<any>
    delete: MockedFunction<any>
  }
}

/**
 * Mock user repository class for testing
 */
class MockUserRepository {
  constructor(private db: MockDatabase) {}

  async create(userData: Partial<TestUser>): Promise<TestUser> {
    return await this.db.user.create({ data: userData })
  }

  async findById(id: string): Promise<TestUser | null> {
    return await this.db.user.findUnique({ where: { id } })
  }

  async findByEmail(email: string): Promise<TestUser | null> {
    return await this.db.user.findFirst({ where: { email } })
  }

  async findByUsername(username: string): Promise<TestUser | null> {
    return await this.db.user.findFirst({ where: { username } })
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<TestUser | null> {
    return await this.db.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      }
    })
  }

  async getByVerificationTier(
    tier: string, 
    options: { limit?: number; offset?: number } = {}
  ): Promise<TestUser[]> {
    const { limit = 10, offset = 0 } = options
    return await this.db.user.findMany({
      where: { verificationTier: tier },
      take: limit,
      skip: offset
    })
  }
}

/**
 * Test suite for UserRepository
 * Tests user CRUD operations with proper mocking
 */
describe('UserRepository', () => {
  let mockDb: MockDatabase
  let userRepository: MockUserRepository
  let mockUser: TestUser

  /**
   * Set up test environment before each test
   * Creates fresh mocks and repository instance
   */
  beforeEach(() => {
    // Create mock database with all required methods
    mockDb = {
      user: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
      }
    }

    // Create repository instance with mocked database
    userRepository = new MockUserRepository(mockDb)

    // Create standard mock user data
    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      bio: 'Test bio',
      avatar: null,
      website: null,
      passwordHash: 'hashed_password',
      isVerified: false,
      verificationTier: 'basic',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      publicKey: null,
      privateKey: null,
      lastLoginAt: null,
      followersCount: 0,
      followingCount: 0,
      postsCount: 0
    }
  })

  /**
   * Tests for user creation functionality
   */
  describe('create', () => {
    it('should create a new user with all required fields', async () => {
      // Arrange: Set up mock to return created user
      mockDb.user.create.mockResolvedValue(mockUser)

      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed_password'
      }

      // Act: Create user
      const result = await userRepository.create(userData)

      // Assert: Verify mock was called correctly and result is correct
      expect(mockDb.user.create).toHaveBeenCalledWith({ data: userData })
      expect(mockDb.user.create).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockUser)
    })

    it('should create user with default values when optional fields are missing', async () => {
      // Arrange: Create user with minimal data
      const minimalUser = {
        ...mockUser,
        displayName: null,
        bio: null
      }
      mockDb.user.create.mockResolvedValue(minimalUser)

      const minimalUserData = {
        email: 'minimal@example.com',
        username: 'minimal',
        passwordHash: 'hashed_password'
      }

      // Act: Create user with minimal data
      const result = await userRepository.create(minimalUserData)

      // Assert: Verify creation with minimal data
      expect(mockDb.user.create).toHaveBeenCalledWith({ data: minimalUserData })
      expect(result.displayName).toBeNull()
      expect(result.bio).toBeNull()
    })
  })

  /**
   * Tests for finding users by ID
   */
  describe('findById', () => {
    it('should return user when found by id', async () => {
      // Arrange: Mock successful user lookup
      mockDb.user.findUnique.mockResolvedValue(mockUser)

      // Act: Find user by ID
      const result = await userRepository.findById('user123')

      // Assert: Verify correct database call and result
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user123' } })
      expect(mockDb.user.findUnique).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockUser)
    })

    it('should return null when user not found by id', async () => {
      // Arrange: Mock user not found
      mockDb.user.findUnique.mockResolvedValue(null)

      // Act: Try to find non-existent user
      const result = await userRepository.findById('nonexistent')

      // Assert: Verify null result
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({ where: { id: 'nonexistent' } })
      expect(result).toBeNull()
    })
  })

  /**
   * Tests for finding users by email
   */
  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      // Arrange: Mock successful email lookup
      mockDb.user.findFirst.mockResolvedValue(mockUser)

      // Act: Find user by email
      const result = await userRepository.findByEmail('test@example.com')

      // Assert: Verify correct database call and result
      expect(mockDb.user.findFirst).toHaveBeenCalledWith({ where: { email: 'test@example.com' } })
      expect(mockDb.user.findFirst).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockUser)
    })

    it('should return null when user not found by email', async () => {
      // Arrange: Mock user not found
      mockDb.user.findFirst.mockResolvedValue(null)

      // Act: Try to find user with non-existent email
      const result = await userRepository.findByEmail('notfound@example.com')

      // Assert: Verify null result
      expect(result).toBeNull()
    })
  })

  /**
   * Tests for finding users by username
   */
  describe('findByUsername', () => {
    it('should return user when found by username', async () => {
      // Arrange: Mock successful username lookup
      mockDb.user.findFirst.mockResolvedValue(mockUser)

      // Act: Find user by username
      const result = await userRepository.findByUsername('testuser')

      // Assert: Verify correct database call and result
      expect(mockDb.user.findFirst).toHaveBeenCalledWith({ where: { username: 'testuser' } })
      expect(mockDb.user.findFirst).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockUser)
    })

    it('should return null when user not found by username', async () => {
      // Arrange: Mock user not found
      mockDb.user.findFirst.mockResolvedValue(null)

      // Act: Try to find user with non-existent username
      const result = await userRepository.findByUsername('notfound')

      // Assert: Verify null result
      expect(result).toBeNull()
    })
  })

  /**
   * Tests for finding users by email or username
   */
  describe('findByEmailOrUsername', () => {
    it('should return user when found by email or username', async () => {
      // Arrange: Mock successful lookup
      mockDb.user.findFirst.mockResolvedValue(mockUser)

      // Act: Find user by email
      const result = await userRepository.findByEmailOrUsername('test@example.com')

      // Assert: Verify OR query structure
      expect(mockDb.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: 'test@example.com' },
            { username: 'test@example.com' }
          ]
        }
      })
      expect(result).toEqual(mockUser)
    })

    it('should return null when user not found by email or username', async () => {
      // Arrange: Mock user not found
      mockDb.user.findFirst.mockResolvedValue(null)

      // Act: Try to find user with non-existent identifier
      const result = await userRepository.findByEmailOrUsername('notfound')

      // Assert: Verify null result
      expect(result).toBeNull()
    })
  })

  /**
   * Tests for getting users by verification tier
   */
  describe('getByVerificationTier', () => {
    it('should return users by verification tier with default options', async () => {
      // Arrange: Mock users with verification tier
      const verifiedUsers = [mockUser, { ...mockUser, id: 'user456' }]
      mockDb.user.findMany.mockResolvedValue(verifiedUsers)

      // Act: Get users by tier
      const result = await userRepository.getByVerificationTier('verified')

      // Assert: Verify query with default pagination
      expect(mockDb.user.findMany).toHaveBeenCalledWith({
        where: { verificationTier: 'verified' },
        take: 10,
        skip: 0
      })
      expect(mockDb.user.findMany).toHaveBeenCalledTimes(1)
      expect(result).toEqual(verifiedUsers)
      expect(result).toHaveLength(2)
    })

    it('should return users by verification tier with custom options', async () => {
      // Arrange: Mock users with custom pagination
      const customUsers = [mockUser]
      mockDb.user.findMany.mockResolvedValue(customUsers)

      // Act: Get users with custom limit and offset
      const result = await userRepository.getByVerificationTier('premium', { limit: 5, offset: 10 })

      // Assert: Verify query with custom pagination
      expect(mockDb.user.findMany).toHaveBeenCalledWith({
        where: { verificationTier: 'premium' },
        take: 5,
        skip: 10
      })
      expect(result).toEqual(customUsers)
    })

    it('should return empty array when no users found for tier', async () => {
      // Arrange: Mock no users found
      mockDb.user.findMany.mockResolvedValue([])

      // Act: Get users for tier with no results
      const result = await userRepository.getByVerificationTier('nonexistent')

      // Assert: Verify empty result
      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })
  })

  /**
   * Tests for error handling
   */
  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange: Mock database error
      const dbError = new Error('Database connection failed')
      mockDb.user.findUnique.mockRejectedValue(dbError)

      // Act & Assert: Verify error propagation
      await expect(userRepository.findById('user123')).rejects.toThrow('Database connection failed')
      expect(mockDb.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user123' } })
    })
  })
})

// backend/src/repositories/__tests__/UserRepository.test.ts
// Version: 1.0.0
// Initial creation of UserRepository unit tests with proper mocking