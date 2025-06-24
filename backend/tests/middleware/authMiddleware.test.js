// backend/tests/middleware/authMiddleware.test.js
// Unit tests for Authentication Middleware - JWT token processing and request handling

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createAuthMiddleware, createOptionalAuthMiddleware } from '../../src/middleware/authMiddleware.js'

describe('Authentication Middleware', () => {
  let mockAuthService
  let mockReq
  let mockRes
  let mockNext
  let authMiddleware
  let optionalAuthMiddleware

  const validToken = 'valid.jwt.token'
  const invalidToken = 'invalid.jwt.token'
  const mockUser = {
    id: 'user123',
    email: 'test@example.com',
    username: 'testuser'
  }
  const mockDecodedToken = {
    userId: 'user123',
    email: 'test@example.com',
    username: 'testuser'
  }

  beforeEach(() => {
    // Mock AuthService
    mockAuthService = {
      extractTokenFromHeader: vi.fn(),
      verifyToken: vi.fn()
    }

    // Mock Express request object
    mockReq = {
      headers: {}
    }

    // Mock Express response object
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    }

    // Mock Express next function
    mockNext = vi.fn()

    // Create middleware instances
    authMiddleware = createAuthMiddleware(mockAuthService)
    optionalAuthMiddleware = createOptionalAuthMiddleware(mockAuthService)
  })

  describe('createAuthMiddleware (Required Authentication)', () => {
    describe('Valid Authentication', () => {
      it('should successfully authenticate with valid token', async () => {
        // Setup
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
        mockAuthService.verifyToken.mockReturnValue(mockDecodedToken)

        // Execute
        await authMiddleware(mockReq, mockRes, mockNext)

        // Verify
        expect(mockAuthService.extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${validToken}`)
        expect(mockAuthService.verifyToken).toHaveBeenCalledWith(validToken)
        expect(mockReq.user).toEqual({
          id: mockDecodedToken.userId,
          email: mockDecodedToken.email,
          username: mockDecodedToken.username
        })
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
        expect(mockRes.json).not.toHaveBeenCalled()
      })

      it('should handle different token formats correctly', async () => {
        const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'
        mockReq.headers.authorization = `Bearer ${testToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(testToken)
        mockAuthService.verifyToken.mockReturnValue(mockDecodedToken)

        await authMiddleware(mockReq, mockRes, mockNext)

        expect(mockAuthService.verifyToken).toHaveBeenCalledWith(testToken)
        expect(mockReq.user).toBeDefined()
        expect(mockNext).toHaveBeenCalled()
      })

      it('should handle user with numeric ID', async () => {
        const decodedWithNumericId = {
          userId: 12345,
          email: 'test@example.com',
          username: 'testuser'
        }

        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
        mockAuthService.verifyToken.mockReturnValue(decodedWithNumericId)

        await authMiddleware(mockReq, mockRes, mockNext)

        expect(mockReq.user).toEqual({
          id: 12345,
          email: 'test@example.com',
          username: 'testuser'
        })
        expect(mockNext).toHaveBeenCalled()
      })

      it('should handle case-sensitive headers', async () => {
        mockReq.headers.Authorization = `Bearer ${validToken}` // Capital A
        mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
        mockAuthService.verifyToken.mockReturnValue(mockDecodedToken)

        await authMiddleware(mockReq, mockRes, mockNext)

        // Should work since Express normalizes headers to lowercase
        expect(mockAuthService.extractTokenFromHeader).toHaveBeenCalled()
        expect(mockNext).toHaveBeenCalled()
      })
    })

    describe('Missing Authentication', () => {
      it('should return 401 when no authorization header is provided', async () => {
        // Setup - no authorization header
        mockAuthService.extractTokenFromHeader.mockReturnValue(null)

        // Execute
        await authMiddleware(mockReq, mockRes, mockNext)

        // Verify
        expect(mockAuthService.extractTokenFromHeader).toHaveBeenCalledWith(undefined)
        expect(mockAuthService.verifyToken).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Authentication token required'
        })
        expect(mockNext).not.toHaveBeenCalled()
        expect(mockReq.user).toBeUndefined()
      })

      it('should return 401 when authorization header is empty', async () => {
        mockReq.headers.authorization = ''
        mockAuthService.extractTokenFromHeader.mockReturnValue(null)

        await authMiddleware(mockReq, mockRes, mockNext)

        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Authentication token required'
        })
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should return 401 when authorization header has wrong format', async () => {
        mockReq.headers.authorization = 'Basic dXNlcjpwYXNzd29yZA=='
        mockAuthService.extractTokenFromHeader.mockReturnValue(null)

        await authMiddleware(mockReq, mockRes, mockNext)

        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Authentication token required'
        })
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should return 401 when Bearer token is missing', async () => {
        mockReq.headers.authorization = 'Bearer '
        mockAuthService.extractTokenFromHeader.mockReturnValue(null)

        await authMiddleware(mockReq, mockRes, mockNext)

        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockNext).not.toHaveBeenCalled()
      })
    })

    describe('Invalid Authentication', () => {
      it('should return 401 for invalid token', async () => {
        mockReq.headers.authorization = `Bearer ${invalidToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(invalidToken)
        mockAuthService.verifyToken.mockImplementation(() => {
          throw new Error('Invalid token')
        })

        await authMiddleware(mockReq, mockRes, mockNext)

        expect(mockAuthService.verifyToken).toHaveBeenCalledWith(invalidToken)
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid token'
        })
        expect(mockNext).not.toHaveBeenCalled()
        expect(mockReq.user).toBeUndefined()
      })

      it('should return 401 for expired token', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
        mockAuthService.verifyToken.mockImplementation(() => {
          throw new Error('Token has expired')
        })

        await authMiddleware(mockReq, mockRes, mockNext)

        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Token has expired'
        })
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should return 401 for malformed token', async () => {
        mockReq.headers.authorization = 'Bearer malformed.token'
        mockAuthService.extractTokenFromHeader.mockReturnValue('malformed.token')
        mockAuthService.verifyToken.mockImplementation(() => {
          throw new Error('Invalid token')
        })

        await authMiddleware(mockReq, mockRes, mockNext)

        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid token'
        })
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should handle generic authentication errors', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
        mockAuthService.verifyToken.mockImplementation(() => {
          throw new Error() // Error without message
        })

        await authMiddleware(mockReq, mockRes, mockNext)

        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid authentication token'
        })
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should handle non-Error exceptions', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
        mockAuthService.verifyToken.mockImplementation(() => {
          throw 'String error' // Non-Error exception
        })

        await authMiddleware(mockReq, mockRes, mockNext)

        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid authentication token'
        })
        expect(mockNext).not.toHaveBeenCalled()
      })
    })

    describe('Error Handling Edge Cases', () => {
      it('should handle extractTokenFromHeader throwing an error', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockImplementation(() => {
          throw new Error('Token extraction failed')
        })

        await authMiddleware(mockReq, mockRes, mockNext)

        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Token extraction failed'
        })
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should handle verifyToken returning null or undefined', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
        mockAuthService.verifyToken.mockReturnValue(null)

        await authMiddleware(mockReq, mockRes, mockNext)

        // When verifyToken returns null, accessing properties on null will cause an error
        // This should be caught by the try-catch and return 401
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: "Cannot read properties of null (reading 'userId')"
        })
        expect(mockNext).not.toHaveBeenCalled()
        expect(mockReq.user).toBeUndefined()
      })
    })
  })

  describe('createOptionalAuthMiddleware (Optional Authentication)', () => {
    describe('Valid Authentication', () => {
      it('should authenticate when valid token is provided', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
        mockAuthService.verifyToken.mockReturnValue(mockDecodedToken)

        await optionalAuthMiddleware(mockReq, mockRes, mockNext)

        expect(mockReq.user).toEqual({
          id: mockDecodedToken.userId,
          email: mockDecodedToken.email,
          username: mockDecodedToken.username
        })
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
        expect(mockRes.json).not.toHaveBeenCalled()
      })

      it('should handle valid authentication same as required middleware', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
        mockAuthService.verifyToken.mockReturnValue(mockDecodedToken)

        await optionalAuthMiddleware(mockReq, mockRes, mockNext)

        expect(mockAuthService.extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${validToken}`)
        expect(mockAuthService.verifyToken).toHaveBeenCalledWith(validToken)
        expect(mockReq.user).toBeDefined()
        expect(mockNext).toHaveBeenCalled()
      })
    })

    describe('Missing Authentication', () => {
      it('should continue without user when no token is provided', async () => {
        // No authorization header
        mockAuthService.extractTokenFromHeader.mockReturnValue(null)

        await optionalAuthMiddleware(mockReq, mockRes, mockNext)

        expect(mockAuthService.extractTokenFromHeader).toHaveBeenCalled()
        expect(mockAuthService.verifyToken).not.toHaveBeenCalled()
        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
        expect(mockRes.json).not.toHaveBeenCalled()
      })

      it('should continue without user when authorization header is empty', async () => {
        mockReq.headers.authorization = ''
        mockAuthService.extractTokenFromHeader.mockReturnValue(null)

        await optionalAuthMiddleware(mockReq, mockRes, mockNext)

        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
      })

      it('should continue without user when Bearer format is wrong', async () => {
        mockReq.headers.authorization = 'Basic credentials'
        mockAuthService.extractTokenFromHeader.mockReturnValue(null)

        await optionalAuthMiddleware(mockReq, mockRes, mockNext)

        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
      })
    })

    describe('Invalid Authentication', () => {
      it('should continue without user when token is invalid', async () => {
        mockReq.headers.authorization = `Bearer ${invalidToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(invalidToken)
        mockAuthService.verifyToken.mockImplementation(() => {
          throw new Error('Invalid token')
        })

        await optionalAuthMiddleware(mockReq, mockRes, mockNext)

        expect(mockAuthService.verifyToken).toHaveBeenCalledWith(invalidToken)
        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
        expect(mockRes.json).not.toHaveBeenCalled()
      })

      it('should continue without user when token is expired', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
        mockAuthService.verifyToken.mockImplementation(() => {
          throw new Error('Token has expired')
        })

        await optionalAuthMiddleware(mockReq, mockRes, mockNext)

        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
      })

      it('should continue without user for any token verification error', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
        mockAuthService.verifyToken.mockImplementation(() => {
          throw new Error('Some verification error')
        })

        await optionalAuthMiddleware(mockReq, mockRes, mockNext)

        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
      })

      it('should handle extractTokenFromHeader errors gracefully', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockImplementation(() => {
          throw new Error('Token extraction failed')
        })

        await optionalAuthMiddleware(mockReq, mockRes, mockNext)

        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
      })
    })
  })

  describe('Middleware Factory Functions', () => {
    it('should create middleware function from createAuthMiddleware', () => {
      const middleware = createAuthMiddleware(mockAuthService)
      
      expect(typeof middleware).toBe('function')
      expect(middleware.length).toBe(3) // req, res, next parameters
    })

    it('should create middleware function from createOptionalAuthMiddleware', () => {
      const middleware = createOptionalAuthMiddleware(mockAuthService)
      
      expect(typeof middleware).toBe('function')
      expect(middleware.length).toBe(3) // req, res, next parameters
    })

    it('should create independent middleware instances', () => {
      const middleware1 = createAuthMiddleware(mockAuthService)
      const middleware2 = createAuthMiddleware(mockAuthService)
      
      expect(middleware1).not.toBe(middleware2)
    })

    it('should handle different AuthService instances', () => {
      const mockAuthService2 = {
        extractTokenFromHeader: vi.fn(),
        verifyToken: vi.fn()
      }

      const middleware1 = createAuthMiddleware(mockAuthService)
      const middleware2 = createAuthMiddleware(mockAuthService2)

      expect(middleware1).not.toBe(middleware2)
      expect(typeof middleware1).toBe('function')
      expect(typeof middleware2).toBe('function')
    })
  })

  describe('Integration Scenarios', () => {
    it('should work in sequence with multiple middleware', async () => {
      // Simulate middleware chain
      const middleware1 = vi.fn((req, res, next) => next())
      const middleware2 = createAuthMiddleware(mockAuthService)
      const middleware3 = vi.fn((req, res, next) => next())

      mockReq.headers.authorization = `Bearer ${validToken}`
      mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
      mockAuthService.verifyToken.mockReturnValue(mockDecodedToken)

      // Execute middleware chain
      await middleware1(mockReq, mockRes, mockNext)
      await middleware2(mockReq, mockRes, mockNext)

      expect(middleware1).toHaveBeenCalled()
      expect(mockReq.user).toBeDefined()
      expect(mockNext).toHaveBeenCalledTimes(2)
    })

    it('should preserve existing request properties', async () => {
      mockReq.existingProperty = 'should be preserved'
      mockReq.headers.authorization = `Bearer ${validToken}`
      mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
      mockAuthService.verifyToken.mockReturnValue(mockDecodedToken)

      await authMiddleware(mockReq, mockRes, mockNext)

      expect(mockReq.existingProperty).toBe('should be preserved')
      expect(mockReq.user).toBeDefined()
    })

    it('should handle concurrent requests independently', async () => {
      const mockReq2 = { headers: { authorization: 'Bearer different.token' } }
      
      mockAuthService.extractTokenFromHeader
        .mockReturnValueOnce(validToken)
        .mockReturnValueOnce('different.token')
      
      mockAuthService.verifyToken
        .mockReturnValueOnce(mockDecodedToken)
        .mockReturnValueOnce({ userId: 'user456', email: 'other@example.com', username: 'otheruser' })

      // Execute both requests
      await authMiddleware(mockReq, mockRes, mockNext)
      await authMiddleware(mockReq2, mockRes, mockNext)

      expect(mockReq.user.id).toBe('user123')
      expect(mockReq2.user.id).toBe('user456')
    })
  })
})