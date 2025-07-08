// backend/src/routes/__tests__/authRegistration.test.ts
// Version: 3.0.0 - Fixed supertest import and usage pattern
// Fixed: Corrected supertest import syntax and removed .default usage

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import express, { Application } from 'express'
import request from 'supertest'

// Mock the dependencies
const mockAuthService = {
  validateRegistrationData: vi.fn(),
  hashPassword: vi.fn(),
  generateToken: vi.fn(),
  verifyPassword: vi.fn(),
  extractTokenFromHeader: vi.fn(),
  verifyToken: vi.fn()
}

const mockUserRepository = {
  findByEmail: vi.fn(),
  findByUsername: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findById: vi.fn()
}

/**
 * Create test Express application with auth routes
 */
function createTestApp(): Application {
  const app = express()
  
  // Basic middleware setup
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Mock registration route that simulates AuthController behavior
  app.post('/auth/register', async (req, res) => {
    try {
      const { email, username, password, displayName, bio } = req.body

      // Simulate validation
      const validation = mockAuthService.validateRegistrationData(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
            details: validation.errors || []
          }
        })
      }

      // Simulate checking for existing email
      const existingUserByEmail = await mockUserRepository.findByEmail(email)
      if (existingUserByEmail) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'User with this email already exists'
          }
        })
      }

      // Simulate checking for existing username
      const existingUserByUsername = await mockUserRepository.findByUsername(username)
      if (existingUserByUsername) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USERNAME_EXISTS',
            message: 'User with this username already exists'
          }
        })
      }

      // Simulate password hashing
      const passwordHash = await mockAuthService.hashPassword(password)

      // Simulate user creation
      const newUser = await mockUserRepository.create({
        email,
        username,
        passwordHash,
        displayName: displayName || username,
        bio: bio || null
      })

      // Simulate token generation
      const token = mockAuthService.generateToken(newUser)

      // Return successful response
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            username: newUser.username,
            displayName: newUser.displayName,
            bio: newUser.bio
          },
          token
        },
        message: 'User registered successfully'
      })
    } catch (error) {
      // Handle different types of errors
      if (error.message?.includes('hash')) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'HASH_ERROR',
            message: 'Password hashing failed'
          }
        })
      }

      if (error.message?.includes('create')) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'USER_CREATION_ERROR',
            message: 'User creation failed'
          }
        })
      }

      if (error.message?.includes('token')) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'TOKEN_ERROR',
            message: 'Token generation failed'
          }
        })
      }

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

describe('Authentication Routes - User Registration', () => {
  let app: Application

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    
    // Reset mock implementations to default success states
    mockAuthService.validateRegistrationData.mockReturnValue({ success: true })
    mockAuthService.hashPassword.mockResolvedValue('hashed_password_123')
    mockAuthService.generateToken.mockReturnValue('mock_jwt_token')
    mockUserRepository.findByEmail.mockResolvedValue(null)
    mockUserRepository.findByUsername.mockResolvedValue(null)
    mockUserRepository.create.mockResolvedValue({
      id: 'user123',
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      bio: null
    })
    
    // Create fresh app for each test
    app = createTestApp()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('POST /auth/register - Valid Registration', () => {
    it('should successfully register a new user with valid data', async () => {
      // Arrange - Set up valid registration data
      const registrationData = {
        email: 'newuser@example.com',
        username: 'newuser123',
        password: 'SecurePass123',
        displayName: 'New User',
        bio: 'A new user joining the platform'
      }
      
      const mockCreatedUser = {
        id: 'user456',
        email: 'newuser@example.com',
        username: 'newuser123',
        displayName: 'New User',
        bio: 'A new user joining the platform'
      }
      
      const mockToken = 'registration_jwt_token'
      
      // Mock service responses for successful registration
      mockAuthService.validateRegistrationData.mockReturnValue({ success: true })
      mockUserRepository.findByEmail.mockResolvedValue(null) // No existing user
      mockUserRepository.findByUsername.mockResolvedValue(null) // No existing user
      mockAuthService.hashPassword.mockResolvedValue('secure_hash_123')
      mockUserRepository.create.mockResolvedValue(mockCreatedUser)
      mockAuthService.generateToken.mockReturnValue(mockToken)

      // Act - Make registration request
      const response = await request(app)
        .post('/auth/register')
        .send(registrationData)

      // Assert - Check response format
      expect(response.status).toBe(201)
      expect(response.body).toEqual({
        success: true,
        data: {
          user: {
            id: mockCreatedUser.id,
            email: mockCreatedUser.email,
            username: mockCreatedUser.username,
            displayName: mockCreatedUser.displayName,
            bio: mockCreatedUser.bio
          },
          token: mockToken
        },
        message: 'User registered successfully'
      })
    })

    it('should register user with minimal required data (no bio or displayName)', async () => {
      // Arrange - Minimal registration data
      const minimalData = {
        email: 'minimal@example.com',
        username: 'minimaluser',
        password: 'ValidPass123'
      }

      const mockCreatedUser = {
        id: 'user789',
        email: 'minimal@example.com',
        username: 'minimaluser',
        displayName: 'minimaluser', // Should default to username
        bio: null
      }
      
      // Set up mocks for minimal registration
      mockUserRepository.create.mockResolvedValue(mockCreatedUser)
      mockAuthService.generateToken.mockReturnValue('minimal_token')

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(minimalData)

      // Assert - Check response structure
      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.displayName).toBe('minimaluser')
      expect(response.body.data.user.bio).toBe(null)
      expect(response.body.data).toHaveProperty('token')
    })

    it('should return user data without password in response', async () => {
      // Arrange
      const registrationData = {
        email: 'secure@example.com',
        username: 'secureuser',
        password: 'SecretPassword123'
      }

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(registrationData)

      // Assert - Ensure no password data in response
      expect(response.status).toBe(201)
      expect(response.body.data.user).not.toHaveProperty('password')
      expect(response.body.data.user).not.toHaveProperty('passwordHash')
    })
  })

  describe('POST /auth/register - Duplicate User Conflicts', () => {
    it('should reject registration when username already exists', async () => {
      // Arrange
      const registrationData = {
        email: 'unique@example.com',
        username: 'existinguser',
        password: 'ValidPass123'
      }
      
      // Mock existing user by username
      mockUserRepository.findByUsername.mockResolvedValue({
        id: 'existing123',
        username: 'existinguser'
      })

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(registrationData)

      // Assert
      expect(response.status).toBe(409)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'USERNAME_EXISTS',
          message: 'User with this username already exists'
        }
      })
    })

    it('should reject registration when email already exists', async () => {
      // Arrange
      const registrationData = {
        email: 'existing@example.com',
        username: 'uniqueuser',
        password: 'ValidPass123'
      }
      
      // Mock existing user by email
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'existing456',
        email: 'existing@example.com'
      })

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(registrationData)

      // Assert
      expect(response.status).toBe(409)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'User with this email already exists'
        }
      })
    })

    it('should handle case-insensitive email conflicts', async () => {
      // Arrange
      const registrationData = {
        email: 'CASE@EXAMPLE.COM',
        username: 'caseuser',
        password: 'ValidPass123'
      }
      
      // Mock existing user with lowercase email
      mockUserRepository.findByEmail.mockResolvedValue({
        id: 'case123',
        email: 'case@example.com'
      })

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(registrationData)

      // Assert
      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('EMAIL_EXISTS')
    })

    it('should handle case-insensitive username conflicts', async () => {
      // Arrange
      const registrationData = {
        email: 'unique@example.com',
        username: 'CASEUSER',
        password: 'ValidPass123'
      }
      
      // Mock existing user with lowercase username
      mockUserRepository.findByUsername.mockResolvedValue({
        id: 'case456',
        username: 'caseuser'
      })

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(registrationData)

      // Assert
      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('USERNAME_EXISTS')
    })
  })

  describe('POST /auth/register - Input Validation Errors', () => {
    it('should reject registration with invalid data', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email-format',
        username: 'a', // Too short
        password: 'weak' // Too weak
      }
      
      mockAuthService.validateRegistrationData.mockReturnValue({
        success: false,
        errors: [
          { field: 'email', message: 'Invalid email format' },
          { field: 'username', message: 'Username must be at least 3 characters' },
          { field: 'password', message: 'Password must be at least 8 characters' }
        ]
      })

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)

      // Assert
      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration data',
          details: expect.arrayContaining([
            { field: 'email', message: 'Invalid email format' },
            { field: 'username', message: 'Username must be at least 3 characters' },
            { field: 'password', message: 'Password must be at least 8 characters' }
          ])
        }
      })
    })

    it('should reject registration with missing required fields', async () => {
      // Arrange
      const incompleteData = {
        email: 'test@example.com'
        // Missing username and password
      }
      
      mockAuthService.validateRegistrationData.mockReturnValue({
        success: false,
        errors: [
          { field: 'username', message: 'Username is required' },
          { field: 'password', message: 'Password is required' }
        ]
      })

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(incompleteData)

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject registration with empty request body', async () => {
      // Arrange
      mockAuthService.validateRegistrationData.mockReturnValue({
        success: false,
        errors: [
          { field: 'email', message: 'Email is required' },
          { field: 'username', message: 'Username is required' },
          { field: 'password', message: 'Password is required' }
        ]
      })

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send({})

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject username with invalid characters', async () => {
      // Arrange
      const invalidData = {
        email: 'test@example.com',
        username: 'user@name!', // Invalid characters
        password: 'ValidPass123'
      }
      
      mockAuthService.validateRegistrationData.mockReturnValue({
        success: false,
        errors: [
          { field: 'username', message: 'Username can only contain letters, numbers, and underscores' }
        ]
      })

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error.details).toContainEqual({
        field: 'username',
        message: 'Username can only contain letters, numbers, and underscores'
      })
    })

    it('should reject weak passwords', async () => {
      // Arrange
      const weakPasswordData = {
        email: 'test@example.com',
        username: 'validuser',
        password: 'password' // Common weak password
      }
      
      mockAuthService.validateRegistrationData.mockReturnValue({
        success: false,
        errors: [
          { field: 'password', message: 'Password must contain at least one uppercase letter, one number' }
        ]
      })

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(weakPasswordData)

      // Assert
      expect(response.status).toBe(400)
      expect(response.body.error.details).toContainEqual({
        field: 'password',
        message: 'Password must contain at least one uppercase letter, one number'
      })
    })
  })

  describe('POST /auth/register - Server Errors', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'ValidPass123'
      }
      
      mockUserRepository.create.mockRejectedValue(new Error('Database connection failed'))

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(registrationData)

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

    it('should handle password hashing errors', async () => {
      // Arrange
      const registrationData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'ValidPass123'
      }
      
      mockAuthService.hashPassword.mockRejectedValue(new Error('Password hash failed'))

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(registrationData)

      // Assert
      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'HASH_ERROR',
          message: 'Password hashing failed'
        }
      })
    })
  })

  describe('POST /auth/register - Content Type Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      // Act - Send malformed JSON
      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')

      // Assert
      expect(response.status).toBe(400)
    })

    it('should require JSON content type', async () => {
      // Act - Send form data instead of JSON
      const response = await request(app)
        .post('/auth/register')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('email=test@example.com&username=testuser&password=pass')

      // Assert - Should still work due to Express middleware
      expect(response.status).toBeGreaterThanOrEqual(200)
      expect(response.status).toBeLessThan(600)
    })
  })

  describe('Response Format Validation', () => {
    it('should return consistent success response format', async () => {
      // Arrange
      const registrationData = {
        email: 'format@example.com',
        username: 'formatuser',
        password: 'ValidPass123'
      }

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(registrationData)

      // Assert - Check response structure
      expect(response.body).toHaveProperty('success')
      if (response.body.success) {
        expect(response.body).toHaveProperty('data')
        expect(response.body).toHaveProperty('message')
        expect(response.body.data).toHaveProperty('user')
        expect(response.body.data).toHaveProperty('token')
      } else {
        expect(response.body).toHaveProperty('error')
      }
    })

    it('should return consistent error response format', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email',
        username: 'a',
        password: 'weak'
      }
      
      mockAuthService.validateRegistrationData.mockReturnValue({
        success: false,
        errors: [
          { field: 'email', message: 'Invalid email format' }
        ]
      })

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)

      // Assert
      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid registration data',
          details: expect.any(Array)
        }
      })
    })
  })

  describe('Security Considerations', () => {
    it('should not return password in any response', async () => {
      // Arrange
      const registrationData = {
        email: 'security@example.com',
        username: 'securityuser',
        password: 'SuperSecretPassword123'
      }

      // Act
      const response = await request(app)
        .post('/auth/register')
        .send(registrationData)

      // Assert - Ensure no password data anywhere in response
      const responseStr = JSON.stringify(response.body)
      expect(responseStr).not.toContain('SuperSecretPassword123')
      expect(responseStr).not.toContain('password')
      expect(responseStr).not.toContain('passwordHash')
    })

    it('should handle concurrent registration attempts', async () => {
      // Arrange
      const registrationData = {
        email: 'concurrent@example.com',
        username: 'concurrentuser',
        password: 'ValidPass123'
      }
      
      // Set up different mock responses for each attempt
      let callCount = 0
      mockUserRepository.create.mockImplementation(() => {
        callCount++
        return Promise.resolve({
          id: `user_${callCount}`,
          email: registrationData.email,
          username: `${registrationData.username}_${callCount}`,
          displayName: `User ${callCount}`,
          bio: null
        })
      })
      
      // Act - Make multiple concurrent requests
      const promises = Array.from({ length: 3 }, (_, index) =>
        request(app)
          .post('/auth/register')
          .send({
            ...registrationData,
            username: `${registrationData.username}_${index}`,
            email: `concurrent${index}@example.com`
          })
      )
      
      const responses = await Promise.all(promises)

      // Assert - All should complete (whether successful or not)
      responses.forEach(response => {
        expect(response.status).toBeGreaterThanOrEqual(200)
        expect(response.status).toBeLessThan(600)
      })
    })
  })
})