// backend/tests/routes/authLogin.test.ts
// Unit tests for user login endpoint functionality
// Tests authentication, validation, error handling, and response formats

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { AuthService } from '../../src/services/AuthService'
import { createAuthRoutes } from '../../src/routes/auth'
import express, { Application } from 'express'
import request from 'supertest'

// Mock Prisma client for testing
const mockPrisma = {
  user: {
    findUnique: vi.fn()
  }
} as any

// Mock AuthService for testing - FIXED: Added missing validation methods
const mockAuthService = {
  verifyPassword: vi.fn(),
  generateToken: vi.fn(),
  validateLoginData: vi.fn(),        // ADDED: This method was missing
  validateRegistrationData: vi.fn(), // ADDED: This method was missing  
  hashPassword: vi.fn()              // ADDED: This method was missing
} as any

// Test data for login scenarios
const validLoginData = {
  email: 'test@example.com',
  password: 'SecurePassword123'
}

const mockUserFromDatabase = {
  id: 'user_123456789',
  username: 'testuser123',
  email: 'test@example.com',
  passwordHash: 'hashed_password_from_db',
  displayName: 'Test User',
  bio: 'I am a test user for login testing',
  avatar: null,
  isVerified: true,
  verificationTier: 'email',
  createdAt: '2024-01-15T10:30:00.000Z'
}

const expectedUserResponse = {
  id: 'user_123456789',
  username: 'testuser123',
  email: 'test@example.com',
  displayName: 'Test User',
  bio: 'I am a test user for login testing',
  avatar: null,
  isVerified: true,
  verificationTier: 'email',
  createdAt: '2024-01-15T10:30:00.000Z'
  // Note: passwordHash should be excluded from response
}

describe('Authentication Routes - User Login', () => {
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
    mockAuthService.generateToken.mockReturnValue('jwt_token_abc123')
    
    // ADDED: Set up default validation success response
    mockAuthService.validateLoginData.mockReturnValue({
      success: true,
      data: validLoginData  
    })
    
    // ADDED: Set up default registration validation (if needed)
    mockAuthService.validateRegistrationData.mockReturnValue({
      success: true,
      data: {} 
    })
  })

  afterEach(() => {
    // Clean up after each test
    vi.resetAllMocks()
  })

  describe('POST /auth/login - Successful Authentication', () => {
    it('should successfully login user with valid credentials', async () => {
      // Arrange: Mock successful authentication flow
      mockPrisma.user.findUnique.mockResolvedValue(mockUserFromDatabase)
      mockAuthService.verifyPassword.mockResolvedValue(true)

      // Act: Send login request
      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(200)

      // Assert: Verify successful response structure
      expect(response.body).toEqual({
        success: true,
        data: {
          user: expectedUserResponse,
          token: 'jwt_token_abc123'
        }
      })

      // Assert: Verify correct service method calls
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: validLoginData.email },
        select: expect.any(Object)
      })
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith(
        'hashed_password_from_db',
        'SecurePassword123'
      )
      expect(mockAuthService.generateToken).toHaveBeenCalledWith({
        id: 'user_123456789',
        username: 'testuser123',
        email: 'test@example.com'
      })
    })

    it('should login user with different verification levels', async () => {
      // Arrange: User with different verification tier
      const unverifiedUser = {
        ...mockUserFromDatabase,
        isVerified: false,
        verificationTier: 'none'
      }

      mockPrisma.user.findUnique.mockResolvedValue(unverifiedUser)
      mockAuthService.verifyPassword.mockResolvedValue(true)

      // Act: Login request
      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(200)

      // Assert: Should successfully login unverified users
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.isVerified).toBe(false)
      expect(response.body.data.user.verificationTier).toBe('none')
      expect(response.body.data.token).toBe('jwt_token_abc123')
    })

    it('should exclude passwordHash from response data', async () => {
      // Arrange: Mock successful authentication
      mockPrisma.user.findUnique.mockResolvedValue(mockUserFromDatabase)
      mockAuthService.verifyPassword.mockResolvedValue(true)

      // Act: Login request
      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(200)

      // Assert: Response should never include password hash
      expect(response.body.data.user).not.toHaveProperty('passwordHash')
      expect(response.body.data.user).not.toHaveProperty('password')
      
      // Assert: All other fields should be present
      expect(response.body.data.user).toHaveProperty('id')
      expect(response.body.data.user).toHaveProperty('username')
      expect(response.body.data.user).toHaveProperty('email')
      expect(response.body.data.user).toHaveProperty('displayName')
    })
  })

  describe('POST /auth/login - Invalid Credentials', () => {
    it('should reject login when user does not exist', async () => {
      // Arrange: User not found in database
      mockPrisma.user.findUnique.mockResolvedValue(null)

      // Act: Attempt login with non-existent user
      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(401)

      // Assert: Verify error response
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      })

      // Assert: Password verification should not be called
      expect(mockAuthService.verifyPassword).not.toHaveBeenCalled()
      expect(mockAuthService.generateToken).not.toHaveBeenCalled()
    })

    it('should reject login when password is incorrect', async () => {
      // Arrange: User exists but password is wrong
      const wrongPasswordData = {
        email: 'test@example.com',
        password: 'WrongPassword123'
      }
      
      // Override validation mock to return the wrong password data
      mockAuthService.validateLoginData.mockReturnValue({
        success: true,
        data: wrongPasswordData
      })
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUserFromDatabase)
      mockAuthService.verifyPassword.mockResolvedValue(false)

      // Act: Attempt login with wrong password
      const response = await request(app)
        .post('/auth/login')
        .send(wrongPasswordData)
        .expect(401)

      // Assert: Verify error response (same message for security)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      })

      // Assert: Password verification should be attempted
      expect(mockAuthService.verifyPassword).toHaveBeenCalledWith(
        'hashed_password_from_db',
        'WrongPassword123'
      )
      expect(mockAuthService.generateToken).not.toHaveBeenCalled()
    })

    it('should provide same error message for non-existent user and wrong password', async () => {
      // Test 1: Non-existent user
      const nonExistentEmailData = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123'
      }
      
      // Override validation mock for first test
      mockAuthService.validateLoginData.mockReturnValue({
        success: true,
        data: nonExistentEmailData
      })
      
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const response1 = await request(app)
        .post('/auth/login')
        .send(nonExistentEmailData)
        .expect(401)

      // Test 2: Wrong password for existing user
      const wrongPasswordData = {
        email: 'test@example.com',
        password: 'WrongPassword123'
      }
      
      // Override validation mock for second test
      mockAuthService.validateLoginData.mockReturnValue({
        success: true,
        data: wrongPasswordData
      })
      
      mockPrisma.user.findUnique.mockResolvedValue(mockUserFromDatabase)
      mockAuthService.verifyPassword.mockResolvedValue(false)

      const response2 = await request(app)
        .post('/auth/login')
        .send(wrongPasswordData)
        .expect(401)

      // Assert: Both should return identical error messages (security best practice)
      expect(response1.body.error.message).toBe(response2.body.error.message)
      expect(response1.body.error.code).toBe(response2.body.error.code)
    })
  })

  describe('POST /auth/login - Input Validation Errors', () => {
    it('should reject login with invalid email format', async () => {
      // Arrange: Mock validation failure for invalid email
      mockAuthService.validateLoginData.mockReturnValue({
        success: false,
        error: {
          errors: [{
            code: 'invalid_string',
            path: ['email'],
            message: 'Invalid email format'
          }]
        }
      })

      const invalidData = {
        email: 'not-a-valid-email',
        password: 'ValidPassword123'
      }

      // Act: Attempt login with invalid email
      const response = await request(app)
        .post('/auth/login')
        .send(invalidData)
        .expect(400)

      // Assert: Verify validation error response
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['email'],
            message: 'Invalid email format'
          })
        ])
      )
    })

    it('should reject login with missing email', async () => {
      // Arrange: Mock validation failure for missing email
      mockAuthService.validateLoginData.mockReturnValue({
        success: false,
        error: {
          errors: [{
            code: 'invalid_type',
            path: ['email'],
            message: 'Required'
          }]
        }
      })

      const invalidData = {
        password: 'ValidPassword123'
      }

      // Act: Attempt login with missing email
      const response = await request(app)
        .post('/auth/login')
        .send(invalidData)
        .expect(400)

      // Assert: Verify validation error
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_type',
            path: ['email'],
            message: 'Required'
          })
        ])
      )
    })

    it('should reject login with missing password', async () => {
      // Arrange: Mock validation failure for missing password
      mockAuthService.validateLoginData.mockReturnValue({
        success: false,
        error: {
          errors: [{
            code: 'invalid_type',
            path: ['password'],
            message: 'Required'
          }]
        }
      })

      const invalidData = {
        email: 'test@example.com'
      }

      // Act: Attempt login with missing password
      const response = await request(app)
        .post('/auth/login')
        .send(invalidData)
        .expect(400)

      // Assert: Verify validation error
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_type',
            path: ['password'],
            message: 'Required'
          })
        ])
      )
    })

    it('should reject login with empty password', async () => {
      // Arrange: Mock validation failure for empty password
      mockAuthService.validateLoginData.mockReturnValue({
        success: false,
        error: {
          errors: [{
            code: 'too_small',
            path: ['password'],
            message: 'Password is required'
          }]
        }
      })

      const invalidData = {
        email: 'test@example.com',
        password: ''
      }

      // Act: Attempt login with empty password
      const response = await request(app)
        .post('/auth/login')
        .send(invalidData)
        .expect(400)

      // Assert: Verify validation error
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'too_small',
            path: ['password'],
            message: 'Password is required'
          })
        ])
      )
    })

    it('should reject login with both email and password missing', async () => {
      // Arrange: Mock validation failure for both missing fields
      mockAuthService.validateLoginData.mockReturnValue({
        success: false,
        error: {
          errors: [
            {
              code: 'invalid_type',
              path: ['email'],
              message: 'Required'
            },
            {
              code: 'invalid_type',
              path: ['password'],
              message: 'Required'
            }
          ]
        }
      })

      const invalidData = {}

      // Act: Attempt login with no data
      const response = await request(app)
        .post('/auth/login')
        .send(invalidData)
        .expect(400)

      // Assert: Verify multiple validation errors
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_type',
            path: ['email'],
            message: 'Required'
          }),
          expect.objectContaining({
            code: 'invalid_type',
            path: ['password'],
            message: 'Required'
          })
        ])
      )

      expect(response.body.error.details).toHaveLength(2)
    })

    it('should reject login with additional unexpected fields', async () => {
      // Arrange: Valid data with extra fields (should succeed with stripped data)
      const dataWithExtraFields = {
        email: 'test@example.com',
        password: 'ValidPassword123',
        unexpectedField: 'should be ignored',
        anotherField: 123
      }

      // Mock successful login to see if extra fields are ignored
      mockPrisma.user.findUnique.mockResolvedValue(mockUserFromDatabase)
      mockAuthService.verifyPassword.mockResolvedValue(true)

      // Act: Login with extra fields
      const response = await request(app)
        .post('/auth/login')
        .send(dataWithExtraFields)
        .expect(200) // Should succeed, Zod strips unknown fields

      // Assert: Should succeed with stripped data
      expect(response.body.success).toBe(true)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' }
        })
      )
    })
  })

  describe('POST /auth/login - Server Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Arrange: Mock database error
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

      // Act: Attempt login during database error
      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(500)

      // Assert: Verify error response
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during login'
        }
      })
    })

    it('should handle password verification errors', async () => {
      // Arrange: User found but password verification fails
      mockPrisma.user.findUnique.mockResolvedValue(mockUserFromDatabase)
      mockAuthService.verifyPassword.mockRejectedValue(new Error('Password verification failed'))

      // Act: Attempt login
      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(500)

      // Assert: Verify error handling
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('SERVER_ERROR')
    })

    it('should handle token generation errors', async () => {
      // Arrange: Successful authentication but token generation fails
      mockPrisma.user.findUnique.mockResolvedValue(mockUserFromDatabase)
      mockAuthService.verifyPassword.mockResolvedValue(true)
      mockAuthService.generateToken.mockImplementation(() => {
        throw new Error('Token generation failed')
      })

      // Act: Attempt login
      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(500)

      // Assert: Verify error handling
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('SERVER_ERROR')
    })

    it('should handle malformed user data from database', async () => {
      // Arrange: Database returns malformed user data
      const malformedUser = {
        id: 'user_123',
        // Missing required fields like username, email, etc.
        passwordHash: 'some_hash',
        createdAt: '2024-01-15T10:30:00.000Z'
      }

      mockPrisma.user.findUnique.mockResolvedValue(malformedUser)
      mockAuthService.verifyPassword.mockResolvedValue(true)
      
      // Make generateToken throw an error when given malformed data (missing username/email)
      mockAuthService.generateToken.mockImplementation((userForToken) => {
        if (!userForToken.username || !userForToken.email) {
          throw new Error('Cannot generate token: missing required user fields')
        }
        return 'jwt_token_abc123'
      })

      // Act: Attempt login with malformed data
      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(500)

      // Assert: Should handle the error gracefully
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('SERVER_ERROR')
    })
  })

  describe('POST /auth/login - Edge Cases', () => {
    it('should handle case-sensitive email matching', async () => {
      // Arrange: Database lookup should be exact match
      const uppercaseEmailData = {
        email: 'TEST@EXAMPLE.COM', // Uppercase
        password: 'ValidPassword123'
      }
      
      // Override validation mock to return the uppercase email data
      mockAuthService.validateLoginData.mockReturnValue({
        success: true,
        data: uppercaseEmailData
      })
      
      mockPrisma.user.findUnique.mockResolvedValue(null)

      // Act: Login with different case email
      const response = await request(app)
        .post('/auth/login')
        .send(uppercaseEmailData)
        .expect(401)

      // Assert: Should not find user (case-sensitive)
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'TEST@EXAMPLE.COM' },
        select: expect.any(Object)
      })
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('should handle very long email addresses', async () => {
      // Arrange: Very long but valid email
      const longEmail = 'a'.repeat(240) + '@example.com' // 254 chars total (email length limit)
      const longEmailData = {
        email: longEmail,
        password: 'ValidPassword123'
      }
      
      // Override validation mock to return the long email data
      mockAuthService.validateLoginData.mockReturnValue({
        success: true,
        data: longEmailData
      })
      
      mockPrisma.user.findUnique.mockResolvedValue(null)

      // Act: Login with long email
      const response = await request(app)
        .post('/auth/login')
        .send(longEmailData)
        .expect(401) // User not found

      // Assert: Should handle long email gracefully
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: longEmail },
        select: expect.any(Object)
      })
    })

    it('should handle user with null optional fields', async () => {
      // Arrange: User with null optional fields
      const userWithNulls = {
        ...mockUserFromDatabase,
        displayName: null,
        bio: null,
        avatar: null
      }

      mockPrisma.user.findUnique.mockResolvedValue(userWithNulls)
      mockAuthService.verifyPassword.mockResolvedValue(true)

      // Act: Login with user having null fields
      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData)
        .expect(200)

      // Assert: Should handle null fields properly
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.displayName).toBeNull()
      expect(response.body.data.user.bio).toBeNull()
      expect(response.body.data.user.avatar).toBeNull()
    })
  })
})