// frontend/src/middleware.ts
// Version: 1.0.0
// Next.js middleware for authentication, rate limiting, CORS, and security headers

import { NextRequest, NextResponse } from 'next/server'

// Define types for better type safety
interface RequestCount {
  count: number
  resetTime: number
}

interface DecodedToken {
  userId: string
  email: string
  role: 'user' | 'admin'
  exp: number
}

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, RequestCount>()

// Configuration constants
const RATE_LIMIT_REQUESTS = 100
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret'

// Define public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/']

// Define admin routes that require admin privileges
const ADMIN_ROUTES = ['/admin']

/**
 * Extract IP address from request headers
 * @param request - NextRequest object
 * @returns IP address as string
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return realIP || cfIP || '127.0.0.1'
}

/**
 * Check if request should be rate limited
 * @param ip - Client IP address
 * @returns true if request should be blocked, false otherwise
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const requestData = rateLimitStore.get(ip)
  
  // If no previous requests or window has expired, reset counter
  if (!requestData || now > requestData.resetTime) {
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    })
    return false
  }
  
  // Increment counter
  requestData.count++
  rateLimitStore.set(ip, requestData)
  
  // Check if limit exceeded
  return requestData.count > RATE_LIMIT_REQUESTS
}

/**
 * Validate and decode JWT token
 * @param token - JWT token string
 * @returns Decoded token or null if invalid
 */
function validateToken(token: string): DecodedToken | null {
  try {
    // Simple token validation (in production, use proper JWT library)
    if (token === 'valid-token-123') {
      return {
        userId: '123',
        email: 'user@example.com',
        role: 'user',
        exp: Date.now() + 3600000 // 1 hour from now
      }
    }
    
    if (token === 'admin-token-456') {
      return {
        userId: '456',
        email: 'admin@example.com',
        role: 'admin',
        exp: Date.now() + 3600000 // 1 hour from now
      }
    }
    
    // Invalid or malformed token
    return null
  } catch (error) {
    console.error('Token validation error:', error)
    return null
  }
}

/**
 * Check if route is public (doesn't require authentication)
 * @param pathname - Request pathname
 * @returns true if public route, false otherwise
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if route requires admin privileges
 * @param pathname - Request pathname
 * @returns true if admin route, false otherwise
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Add CORS headers to response
 * @param response - NextResponse object
 * @returns NextResponse with CORS headers
 */
function addCORSHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  return response
}

/**
 * Add security headers to response
 * @param response - NextResponse object
 * @returns NextResponse with security headers
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  return response
}

/**
 * Log incoming request details
 * @param request - NextRequest object
 */
function logRequest(request: NextRequest): void {
  const timestamp = new Date().toISOString()
  const ip = getClientIP(request)
  
  console.log('Incoming request:', {
    method: request.method,
    url: request.url,
    pathname: request.nextUrl.pathname,
    ip,
    userAgent: request.headers.get('user-agent'),
    timestamp
  })
}

/**
 * Main middleware function
 * @param request - NextRequest object
 * @returns NextResponse or redirect
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  try {
    // Log all incoming requests
    logRequest(request)
    
    const { pathname } = request.nextUrl
    const ip = getClientIP(request)
    
    // Handle preflight OPTIONS requests for CORS
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      return addCORSHeaders(response)
    }
    
    // Rate limiting check
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }
    
    // Skip authentication for public routes
    if (isPublicRoute(pathname)) {
      const response = NextResponse.next()
      return addSecurityHeaders(response)
    }
    
    // Check authentication for protected routes
    const authCookie = request.cookies.get('auth-token')
    
    if (!authCookie) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Validate authentication token
    const decodedToken = validateToken(authCookie.value)
    
    if (!decodedToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Check admin access for admin routes
    if (isAdminRoute(pathname) && decodedToken.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
    
    // Create response and add headers
    let response = NextResponse.next()
    
    // Add CORS headers for API routes
    if (pathname.startsWith('/api/')) {
      response = addCORSHeaders(response)
    }
    
    // Add security headers to all responses
    response = addSecurityHeaders(response)
    
    return response
    
  } catch (error) {
    // Log error but don't throw to avoid breaking the request
    console.error('Middleware error:', error)
    
    // Return a basic response with security headers
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }
}

/**
 * Matcher configuration for middleware
 * Define which routes should trigger the middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}

// frontend/src/middleware.ts
// Version: 1.0.0
// Next.js middleware for authentication, rate limiting, CORS, and security headers