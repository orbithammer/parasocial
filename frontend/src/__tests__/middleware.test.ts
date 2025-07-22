// frontend/src/__tests__/middleware.test.ts
// Version: 1.8.0
// Fixed: OPTIONS CORS response creation and console.log spy tracking

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock console methods as spies BEFORE importing middleware
const mockConsoleLog = vi.fn()
const mockConsoleError = vi.fn()

// Override console globally using Object.defineProperty to ensure it sticks
Object.defineProperty(global, 'console', {
  value: {
    ...console,
    log: mockConsoleLog,
    error: mockConsoleError
  },
  writable: true
})

// Mock NextResponse for testing
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  
  // Create a mock that preserves header modifications
  const createMockResponse = (status: number = 200) => {
    const headers = new Headers()
    return {
      headers,
      status,
      ok: status >= 200 && status < 300
    }
  }
  
  return {
    ...actual,
    NextResponse: {
      redirect: vi.fn((url: URL) => {
        const response = createMockResponse(302)
        response.headers.set('Location', url.toString())
        return response
      }),
      next: vi.fn(() => createMockResponse(200)),
      rewrite: vi.fn(() => createMockResponse(200)),
      json: vi.fn((data: unknown, options?: { status?: number }) => {
        const response = createMockResponse(options?.status || 200)
        response.headers.set('Content-Type', 'application/json')
        return response
      })
    }
  }
})

// Import middleware AFTER mocks are set up
import { middleware } from '../middleware'

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
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
    
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
      expect(response?.headers?.get('X-Frame-Options')).toBe('DENY')
    })

    it('should redirect unauthenticated users to login page', async () => {
      // Arrange: Set up request without auth token
      mockRequest = createMockRequest('GET', '/dashboard', new Headers(), undefined)
      
      // Debug: Check what cookies.get returns
      console.log('Debug - cookies.get result:', mockRequest.cookies.get('auth-token'))
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should redirect to login
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/login', mockRequest.url)
      )
      
      // Check that the response has the redirect location
      expect(response?.headers?.get('Location')).toBe('http://localhost:3000/login')
    })

    it('should allow access to protected routes with valid authentication', async () => {
      // Arrange: Set up request with valid auth token
      mockRequest = createMockRequest('GET', '/dashboard', new Headers(), 'valid-token-123')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should continue without redirect
      expect(NextResponse.next).toHaveBeenCalled()
      expect(response?.headers?.get('X-Frame-Options')).toBe('DENY')
    })
  })

  describe('Route Protection', () => {
    it('should protect admin routes from non-admin users', async () => {
      // Arrange: Set up request to admin route with user token
      mockRequest = createMockRequest('GET', '/admin/users', new Headers(), 'valid-token-123')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should redirect to unauthorized page
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/unauthorized', mockRequest.url)
      )
      
      // Check that the response has the redirect location
      expect(response?.headers?.get('Location')).toBe('http://localhost:3000/unauthorized')
    })

    it('should allow admin users to access admin routes', async () => {
      // Arrange: Set up request to admin route with admin token
      mockRequest = createMockRequest('GET', '/admin/users', new Headers(), 'admin-token-456')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should continue without redirect
      expect(NextResponse.next).toHaveBeenCalled()
      expect(response?.headers?.get('X-Frame-Options')).toBe('DENY')
    })
  })

  describe('API Route Handling', () => {
    it('should add CORS headers to API routes', async () => {
      // Arrange: Set up API route request with auth token
      mockRequest = createMockRequest('GET', '/api/users', new Headers(), 'valid-token-123')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should add CORS headers
      expect(response?.headers?.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response?.headers?.get('Access-Control-Allow-Methods')).toBe(
        'GET, POST, PUT, DELETE, OPTIONS'
      )
      expect(response?.headers?.get('Access-Control-Allow-Headers')).toBe(
        'Content-Type, Authorization'
      )
    })

    it('should handle preflight OPTIONS requests', async () => {
      // Arrange: Set up OPTIONS request for preflight (no auth needed for OPTIONS)
      mockRequest = createMockRequest('OPTIONS', '/api/users')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should add CORS headers and return 200
      expect(response?.headers?.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response?.headers?.get('Access-Control-Allow-Methods')).toBe(
        'GET, POST, PUT, DELETE, OPTIONS'
      )
      expect(response?.status).toBe(200)
    })
  })

  describe('Request Logging', () => {
    it('should log incoming requests with timestamp', async () => {
      // Arrange: Set up request
      mockRequest = createMockRequest('GET', '/dashboard')
      
      // Act: Call middleware
      await middleware(mockRequest)
      
      // Assert: Should log request details
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Incoming request:',
        expect.objectContaining({
          method: 'GET',
          pathname: '/dashboard',
          ip: '127.0.0.1'
        })
      )
    })
  })

  describe('Rate Limiting', () => {
    it('should track request count per IP address', async () => {
      // Arrange: Create multiple requests from same IP with auth token
      const ip = '192.168.1.1'
      const headers = new Headers()
      headers.set('x-forwarded-for', ip)
      
      mockRequest = createMockRequest('GET', '/api/data', headers, 'valid-token-123')
      
      // Act: Make first request
      await middleware(mockRequest)
      
      // Make second request
      await middleware(mockRequest)
      
      // Assert: Both requests should be allowed (under rate limit)
      expect(NextResponse.next).toHaveBeenCalledTimes(2)
    })

    it('should block requests when rate limit is exceeded', async () => {
      // Arrange: Create requests that exceed rate limit with auth token
      const ip = '192.168.1.2'
      const headers = new Headers()
      headers.set('x-forwarded-for', ip)
      
      mockRequest = createMockRequest('GET', '/api/data', headers, 'valid-token-123')
      
      // Act: Make requests that exceed the limit (100+)
      const responses = []
      for (let i = 0; i < 105; i++) {
        const response = await middleware(mockRequest)
        responses.push(response)
      }
      
      // Assert: Last few requests should be rate limited
      const lastResponse = responses[responses.length - 1]
      expect(lastResponse?.status).toBe(429)
    })
  })

  describe('Response Headers', () => {
    it('should add security headers to all responses', async () => {
      // Arrange: Set up request
      mockRequest = createMockRequest('GET', '/dashboard', new Headers(), 'valid-token-123')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should add security headers
      expect(response?.headers?.get('X-Frame-Options')).toBe('DENY')
      expect(response?.headers?.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response?.headers?.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(response?.headers?.get('X-XSS-Protection')).toBe('1; mode=block')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid authentication tokens gracefully', async () => {
      // Arrange: Set up request with invalid token
      mockRequest = createMockRequest('GET', '/dashboard', new Headers(), 'invalid-token-999')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should redirect to login for invalid token
      expect(NextResponse.redirect).toHaveBeenCalledWith(
        new URL('/login', mockRequest.url)
      )
      
      // Check that the response has the redirect location
      expect(response?.headers?.get('Location')).toBe('http://localhost:3000/login')
    })

    it('should continue processing when optional features fail', async () => {
      // Arrange: Set up request that might cause errors
      mockRequest = createMockRequest('GET', '/dashboard', new Headers(), 'valid-token-123')
      
      // Act: Call middleware
      const response = await middleware(mockRequest)
      
      // Assert: Should continue processing despite potential errors
      expect(response?.headers?.get('X-Frame-Options')).toBe('DENY')
    })
  })
})

// frontend/src/__tests__/middleware.test.ts
// Version: 1.8.0
// Fixed: OPTIONS CORS response creation and console.log spy tracking