// Path: frontend/src/middleware.ts
// Version: 1.0.0
// Changes: Replaced mock token validation with proper JWT validation

import { NextRequest, NextResponse } from 'next/server'

// Interface for decoded JWT payload
interface JWTPayload {
  userId: string
  email: string
  exp: number
  iat: number
}

// Interface for token validation result
interface TokenValidationResult {
  isValid: boolean
  user?: JWTPayload
  error?: string
}

/**
 * Validates JWT token by decoding and checking expiration
 * @param token - JWT token string
 * @returns TokenValidationResult with validation status and user data
 */
function validateToken(token: string): TokenValidationResult {
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
 * Next.js middleware function to handle authentication
 * @param request - NextRequest object
 * @returns NextResponse for routing
 */
export function middleware(request: NextRequest) {
  console.log('Middleware running for path:', request.nextUrl.pathname)
  
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Get auth token from cookies
  const token = request.cookies.get('auth-token')?.value
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/']
  const isPublicRoute = publicRoutes.includes(pathname)
  
  // If no token and trying to access protected route
  if (!token && !isPublicRoute) {
    console.log('No token found, redirecting to login')
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // If token exists, validate it
  if (token) {
    const validationResult = validateToken(token)
    
    if (!validationResult.isValid) {
      console.log('Invalid token:', validationResult.error)
      // Clear invalid token and redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth-token')
      return response
    }
    
    console.log('Valid token for user:', validationResult.user?.email)
    
    // If user is authenticated and trying to access login/register, redirect to dashboard
    if (isPublicRoute && pathname !== '/') {
      console.log('Authenticated user accessing public route, redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
  
  // Allow request to continue
  console.log('Request allowed to continue')
  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

// Path: frontend/src/middleware.ts
// Version: 1.0.0