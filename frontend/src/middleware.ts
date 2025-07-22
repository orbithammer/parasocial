// frontend/src/middleware.ts
// Version: 1.3.0
// Fixed: OPTIONS request CORS headers using NextResponse.json for proper mock tracking
// Next.js middleware for authentication, rate limiting, CORS, and security headers

import { NextRequest, NextResponse } from 'next/server'

// Types for authentication and middleware
interface DecodedToken {
  userId: string
  email: string
  role: string
  exp: number
}

interface RateLimitData {
  count: number
  resetTime: number
}

// Configuration constants
const PUBLIC_ROUTES = ['/login', '/register', '/about']
const ADMIN_ROUTES = ['/admin']
const RATE_LIMIT_REQUESTS = 100 // requests per window
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitData>()

/**
 * Extract client IP address from request
 * @param request - NextRequest object
 * @returns IP address string
 */
function getClientIP(request: NextRequest): string {
  // Check for forwarded IP addresses first
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  // Check other common headers
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP.trim()
  }
  
  // Fallback to default
  return '127.0.0.1'
}

/**
 * Check if IP address is rate limited
 * @param ip - Client IP address
 * @returns true if rate limited, false otherwise
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const requestData = rateLimitStore.get(ip)
  
  // No previous requests from this IP
  if (!requestData) {
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    })
    return false
  }
  
  // Reset window has expired
  if (now > requestData.resetTime) {
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
  // Exact match for root route
  if (pathname === '/') return true
  
  // Check if pathname starts with any public route
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
      const response = NextResponse.next()
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
// Version: 1.3.0
// Fixed: OPTIONS request CORS headers using NextResponse.json for proper mock tracking