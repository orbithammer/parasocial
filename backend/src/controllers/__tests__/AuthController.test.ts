// backend/src/controllers/__tests__/AuthController.test.ts
// Version: 1.1.0
// Fixed spy expectations to match actual AuthController implementation that calls findByEmail and findByUsername separately

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthController } from '../AuthController'

describe('AuthController', () => {
  let authController: AuthController
  let mockAuthService: any
  let mockUserRepository: any
  let mockReq: any
  let mockRes: any

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

  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    bio: '',
    avatar: null,
    isVerified: false,
    verificationTier: 'none',
    website: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    passwordHash: 'hashedPassword123',
    getPublicProfile: vi.fn().mockReturnValue({
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      bio: '',
      avatar: null,
      isVerified: false,
      verificationTier: 'none',
      website: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }),
    getPrivateProfile: vi.fn().mockReturnValue({
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      bio: '',
      avatar: null,
      isVerified: false,
      verificationTier: 'none',
      website: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    })
  }

  beforeEach(() => {
    // Create mock services
    mockAuthService = {
      validateRegistrationData: vi.fn(),
      validateLoginData: vi.fn(),
      hashPassword: vi.fn(),
      verifyPassword: vi.fn(),
      generateToken: vi.fn()
    }

    // Updated to match actual AuthController implementation
    mockUserRepository = {
      findByEmail: vi.fn(),
      findByUsername: vi.fn(),
      findById: vi.fn(),
      create: vi.fn()
    }

    // Create controller instance
    authController = new AuthController(mockAuthService, mockUserRepository)

    // Create mock request and response
    mockReq = {
      body: {},
      user: {}
    }

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
  })

  describe('register', () => {
    describe('Successful Registration', () => {
      it('should register user successfully', async () => {
        // Arrange
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        // Mock no existing users found
        mockUserRepository.findByEmail.mockResolvedValue(null)
        mockUserRepository.findByUsername.mockResolvedValue(null)
        mockAuthService.hashPassword.mockResolvedValue('hashedPassword123')
        mockUserRepository.create.mockResolvedValue(mockUser)
        mockAuthService.generateToken.mockReturnValue('jwt.token.here')

        // Act
        await authController.register(mockReq, mockRes)

        // Assert - Updated expectations to match actual implementation
        expect(mockAuthService.validateRegistrationData).toHaveBeenCalledWith(validRegistrationData)
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
        expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser')
        expect(mockAuthService.hashPassword).toHaveBeenCalledWith('Password123')
        expect(mockUserRepository.create).toHaveBeenCalled()
        expect(mockAuthService.generateToken).toHaveBeenCalledWith(mockUser)
        expect(mockRes.status).toHaveBeenCalledWith(201)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: {
            user: mockUser.getPublicProfile(),
            token: 'jwt.token.here'
          }
        })
      })
    })

    describe('Validation Errors', () => {
      it('should return 400 for invalid registration data', async () => {
        // Arrange
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

        // Act
        await authController.register(mockReq, mockRes)

        // Assert
        expect(mockAuthService.validateRegistrationData).toHaveBeenCalledWith(invalidData)
        expect(mockUserRepository.findByEmail).not.toHaveBeenCalled()
        expect(mockUserRepository.findByUsername).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
            details: [
              { message: 'Invalid email format', path: ['email'] },
              { message: 'Username is required', path: ['username'] }
            ]
          }
        })
      })

      it('should handle empty request body', async () => {
        // Arrange
        mockReq.body = {}
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: false,
          error: { errors: [{ message: 'Required fields missing' }] }
        })

        // Act
        await authController.register(mockReq, mockRes)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
            details: [{ message: 'Required fields missing' }]
          }
        })
      })
    })

    describe('User Already Exists', () => {
      it('should return 409 when email already exists', async () => {
        // Arrange
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        // Mock existing user found by email
        mockUserRepository.findByEmail.mockResolvedValue({
          email: 'test@example.com',
          username: 'differentuser'
        })

        // Act
        await authController.register(mockReq, mockRes)

        // Assert - Updated expectations to match actual implementation
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
        expect(mockAuthService.hashPassword).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(409)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists'
          }
        })
      })

      it('should return 409 when username already exists', async () => {
        // Arrange
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        // Mock no existing email but existing username
        mockUserRepository.findByEmail.mockResolvedValue(null)
        mockUserRepository.findByUsername.mockResolvedValue({
          email: 'different@example.com',
          username: 'testuser'
        })

        // Act
        await authController.register(mockReq, mockRes)

        // Assert - Updated expectations to match actual implementation
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
        expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('testuser')
        expect(mockRes.status).toHaveBeenCalledWith(409)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'USERNAME_EXISTS',
            message: 'This username is already taken'
          }
        })
      })
    })

    describe('Server Errors', () => {
      it('should return 500 when password hashing fails', async () => {
        // Arrange
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        mockUserRepository.findByEmail.mockResolvedValue(null)
        mockUserRepository.findByUsername.mockResolvedValue(null)
        mockAuthService.hashPassword.mockRejectedValue(new Error('Hashing failed'))

        // Act
        await authController.register(mockReq, mockRes)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Internal server error during registration'
          }
        })
      })

      it('should return 500 when user creation fails', async () => {
        // Arrange
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        mockUserRepository.findByEmail.mockResolvedValue(null)
        mockUserRepository.findByUsername.mockResolvedValue(null)
        mockAuthService.hashPassword.mockResolvedValue('hashedPassword123')
        mockUserRepository.create.mockRejectedValue(new Error('Database error'))

        // Act
        await authController.register(mockReq, mockRes)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Internal server error during registration'
          }
        })
      })

      it('should return 500 when token generation fails', async () => {
        // Arrange
        mockReq.body = validRegistrationData
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: true,
          data: validRegistrationData
        })
        mockUserRepository.findByEmail.mockResolvedValue(null)
        mockUserRepository.findByUsername.mockResolvedValue(null)
        mockAuthService.hashPassword.mockResolvedValue('hashedPassword123')
        mockUserRepository.create.mockResolvedValue(mockUser)
        mockAuthService.generateToken.mockImplementation(() => {
          throw new Error('Token generation failed')
        })

        // Act
        await authController.register(mockReq, mockRes)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Internal server error during registration'
          }
        })
      })
    })
  })

  describe('login', () => {
    describe('Successful Login', () => {
      it('should login user successfully', async () => {
        // Arrange
        mockReq.body = validLoginData
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: validLoginData
        })
        mockUserRepository.findByEmail.mockResolvedValue(mockUser)
        mockAuthService.verifyPassword.mockResolvedValue(true)
        mockAuthService.generateToken.mockReturnValue('jwt.token.here')

        // Act
        await authController.login(mockReq, mockRes)

        // Assert
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

      it('should return user data and token on successful login', async () => {
        // Arrange
        mockReq.body = validLoginData
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: validLoginData
        })
        mockUserRepository.findByEmail.mockResolvedValue(mockUser)
        mockAuthService.verifyPassword.mockResolvedValue(true)
        mockAuthService.generateToken.mockReturnValue('jwt.token.here')

        // Act
        await authController.login(mockReq, mockRes)

        // Assert
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: {
            user: mockUser.getPrivateProfile(),
            token: 'jwt.token.here'
          }
        })
      })
    })

    describe('Validation Errors', () => {
      it('should return 400 for invalid login data', async () => {
        // Arrange
        const invalidData = { email: 'invalid', password: '' }
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

        // Act
        await authController.login(mockReq, mockRes)

        // Assert
        expect(mockAuthService.validateLoginData).toHaveBeenCalledWith(invalidData)
        expect(mockUserRepository.findByEmail).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login data',
            details: [
              { message: 'Invalid email format', path: ['email'] },
              { message: 'Password is required', path: ['password'] }
            ]
          }
        })
      })

      it('should return 400 for missing password', async () => {
        // Arrange
        const invalidData = { email: 'test@example.com' }
        mockReq.body = invalidData
        mockAuthService.validateLoginData.mockReturnValue({
          success: false,
          error: { errors: [{ message: 'Password is required' }] }
        })

        // Act
        await authController.login(mockReq, mockRes)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login data',
            details: [{ message: 'Password is required' }]
          }
        })
      })

      it('should return 400 for missing email', async () => {
        // Arrange
        const invalidData = { password: 'Password123' }
        mockReq.body = invalidData
        mockAuthService.validateLoginData.mockReturnValue({
          success: false,
          error: { errors: [{ message: 'Email is required' }] }
        })

        // Act
        await authController.login(mockReq, mockRes)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login data',
            details: [{ message: 'Email is required' }]
          }
        })
      })

      it('should handle empty login request', async () => {
        // Arrange
        mockReq.body = {}
        mockAuthService.validateLoginData.mockReturnValue({
          success: false,
          error: { errors: [{ message: 'Required fields missing' }] }
        })

        // Act
        await authController.login(mockReq, mockRes)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login data',
            details: [{ message: 'Required fields missing' }]
          }
        })
      })
    })

    describe('Authentication Errors', () => {
      it('should return 401 when user does not exist', async () => {
        // Arrange
        mockReq.body = validLoginData
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: validLoginData
        })
        mockUserRepository.findByEmail.mockResolvedValue(null)

        // Act
        await authController.login(mockReq, mockRes)

        // Assert
        expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com')
        expect(mockAuthService.verifyPassword).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      })

      it('should return 401 when password is incorrect', async () => {
        // Arrange
        mockReq.body = validLoginData
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: validLoginData
        })
        mockUserRepository.findByEmail.mockResolvedValue(mockUser)
        mockAuthService.verifyPassword.mockResolvedValue(false)

        // Act
        await authController.login(mockReq, mockRes)

        // Assert
        expect(mockAuthService.verifyPassword).toHaveBeenCalledWith('hashedPassword123', 'Password123')
        expect(mockAuthService.generateToken).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      })

      it('should not reveal whether email exists in error messages', async () => {
        // Arrange
        mockReq.body = validLoginData
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: validLoginData
        })
        mockUserRepository.findByEmail.mockResolvedValue(null)

        // Act
        await authController.login(mockReq, mockRes)

        // Assert - Same error message whether user exists or not
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      })
    })

    describe('Server Errors', () => {
      it('should return 500 when database lookup fails', async () => {
        // Arrange
        mockReq.body = validLoginData
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: validLoginData
        })
        mockUserRepository.findByEmail.mockRejectedValue(new Error('Database error'))

        // Act
        await authController.login(mockReq, mockRes)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Internal server error during login'
          }
        })
      })

      it('should return 500 when password verification fails', async () => {
        // Arrange
        mockReq.body = validLoginData
        mockAuthService.validateLoginData.mockReturnValue({
          success: true,
          data: validLoginData
        })
        mockUserRepository.findByEmail.mockResolvedValue(mockUser)
        mockAuthService.verifyPassword.mockRejectedValue(new Error('Verification failed'))

        // Act
        await authController.login(mockReq, mockRes)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Internal server error during login'
          }
        })
      })
    })
  })

  describe('logout', () => {
    it('should logout user successfully', async () => {
      // Act
      await authController.logout(mockReq, mockRes)

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Logged out successfully'
        }
      })
    })

    it('should handle logout errors gracefully', async () => {
      // Arrange - Mock some error in logout logic
      mockRes.json.mockImplementationOnce(() => {
        throw new Error('Response error')
      })

      // Act & Assert - Should not throw
      await expect(authController.logout(mockReq, mockRes)).resolves.not.toThrow()
    })
  })

  describe('getCurrentUser', () => {
    describe('Successful User Retrieval', () => {
      it('should return current user profile', async () => {
        // Arrange
        mockReq.user = { id: 'user123', email: 'test@example.com', username: 'testuser' }
        mockUserRepository.findById.mockResolvedValue(mockUser)

        // Act
        await authController.getCurrentUser(mockReq as any, mockRes)

        // Assert
        expect(mockUserRepository.findById).toHaveBeenCalledWith('user123')
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUser.getPrivateProfile()
        })
      })
    })

    describe('User Not Found', () => {
      it('should return 404 when user does not exist', async () => {
        // Arrange
        mockReq.user = { id: 'nonexistent', email: 'test@example.com', username: 'testuser' }
        mockUserRepository.findById.mockResolvedValue(null)

        // Act
        await authController.getCurrentUser(mockReq as any, mockRes)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(404)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        })
      })
    })

    describe('Server Errors', () => {
      it('should return 500 when database lookup fails', async () => {
        // Arrange
        mockReq.user = { id: 'user123', email: 'test@example.com', username: 'testuser' }
        mockUserRepository.findById.mockRejectedValue(new Error('Database error'))

        // Act
        await authController.getCurrentUser(mockReq as any, mockRes)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'SERVER_ERROR',
            message: 'Internal server error while fetching user'
          }
        })
      })

      it('should handle missing user ID in request', async () => {
        // Arrange
        mockReq.user = undefined

        // Act
        await authController.getCurrentUser(mockReq as any, mockRes)

        // Assert
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        })
      })
    })
  })
})