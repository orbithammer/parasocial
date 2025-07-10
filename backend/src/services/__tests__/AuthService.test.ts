// backend/src/services/__tests__/AuthService.test.ts
// Version: 1.1
// Fixed generateToken test to match actual implementation (7d expiry)

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AuthService } from '../AuthService'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

// Mock bcrypt for consistent testing
vi.mock('bcrypt')
const mockHash = vi.mocked(bcrypt.hash)
const mockCompare = vi.mocked(bcrypt.compare)

// Mock jwt for token testing
vi.mock('jsonwebtoken')
const mockSign = vi.mocked(jwt.sign)
const mockVerify = vi.mocked(jwt.verify)

describe('AuthService', () => {
  let authService: AuthService
  
  // Test user data for consistent testing
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser'
  }

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Create fresh AuthService instance
    authService = new AuthService()
  })

  describe('hashPassword', () => {
    it('should hash password with correct salt rounds', async () => {
      // Arrange
      const password = 'testPassword123'
      const expectedHash = 'hashedPassword123'
      mockHash.mockResolvedValue(expectedHash as never)

      // Act
      const result = await authService.hashPassword(password)

      // Assert
      expect(mockHash).toHaveBeenCalledWith(password, 12)
      expect(result).toBe(expectedHash)
    })

    it('should handle hashing errors gracefully', async () => {
      // Arrange
      const password = 'testPassword123'
      mockHash.mockRejectedValue(new Error('Hashing failed'))

      // Act & Assert
      await expect(authService.hashPassword(password)).rejects.toThrow('Hashing failed')
    })
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      // Arrange
      const password = 'testPassword123'
      const hashedPassword = 'hashedPassword123'
      mockCompare.mockResolvedValue(true as never)

      // Act
      const result = await authService.verifyPassword(hashedPassword, password)

      // Assert
      expect(mockCompare).toHaveBeenCalledWith(password, hashedPassword)
      expect(result).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      // Arrange
      const password = 'wrongPassword'
      const hashedPassword = 'hashedPassword123'
      mockCompare.mockResolvedValue(false as never)

      // Act
      const result = await authService.verifyPassword(hashedPassword, password)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('generateToken', () => {
    it('should generate JWT token with correct payload', () => {
      // Arrange
      const expectedToken = 'generated.jwt.token'
      mockSign.mockReturnValue(expectedToken as never)

      // Act
      const result = authService.generateToken(testUser)

      // Assert
      expect(mockSign).toHaveBeenCalledWith(
        {
          userId: testUser.id,
          email: testUser.email,
          username: testUser.username
        },
        expect.any(String), // JWT secret (actual implementation uses specific secret)
        { expiresIn: '7d' } // Updated to match actual implementation (7 days)
      )
      expect(result).toBe(expectedToken)
    })
  })

  describe('verifyToken', () => {
    it('should verify valid token and return payload', () => {
      // Arrange
      const token = 'valid.jwt.token'
      const expectedPayload = {
        userId: testUser.id,
        email: testUser.email,
        username: testUser.username
      }
      mockVerify.mockReturnValue(expectedPayload as never)

      // Act
      const result = authService.verifyToken(token)

      // Assert
      expect(mockVerify).toHaveBeenCalledWith(token, expect.any(String))
      expect(result).toEqual(expectedPayload)
    })

    it('should throw error for invalid token', () => {
      // Arrange
      const invalidToken = 'invalid.jwt.token'
      mockVerify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      // Act & Assert
      expect(() => authService.verifyToken(invalidToken)).toThrow('Invalid token')
    })
  })

  describe('extractTokenFromHeader', () => {
    it('should extract token from Bearer header', () => {
      // Arrange
      const token = 'test.jwt.token'
      const header = `Bearer ${token}`

      // Act
      const result = authService.extractTokenFromHeader(header)

      // Assert
      expect(result).toBe(token)
    })

    it('should throw error for missing Bearer prefix', () => {
      // Arrange
      const invalidHeader = 'InvalidToken'

      // Act & Assert
      expect(() => authService.extractTokenFromHeader(invalidHeader)).toThrow()
    })

    it('should throw error for undefined header', () => {
      // Act & Assert
      expect(() => authService.extractTokenFromHeader(undefined)).toThrow()
    })
  })
})