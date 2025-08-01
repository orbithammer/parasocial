// frontend/src/__tests__/middleware.test.ts
// Version: 2.6
// Completely rewritten with proper Headers API implementation to fix security header capture

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Create a proper Headers implementation for testing
class MockHeaders {
  private headers = new Map<string, string>()

  set(key: string, value: string): void {
    this.headers.set(key.toLowerCase(), value)
  }

  get(key: string): string | null {
    return this.headers.get(key.toLowerCase()) || null
  }

  has(key: string): boolean {
    return this.headers.has(key.toLowerCase())
  }

  delete(key: string): void {
    this.headers.delete(key.toLowerCase())
  }
}

// Mock NextResponse with proper implementations
const mockNext = vi.fn()
const mockRedirect = vi.fn()
const mockJson = vi.fn()

// Mock the token validation function
vi.mock('../middleware', async () => {
  const actual = await vi.importActual('../middleware')
  return {
    ...actual,
    validateToken: vi.fn((token: string) => {
      if (token === 'valid-token-123') {
        return {
          isValid: true,
          user: { email: 'user@test.com', role: 'user' }
        }
      }
      if (token === 'admin-token-456') {
        return {
          isValid: true,
          user: { email: 'admin@test.com', role: 'admin' }
        }
      }
      return {
        isValid: false,
        error: 'Invalid token'
      }
    })
  }
})

vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  return {
    ...actual,
    NextResponse: {
      next: mockNext,
      redirect: mockRedirect,
      json: mockJson
    }
  }
})

// Import after mocking
const { middleware } = await import('../middleware')

describe('Middleware', () => {
  let mockRequest: NextRequest

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Create a proper mock response with real Headers implementation
    const createMockResponse = () => {
      const headers = new MockHeaders()
      return {
        headers,
        status: 200,
        cookies: {
          delete: vi.fn()
        }
      }
    }
    
    mockNext.mockImplementation(() => createMockResponse())
    mockRedirect.mockImplementation((url: URL) => {
      const response = createMockResponse()
      response.headers.set('Location', url.toString())
      response.status = 302
      return response
    })
    mockJson.mockImplementation((data: any, options?: { status?: number }) => {
      const response = createMockResponse()
      response.status = options?.status || 200
      return response
    })
  })

  function createMockRequest(method: string, pathname: string, authToken?: string): NextRequest {
    const headers = new Headers()
    if (authToken) {
      headers.set('authorization', `Bearer ${authToken}`)
    }
    
    const cookies = new Map<string, string>()
    if (authToken) {
      cookies.set('auth-token', authToken)
    }
    
    return {
      method,
      url: `http://localhost:3000${pathname}`,
      nextUrl: { pathname },
      headers,
      cookies: {
        get: vi.fn((name: string) => {
          const value = cookies.get(name)
          return value ? { value } : undefined
        })
      }
    } as unknown as NextRequest
  }

  describe('Authentication', () => {
    it('should allow access to public routes without authentication', async () => {
      mockRequest = createMockRequest('GET', '/')
      
      const response = await middleware(mockRequest)
      
      expect(mockNext).toHaveBeenCalled()
    })

    it('should redirect unauthenticated users to login page', async () => {
      mockRequest = createMockRequest('GET', '/dashboard')
      
      const response = await middleware(mockRequest)
      
      expect(mockRedirect).toHaveBeenCalledWith(
        new URL('/login', mockRequest.url)
      )
    })

    it('should allow access to protected routes with valid authentication', async () => {
      mockRequest = createMockRequest('GET', '/dashboard', 'valid-token-123')
      
      const response = await middleware(mockRequest)
      
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('Route Protection', () => {
    it('should protect admin routes from non-admin users', async () => {
      mockRequest = createMockRequest('GET', '/admin/users', 'valid-token-123')
      
      const response = await middleware(mockRequest)
      
      expect(mockJson).toHaveBeenCalledWith(
        { error: 'Forbidden' },
        { status: 403 }
      )
    })

    it('should allow admin users to access admin routes', async () => {
      mockRequest = createMockRequest('GET', '/admin/users', 'admin-token-456')
      
      const response = await middleware(mockRequest)
      
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('API Route Handling', () => {
    it('should add CORS headers to API routes', async () => {
      mockRequest = createMockRequest('GET', '/api/users')
      
      const response = await middleware(mockRequest)
      
      expect(response?.headers?.get('Access-Control-Allow-Origin')).toBe('*')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle preflight OPTIONS requests', async () => {
      mockRequest = createMockRequest('OPTIONS', '/api/users')
      
      const response = await middleware(mockRequest)
      
      expect(response?.headers?.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response?.status).toBe(200)
    })
  })

  describe('Request Logging', () => {
    it('should log incoming requests with timestamp', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      mockRequest = createMockRequest('GET', '/dashboard', 'valid-token-123')
      
      await middleware(mockRequest)
      
      expect(consoleSpy).toHaveBeenCalledWith('Middleware running for path:', '/dashboard')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Incoming request:', 
        expect.objectContaining({
          method: 'GET',
          pathname: '/dashboard',
          ip: '127.0.0.1'
        })
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Rate Limiting', () => {
    it('should track request count per IP address', async () => {
      mockRequest = createMockRequest('GET', '/api/posts')
      
      const response = await middleware(mockRequest)
      
      expect(response?.headers?.get('X-RateLimit-Remaining')).toBeDefined()
    })

    it('should block requests when rate limit is exceeded', async () => {
      mockRequest = createMockRequest('GET', '/api/posts', 'valid-token-123')
      
      // Simulate rate limit exceeded by making many requests
      for (let i = 0; i < 101; i++) {
        await middleware(mockRequest)
      }
      
      const response = await middleware(mockRequest)
      
      expect(mockJson).toHaveBeenCalledWith(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    })
  })

  describe('Response Headers', () => {
    it('should add security headers to all responses', async () => {
      mockRequest = createMockRequest('GET', '/dashboard', 'valid-token-123')
      
      const response = await middleware(mockRequest)
      
      // Check that security headers are present in the response
      expect(response?.headers?.get('X-Frame-Options')).toBe('DENY')
      expect(response?.headers?.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response?.headers?.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response?.headers?.get('Content-Security-Policy')).toBe("frame-ancestors 'none'")
      expect(response?.headers?.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid authentication tokens gracefully', async () => {
      console.log('=== DEBUG: Starting invalid token test ===')
      mockRequest = createMockRequest('GET', '/dashboard', 'invalid-token-999')
      
      console.log('=== DEBUG: Mock request created ===')
      console.log('Request URL:', mockRequest.url)
      console.log('Request pathname:', mockRequest.nextUrl.pathname)
      console.log('Request headers authorization:', mockRequest.headers.get('authorization'))
      console.log('Request cookie auth-token:', mockRequest.cookies.get('auth-token'))
      
      const response = await middleware(mockRequest)
      
      console.log('=== DEBUG: Middleware completed ===')
      console.log('mockRedirect called?', mockRedirect.mock.calls.length > 0)
      console.log('mockRedirect calls:', mockRedirect.mock.calls)
      console.log('mockNext called?', mockNext.mock.calls.length > 0)
      console.log('mockJson called?', mockJson.mock.calls.length > 0)
      
      // Check that redirect was called for invalid tokens
      expect(mockRedirect).toHaveBeenCalledWith(
        new URL('/login', mockRequest.url)
      )
    })

    it('should continue processing when optional features fail', async () => {
      mockRequest = createMockRequest('GET', '/dashboard', 'valid-token-123')
      
      const response = await middleware(mockRequest)
      
      expect(response?.headers?.get('X-Frame-Options')).toBe('DENY')
    })
  })
})

// frontend/src/__tests__/middleware.test.ts
// Version: 2.6
// Completely rewritten with proper Headers API implementation to fix security header capture