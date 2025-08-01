// src/__tests__/middleware.test.ts
// Version: 1.1.0
// Updated: Fixed rate limit test expectations to match middleware structure

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '../middleware'

// Mock the auth utilities
vi.mock('../lib/auth', () => ({
  validateToken: vi.fn()
}))

import { validateToken } from '../lib/auth'

describe('Middleware', () => {
  let mockNext: ReturnType<typeof vi.fn>
  let mockRedirect: ReturnType<typeof vi.fn>
  let mockJson: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset rate limiting state
    vi.doUnmock('../middleware')
    
    mockNext = vi.fn()
    mockRedirect = vi.fn()
    mockJson = vi.fn()

    // Mock NextResponse methods
    vi.spyOn(NextResponse, 'next').mockImplementation(() => {
      mockNext()
      return new NextResponse()
    })
    
    vi.spyOn(NextResponse, 'redirect').mockImplementation((url) => {
      mockRedirect(url)
      return new NextResponse()
    })
    
    vi.spyOn(NextResponse, 'json').mockImplementation((data, options) => {
      mockJson(data, options)
      return new NextResponse()
    })
  })

  describe('Authentication', () => {
    it('should allow access to public routes without authentication', async () => {
      const request = new NextRequest('http://localhost:3000/')
      
      await middleware(request)
      
      expect(mockNext).toHaveBeenCalled()
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should redirect unauthenticated users to login page', async () => {
      const request = new NextRequest('http://localhost:3000/dashboard')
      
      await middleware(request)
      
      expect(mockRedirect).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should allow access to protected routes with valid authentication', async () => {
      vi.mocked(validateToken).mockResolvedValue({
        isValid: true,
        userEmail: 'user@test.com'
      })

      const request = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          'Authorization': 'Bearer valid-token-123',
          'Cookie': 'auth-token=valid-token-123'
        }
      })
      
      await middleware(request)
      
      expect(mockNext).toHaveBeenCalled()
      expect(mockRedirect).not.toHaveBeenCalled()
    })
  })

  describe('Route Protection', () => {
    it('should protect admin routes from non-admin users', async () => {
      vi.mocked(validateToken).mockResolvedValue({
        isValid: true,
        userEmail: 'user@test.com'
      })

      const request = new NextRequest('http://localhost:3000/admin/users', {
        headers: {
          'Authorization': 'Bearer valid-token-123',
          'Cookie': 'auth-token=valid-token-123'
        }
      })
      
      await middleware(request)
      
      expect(mockJson).toHaveBeenCalledWith(
        { error: 'Forbidden' },
        { status: 403 }
      )
    })

    it('should allow admin users to access admin routes', async () => {
      vi.mocked(validateToken).mockResolvedValue({
        isValid: true,
        userEmail: 'admin@test.com',
        userRole: 'admin'
      })

      const request = new NextRequest('http://localhost:3000/admin/users', {
        headers: {
          'Authorization': 'Bearer admin-token-456',
          'Cookie': 'auth-token=admin-token-456'
        }
      })
      
      await middleware(request)
      
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('API Route Handling', () => {
    it('should add CORS headers to API routes', async () => {
      const request = new NextRequest('http://localhost:3000/api/users')
      
      const response = await middleware(request)
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS')
    })

    it('should handle preflight OPTIONS requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/users', {
        method: 'OPTIONS'
      })
      
      const response = await middleware(request)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })
  })

  describe('Request Logging', () => {
    it('should log incoming requests with timestamp', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const request = new NextRequest('http://localhost:3000/dashboard')
      
      await middleware(request)
      
      // Check that debug logging occurred (middleware uses multiple debug logs)
      expect(consoleSpy).toHaveBeenCalledWith('=== MIDDLEWARE DEBUG START ===')
      expect(consoleSpy).toHaveBeenCalledWith('Middleware running for path:', '/dashboard')
      expect(consoleSpy).toHaveBeenCalledWith('Method:', 'GET')
      expect(consoleSpy).toHaveBeenCalledWith('Client IP:', '127.0.0.1')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Rate Limiting', () => {
    it('should track request count per IP address', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts')
      
      await middleware(request)
      
      expect(mockNext).toHaveBeenCalled()
    })

    it('should block requests when rate limit is exceeded', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts')
      
      // Make requests up to the limit (10 requests)
      for (let i = 0; i < 10; i++) {
        await middleware(request)
      }
      
      // The 11th request should be rate limited
      await middleware(request)
      
      // Expect the structured error response that the middleware actually returns
      expect(mockJson).toHaveBeenCalledWith(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter: 60
          },
          success: false
        },
        {
          status: 429,
          headers: expect.objectContaining({
            'Retry-After': '60',
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': expect.any(String)
          })
        }
      )
    })
  })

  describe('Response Headers', () => {
    it('should add security headers to all responses', async () => {
      vi.mocked(validateToken).mockResolvedValue({
        isValid: true,
        userEmail: 'user@test.com'
      })

      const request = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          'Authorization': 'Bearer valid-token-123',
          'Cookie': 'auth-token=valid-token-123'
        }
      })
      
      const response = await middleware(request)
      
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid authentication tokens gracefully', async () => {
      console.log('=== DEBUG: Starting invalid token test ===')
      
      vi.mocked(validateToken).mockResolvedValue({
        isValid: false
      })

      console.log('=== DEBUG: Mock request created ===')
      const request = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          'Authorization': 'Bearer invalid-token-999',
          'Cookie': 'auth-token=invalid-token-999'
        }
      })

      console.log('Request URL:', request.url)
      console.log('Request pathname:', new URL(request.url).pathname)
      console.log('Request headers authorization:', request.headers.get('authorization'))
      console.log('Request cookie auth-token:', request.cookies.get('auth-token'))
      
      await middleware(request)
      
      console.log('=== DEBUG: Middleware completed ===')
      console.log('mockRedirect called?', mockRedirect.mock.calls.length > 0)
      console.log('mockRedirect calls:', mockRedirect.mock.calls)
      console.log('mockNext called?', mockNext.mock.calls.length > 0)
      console.log('mockJson called?', mockJson.mock.calls.length > 0)
      
      expect(mockRedirect).toHaveBeenCalled()
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should continue processing when optional features fail', async () => {
      vi.mocked(validateToken).mockResolvedValue({
        isValid: true,
        userEmail: 'user@test.com'
      })

      const request = new NextRequest('http://localhost:3000/dashboard', {
        headers: {
          'Authorization': 'Bearer valid-token-123',
          'Cookie': 'auth-token=valid-token-123'
        }
      })
      
      await middleware(request)
      
      expect(mockNext).toHaveBeenCalled()
    })
  })
})

// src/__tests__/middleware.test.ts
// Version: 1.1.0
// Updated: Fixed rate limit test expectations to match middleware structure