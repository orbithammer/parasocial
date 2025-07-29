// frontend/src/middleware.ts
// Version: 1.5.0  
// Fixed: Added debug logging to track authentication flow

import { NextRequest, NextResponse } from 'next/server'

// Types for decoded JWT token
interface DecodedToken {
  userId: string
  email: string
  role: string
  exp: number
}

// Rate limiting configuration
const RATE_LIMIT_REQUESTS = 100
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Route configuration
const PUBLIC_ROUTES = ['/login', '/register', '/api/auth', '/forgot-password']
const ADMIN_ROUTES = ['/admin']

/**
 * Main middleware function for Next.js
 * Handles authentication, rate limiting, and security headers
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  console.log('🚀 Middleware called for:', pathname)
  
  try {
    
    // Skip middleware for static files and API routes (except auth)
    if (pathname.startsWith('/_next/') || 
        pathname.startsWith('/favicon.ico') ||
        pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')) {
      return NextResponse.next()
    }
    
    // Apply rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (isRateLimited(clientIP)) {
      return NextResponse.json(
        { error: 'Too many requests' },
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
    console.log('🔍 Middleware - Auth cookie:', authCookie?.value?.substring(0, 20) + '...')
    
    if (!authCookie) {
      console.log('❌ No auth cookie found, redirecting to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Validate authentication token
    const decodedToken = validateToken(authCookie.value)
    console.log('🔍 Decoded token:', decodedToken)
    
    if (!decodedToken) {
      console.log('❌ Token validation failed, redirecting to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    console.log('✅ Authentication successful, allowing access to:', pathname)
    
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
    console.error('Middleware error:', error)
    
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }
}

/**
 * Check if client IP is rate limited
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const requestData = rateLimitStore.get(ip)
  
  // Clean up expired entries
  if (requestData && now > requestData.resetTime) {
    rateLimitStore.delete(ip)
  }
  
  // First request from this IP
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
    // Simple JWT validation - in production use proper JWT library like 'jsonwebtoken'
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }
    
    // Decode payload (second part)
    const payload = JSON.parse(atob(parts[1]))
    
    // Check if token is expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null
    }
    
    // Return decoded token with expected structure
    return {
      userId: payload.userId || payload.id || payload.sub,
      email: payload.email,
      role: payload.role || 'user',
      exp: payload.exp
    }
  } catch (error) {
    console.error('Token validation error:', error)
    return null
  }
}

/**
 * Check if route is public (doesn't require authentication)
 */
function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Check if route requires admin privileges
 */
function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(route => pathname.startsWith(route))
}

/**
 * Add CORS headers to response
 */
function addCORSHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  return response
}

/**
 * Matcher configuration for middleware
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}

// frontend/src/middleware.ts
// Version: 1.5.0  
// Fixed: Added debug logging to track authentication flow