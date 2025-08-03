// frontend/src/middleware.ts
// Version: 2.11.0
// Fixed: Browser-compatible base64url decoding
// Changed: Proper JWT decoding that works in Edge Runtime

import { NextRequest, NextResponse } from 'next/server'

interface TokenValidationResult {
  isValid: boolean
  userEmail?: string
  userRole?: string
}

/**
 * Base64url decode function compatible with Edge Runtime
 */
function base64urlDecode(str: string): string {
  // Add padding if necessary
  str += '='.repeat((4 - str.length % 4) % 4)
  // Replace URL-safe characters
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  // Decode base64
  return atob(str)
}

/**
 * JWT decoder compatible with Edge Runtime
 */
function validateToken(token: string): TokenValidationResult {
  try {
    console.log('>>> VALIDATE TOKEN CALLED with JWT:', token.substring(0, 20) + '...')
    
    // Split JWT token
    const parts = token.split('.')
    if (parts.length !== 3) {
      console.log('>>> INVALID JWT FORMAT')
      return { isValid: false }
    }
    
    // Decode payload using browser-compatible method
    const payloadStr = base64urlDecode(parts[1])
    const payload = JSON.parse(payloadStr)
    
    console.log('>>> JWT PAYLOAD:', payload)
    
    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      console.log('>>> TOKEN EXPIRED')
      return { isValid: false }
    }
    
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

export function middleware(request: NextRequest) {
  console.log('=== MIDDLEWARE DEBUG START ===')
  
  const pathname = request.nextUrl.pathname
  console.log('Processing path:', pathname)
  
  // Skip static files and API routes
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/api/') ||
      pathname.endsWith('.ico')) {
    console.log('>>> SKIPPING: Static/API route')
    return NextResponse.next()
  }

  // Extract token
  const cookieToken = request.cookies.get('auth-token')?.value
  const headerAuth = request.headers.get('authorization')
  const headerToken = headerAuth?.startsWith('Bearer ') ? 
                     headerAuth.substring(7) : null
  
  const token = cookieToken || headerToken
  
  console.log('Cookie token found:', !!cookieToken)
  console.log('Header token found:', !!headerToken)
  console.log('Using token:', token ? 'YES' : 'NO')
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
  
  console.log('Is public route:', isPublicRoute)
  
  if (isPublicRoute) {
    console.log('>>> ALLOWING: Public route')
    console.log('=== MIDDLEWARE DEBUG END ===')
    return NextResponse.next()
  }
  
  // Protected route - check token
  if (!token) {
    console.log('>>> REDIRECTING: No token on protected route')
    console.log('=== MIDDLEWARE DEBUG END ===')
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Validate token
  const validation = validateToken(token)
  
  console.log('Validation result:', validation)
  
  if (!validation.isValid) {
    console.log('>>> REDIRECTING: Invalid token')
    console.log('=== MIDDLEWARE DEBUG END ===')
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  console.log('>>> ALLOWING: Valid token for', validation.userEmail)
  console.log('=== MIDDLEWARE DEBUG END ===')
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

// frontend/src/middleware.ts
// Version: 2.11.0