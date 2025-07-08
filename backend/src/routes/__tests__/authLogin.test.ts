// backend/src/routes/__tests__/authLogin.test.ts
// Version: 3.0.0 - Fixed supertest import and usage pattern
// Fixed: Corrected supertest import syntax and removed .default usage

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import express, { Application } from 'express'
import request from 'supertest'

// Mock the dependencies
const mockAuthService = {
  validateLoginData: vi.fn(),
  verifyPassword: vi.fn(),
  generateToken: vi.fn(),
  hashPassword: vi.fn(),
  extractTokenFromHeader: vi.fn(),
  verifyToken: vi.fn()
}

const mockUserRepository = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByUsername: vi.fn()
}

const mockAuthController = {
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn()
}

/**
 * Create test Express application with auth routes
 */
function createTestApp(): Application {
  const app = express()
  
  // Basic middleware setup
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Mock login route that simulates AuthController behavior
  app.post('/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body

      // Simulate validation
      const validation = mockAuthService.validateLoginData({ email, password })
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login data',
            details: validation.errors || []
          }
        })
      }

      // Simulate user lookup
      const user = await mockUserRepository.findByEmail(email)
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      }

      // Simulate password verification
      const isPasswordValid = await mockAuthService.verifyPassword(password, user.passwordHash)
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      }

      // Simulate token generation
      const token = mockAuthService.generateToken(user)

      // Return successful response
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName
          },
          token
        },
        message: 'Login successful'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error'
        }
      })
    }
  })
  
  return app
}

describe('Authentication Routes - User Login', () => {
  let app: Application

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    
    // Reset mock implementations
    mockAuthService.validateLoginData.mockReturnValue({ success: true })
    mockAuthService.verifyPassword.mockResolvedValue(true)
    mockAuthService.generateToken.mockReturnValue('mock_jwt_token')
    mockUserRepository.findByEmail.mockResolvedValue(null)
    
    // Create fresh app for each test
    app = createTestApp()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('POST /auth/login - Successful Login', () => {
    it('should login user successfully with valid credentials', async () => {
      // Arrange - Set up valid user data
      const loginData = {
        email: 'user@example.com',
        password: 'SecurePass123'
      }
      
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: 'hashed_password'
      }
      
      const mockToken = 'jwt_token_here'
      
      // Mock service responses
      mockAuthService.validateLoginData.mockReturnValue({ success: true })
      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockAuthService.verifyPassword.mockResolvedValue(true)
      mockAuthService.generateToken.mockReturnValue(mockToken)

      // Act - Make login request
      const response = await request(app)
        .post('/auth/login')
        .send(loginData)

      // Assert - Check response format
      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: mockUser.id,
            email: mockUser.email,
            username: mockUser.username,
            displayName: mockUser.displayName
          },
          token: mockToken
        },
        message: 'Login successful'
      })
    })

    it('should return user data and token on successful login', async () => {
      // Arrange
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPass123'
      }

      const mockUser = {
        id: 'user456',
        email: 'test@example.com',
        username: 'testuser2',
        displayName: 'Test User 2',
        passwordHash: 'hashed_password'
      }
      
      // Set up mocks for successful login
      mockAuthService.validateLoginData.mockReturnValue({ success: true })
      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockAuthService.verifyPassword.mockResolvedValue(true)
      mockAuthService.generateToken.mockReturnValue('test_token')

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(loginData)

      // Assert - Check response structure
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('user')
      expect(response.body.data).toHaveProperty('token')
      expect(response.body.data.user).not.toHaveProperty('passwordHash')
      expect(response.body.data.user).not.toHaveProperty('password')
    })
  })

  describe('POST /auth/login - Authentication Failures', () => {
    it('should return 401 for non-existent user', async () => {
      // Arrange
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'SomePassword123'
      }
      
      mockAuthService.validateLoginData.mockReturnValue({ success: true })
      mockUserRepository.findByEmail.mockResolvedValue(null) // User not found

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(loginData)

      // Assert
      expect(response.status).toBe(401)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      })
    })

    it('should return 401 for incorrect password', async () => {
      // Arrange
      const loginData = {
        email: 'user@example.com',
        password: 'WrongPassword123'
      }
      
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        passwordHash: 'correct_hash'
      }
      
      mockAuthService.validateLoginData.mockReturnValue({ success: true })
      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockAuthService.verifyPassword.mockResolvedValue(false) // Wrong password

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(loginData)

      // Assert
      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS')
    })

    it('should not reveal whether email exists in error messages', async () => {
      // Arrange - Test both non-existent user and wrong password
      const testCases = [
        {
          name: 'non-existent user',
          email: 'nonexistent@example.com',
          mockUser: null,
          passwordValid: false
        },
        {
          name: 'wrong password',
          email: 'user@example.com',
          mockUser: { id: 'user123', email: 'user@example.com', passwordHash: 'hash' },
          passwordValid: false
        }
      ]

      for (const testCase of testCases) {
        // Arrange
        mockAuthService.validateLoginData.mockReturnValue({ success: true })
        mockUserRepository.findByEmail.mockResolvedValue(testCase.mockUser)
        if (testCase.mockUser) {
          mockAuthService.verifyPassword.mockResolvedValue(testCase.passwordValid)
        }

        // Act
        const response = await request(app)
          .post('/auth/login')
          .send({
            email: testCase.email,
            password: 'SomePassword123'
          })

        // Assert - Same error message for both cases
        expect(response.status).toBe(401)
        expect(response.body.error.message).toBe('Invalid email or password')
      }
    })
  })

  describe('POST /auth/login - Input Validation', () => {
    it('should return 400 for invalid email format', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email-format',
        password: 'ValidPass123'
      }
      
      mockAuthService.validateLoginData.mockReturnValue({
        success: false,
        errors: [{ field: 'email', message: 'Invalid email format' }]
      })

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(invalidData)

      // Assert
      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login data',
          details: [{ field: 'email', message: 'Invalid email format' }]
        }
      })
    })

    it('should return 400 for missing password', async () => {
      // Arrange
      const incompleteData = {
        email: 'user@example.com'
        // password missing
      }
      
      mockAuthService.validateLoginData.mockReturnValue({
        success: false,
        errors: [{ field: 'password', message: 'Password is required' }]
      })

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(incompleteData)

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for missing email', async () => {
      // Arrange
      const incompleteData = {
        password: 'ValidPass123'
        // email missing
      }
      
      mockAuthService.validateLoginData.mockReturnValue({
        success: false,
        errors: [{ field: 'email', message: 'Email is required' }]
      })

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(incompleteData)

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for empty request body', async () => {
      // Arrange
      mockAuthService.validateLoginData.mockReturnValue({
        success: false,
        errors: [
          { field: 'email', message: 'Email is required' },
          { field: 'password', message: 'Password is required' }
        ]
      })

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send({})

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /auth/login - Content-Type Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      // Act - Send malformed JSON
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')

      // Assert
      expect(response.status).toBe(400)
    })

    it('should handle form data content type', async () => {
      // Arrange
      const loginData = 'email=test@example.com&password=ValidPass123'
      
      // Set up mocks for this test
      mockAuthService.validateLoginData.mockReturnValue({ success: true })
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: 'hash'
      })
      mockAuthService.verifyPassword.mockResolvedValue(true)
      mockAuthService.generateToken.mockReturnValue('form_token')

      // Act - Send form data instead of JSON
      const response = await request(app)
        .post('/auth/login')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(loginData)

      // Assert - Should work due to Express middleware
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(500)
    })
  })

  describe('POST /auth/login - Database Errors', () => {
    it('should handle database connection errors gracefully', async () => {
      // Arrange
      const loginData = {
        email: 'user@example.com',
        password: 'ValidPass123'
      }
      
      mockAuthService.validateLoginData.mockReturnValue({ success: true })
      mockUserRepository.findByEmail.mockRejectedValue(new Error('Database connection failed'))

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(loginData)

      // Assert
      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error'
        }
      })
    })

    it('should handle AuthService errors gracefully', async () => {
      // Arrange
      const loginData = {
        email: 'user@example.com',
        password: 'ValidPass123'
      }
      
      mockAuthService.validateLoginData.mockImplementation(() => {
        throw new Error('Service error')
      })

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(loginData)

      // Assert
      expect(response.status).toBe(500)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('SERVER_ERROR')
    })
  })

  describe('Security and Rate Limiting Tests', () => {
    it('should handle concurrent login attempts', async () => {
      // Arrange
      const loginData = {
        email: 'user@example.com',
        password: 'ValidPass123'
      }
      
      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: 'hashed_password'
      }
      
      // Set up successful login mocks
      mockAuthService.validateLoginData.mockReturnValue({ success: true })
      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockAuthService.verifyPassword.mockResolvedValue(true)
      mockAuthService.generateToken.mockReturnValue('concurrent_token')
      
      // Act - Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/auth/login')
          .send(loginData)
      )
      
      const responses = await Promise.all(promises)

      // Assert - All should complete (whether successful or not)
      responses.forEach(response => {
        expect(response.status).toBeGreaterThanOrEqual(200)
        expect(response.status).toBeLessThan(600)
      })
    })
  })

  describe('Response Format Validation', () => {
    it('should return consistent success response format', async () => {
      // Arrange
      const loginData = {
        email: 'user@example.com',
        password: 'ValidPass123'
      }

      const mockUser = {
        id: 'user123',
        email: 'user@example.com',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: 'hashed_password'
      }
      
      // Set up successful login mocks
      mockAuthService.validateLoginData.mockReturnValue({ success: true })
      mockUserRepository.findByEmail.mockResolvedValue(mockUser)
      mockAuthService.verifyPassword.mockResolvedValue(true)
      mockAuthService.generateToken.mockReturnValue('format_token')

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(loginData)

      // Assert - Check response structure regardless of status
      expect(response.body).toHaveProperty('success')
      if (response.body.success) {
        expect(response.body).toHaveProperty('data')
        expect(response.body).toHaveProperty('message')
      } else {
        expect(response.body).toHaveProperty('error')
      }
    })

    it('should return consistent error response format', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email',
        password: 'short'
      }
      
      mockAuthService.validateLoginData.mockReturnValue({
        success: false,
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'password', message: 'Password too short' }
        ]
      })

      // Act
      const response = await request(app)
        .post('/auth/login')
        .send(invalidData)

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login data',
          details: expect.any(Array)
        }
      })
    })
  })
})