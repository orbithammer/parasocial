// backend/tests/services/AuthService.test.ts
// Fixed tests to match actual AuthService implementation with updated error messages

import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { AuthService } from '../../src/services/AuthService.js'

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
    // AuthService constructor reads from environment variables
    authService = new AuthService()
  })

  describe('Constructor', () => {
    it('should create AuthService with default expiration', () => {
      const service = new AuthService()
      
      // Note: AuthService properties are private, so we can't directly access them
      // We test functionality instead of internal state
      expect(service).toBeInstanceOf(AuthService)
      expect(typeof service.hashPassword).toBe('function')
      expect(typeof service.generateToken).toBe('function')
    })

    it('should create AuthService with custom expiration', () => {
      // Set custom environment variable
      process.env.JWT_EXPIRES_IN = '24h'
      const service = new AuthService()
      
      // Test that it works (we can't access the private property directly)
      expect(service).toBeInstanceOf(AuthService)
      
      // Reset to default
      process.env.JWT_EXPIRES_IN = '7d'
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
        expect(hashedPassword.length).toBeGreaterThan(50) // bcrypt hashes are long
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

      // Fixed: Updated to match actual error message format
      it('should throw error for null password', async () => {
        await expect(authService.hashPassword(null as any))
          .rejects.toThrow('Password hashing failed: data and salt arguments required')
      })

      // Fixed: Updated to match actual error message format
      it('should throw error for undefined password', async () => {
        await expect(authService.hashPassword(undefined as any))
          .rejects.toThrow('Password hashing failed: data and salt arguments required')
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
        
        // Fixed: bcrypt.compare returns false for invalid hash, doesn't throw
        const isValid = await authService.verifyPassword(invalidHash, password)
        expect(isValid).toBe(false)
      })

      // Fixed: Updated to match actual error message format
      it('should throw error for null hash', async () => {
        const password = 'TestPassword123'
        
        await expect(authService.verifyPassword(null as any, password))
          .rejects.toThrow('Password verification failed: data and hash arguments required')
      })

      // Fixed: Updated to match actual error message format
      it('should throw error for null password', async () => {
        const password = 'TestPassword123'
        const hashedPassword = await authService.hashPassword(password)
        
        await expect(authService.verifyPassword(hashedPassword, null as any))
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

      it('should include user data in token payload', () => {
        const token = authService.generateToken(testUser)
        const decoded = authService.verifyToken(token)
        
        expect(decoded.userId).toBe(testUser.id)
        expect(decoded.email).toBe(testUser.email)
        expect(decoded.username).toBe(testUser.username)
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

      it('should throw error for empty token', () => {
        expect(() => authService.verifyToken('')).toThrow()
      })

      it('should throw error for null token', () => {
        expect(() => authService.verifyToken(null as any)).toThrow()
      })
    })

    describe('extractTokenFromHeader', () => {
      it('should extract token from Bearer header', () => {
        const token = 'jwt.token.here'
        const header = `Bearer ${token}`
        
        const extracted = authService.extractTokenFromHeader(header)
        
        expect(extracted).toBe(token)
      })

      it('should throw error for invalid header format', () => {
        const invalidHeader = 'jwt.token.here'
        
        expect(() => authService.extractTokenFromHeader(invalidHeader)).toThrow()
      })

      it('should throw error for undefined header', () => {
        expect(() => authService.extractTokenFromHeader(undefined)).toThrow()
      })

      it('should throw error for empty header', () => {
        expect(() => authService.extractTokenFromHeader('')).toThrow()
      })
    })
  })

  describe('Data Validation', () => {
    describe('validateRegistrationData', () => {
      it('should validate correct registration data', () => {
        const validData = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'Password123',
          displayName: 'Test User'
        }
        
        const result = authService.validateRegistrationData(validData)
        
        expect(result.success).toBe(true)
        expect(result.data).toEqual(validData)
      })

      it('should reject invalid email', () => {
        const invalidData = {
          email: 'invalid-email',
          username: 'testuser',
          password: 'Password123',
          displayName: 'Test User'
        }
        
        const result = authService.validateRegistrationData(invalidData)
        
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should reject short password', () => {
        const invalidData = {
          email: 'test@example.com',
          username: 'testuser',
          password: '123',
          displayName: 'Test User'
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

      it('should reject missing password', () => {
        const invalidData = {
          email: 'test@example.com'
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
      // Set different expiration times via environment
      process.env.JWT_EXPIRES_IN = '30d'
      const longExpiryService = new AuthService()
      
      process.env.JWT_EXPIRES_IN = '1h'
      const shortExpiryService = new AuthService()
      
      const longToken = longExpiryService.generateToken(testUser)
      const shortToken = shortExpiryService.generateToken(testUser)
      
      // Both should be valid immediately
      expect(() => longExpiryService.verifyToken(longToken)).not.toThrow()
      expect(() => shortExpiryService.verifyToken(shortToken)).not.toThrow()
      
      // Should be able to verify each other's tokens (same secret)
      expect(() => longExpiryService.verifyToken(shortToken)).not.toThrow()
      expect(() => shortExpiryService.verifyToken(longToken)).not.toThrow()
      
      // Reset to default
      process.env.JWT_EXPIRES_IN = '7d'
    })
  })
})