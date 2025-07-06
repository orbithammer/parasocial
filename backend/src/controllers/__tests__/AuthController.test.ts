// backend/tests/controllers/AuthController.test.ts
// Unit tests for AuthController with updated error response formats
// Fixed to match the current structured error response implementation

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

    mockUserRepository = {
      findByEmailOrUsername: vi.fn(),
      findByEmail: vi.fn(),
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

        expect(mockAuthService.validateRegistrationData).toHaveBeenCalledWith(validRegistrationData)
        expect(mockUserRepository.findByEmailOrUsername).toHaveBeenCalledWith('test@example.com', 'testuser')
        expect(mockAuthService.hashPassword).toHaveBeenCalledWith('Password123')
        expect(mockUserRepository.create).toHaveBeenCalled()
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
        mockReq.body = {}
        mockAuthService.validateRegistrationData.mockReturnValue({
          success: false,
          error: { errors: [{ message: 'Required fields missing' }] }
        })

        await authController.register(mockReq, mockRes)

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
          error: {
            code: 'EMAIL_EXISTS',
            message: 'Email is already registered',
            details: {
              field: 'email',
              value: 'test@example.com'
            }
          }
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
          error: {
            code: 'USERNAME_EXISTS',
            message: 'Username is already taken',
            details: {
              field: 'username',
              value: 'testuser'
            }
          }
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
          error: {
            code: 'SERVER_ERROR',
            message: 'Internal server error during registration'
          }
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
          error: {
            code: 'SERVER_ERROR',
            message: 'Internal server error during registration'
          }
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

      it('should handle empty login request', async () => {
        mockReq.body = {}
        mockAuthService.validateLoginData.mockReturnValue({
          success: false,
          error: { errors: [{ message: 'Required fields missing' }] }
        })

        await authController.login(mockReq, mockRes)

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
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
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
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
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
          error: {
            code: 'SERVER_ERROR',
            message: 'Internal server error during login'
          }
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
      await authController.logout(mockReq, mockRes)

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          message: 'Logged out successfully'
        }
      })
    })

    it('should handle logout errors gracefully', async () => {
      // Mock some error in logout logic
      mockRes.json.mockImplementationOnce(() => {
        throw new Error('Response error')
      })

      // The logout method doesn't currently throw errors, but if it did:
      await expect(authController.logout(mockReq, mockRes)).resolves.toBeUndefined()
    })
  })

  describe('getCurrentUser', () => {
    describe('Successful User Retrieval', () => {
      it('should return current user profile', async () => {
        mockReq.user = { id: 'user123' }
        mockUserRepository.findById.mockResolvedValue(mockUser)

        await authController.getCurrentUser(mockReq, mockRes)

        expect(mockUserRepository.findById).toHaveBeenCalledWith('user123')
        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          data: mockUser.getPrivateProfile()
        })
      })
    })

    describe('User Not Found', () => {
      it('should return 404 when user does not exist', async () => {
        mockReq.user = { id: 'nonexistent' }
        mockUserRepository.findById.mockResolvedValue(null)

        await authController.getCurrentUser(mockReq, mockRes)

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
        mockReq.user = { id: 'user123' }
        mockUserRepository.findById.mockRejectedValue(new Error('Database error'))

        await authController.getCurrentUser(mockReq, mockRes)

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
        mockReq.user = {}

        await authController.getCurrentUser(mockReq, mockRes)

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
  })
})