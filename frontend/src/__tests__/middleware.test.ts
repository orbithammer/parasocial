// frontend/src/__tests__/middleware.test.ts
// Version: 1.4.0
// Added debug logging to diagnose redirect issues

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '../middleware'

// Mock NextResponse for testing
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  
  // Create mock response object with headers
  const createMockResponse = (status: number = 200) => ({
    headers: new Headers(),
    status,
    ok: status >= 200 && status < 300
  })
  
  return {
    ...actual,
    NextResponse: {
      redirect: vi.fn().mockReturnValue(createMockResponse(302)),
      next: vi.fn().mockReturnValue(createMockResponse(200)),
      rewrite: vi.fn().mockReturnValue(createMockResponse(200)),
      json: vi.fn().mockReturnValue(createMockResponse(200))
    }
  }
})

// Mock console.log to avoid test noise
vi.mock('console', () => ({
  log: vi.fn(),
  error: vi.fn()
}))

describe('Middleware', () => {
  let mockRequest: NextRequest
  let mockResponse: NextResponse

  // Helper function to create mock request with specific method
  const createMockRequest = (
    method: string = 'GET', 
    pathname: string = '/dashboard',
    headers: Headers = new Headers(),
    authToken?: string
  ): NextRequest => {
    const mockCookies = {
      get: vi.fn().mockImplementation((name: string) => {
        if (name === 'auth-token' && authToken) {
          return { name: 'auth-token', value: authToken }
        }
        return undefined
      }),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      clear: vi.fn()
    }

    return {
      url: `http://localhost:3000${pathname}`,
      method,
      headers,
      nextUrl: {
        pathname,
        search: '',
        origin: 'http://localhost:3000',
        href: `http://localhost:3000${pathname}`
      },
      cookies: mockCookies,
      geo: undefined
    } as unknown as NextRequest
  }

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    
    // Create default mock request object
    mockRequest = createMockRequest()

    // Create mock response object
    mockResponse = {
      headers: new Headers(),
      status: 200,
      ok: true
    } as unknown as NextResponse
  })

  describe('Authentication', () => {
    it('should allow access to public routes without authentication', async () => {
      // Arrange: Set up request for public route
      mockRequest = createMockRequest('GET', '/login')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should continue without redirect
      expect(NextResponse.next).toHaveBeenCalled()
    })

    it('should redirect unauthenticated users to login page', async () => {
      // Arrange: Set up request without auth token
      mockRequest = createMockRequest('GET', '/dashboard', new Headers(), undefined)
      
      // Debug: Check what cookies.get returns
      console.log('Debug - cookies.get result:', mockRequest.cookies.get('auth-token'))
      
      // Act: Call middleware
      await middleware(mockRequest)
      
      // Assert: Should redirect to login
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/login', mockRequest.url)
      )
    })

    it('should allow access to protected routes with valid authentication', async () => {
      // Arrange: Set up request with valid auth token
      mockRequest = createMockRequest('GET', '/dashboard', new Headers(), 'valid-token-123')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should continue without redirect
      expect(NextResponse.next).toHaveBeenCalled()
    })
  })

  describe('Route Protection', () => {
    it('should protect admin routes from non-admin users', async () => {
      // Arrange: Set up request to admin route with user token
      mockRequest = createMockRequest('GET', '/admin/users', new Headers(), 'user-token-123')
      
      // Act: Call middleware
      await middleware(mockRequest)
      
      // Assert: Should redirect to unauthorized page
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/unauthorized', mockRequest.url)
      )
    })

    it('should allow admin users to access admin routes', async () => {
      // Arrange: Set up request to admin route with admin token
      mockRequest = createMockRequest('GET', '/admin/users', new Headers(), 'admin-token-456')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should continue without redirect
      expect(NextResponse.next).toHaveBeenCalled()
    })
  })

  describe('API Route Handling', () => {
    it('should add CORS headers to API routes', async () => {
      // Arrange: Set up API route request
      mockRequest = createMockRequest('GET', '/api/users')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should add CORS headers
      expect(response?.headers?.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response?.headers?.get('Access-Control-Allow-Methods')).toBe(
        'GET, POST, PUT, DELETE, OPTIONS'
      )
    })

    it('should handle preflight OPTIONS requests', async () => {
      // Arrange: Set up OPTIONS request
      mockRequest = createMockRequest('OPTIONS', '/api/users')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should return 200 with CORS headers
      expect(response?.status).toBe(200)
      expect(response?.headers?.get('Access-Control-Allow-Origin')).toBe('*')
    })
  })

  describe('Request Logging', () => {
    it('should log incoming requests with timestamp', async () => {
      // Arrange: Set up console.log spy
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      // Act: Call middleware
      await middleware(mockRequest)
      
      // Assert: Should log request details
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Incoming request:'),
        expect.objectContaining({
          method: 'GET',
          url: expect.stringContaining('/dashboard'),
          timestamp: expect.any(String)
        })
      )
      
      // Cleanup
      logSpy.mockRestore()
    })
  })

  describe('Rate Limiting', () => {
    it('should track request count per IP address', async () => {
      // Arrange: Set up multiple requests from same IP using headers
      const headers = new Headers()
      headers.set('x-forwarded-for', '192.168.1.1')
      mockRequest = createMockRequest('GET', '/api/data', headers)
      
      // Act: Call middleware multiple times
      await middleware(mockRequest)
      await middleware(mockRequest)
      
      // Assert: Should track requests (implementation will vary)
      expect(NextResponse.next).toHaveBeenCalledTimes(2)
    })

    it('should block requests when rate limit is exceeded', async () => {
      // Arrange: Set up request that would exceed rate limit
      const headers = new Headers()
      headers.set('x-forwarded-for', '192.168.1.2')
      mockRequest = createMockRequest('GET', '/api/data', headers)
      
      // Simulate multiple rapid requests
      for (let i = 0; i < 101; i++) {
        await middleware(mockRequest)
      }
      
      // Assert: Should eventually return rate limit response
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    })
  })

  describe('Response Headers', () => {
    it('should add security headers to all responses', async () => {
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should include security headers
      expect(response?.headers?.get('X-Frame-Options')).toBe('DENY')
      expect(response?.headers?.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response?.headers?.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid authentication tokens gracefully', async () => {
      // Arrange: Set up request with malformed token
      mockRequest = createMockRequest('GET', '/dashboard', new Headers(), 'invalid-malformed-token')
      
      // Act: Call middleware
      await middleware(mockRequest)
      
      // Assert: Should redirect to login instead of throwing error
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/login', mockRequest.url)
      )
    })

    it('should continue processing when optional features fail', async () => {
      // Arrange: Mock a feature that might fail
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should not throw and should continue
      expect(response).toBeDefined()
      
      // Cleanup
      consoleSpy.mockRestore()
    })
  })
})

// frontend/src/__tests__/middleware.test.ts
// Version: 1.4.0
// Initial test suite for Next.js middleware functionality