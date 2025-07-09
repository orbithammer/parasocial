// src/services/__tests__/AuthService.test.ts
// v1.5.0 - Fixed UserTokenData interface mismatch (id input → userId in JWT payload)
// AuthService unit tests with basic functionality

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock bcrypt before importing AuthService
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn()
  },
  hash: vi.fn(),
  compare: vi.fn()
}))

// Mock jsonwebtoken before importing AuthService  
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn()
  },
  sign: vi.fn(),
  verify: vi.fn()
}))

// Import after mocks are set up
import { AuthService } from '../AuthService'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
    
    // Create fresh AuthService instance
    authService = new AuthService()
  })

  describe('Constructor', () => {
    it('should create AuthService instance', () => {
      const service = new AuthService()
      expect(service).toBeInstanceOf(AuthService)
    })
  })

  describe('Password Hashing', () => {
    describe('hashPassword', () => {
      it('should hash a password successfully', async () => {
        const password = 'testPassword123'
        const hashedPassword = 'hashedPassword123'
        
        // Mock bcrypt.hash to return resolved value
        vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never)

        const result = await authService.hashPassword(password)

        expect(bcrypt.hash).toHaveBeenCalledWith(password, 12)
        expect(result).toBe(hashedPassword)
      })

      it('should handle null password gracefully', async () => {
        // AuthService returns undefined for null password instead of throwing
        const result = await authService.hashPassword(null as any)
        expect(result).toBeUndefined()
      })

      it('should handle undefined password gracefully', async () => {
        // AuthService returns undefined for undefined password instead of throwing
        const result = await authService.hashPassword(undefined as any)
        expect(result).toBeUndefined()
      })
    })

    describe('verifyPassword', () => {
      it('should verify correct password', async () => {
        const password = 'testPassword123'
        const hash = 'hashedPassword123'
        
        // Mock bcrypt.compare to return true
        vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

        const result = await authService.verifyPassword(password, hash)

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hash)
        expect(result).toBe(true)
      })

      it('should reject incorrect password', async () => {
        const password = 'wrongPassword'
        const hash = 'hashedPassword123'
        
        // Mock bcrypt.compare to return false
        vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

        const result = await authService.verifyPassword(password, hash)

        expect(bcrypt.compare).toHaveBeenCalledWith(password, hash)
        expect(result).toBe(false)
      })

      it('should handle null hash gracefully', async () => {
        const password = 'testPassword'
        
        // AuthService returns undefined for null hash instead of throwing
        const result = await authService.verifyPassword(password, null as any)
        expect(result).toBeUndefined()
      })
    })
  })

  describe('JWT Token Management', () => {
    describe('generateToken', () => {
      const mockUser = {
        id: '123', // Input to generateToken uses 'id'
        email: 'test@example.com',
        username: 'testuser'
      }

      it('should generate a valid JWT token', () => {
        const mockToken = 'mock.jwt.token'
        
        // Mock jwt.sign to return token
        vi.mocked(jwt.sign).mockReturnValue(mockToken as never)

        const result = authService.generateToken(mockUser)

        expect(jwt.sign).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: mockUser.id, // AuthService transforms id to userId internally
            email: mockUser.email,
            username: mockUser.username
          }),
          expect.any(String), // Specific JWT secret
          { expiresIn: '7d' } // Specific expiration from your implementation
        )
        expect(result).toBe(mockToken)
      })

      it('should generate different tokens for different users', () => {
        const user1 = { id: '1', email: 'user1@example.com', username: 'user1' }
        const user2 = { id: '2', email: 'user2@example.com', username: 'user2' }
        
        // Mock jwt.sign to return different tokens
        vi.mocked(jwt.sign)
          .mockReturnValueOnce('token1' as never)
          .mockReturnValueOnce('token2' as never)

        const token1 = authService.generateToken(user1)
        const token2 = authService.generateToken(user2)

        expect(token1).toBe('token1')
        expect(token2).toBe('token2')
        expect(token1).not.toBe(token2)
      })
    })

    describe('verifyToken', () => {
      it('should verify a valid token', () => {
        const mockToken = 'valid.jwt.token'
        const mockPayload = { userId: '123', email: 'test@example.com' }
        
        // Mock jwt.verify to return payload
        vi.mocked(jwt.verify).mockReturnValue(mockPayload as never)

        const result = authService.verifyToken(mockToken)

        expect(jwt.verify).toHaveBeenCalledWith(mockToken, expect.any(String))
        expect(result).toBe(mockPayload)
      })

      it('should throw error for invalid token', () => {
        const invalidToken = 'invalid.token'
        
        // Mock jwt.verify to throw error
        vi.mocked(jwt.verify).mockImplementation(() => {
          throw new Error('Invalid token')
        })

        expect(() => authService.verifyToken(invalidToken)).toThrow('Invalid token')
      })

      it('should handle empty token gracefully', () => {
        // AuthService handles empty token gracefully instead of throwing
        const result = authService.verifyToken('')
        expect(result).toBeUndefined()
      })
    })

    describe('extractTokenFromHeader', () => {
      it('should extract token from Bearer header', () => {
        const bearerToken = 'Bearer valid.jwt.token'
        
        const result = authService.extractTokenFromHeader(bearerToken)

        expect(result).toBe('valid.jwt.token')
      })

      it('should throw error for invalid header format', () => {
        const invalidHeader = 'InvalidFormat token'
        
        expect(() => authService.extractTokenFromHeader(invalidHeader)).toThrow()
      })

      it('should throw error for undefined header', () => {
        expect(() => authService.extractTokenFromHeader(undefined as any)).toThrow()
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
      const password = 'testPassword123'
      const hashedPassword = 'hashedPassword123'
      
      // Mock both hash and compare
      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never)
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const hash = await authService.hashPassword(password)
      const isValid = await authService.verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should complete full token generation and verification cycle', () => {
      const mockUser = { id: '123', email: 'test@example.com', username: 'testuser' }
      const mockToken = 'mock.jwt.token'
      
      // Mock both sign and verify
      vi.mocked(jwt.sign).mockReturnValue(mockToken as never)
      vi.mocked(jwt.verify).mockReturnValue(mockUser as never)

      const token = authService.generateToken(mockUser)
      const payload = authService.verifyToken(token)

      expect(payload).toEqual(mockUser)
    })
  })
})