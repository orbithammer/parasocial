// backend/tests/routes/authRegistration.test.ts
// Unit tests for user registration endpoint functionality
// Tests validation, user creation, error handling, and response formats

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { AuthService } from '../../src/services/AuthService'
import { createAuthRoutes } from '../../src/routes/auth'
import express, { Application } from 'express'
import request from 'supertest'

// Mock Prisma client for testing
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn()
  }
} as any

// Mock AuthService for testing
const mockAuthService = {
  hashPassword: vi.fn(),
  generateToken: vi.fn()
} as any

// Test data for registration scenarios
const validRegistrationData = {
  username: 'testuser123',
  email: 'test@example.com',
  password: 'SecurePassword123',
  displayName: 'Test User',
  bio: 'I am a test user for registration testing'
}

const mockCreatedUser = {
  id: 'user_123456789',
  username: 'testuser123',
  email: 'test@example.com',
  displayName: 'Test User',
  bio: 'I am a test user for registration testing',
  avatar: null,
  isVerified: false,
  verificationTier: 'none',
  createdAt: '2024-01-15T10:30:00.000Z' // String format as it appears in JSON response
}

describe('Authentication Routes - User Registration', () => {
  let app: Application
  let authRoutes: any

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()

    // Create Express app with auth routes for testing
    app = express()
    app.use(express.json()) // Parse JSON request bodies
    
    // Create auth routes with mocked dependencies
    authRoutes = createAuthRoutes(mockPrisma, mockAuthService)
    app.use('/auth', authRoutes)

    // Set up default mock implementations
    mockAuthService.hashPassword.mockResolvedValue('hashed_password_123')
    mockAuthService.generateToken.mockReturnValue('jwt_token_abc123')
  })

  afterEach(() => {
    // Clean up after each test
    vi.resetAllMocks()
  })

  describe('POST /auth/register - Valid Registration', () => {
    it('should successfully register a new user with valid data', async () => {
      // Arrange: Set up mocks for successful registration
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // Username not taken
        .mockResolvedValueOnce(null) // Email not taken
      
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser)

      // Act: Make registration request
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201)

      // Assert: Verify response structure and data
      expect(response.body).toEqual({
        success: true,
        data: {
          user: mockCreatedUser,
          token: 'jwt_token_abc123'
        }
      })

      // Assert: Verify service method calls
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2)
      expect(mockPrisma.user.findUnique).toHaveBeenNthCalledWith(1, {
        where: { username: 'testuser123' }
      })
      expect(mockPrisma.user.findUnique).toHaveBeenNthCalledWith(2, {
        where: { email: 'test@example.com' }
      })

      expect(mockAuthService.hashPassword).toHaveBeenCalledWith('SecurePassword123')
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'testuser123',
          email: 'test@example.com',
          passwordHash: 'hashed_password_123',
          displayName: 'Test User',
          bio: 'I am a test user for registration testing',
          isVerified: false,
          verificationTier: 'none'
        },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          bio: true,
          avatar: true,
          isVerified: true,
          verificationTier: true,
          createdAt: true
        }
      })

      expect(mockAuthService.generateToken).toHaveBeenCalledWith(mockCreatedUser)
    })

    it('should register user with minimal required data (no bio or displayName)', async () => {
      // Arrange: Minimal registration data
      const minimalData = {
        username: 'minimaluser',
        email: 'minimal@example.com',
        password: 'Password123'
      }

      const minimalUser = {
        ...mockCreatedUser,
        username: 'minimaluser',
        email: 'minimal@example.com',
        displayName: 'minimaluser', // Should default to username
        bio: null // Should be null when not provided
      }

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      mockPrisma.user.create.mockResolvedValue(minimalUser)

      // Act: Register with minimal data
      const response = await request(app)
        .post('/auth/register')
        .send(minimalData)
        .expect(201)

      // Assert: Verify defaults are applied correctly
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          username: 'minimaluser',
          email: 'minimal@example.com',
          passwordHash: 'hashed_password_123',
          displayName: 'minimaluser', // Default to username
          bio: undefined, // Should be undefined for optional field
          isVerified: false,
          verificationTier: 'none'
        },
        select: expect.any(Object)
      })

      expect(response.body.success).toBe(true)
      expect(response.body.data.user.displayName).toBe('minimaluser')
    })
  })

  describe('POST /auth/register - Input Validation Errors', () => {
    it('should reject registration with invalid username format', async () => {
      // Arrange: Invalid username with special characters
      const invalidData = {
        ...validRegistrationData,
        username: 'invalid-user@name!' // Contains invalid characters
      }

      // Act: Attempt registration with invalid username
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400)

      // Assert: Verify validation error response
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: expect.arrayContaining([
            expect.objectContaining({
              code: 'invalid_string',
              path: ['username'],
              message: 'Username can only contain letters, numbers, and underscores'
            })
          ])
        }
      })

      // Assert: No database operations should be attempted
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it('should reject registration with short username', async () => {
      // Arrange: Username too short
      const invalidData = {
        ...validRegistrationData,
        username: 'ab' // Only 2 characters, minimum is 3
      }

      // Act: Attempt registration
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400)

      // Assert: Verify validation error
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'too_small',
            path: ['username'],
            message: 'Username must be at least 3 characters'
          })
        ])
      )
    })

    it('should reject registration with long username', async () => {
      // Arrange: Username too long
      const invalidData = {
        ...validRegistrationData,
        username: 'a'.repeat(31) // 31 characters, maximum is 30
      }

      // Act: Attempt registration
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400)

      // Assert: Verify validation error
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'too_big',
            path: ['username'],
            message: 'Username must be no more than 30 characters'
          })
        ])
      )
    })

    it('should reject registration with invalid email format', async () => {
      // Arrange: Invalid email format
      const invalidData = {
        ...validRegistrationData,
        email: 'not-a-valid-email'
      }

      // Act: Attempt registration
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400)

      // Assert: Verify validation error
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_string',
            path: ['email'],
            message: 'Invalid email format'
          })
        ])
      )
    })

    it('should reject registration with short password', async () => {
      // Arrange: Password too short
      const invalidData = {
        ...validRegistrationData,
        password: '1234567' // Only 7 characters, minimum is 8
      }

      // Act: Attempt registration
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400)

      // Assert: Verify validation error
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'too_small',
            path: ['password'],
            message: 'Password must be at least 8 characters'
          })
        ])
      )
    })

    it('should reject registration with long bio', async () => {
      // Arrange: Bio too long
      const invalidData = {
        ...validRegistrationData,
        bio: 'a'.repeat(501) // 501 characters, maximum is 500
      }

      // Act: Attempt registration
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400)

      // Assert: Verify validation error
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'too_big',
            path: ['bio'],
            message: 'Bio must be no more than 500 characters'
          })
        ])
      )
    })

    it('should reject registration with missing required fields', async () => {
      // Arrange: Missing required fields
      const invalidData = {
        username: 'testuser'
        // Missing email and password
      }

      // Act: Attempt registration
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400)

      // Assert: Verify multiple validation errors
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_type',
            path: ['email'],
            message: 'Required',
            expected: 'string',
            received: 'undefined'
          }),
          expect.objectContaining({
            code: 'invalid_type',
            path: ['password'],
            message: 'Required',
            expected: 'string',
            received: 'undefined'
          })
        ])
      )
    })
  })

  describe('POST /auth/register - Duplicate User Conflicts', () => {
    it('should reject registration when username already exists', async () => {
      // Arrange: Mock existing user with same username
      const existingUser = { id: 'existing_user', username: 'testuser123' }
      mockPrisma.user.findUnique.mockResolvedValueOnce(existingUser)

      // Act: Attempt registration with existing username
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(409)

      // Assert: Verify conflict response
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'Username is already taken',
          details: {
            field: 'username',
            value: 'testuser123'
          }
        }
      })

      // Assert: Only username check should be performed
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1)
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it('should reject registration when email already exists', async () => {
      // Arrange: Mock username available but email taken
      const existingUser = { id: 'existing_user', email: 'test@example.com' }
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // Username available
        .mockResolvedValueOnce(existingUser) // Email taken

      // Act: Attempt registration with existing email
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(409)

      // Assert: Verify conflict response
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Email is already registered',
          details: {
            field: 'email',
            value: 'test@example.com'
          }
        }
      })

      // Assert: Both checks should be performed
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2)
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })
  })

  describe('POST /auth/register - Server Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Arrange: Mock database error
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

      // Act: Attempt registration during database error
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(500)

      // Assert: Verify error response
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during registration'
        }
      })
    })

    it('should handle password hashing errors', async () => {
      // Arrange: Mock successful checks but password hashing failure
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      mockAuthService.hashPassword.mockRejectedValue(new Error('Hashing failed'))

      // Act: Attempt registration
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(500)

      // Assert: Verify error handling
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('SERVER_ERROR')
    })

    it('should handle user creation errors in database', async () => {
      // Arrange: Mock successful checks and hashing but user creation failure
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      mockPrisma.user.create.mockRejectedValue(new Error('User creation failed'))

      // Act: Attempt registration
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(500)

      // Assert: Verify error handling
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('SERVER_ERROR')
    })
  })
})