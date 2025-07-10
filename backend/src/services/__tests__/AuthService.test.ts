// backend/src/services/__tests__/AuthService.test.ts
// Version: 1.5.0 - Fixed bcrypt default export mocking for Vitest compatibility

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { AuthService } from '../AuthService'

// Create shared mock functions that can be reused
const mockHash = vi.fn()
const mockCompare = vi.fn()
const mockGenSalt = vi.fn()

// FIXED: Mock bcrypt with proper default export structure
vi.mock('bcrypt', () => {
  // Create the mock object that contains all bcrypt functions
  const bcryptMock = {
    hash: mockHash,
    compare: mockCompare,
    genSalt: mockGenSalt
  }
  
  // Return ONLY the default export (bcrypt uses: import bcrypt from 'bcrypt')
  return {
    default: bcryptMock
  }
})

describe('AuthService', () => {
  let authService: AuthService
  const testUser = {
    id: 'user123',
    email: 'test@example.com',
    username: 'testuser'
  }

  beforeAll(() => {
    // Set test environment variables that AuthService reads
    process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only'
    process.env.JWT_EXPIRES_IN = '7d'
    process.env.BCRYPT_ROUNDS = '12'
  })

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    mockHash.mockClear()
    mockCompare.mockClear()
    mockGenSalt.mockClear()
    
    // AuthService constructor reads from environment variables
    authService = new AuthService()
  })

  describe('Constructor', () => {
    it('should create AuthService instance', () => {
      expect(authService).toBeInstanceOf(AuthService)
      expect(typeof authService.hashPassword).toBe('function')
      expect(typeof authService.generateToken).toBe('function')
    })
  })

  describe('Password Hashing', () => {
    describe('hashPassword', () => {
      it('should hash a password successfully', async () => {
        const password = 'TestPassword123'
        const expectedHash = 'hashedPassword123'
        
        // Mock bcrypt.hash to return our test hash
        mockHash.mockResolvedValue(expectedHash)
        
        const hashedPassword = await authService.hashPassword(password)
        
        expect(mockHash).toHaveBeenCalledWith(password, 12)
        expect(hashedPassword).toBe(expectedHash)
      })

      it('should handle null password gracefully', async () => {
        // Mock bcrypt.hash to reject with the expected error
        mockHash.mockRejectedValue(new Error('data and salt arguments required'))
        
        await expect(authService.hashPassword(null as any))
          .rejects.toThrow('Password hashing failed: data and salt arguments required')
      })

      it('should handle undefined password gracefully', async () => {
        // Mock bcrypt.hash to reject with the expected error
        mockHash.mockRejectedValue(new Error('data and salt arguments required'))
        
        await expect(authService.hashPassword(undefined as any))
          .rejects.toThrow('Password hashing failed: data and salt arguments required')
      })
    })

    describe('verifyPassword', () => {
      it('should verify correct password', async () => {
        const password = 'testPassword123'
        const hashedPassword = 'hashedPassword123'
        
        // Mock bcrypt.compare to return true for correct password
        mockCompare.mockResolvedValue(true)
        
        const isValid = await authService.verifyPassword(hashedPassword, password)
        
        // FIXED: bcrypt.compare is called with (password, hash), not (hash, password)
        expect(mockCompare).toHaveBeenCalledWith(password, hashedPassword)
        expect(isValid).toBe(true)
      })

      it('should reject incorrect password', async () => {
        const wrongPassword = 'wrongPassword'
        const hashedPassword = 'hashedPassword123'
        
        // Mock bcrypt.compare to return false for wrong password
        mockCompare.mockResolvedValue(false)
        
        const isValid = await authService.verifyPassword(hashedPassword, wrongPassword)
        
        // FIXED: bcrypt.compare is called with (password, hash), not (hash, password)
        expect(mockCompare).toHaveBeenCalledWith(wrongPassword, hashedPassword)
        expect(isValid).toBe(false)
      })

      it('should handle null hash gracefully', async () => {
        const password = 'TestPassword123'
        
        // Mock bcrypt.compare to reject with the expected error
        mockCompare.mockRejectedValue(new Error('data and hash arguments required'))
        
        await expect(authService.verifyPassword(null as any, password))
          .rejects.toThrow('Password verification failed: data and hash arguments required')
      })
    })
  })

  describe('JWT Token Management', () => {
    describe('generateToken', () => {
      it('should generate a valid JWT token', () => {
        const token = authService.generateToken(testUser)
        
        expect(token).toBeDefined()
        expect(typeof token).toBe('string')
        expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
      })

      it('should generate different tokens for different users', () => {
        const user1 = { ...testUser, id: 'user1' }
        const user2 = { ...testUser, id: 'user2' }
        
        const token1 = authService.generateToken(user1)
        const token2 = authService.generateToken(user2)
        
        expect(token1).not.toBe(token2)
      })
    })

    describe('verifyToken', () => {
      it('should verify a valid token', () => {
        const token = authService.generateToken(testUser)
        
        const decoded = authService.verifyToken(token)
        
        expect(decoded).toBeDefined()
        expect(decoded.userId).toBe(testUser.id)
        expect(decoded.email).toBe(testUser.email)
      })

      it('should throw error for invalid token', () => {
        const invalidToken = 'invalid.jwt.token'
        
        expect(() => authService.verifyToken(invalidToken)).toThrow()
      })

      it('should handle empty token gracefully', () => {
        expect(() => authService.verifyToken('')).toThrow()
      })
    })

    describe('extractTokenFromHeader', () => {
      it('should extract token from Bearer header', () => {
        const token = 'test.jwt.token'
        const header = `Bearer ${token}`
        
        const extractedToken = authService.extractTokenFromHeader(header)
        
        expect(extractedToken).toBe(token)
      })

      it('should throw error for invalid header format', () => {
        const invalidHeader = 'InvalidToken'
        
        expect(() => authService.extractTokenFromHeader(invalidHeader)).toThrow()
      })

      it('should throw error for undefined header', () => {
        expect(() => authService.extractTokenFromHeader(undefined)).toThrow()
      })
    })
  })

  describe('Data Validation', () => {
    describe('validateRegistrationData', () => {
      it('should validate correct registration data', () => {
        const validData = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123'
        }
        
        const result = authService.validateRegistrationData(validData)
        
        expect(result.success).toBe(true)
        expect(result.data).toEqual(validData)
      })

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email',
          username: 'testuser',
          password: 'Password123'
        }
        
        const result = authService.validateRegistrationData(invalidData)
        
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })

    describe('validateLoginData', () => {
      it('should validate correct login data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'Password123'
        }
        
        const result = authService.validateLoginData(validData)
        
        expect(result.success).toBe(true)
        expect(result.data).toEqual(validData)
      })

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email',
          password: 'Password123'
        }
        
        const result = authService.validateLoginData(invalidData)
        
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('Integration Tests', () => {
    it('should complete full password hash and verify cycle', async () => {
      const password = 'TestPassword123'
      const expectedHash = 'hashedPassword123'
      
      // Mock bcrypt methods for integration test
      mockHash.mockResolvedValue(expectedHash)
      mockCompare.mockResolvedValue(true)
      
      // Hash the password
      const hashedPassword = await authService.hashPassword(password)
      expect(hashedPassword).toBe(expectedHash)
      
      // Verify correct password
      const isValidCorrect = await authService.verifyPassword(hashedPassword, password)
      expect(isValidCorrect).toBe(true)
      
      // Verify bcrypt was called correctly
      expect(mockHash).toHaveBeenCalledWith(password, 12)
      expect(mockCompare).toHaveBeenCalledWith(password, hashedPassword)
    })

    it('should complete full token generation and verification cycle', () => {
      // Generate token
      const token = authService.generateToken(testUser)
      
      // Verify token
      const decoded = authService.verifyToken(token)
      
      expect(decoded.userId).toBe(testUser.id)
      expect(decoded.email).toBe(testUser.email)
      expect(decoded.username).toBe(testUser.username)
    })
  })
})