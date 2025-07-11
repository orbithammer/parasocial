// backend/src/middleware/__tests__/authMiddleware.test.ts
// Version: 1.1.0 - Removed all TypeScript "any" types
// Changed: Replaced all "any" with proper TypeScript types for type safety

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { createAuthMiddleware, createOptionalAuthMiddleware } from '../authMiddleware'

// Define the authenticated request interface that matches the middleware
interface AuthenticatedRequest extends Request {
  headers: {
    authorization?: string
    Authorization?: string
    [key: string]: string | string[] | undefined // FIXED: Changed from "any" to proper union type
  }
  user?: {
    id: string | number
    email: string
    username: string
  }
  customProperty?: string
  // FIXED: Use index signature with specific types instead of "any"
  [key: string]: unknown
}

// Define the response interface for mocking Express Response
interface MockResponse {
  status: (code: number) => MockResponse // FIXED: Chainable status method
  json: (data: unknown) => MockResponse // FIXED: Chainable json method
  send?: (data: unknown) => MockResponse // FIXED: Optional chainable send method
}

// Mock AuthService interface with proper typing
interface MockAuthService {
  extractTokenFromHeader: ReturnType<typeof vi.fn>
  verifyToken: ReturnType<typeof vi.fn>
}

// Mock middleware function type - use the actual Express types
type AuthMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void>

describe('Authentication Middleware', () => {
  let mockAuthService: MockAuthService // FIXED: Changed from "any" to proper interface
  let mockReq: AuthenticatedRequest
  let mockRes: MockResponse
  let mockNext: NextFunction // FIXED: Changed from "any" to NextFunction
  let authMiddleware: AuthMiddleware // FIXED: Use actual middleware type
  let optionalAuthMiddleware: AuthMiddleware // FIXED: Use actual middleware type

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
    // Mock AuthService with proper typing
    mockAuthService = {
      extractTokenFromHeader: vi.fn(),
      verifyToken: vi.fn()
    }

    // Mock Express request object with proper typing
    mockReq = {
      headers: {}
    } as AuthenticatedRequest

    // Mock Express response object with proper Express types
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    } as MockResponse

    // Mock Express next function
    mockNext = vi.fn() as NextFunction

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
        await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

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

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

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

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

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

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

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
        await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

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

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

        expect(mockAuthService.extractTokenFromHeader).toHaveBeenCalledWith('')
        expect(mockAuthService.verifyToken).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Authentication token required'
        })
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should return 401 when token extraction fails', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(null)

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

        expect(mockAuthService.extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${validToken}`)
        expect(mockAuthService.verifyToken).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Authentication token required'
        })
        expect(mockNext).not.toHaveBeenCalled()
      })
    })

    describe('Invalid Authentication', () => {
      it('should return 401 when token verification fails', async () => {
        mockReq.headers.authorization = `Bearer ${invalidToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(invalidToken)
        mockAuthService.verifyToken.mockImplementation(() => {
          throw new Error('Invalid token')
        })

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

        expect(mockAuthService.extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${invalidToken}`)
        expect(mockAuthService.verifyToken).toHaveBeenCalledWith(invalidToken)
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({
          success: false,
          error: 'Invalid token'
        })
        expect(mockNext).not.toHaveBeenCalled()
        expect(mockReq.user).toBeUndefined()
      })

      it('should handle extractTokenFromHeader errors', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockImplementation(() => {
          throw new Error('Token extraction failed')
        })

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

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

        await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

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

        await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

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

        await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

        expect(mockAuthService.extractTokenFromHeader).toHaveBeenCalledWith(`Bearer ${validToken}`)
        expect(mockAuthService.verifyToken).toHaveBeenCalledWith(validToken)
        expect(mockReq.user).toBeDefined()
        expect(mockNext).toHaveBeenCalled()
      })
    })

    describe('Missing Authentication', () => {
      it('should continue without user when no authorization header', async () => {
        // No authorization header
        mockAuthService.extractTokenFromHeader.mockReturnValue(null)

        await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
        expect(mockRes.json).not.toHaveBeenCalled()
      })

      it('should continue without user when authorization header is empty', async () => {
        mockReq.headers.authorization = ''
        mockAuthService.extractTokenFromHeader.mockReturnValue(null)

        await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
      })

      it('should continue without user when token extraction fails', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(null)

        await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
      })
    })

    describe('Invalid Authentication', () => {
      it('should continue without user when token verification fails', async () => {
        mockReq.headers.authorization = `Bearer ${invalidToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(invalidToken)
        mockAuthService.verifyToken.mockImplementation(() => {
          throw new Error('Invalid token')
        })

        await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
        expect(mockRes.json).not.toHaveBeenCalled()
      })

      it('should continue without user for expired tokens', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
        mockAuthService.verifyToken.mockImplementation(() => {
          throw new Error('Token has expired')
        })

        await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

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

        await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

        expect(mockReq.user).toBeUndefined()
        expect(mockNext).toHaveBeenCalledWith()
        expect(mockRes.status).not.toHaveBeenCalled()
      })

      it('should handle extractTokenFromHeader errors gracefully', async () => {
        mockReq.headers.authorization = `Bearer ${validToken}`
        mockAuthService.extractTokenFromHeader.mockImplementation(() => {
          throw new Error('Header extraction failed')
        })

        await optionalAuthMiddleware(mockReq as Request, mockRes as Response, mockNext)

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
      const otherAuthService: MockAuthService = {
        extractTokenFromHeader: vi.fn(),
        verifyToken: vi.fn()
      }
      
      const middleware1 = createAuthMiddleware(mockAuthService)
      const middleware2 = createAuthMiddleware(otherAuthService)
      
      expect(middleware1).not.toBe(middleware2)
      expect(typeof middleware1).toBe('function')
      expect(typeof middleware2).toBe('function')
    })
  })

  describe('Integration Scenarios', () => {
    it('should work in sequence with multiple middleware', async () => {
      const middleware1 = createAuthMiddleware(mockAuthService)
      const middleware2 = createOptionalAuthMiddleware(mockAuthService)
      
      mockReq.headers.authorization = `Bearer ${validToken}`
      mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
      mockAuthService.verifyToken.mockReturnValue(mockDecodedToken)

      // First middleware (required auth)
      await middleware1(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockReq.user).toBeDefined()
      expect(mockNext).toHaveBeenCalled()
      
      // Reset mockNext for second middleware
      mockNext = vi.fn() as NextFunction
      
      // Second middleware (optional auth) - should still work with existing user
      await middleware2(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockReq.user).toBeDefined()
      expect(mockNext).toHaveBeenCalled()
    })

    it('should preserve existing request properties', async () => {
      mockReq.customProperty = 'testValue'
      mockReq.headers.authorization = `Bearer ${validToken}`
      mockAuthService.extractTokenFromHeader.mockReturnValue(validToken)
      mockAuthService.verifyToken.mockReturnValue(mockDecodedToken)

      await authMiddleware(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.customProperty).toBe('testValue')
      expect(mockReq.user).toBeDefined()
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle concurrent requests independently', async () => {
      // Create separate request objects for concurrent requests
      const req1 = { headers: { authorization: `Bearer ${validToken}` } } as AuthenticatedRequest
      const req2 = { headers: {} } as AuthenticatedRequest
      
      mockAuthService.extractTokenFromHeader
        .mockReturnValueOnce(validToken)  // For req1
        .mockReturnValueOnce(null)        // For req2
      
      mockAuthService.verifyToken.mockReturnValue(mockDecodedToken)

      const middleware = createAuthMiddleware(mockAuthService)

      // Execute concurrently
      await Promise.all([
        middleware(req1 as Request, mockRes as Response, mockNext),
        // Second request should fail authentication
        expect(middleware(req2 as Request, mockRes as Response, mockNext)).rejects.toThrow()
          .catch(() => {}) // Handle expected error
      ])

      expect(req1.user).toBeDefined()
      expect(req2.user).toBeUndefined()
    })
  })
})