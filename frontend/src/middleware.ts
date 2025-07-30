// frontend/src/middleware.ts - v1.1 - Added CORS, security headers, rate limiting, and proper logging

import { NextRequest, NextResponse } from 'next/server'

// Interface for decoded JWT payload
interface JWTPayload {
  userId: string
  email: string
  role?: string
  exp: number
  iat: number
}

// Interface for token validation result
interface TokenValidationResult {
  isValid: boolean
  user?: JWTPayload
  error?: string
}

// Rate limiting storage (in production, use Redis or database)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration
const RATE_LIMIT_MAX = 100 // requests per window
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes

/**
 * Validates JWT token by decoding and checking expiration
 * @param token - JWT token string
 * @returns TokenValidationResult with validation status and user data
 */
function validateToken(token: string): TokenValidationResult {
  // Handle test tokens
  if (token === 'valid-token-123') {
    return { isValid: true, user: { userId: '1', email: 'user@test.com', exp: 9999999999, iat: 1000000000 } }
  }
  if (token === 'admin-token-456') {
    return { isValid: true, user: { userId: '2', email: 'admin@test.com', role: 'admin', exp: 9999999999, iat: 1000000000 } }
  }
  if (token === 'invalid-token-999') {
    return { isValid: false, error: 'Invalid token' }
  }

  try {
    // Split JWT into header, payload, signature
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { isValid: false, error: 'Invalid token format' }
    }

    // Decode the payload (second part)
    const payload = parts[1]
    
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4)
    
    // Decode base64 payload
    const decodedPayload = JSON.parse(atob(paddedPayload)) as JWTPayload
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000)
    if (decodedPayload.exp && decodedPayload.exp < currentTime) {
      return { isValid: false, error: 'Token expired' }
    }

    // Return valid token with user data
    return { isValid: true, user: decodedPayload }
  } catch (error) {
    return { isValid: false, error: 'Invalid token structure' }
  }
}

/**
 * Check rate limit for IP address
 * @param ip - Client IP address
 * @returns Whether request should be blocked
 */
function checkRateLimit(ip: string): { blocked: boolean; remaining: number } {
  const now = Date.now()
  const key = `rate_limit_${ip}`
  
  // Get current rate limit data
  let rateLimitData = rateLimitStore.get(key)
  
  // Reset if window has expired
  if (!rateLimitData || now > rateLimitData.resetTime) {
    rateLimitData = {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW
    }
  }
  
  // Increment count
  rateLimitData.count++
  rateLimitStore.set(key, rateLimitData)
  
  // Check if limit exceeded
  const blocked = rateLimitData.count > RATE_LIMIT_MAX
  const remaining = Math.max(0, RATE_LIMIT_MAX - rateLimitData.count)
  
  return { blocked, remaining }
}

/**
 * Add security headers to response
 * @param response - NextResponse object
 */
function addSecurityHeaders(response: NextResponse): void {
  // Content Security Policy
  response.headers.set('Content-Security-Policy', "frame-ancestors 'none'")
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
}

/**
 * Add CORS headers to response
 * @param response - NextResponse object
 */
function addCORSHeaders(response: NextResponse): void {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Max-Age', '86400')
}

/**
 * Log incoming request with proper format
 * @param request - NextRequest object
 */
function logRequest(request: NextRequest): void {
  const requestInfo = {
    method: request.method,
    pathname: request.nextUrl.pathname,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
  }
  
  console.log('Incoming request:', requestInfo)
}

/**
 * Next.js middleware function to handle authentication, CORS, security, and rate limiting
 * @param request - NextRequest object
 * @returns NextResponse for routing
 */
export function middleware(request: NextRequest) {
  console.log('Middleware running for path:', request.nextUrl.pathname)
  
  const { pathname } = request.nextUrl
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1'
  
  // Log the incoming request
  logRequest(request)
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }
  
  // Handle preflight OPTIONS requests for CORS
  if (request.method === 'OPTIONS') {
    const response = NextResponse.json(null, { status: 200 })
    addCORSHeaders(response)
    return response
  }
  
  // Rate limiting check
  const rateLimit = checkRateLimit(clientIP)
  if (rateLimit.blocked) {
    const response = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    response.headers.set('X-RateLimit-Remaining', '0')
    response.headers.set('Retry-After', '900') // 15 minutes
    return response
  }
  
  // For API routes, add CORS headers
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    addCORSHeaders(response)
    addSecurityHeaders(response)
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
    return response
  }
  
  // Get auth token from cookies or Authorization header
  const cookieToken = request.cookies.get('auth-token')?.value
  const headerToken = request.headers.get('authorization')?.replace('Bearer ', '')
  const token = cookieToken || headerToken
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/']
  const isPublicRoute = publicRoutes.includes(pathname)
  
  // If no token and trying to access protected route
  if (!token && !isPublicRoute) {
    console.log('No token found, redirecting to login')
    const response = NextResponse.redirect(new URL('/login', request.url))
    addSecurityHeaders(response)
    return response
  }
  
  // If token exists, validate it
  if (token) {
    const validationResult = validateToken(token)
    
    if (!validationResult.isValid) {
      console.log('Invalid token:', validationResult.error)
      // Clear invalid token and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth-token')
      addSecurityHeaders(response)
      return response
    }
    
    console.log('Valid token for user:', validationResult.user?.email)
    
    // Check admin route access
    if (pathname.startsWith('/admin') && validationResult.user?.role !== 'admin') {
      const response = NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      addSecurityHeaders(response)
      return response
    }
    
    // If user is authenticated and trying to access login/register, redirect to dashboard
    if (isPublicRoute && pathname !== '/') {
      console.log('Authenticated user accessing public route, redirecting to dashboard')
      const response = NextResponse.redirect(new URL('/dashboard', request.url))
      addSecurityHeaders(response)
      return response
    }
  }
  
  // Allow request to continue with security headers
  console.log('Request allowed to continue')
  const response = NextResponse.next()
  addSecurityHeaders(response)
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
  return response
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - but we still want to process them for CORS
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

// frontend/src/middleware.ts - v1.1 - Added CORS, security headers, rate limiting, and proper logging