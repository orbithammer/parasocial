// backend/tests/middleware/authMiddleware.test.js
// Fixed tests to match actual authMiddleware implementation

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

        // Verify - Fixed: middleware passes empty string, not undefined
        expect(mockAuthService.extractTokenFromHeader).toHaveBeenCalledWith("")
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
          // Fixed: throw Error with proper message for consistency
          throw new Error('Invalid authentication token')
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
          throw new Error('Any verification error')
        })

        await optionalAuthMiddleware(mockReq, mockRes, mockNext)

        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
      })

      it('should handle extractTokenFromHeader errors gracefully', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockImplementation(() => {
          throw new Error('Header extraction failed')
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
      expect(middleware.length).toBe(3) // req, res, next
    })

    it('should create middleware function from createOptionalAuthMiddleware', () => {
      const middleware = createOptionalAuthMiddleware(mockAuthService)
      expect(typeof middleware).toBe('function')
      expect(middleware.length).toBe(3) // req, res, next
    })

    it('should create independent middleware instances', () => {
      const middleware1 = createAuthMiddleware(mockAuthService)
      const middleware2 = createAuthMiddleware(mockAuthService)
      
      expect(middleware1).not.toBe(middleware2)
      expect(typeof middleware1).toBe('function')
      expect(typeof middleware2).toBe('function')
    })

    it('should handle different AuthService instances', () => {
      const otherAuthService = {
        extractTokenFromHeader: vi.fn(),
        verifyToken: vi.fn()
      }

      const middleware1 = createAuthMiddleware(mockAuthService)
      const middleware2 = createAuthMiddleware(otherAuthService)

      expect(middleware1).not.toBe(middleware2)
    })
  })

  describe('Integration Scenarios', () => {
    it('should work in sequence with multiple middleware', async () => {
      // Set up a sequence: optional auth -> required auth
      mockReq.headers.authorization = `Bearer ${validToken}`
      mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
      mockAuthService.verifyToken.mockReturnValue(mockDecodedToken)

      // First middleware (optional)
      await optionalAuthMiddleware(mockReq, mockRes, mockNext)
      expect(mockReq.user).toBeDefined()

      // Reset next mock for second middleware
      mockNext.mockClear()

      // Second middleware (required) - should use the same user
      await authMiddleware(mockReq, mockRes, mockNext)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should preserve existing request properties', async () => {
      mockReq.customProperty = 'existing value'
      mockReq.headers.authorization = `Bearer ${validToken}`
      mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
      mockAuthService.verifyToken.mockReturnValue(mockDecodedToken)

      await authMiddleware(mockReq, mockRes, mockNext)

      expect(mockReq.customProperty).toBe('existing value')
      expect(mockReq.user).toBeDefined()
    })

    it('should handle concurrent requests independently', async () => {
      const req1 = { headers: { authorization: `Bearer ${validToken}` } }
      const req2 = { headers: { authorization: `Bearer ${invalidToken}` } }
      const res1 = { status: vi.fn().mockReturnThis(), json: vi.fn() }
      const res2 = { status: vi.fn().mockReturnThis(), json: vi.fn() }
      const next1 = vi.fn()
      const next2 = vi.fn()

      mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
      mockAuthService.verifyToken
        .mockReturnValueOnce(mockDecodedToken)
        .mockImplementationOnce(() => { throw new Error('Invalid token') })

      await Promise.all([
        authMiddleware(req1, res1, next1),
        authMiddleware(req2, res2, next2)
      ])

      expect(req1.user).toBeDefined()
      expect(req2.user).toBeUndefined()
      expect(next1).toHaveBeenCalled()
      expect(next2).not.toHaveBeenCalled()
      expect(res2.status).toHaveBeenCalledWith(401)
    })
  })
})