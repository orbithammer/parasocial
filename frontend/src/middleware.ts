// frontend/src/middleware.ts
// Version: 2.12.0
// Fixed: JWT validation logic to properly decode base64 tokens from tests
// Changed: Updated base64urlDecode to handle both base64 and base64url formats

import { NextRequest, NextResponse } from 'next/server'

interface TokenValidationResult {
  isValid: boolean
  userEmail?: string
  userRole?: string
}

/**
 * Base64url decode function compatible with Edge Runtime
 * Handles both regular base64 and base64url encoded strings
 */
function base64urlDecode(str: string): string {
  try {
    // Handle base64url format (with - and _ characters)
    if (str.includes('-') || str.includes('_')) {
      // Add padding if necessary
      str += '='.repeat((4 - str.length % 4) % 4)
      // Replace URL-safe characters
      str = str.replace(/-/g, '+').replace(/_/g, '/')
    } else {
      // Handle regular base64 format (add padding if missing)
      str += '='.repeat((4 - str.length % 4) % 4)
    }
    
    // Decode base64
    return atob(str)
  } catch (error) {
    console.log('>>> BASE64 DECODE ERROR:', error)
    throw new Error('Invalid base64 encoding')
  }
}

/**
 * JWT decoder compatible with Edge Runtime
 * Validates JWT token format and extracts payload
 */
function validateToken(token: string): TokenValidationResult {
  try {
    console.log('>>> VALIDATE TOKEN CALLED with JWT:', token.substring(0, 20) + '...')
    
    // Split JWT token into parts
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.log('>>> INVALID JWT FORMAT: Expected 3 parts, got', parts.length)
      return { isValid: false }
    }
    
    // Decode payload using browser-compatible method
    const payloadStr = base64urlDecode(parts[1])
    const payload = JSON.parse(payloadStr)
    
    console.log('>>> JWT PAYLOAD DECODED:', payload)
    
    // Check expiration if present
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      console.log('>>> TOKEN EXPIRED')
      return { isValid: false }
    }
    
    console.log('>>> TOKEN VALIDATED SUCCESSFULLY')
    return {
      isValid: true,
      userEmail: payload.email,
      userRole: payload.role || 'user'
    }
  } catch (error) {
    console.log('>>> JWT DECODE FAILED:', error)
    return { isValid: false }
  }
}

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/favicon.ico',
  '/_next',
  '/static'
]

/**
 * Next.js middleware function for authentication and route protection
 * Handles JWT token validation, route protection, and CORS headers
 */
export function middleware(request: NextRequest) {
  console.log('=== MIDDLEWARE DEBUG START ===')
  
  const pathname = request.nextUrl.pathname
  console.log('Processing path:', pathname)
  
  // Skip static files and API routes for authentication
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/api/') ||
      pathname.endsWith('.ico')) {
    console.log('>>> SKIPPING: Static/API route')
    
    // Still add CORS headers for API routes
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.next()
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      return response
    }
    
    return NextResponse.next()
  }

  // Extract authentication token from cookies or headers
  const cookieToken = request.cookies.get('auth-token')?.value
  const headerAuth = request.headers.get('authorization')
  const headerToken = headerAuth?.startsWith('Bearer ') ? 
                     headerAuth.substring(7) : null
  
  const token = cookieToken || headerToken
  
  console.log('Cookie token found:', !!cookieToken)
  console.log('Header token found:', !!headerToken)
  console.log('Using token:', token ? 'YES' : 'NO')
  
  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  console.log('Is public route:', isPublicRoute)
  
  // Allow access to public routes without authentication
  if (isPublicRoute) {
    console.log('>>> ALLOWING: Public route')
    console.log('=== MIDDLEWARE DEBUG END ===')
    return NextResponse.next()
  }
  
  // Redirect to login if no token on protected route
  if (!token) {
    console.log('>>> REDIRECTING: No token on protected route')
    console.log('=== MIDDLEWARE DEBUG END ===')
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Validate the token
  const validation = validateToken(token)
  
  if (!validation.isValid) {
    console.log('>>> REDIRECTING: Invalid token')
    console.log('=== MIDDLEWARE DEBUG END ===')
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Check admin route access
  if (pathname.startsWith('/admin') && validation.userRole !== 'admin') {
    console.log('>>> BLOCKING: Non-admin user accessing admin route')
    console.log('=== MIDDLEWARE DEBUG END ===')
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }
  
  console.log('>>> ALLOWING: Valid token and authorized access')
  console.log('=== MIDDLEWARE DEBUG END ===')
  
  // Create response with security headers
  const response = NextResponse.next()
  
  // Add security headers to all responses
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

// frontend/src/middleware.ts
// Version: 2.12.0
// Fixed: JWT validation logic to properly decode base64 tokens from tests
// Changed: Updated base64urlDecode to handle both base64 and base64url formats