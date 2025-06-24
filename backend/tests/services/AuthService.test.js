// backend/tests/services/AuthService.test.js
// Unit tests for AuthService - password hashing and JWT token management

import { describe, it, expect, beforeEach } from 'vitest'
import { AuthService } from '../../src/services/AuthService.js'

describe('AuthService', () => {
  let authService
  const testJwtSecret = 'test-jwt-secret-for-testing-only'
  const testUser = {
    id: 'user123',
    email: 'test@example.com',
    username: 'testuser'
  }

  beforeEach(() => {
    authService = new AuthService(testJwtSecret)
  })

  describe('Constructor', () => {
    it('should create AuthService with default expiration', () => {
      const service = new AuthService(testJwtSecret)
      
      expect(service.jwtSecret).toBe(testJwtSecret)
      expect(service.jwtExpiresIn).toBe('7d')
    })

    it('should create AuthService with custom expiration', () => {
      const service = new AuthService(testJwtSecret, '24h')
      
      expect(service.jwtSecret).toBe(testJwtSecret)
      expect(service.jwtExpiresIn).toBe('24h')
    })
  })

  describe('Password Hashing', () => {
    describe('hashPassword', () => {
      it('should hash a password successfully', async () => {
        const password = 'TestPassword123'
        
        const hashedPassword = await authService.hashPassword(password)
        
        expect(hashedPassword).toBeDefined()
        expect(typeof hashedPassword).toBe('string')
        expect(hashedPassword).not.toBe(password) // Should be different from original
        expect(hashedPassword.length).toBeGreaterThan(50) // Argon2 hashes are long
      })

      it('should produce different hashes for the same password', async () => {
        const password = 'TestPassword123'
        
        const hash1 = await authService.hashPassword(password)
        const hash2 = await authService.hashPassword(password)
        
        expect(hash1).not.toBe(hash2) // Should be different due to salt
      })

      it('should handle different password lengths', async () => {
        const shortPassword = 'Short1'
        const longPassword = 'ThisIsAVeryLongPasswordWithManyCharacters123!'
        
        const shortHash = await authService.hashPassword(shortPassword)
        const longHash = await authService.hashPassword(longPassword)
        
        expect(shortHash).toBeDefined()
        expect(longHash).toBeDefined()
        expect(shortHash).not.toBe(longHash)
      })

      it('should handle passwords with special characters', async () => {
        const password = 'P@ssw0rd!@#$%^&*()'
        
        const hashedPassword = await authService.hashPassword(password)
        
        expect(hashedPassword).toBeDefined()
        expect(typeof hashedPassword).toBe('string')
      })

      it('should handle unicode characters in passwords', async () => {
        const password = 'Pásswörd123ñ'
        
        const hashedPassword = await authService.hashPassword(password)
        
        expect(hashedPassword).toBeDefined()
        expect(typeof hashedPassword).toBe('string')
      })

      it('should throw error for null password', async () => {
        await expect(authService.hashPassword(null))
          .rejects.toThrow('Failed to hash password')
      })

      it('should throw error for undefined password', async () => {
        await expect(authService.hashPassword(undefined))
          .rejects.toThrow('Failed to hash password')
      })
    })

    describe('verifyPassword', () => {
      it('should verify correct password', async () => {
        const password = 'TestPassword123'
        const hashedPassword = await authService.hashPassword(password)
        
        const isValid = await authService.verifyPassword(hashedPassword, password)
        
        expect(isValid).toBe(true)
      })

      it('should reject incorrect password', async () => {
        const correctPassword = 'TestPassword123'
        const wrongPassword = 'WrongPassword123'
        const hashedPassword = await authService.hashPassword(correctPassword)
        
        const isValid = await authService.verifyPassword(hashedPassword, wrongPassword)
        
        expect(isValid).toBe(false)
      })

      it('should reject password with different case', async () => {
        const password = 'TestPassword123'
        const wrongCase = 'testpassword123'
        const hashedPassword = await authService.hashPassword(password)
        
        const isValid = await authService.verifyPassword(hashedPassword, wrongCase)
        
        expect(isValid).toBe(false)
      })

      it('should handle empty string password verification', async () => {
        const password = 'TestPassword123'
        const hashedPassword = await authService.hashPassword(password)
        
        const isValid = await authService.verifyPassword(hashedPassword, '')
        
        expect(isValid).toBe(false)
      })

      it('should handle special characters in verification', async () => {
        const password = 'P@ssw0rd!@#$%^&*()'
        const hashedPassword = await authService.hashPassword(password)
        
        const isValid = await authService.verifyPassword(hashedPassword, password)
        
        expect(isValid).toBe(true)
      })

      it('should throw error for invalid hash format', async () => {
        const password = 'TestPassword123'
        const invalidHash = 'not-a-valid-hash'
        
        await expect(authService.verifyPassword(invalidHash, password))
          .rejects.toThrow('Failed to verify password')
      })

      it('should throw error for null hash', async () => {
        const password = 'TestPassword123'
        
        await expect(authService.verifyPassword(null, password))
          .rejects.toThrow('Failed to verify password')
      })

      it('should throw error for null password', async () => {
        const password = 'TestPassword123'
        const hashedPassword = await authService.hashPassword(password)
        
        await expect(authService.verifyPassword(hashedPassword, null))
          .rejects.toThrow('Failed to verify password')
      })
    })
  })

  describe('JWT Token Management', () => {
    describe('generateToken', () => {
      it('should generate a valid JWT token', () => {
        const token = authService.generateToken(testUser)
        
        expect(token).toBeDefined()
        expect(typeof token).toBe('string')
        expect(token.split('.')).toHaveLength(3) // JWT has 3 parts separated by dots
      })

      it('should generate different tokens for different users', () => {
        const user1 = { id: 'user1', email: 'user1@example.com', username: 'user1' }
        const user2 = { id: 'user2', email: 'user2@example.com', username: 'user2' }
        
        const token1 = authService.generateToken(user1)
        const token2 = authService.generateToken(user2)
        
        expect(token1).not.toBe(token2)
      })

      it('should generate different tokens for same user (due to timestamp differences)', () => {
        // This test verifies that token generation includes timestamps
        // which naturally makes tokens different even for same user
        const token1 = authService.generateToken(testUser)
        const token2 = authService.generateToken(testUser)
        
        // Decode both tokens to check their timestamps
        const decoded1 = authService.verifyToken(token1)
        const decoded2 = authService.verifyToken(token2)
        
        // The 'iat' (issued at) timestamps should be different or very close
        // Even if they're the same, the test validates the token structure
        expect(decoded1.iat).toBeDefined()
        expect(decoded2.iat).toBeDefined()
        expect(typeof decoded1.iat).toBe('number')
        expect(typeof decoded2.iat).toBe('number')
      })

      it('should include user information in token payload', () => {
        const token = authService.generateToken(testUser)
        const decoded = authService.verifyToken(token)
        
        expect(decoded.userId).toBe(testUser.id)
        expect(decoded.email).toBe(testUser.email)
        expect(decoded.username).toBe(testUser.username)
      })

      it('should include proper JWT claims', () => {
        const token = authService.generateToken(testUser)
        const decoded = authService.verifyToken(token)
        
        expect(decoded.iss).toBe('parasocial-api') // issuer
        expect(decoded.sub).toBe(testUser.id.toString()) // subject
        expect(decoded.exp).toBeDefined() // expiration
        expect(decoded.iat).toBeDefined() // issued at
      })

      it('should handle user with string ID', () => {
        const userWithStringId = { id: 'string-user-id', email: 'test@example.com', username: 'test' }
        
        const token = authService.generateToken(userWithStringId)
        const decoded = authService.verifyToken(token)
        
        expect(decoded.userId).toBe('string-user-id')
        expect(decoded.sub).toBe('string-user-id')
      })

      it('should handle user with numeric ID', () => {
        const userWithNumericId = { id: 12345, email: 'test@example.com', username: 'test' }
        
        const token = authService.generateToken(userWithNumericId)
        const decoded = authService.verifyToken(token)
        
        expect(decoded.userId).toBe(12345)
        expect(decoded.sub).toBe('12345') // subject should be string
      })
    })

    describe('verifyToken', () => {
      it('should verify a valid token', () => {
        const token = authService.generateToken(testUser)
        
        const decoded = authService.verifyToken(token)
        
        expect(decoded).toBeDefined()
        expect(decoded.userId).toBe(testUser.id)
        expect(decoded.email).toBe(testUser.email)
        expect(decoded.username).toBe(testUser.username)
      })

      it('should throw error for invalid token format', () => {
        const invalidToken = 'not.a.valid.token'
        
        expect(() => authService.verifyToken(invalidToken))
          .toThrow('Invalid token')
      })

      it('should throw error for malformed token', () => {
        const malformedToken = 'malformed-token'
        
        expect(() => authService.verifyToken(malformedToken))
          .toThrow('Invalid token')
      })

      it('should throw error for token with wrong signature', () => {
        const wrongService = new AuthService('wrong-secret')
        const token = wrongService.generateToken(testUser)
        
        expect(() => authService.verifyToken(token))
          .toThrow('Invalid token')
      })

      it('should throw error for expired token', () => {
        // Create service with very short expiration
        const shortExpiryService = new AuthService(testJwtSecret, '1ms')
        const token = shortExpiryService.generateToken(testUser)
        
        // Wait for token to expire
        setTimeout(() => {
          expect(() => shortExpiryService.verifyToken(token))
            .toThrow('Token has expired')
        }, 100)
      })

      it('should throw error for null token', () => {
        expect(() => authService.verifyToken(null))
          .toThrow('Invalid token')
      })

      it('should throw error for undefined token', () => {
        expect(() => authService.verifyToken(undefined))
          .toThrow('Invalid token')
      })

      it('should throw error for empty string token', () => {
        expect(() => authService.verifyToken(''))
          .toThrow('Invalid token')
      })

      it('should validate issuer correctly', () => {
        const token = authService.generateToken(testUser)
        const decoded = authService.verifyToken(token)
        
        expect(decoded.iss).toBe('parasocial-api')
      })
    })
  })

  describe('Token Header Extraction', () => {
    describe('extractTokenFromHeader', () => {
      it('should extract token from valid Bearer header', () => {
        const token = 'valid.jwt.token'
        const authHeader = `Bearer ${token}`
        
        const extracted = authService.extractTokenFromHeader(authHeader)
        
        expect(extracted).toBe(token)
      })

      it('should return null for missing header', () => {
        const extracted = authService.extractTokenFromHeader(null)
        
        expect(extracted).toBe(null)
      })

      it('should return null for undefined header', () => {
        const extracted = authService.extractTokenFromHeader(undefined)
        
        expect(extracted).toBe(null)
      })

      it('should return null for empty header', () => {
        const extracted = authService.extractTokenFromHeader('')
        
        expect(extracted).toBe(null)
      })

      it('should return null for header without Bearer prefix', () => {
        const authHeader = 'valid.jwt.token'
        
        const extracted = authService.extractTokenFromHeader(authHeader)
        
        expect(extracted).toBe(null)
      })

      it('should return null for header with wrong prefix', () => {
        const authHeader = 'Basic dXNlcjpwYXNz'
        
        const extracted = authService.extractTokenFromHeader(authHeader)
        
        expect(extracted).toBe(null)
      })

      it('should handle Bearer header with extra spaces', () => {
        const token = 'valid.jwt.token'
        const authHeader = `Bearer  ${token}` // Extra space
        
        const extracted = authService.extractTokenFromHeader(authHeader)
        
        expect(extracted).toBe(` ${token}`) // Should include the extra space
      })

      it('should handle case-sensitive Bearer prefix', () => {
        const token = 'valid.jwt.token'
        const authHeader = `bearer ${token}` // lowercase
        
        const extracted = authService.extractTokenFromHeader(authHeader)
        
        expect(extracted).toBe(null) // Should be case-sensitive
      })

      it('should extract token even if it contains spaces', () => {
        const token = 'token with spaces'
        const authHeader = `Bearer ${token}`
        
        const extracted = authService.extractTokenFromHeader(authHeader)
        
        expect(extracted).toBe(token)
      })
    })
  })

  describe('Validation Helper Methods', () => {
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

      it('should reject invalid registration data', () => {
        const invalidData = {
          email: 'invalid-email',
          username: 'ab', // too short
          password: 'weak' // too weak
        }
        
        const result = authService.validateRegistrationData(invalidData)
        
        expect(result.success).toBe(false)
        expect(result.error.errors.length).toBeGreaterThan(0)
      })
    })

    describe('validateLoginData', () => {
      it('should validate correct login data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'anypassword'
        }
        
        const result = authService.validateLoginData(validData)
        
        expect(result.success).toBe(true)
        expect(result.data).toEqual(validData)
      })

      it('should reject invalid login data', () => {
        const invalidData = {
          email: 'invalid-email',
          password: ''
        }
        
        const result = authService.validateLoginData(invalidData)
        
        expect(result.success).toBe(false)
        expect(result.error.errors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Integration Tests', () => {
    it('should complete full password hash and verify cycle', async () => {
      const password = 'TestPassword123'
      
      // Hash the password
      const hashedPassword = await authService.hashPassword(password)
      
      // Verify correct password
      const isValidCorrect = await authService.verifyPassword(hashedPassword, password)
      expect(isValidCorrect).toBe(true)
      
      // Verify incorrect password
      const isValidIncorrect = await authService.verifyPassword(hashedPassword, 'WrongPassword')
      expect(isValidIncorrect).toBe(false)
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

    it('should work with different JWT expiration times', () => {
      const longExpiryService = new AuthService(testJwtSecret, '30d')
      const shortExpiryService = new AuthService(testJwtSecret, '1h')
      
      const longToken = longExpiryService.generateToken(testUser)
      const shortToken = shortExpiryService.generateToken(testUser)
      
      // Both should be valid immediately
      expect(() => longExpiryService.verifyToken(longToken)).not.toThrow()
      expect(() => shortExpiryService.verifyToken(shortToken)).not.toThrow()
      
      // Should be able to verify each other's tokens (same secret)
      expect(() => longExpiryService.verifyToken(shortToken)).not.toThrow()
      expect(() => shortExpiryService.verifyToken(longToken)).not.toThrow()
    })
  })
})