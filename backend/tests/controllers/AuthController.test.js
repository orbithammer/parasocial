// backend/tests/controllers/AuthController.test.js
// Unit tests for AuthController - HTTP request handlers for authentication

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthController } from '../../src/controllers/AuthController.js'

describe('AuthController', () => {
  let authController
  let mockAuthService
  let mockUserRepository
  let mockReq
  let mockRes

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    username: 'testuser',
    password: 'hashedPassword123',
    displayName: 'Test User',
    getPrivateProfile: vi.fn().mockReturnValue({
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      bio: '',
      avatar: null,
      website: null,
      isVerified: false,
      verificationTier: 'none',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    })
  }

  const validRegistrationData = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'Password123',
    displayName: 'Test User'
  }

  const validLoginData = {
    email: 'test@example.com',
    password: 'Password123'
  }

  beforeEach(() => {
    // Mock AuthService
    mockAuthService = {
      validateRegistrationData: vi.fn(),
      validateLoginData: vi.fn(),
      hashPassword: vi.fn(),
      verifyPassword: vi.fn(),
      generateToken: vi.fn()
    }

    // Mock UserRepository
    mockUserRepository = {
      findByEmailOrUsername: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn()
    }

    // Mock Express request object
    mockReq = {
      body: {},
      user: {}
    }

    // Mock Express response object
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }

    // Create controller instance
    authController = new AuthController(mockAuthService, mockUserRepository)
  })

  describe('register', () => {
    describe('Successful Registration', () => {
      it('should register a new user successfully', async () => {
        // Setup
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        mockUserRepository.findByEmailOrUsername.mockResolvedValue(null) // No existing user
        mockAuthService.hashPassword.mockResolvedValue('hashedPassword123')
        mockUserRepository.create.mockResolvedValue(mockUser)
        mockAuthService.generateToken.mockReturnValue('jwt.token.here')

        // Execute
        await authController.register(mockReq, mockRes)

        // Verify
        expect(mockAuthService.validateRegistrationData).toHaveBeenCalledWith(validRegistrationData)
        expect(mockUserRepository.findByEmailOrUsername).toHaveBeenCalledWith('test@example.com', 'testuser')
        expect(mockAuthService.hashPassword).toHaveBeenCalledWith('Password123')
        expect(mockUserRepository.create).toHaveBeenCalledWith({
          email: 'test@example.com',
          username: 'testuser',
          password: 'hashedPassword123',
          displayName: 'Test User'
        })
        expect(mockAuthService.generateToken).toHaveBeenCalledWith(mockUser)
        expect(mockRes.status).toHaveBeenCalledWith(201)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: {
            user: mockUser.getPrivateProfile(),
            token: 'jwt.token.here'
          }
        })
      })

      it('should register user with default displayName when not provided', async () => {
        const registrationWithoutDisplayName = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123'
        }

        mockReq.body = registrationWithoutDisplayName
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: registrationWithoutDisplayName
        })
        mockUserRepository.findByEmailOrUsername.mockResolvedValue(null)
        mockAuthService.hashPassword.mockResolvedValue('hashedPassword123')
        mockUserRepository.create.mockResolvedValue(mockUser)
        mockAuthService.generateToken.mockReturnValue('jwt.token.here')

        await authController.register(mockReq, mockRes)

        expect(mockUserRepository.create).toHaveBeenCalledWith({
          email: 'test@example.com',
          username: 'testuser',
          password: 'hashedPassword123',
          displayName: 'testuser' // Should default to username
        })
        expect(mockRes.status).toHaveBeenCalledWith(201)
      })

      it('should handle user creation with all valid fields', async () => {
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        mockUserRepository.findByEmailOrUsername.mockResolvedValue(null)
        mockAuthService.hashPassword.mockResolvedValue('hashedPassword123')
        mockUserRepository.create.mockResolvedValue(mockUser)
        mockAuthService.generateToken.mockReturnValue('jwt.token.here')

        await authController.register(mockReq, mockRes)

        expect(mockAuthService.hashPassword).toHaveBeenCalledWith('Password123')
        expect(mockUserRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'test@example.com',
            username: 'testuser',
            password: 'hashedPassword123',
            displayName: 'Test User'
          })
        )
      })
    })

    describe('Validation Errors', () => {
      it('should return 400 for invalid registration data', async () => {
        const invalidData = { email: 'invalid-email' }
        mockReq.body = invalidData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: false,
          error: {
            errors: [
              { message: 'Invalid email format', path: ['email'] },
              { message: 'Username is required', path: ['username'] }
            ]
          }
        })

        await authController.register(mockReq, mockRes)

        expect(mockAuthService.validateRegistrationData).toHaveBeenCalledWith(invalidData)
        expect(mockUserRepository.findByEmailOrUsername).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Validation failed',
          details: [
            { message: 'Invalid email format', path: ['email'] },
            { message: 'Username is required', path: ['username'] }
          ]
        })
      })

      it('should handle empty request body', async () => {
        mockReq.body = {}
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: false,
          error: { errors: [{ message: 'Required fields missing' }] }
        })

        await authController.register(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Validation failed',
          details: [{ message: 'Required fields missing' }]
        })
      })
    })

    describe('User Already Exists', () => {
      it('should return 409 when email already exists', async () => {
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        mockUserRepository.findByEmailOrUsername.mockResolvedValue({
          email: 'test@example.com',
          username: 'differentuser'
        })

        await authController.register(mockReq, mockRes)

        expect(mockUserRepository.findByEmailOrUsername).toHaveBeenCalledWith('test@example.com', 'testuser')
        expect(mockAuthService.hashPassword).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(409)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Email already registered'
        })
      })

      it('should return 409 when username already exists', async () => {
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        mockUserRepository.findByEmailOrUsername.mockResolvedValue({
          email: 'different@example.com',
          username: 'testuser'
        })

        await authController.register(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(409)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Username already taken'
        })
      })
    })

    describe('Server Errors', () => {
      it('should return 500 when password hashing fails', async () => {
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        mockUserRepository.findByEmailOrUsername.mockResolvedValue(null)
        mockAuthService.hashPassword.mockRejectedValue(new Error('Hashing failed'))

        await authController.register(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Registration failed',
          message: 'Hashing failed'
        })
      })

      it('should return 500 when user creation fails', async () => {
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        mockUserRepository.findByEmailOrUsername.mockResolvedValue(null)
        mockAuthService.hashPassword.mockResolvedValue('hashedPassword123')
        mockUserRepository.create.mockRejectedValue(new Error('Database error'))

        await authController.register(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Registration failed',
          message: 'Database error'
        })
      })

      it('should return 500 when token generation fails', async () => {
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        mockUserRepository.findByEmailOrUsername.mockResolvedValue(null)
        mockAuthService.hashPassword.mockResolvedValue('hashedPassword123')
        mockUserRepository.create.mockResolvedValue(mockUser)
        mockAuthService.generateToken.mockImplementation(() => {
          throw new Error('Token generation failed')
        })

        await authController.register(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Registration failed',
          message: 'Token generation failed'
        })
      })
    })
  })

  describe('login', () => {
    describe('Successful Login', () => {
      it('should login user with valid credentials', async () => {
        mockReq.body = validLoginData
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: validLoginData
        })
        mockUserRepository.findByEmail.mockResolvedValue(mockUser)
        mockAuthService.verifyPassword.mockResolvedValue(true)
        mockAuthService.generateToken.mockReturnValue('jwt.token.here')

        await authController.login(mockReq, mockRes)

        expect(mockAuthService.validateLoginData).toHaveBeenCalledWith(validLoginData)
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
        expect(mockAuthService.verifyPassword).toHaveBeenCalledWith('hashedPassword123', 'Password123')
        expect(mockAuthService.generateToken).toHaveBeenCalledWith(mockUser)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: {
            user: mockUser.getPrivateProfile(),
            token: 'jwt.token.here'
          }
        })
      })

      it('should handle login with different user data', async () => {
        const differentUser = {
          ...mockUser,
          id: 'user456',
          email: 'different@example.com',
          username: 'differentuser'
        }

        mockReq.body = { email: 'different@example.com', password: 'Password123' }
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: { email: 'different@example.com', password: 'Password123' }
        })
        mockUserRepository.findByEmail.mockResolvedValue(differentUser)
        mockAuthService.verifyPassword.mockResolvedValue(true)
        mockAuthService.generateToken.mockReturnValue('different.jwt.token')

        await authController.login(mockReq, mockRes)

        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('different@example.com')
        expect(mockAuthService.generateToken).toHaveBeenCalledWith(differentUser)
      })
    })

    describe('Validation Errors', () => {
      it('should return 400 for invalid login data', async () => {
        const invalidData = { email: 'invalid-email' }
        mockReq.body = invalidData
        mockAuthService.validateLoginData.mockReturnValue({
          success: false,
          error: {
            errors: [
              { message: 'Invalid email format', path: ['email'] },
              { message: 'Password is required', path: ['password'] }
            ]
          }
        })

        await authController.login(mockReq, mockRes)

        expect(mockAuthService.validateLoginData).toHaveBeenCalledWith(invalidData)
        expect(mockUserRepository.findByEmail).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Validation failed',
          details: [
            { message: 'Invalid email format', path: ['email'] },
            { message: 'Password is required', path: ['password'] }
          ]
        })
      })

      it('should handle empty login request', async () => {
        mockReq.body = {}
        mockAuthService.validateLoginData.mockReturnValue({
          success: false,
          error: { errors: [{ message: 'Email and password required' }] }
        })

        await authController.login(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(400)
      })
    })

    describe('Authentication Errors', () => {
      it('should return 401 when user does not exist', async () => {
        mockReq.body = validLoginData
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: validLoginData
        })
        mockUserRepository.findByEmail.mockResolvedValue(null)

        await authController.login(mockReq, mockRes)

        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
        expect(mockAuthService.verifyPassword).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid email or password'
        })
      })

      it('should return 401 when password is incorrect', async () => {
        mockReq.body = validLoginData
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: validLoginData
        })
        mockUserRepository.findByEmail.mockResolvedValue(mockUser)
        mockAuthService.verifyPassword.mockResolvedValue(false)

        await authController.login(mockReq, mockRes)

        expect(mockAuthService.verifyPassword).toHaveBeenCalledWith('hashedPassword123', 'Password123')
        expect(mockAuthService.generateToken).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid email or password'
        })
      })
    })

    describe('Server Errors', () => {
      it('should return 500 when database lookup fails', async () => {
        mockReq.body = validLoginData
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: validLoginData
        })
        mockUserRepository.findByEmail.mockRejectedValue(new Error('Database error'))

        await authController.login(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Login failed',
          message: 'Database error'
        })
      })

      it('should return 500 when password verification fails', async () => {
        mockReq.body = validLoginData
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: validLoginData
        })
        mockUserRepository.findByEmail.mockResolvedValue(mockUser)
        mockAuthService.verifyPassword.mockRejectedValue(new Error('Verification failed'))

        await authController.login(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Login failed',
          message: 'Verification failed'
        })
      })
    })
  })

  describe('logout', () => {
    it('should logout user successfully', async () => {
      await authController.logout(mockReq, mockRes)

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logged out successfully'
      })
    })

    it('should handle logout errors gracefully', async () => {
      // Force an error in logout
      const originalJson = mockRes.json
      mockRes.json.mockImplementationOnce(() => {
        throw new Error('Response error')
      })

      await authController.logout(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(500)
      // Reset the mock to allow the second call
      mockRes.json.mockImplementation(originalJson)
    })
  })

  describe('getCurrentUser', () => {
    beforeEach(() => {
      mockReq.user = { id: 'user123' }
    })

    describe('Successful User Retrieval', () => {
      it('should return current user profile', async () => {
        mockUserRepository.findById.mockResolvedValue(mockUser)

        await authController.getCurrentUser(mockReq, mockRes)

        expect(mockUserRepository.findById).toHaveBeenCalledWith('user123')
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUser.getPrivateProfile()
        })
      })

      it('should handle different user IDs', async () => {
        mockReq.user = { id: 'user456' }
        const differentUser = { ...mockUser, id: 'user456' }
        mockUserRepository.findById.mockResolvedValue(differentUser)

        await authController.getCurrentUser(mockReq, mockRes)

        expect(mockUserRepository.findById).toHaveBeenCalledWith('user456')
      })
    })

    describe('User Not Found', () => {
      it('should return 404 when user does not exist', async () => {
        mockUserRepository.findById.mockResolvedValue(null)

        await authController.getCurrentUser(mockReq, mockRes)

        expect(mockUserRepository.findById).toHaveBeenCalledWith('user123')
        expect(mockRes.status).toHaveBeenCalledWith(404)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'User not found'
        })
      })
    })

    describe('Server Errors', () => {
      it('should return 500 when database lookup fails', async () => {
        mockUserRepository.findById.mockRejectedValue(new Error('Database error'))

        await authController.getCurrentUser(mockReq, mockRes)

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Failed to get user profile',
          message: 'Database error'
        })
      })

      it('should handle missing user ID in request', async () => {
        mockReq.user = {} // No ID
        mockUserRepository.findById.mockResolvedValue(null)

        await authController.getCurrentUser(mockReq, mockRes)

        expect(mockUserRepository.findById).toHaveBeenCalledWith(undefined)
        expect(mockRes.status).toHaveBeenCalledWith(404)
      })
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete registration and login flow', async () => {
      // Registration
      mockReq.body = validRegistrationData
      mockAuthService.validateRegistrationData.mockReturnValue({
        success: true,
        data: validRegistrationData
      })
      mockUserRepository.findByEmailOrUsername.mockResolvedValue(null)
      mockAuthService.hashPassword.mockResolvedValue('hashedPassword123')
      mockUserRepository.create.mockResolvedValue(mockUser)
      mockAuthService.generateToken.mockReturnValue('registration.token')

      await authController.register(mockReq, mockRes)

      expect(mockRes.status).toHaveBeenCalledWith(201)

      // Reset mocks for login
      mockRes.status.mockClear()
      mockRes.json.mockClear()

      // Login
      mockReq.body = validLoginData
      mockAuthService.validateLoginData.mockReturnValue({
        success: true,
        data: validLoginData
      })
      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockAuthService.verifyPassword.mockResolvedValue(true)
      mockAuthService.generateToken.mockReturnValue('login.token')

      await authController.login(mockReq, mockRes)

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: mockUser.getPrivateProfile(),
          token: 'login.token'
        }
      })
    })

    it('should handle multiple concurrent requests independently', async () => {
      const req1 = { body: validRegistrationData }
      const req2 = { body: { ...validRegistrationData, email: 'user2@example.com' } }

      mockAuthService.validateRegistrationData.mockReturnValue({
        success: true,
        data: validRegistrationData
      })
      mockUserRepository.findByEmailOrUsername.mockResolvedValue(null)
      mockAuthService.hashPassword.mockResolvedValue('hashedPassword123')
      mockUserRepository.create.mockResolvedValue(mockUser)
      mockAuthService.generateToken.mockReturnValue('jwt.token')

      // Execute both requests
      await Promise.all([
        authController.register(req1, mockRes),
        authController.register(req2, mockRes)
      ])

      expect(mockUserRepository.create).toHaveBeenCalledTimes(2)
    })
  })
})