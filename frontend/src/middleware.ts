// frontend/src/middleware.ts
// Version: 2.8
// Fixed rate limiting: moved rate limiting check before API route handling

import { NextRequest, NextResponse } from 'next/server'

// Rate limiting store (in-memory for demo)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Mock token validation function for testing
function validateToken(token: string): { isValid: boolean; userEmail?: string; userRole?: string } {
  console.log('>>> VALIDATE TOKEN CALLED with:', token)
  
  // Mock validation logic for testing
  if (token.startsWith('invalid-token')) {
    console.log('>>> RETURNING INVALID TOKEN')
    return { isValid: false }
  }
  
  if (token.startsWith('admin-token')) {
    console.log('>>> RETURNING VALID ADMIN TOKEN')
    return { 
      isValid: true, 
      userEmail: 'admin@test.com',
      userRole: 'admin'
    }
  }
  
  if (token.startsWith('valid-token')) {
    console.log('>>> RETURNING VALID USER TOKEN')
    return { 
      isValid: true, 
      userEmail: 'user@test.com'
    }
  }
  
  console.log('>>> RETURNING INVALID TOKEN (default)')
  return { isValid: false }
}

export function middleware(request: NextRequest) {
  console.log('=== MIDDLEWARE DEBUG START ===')
  
  const pathname = request.nextUrl.pathname
  const method = request.method
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            '127.0.0.1'
  
  console.log('Middleware running for path:', pathname)
  console.log('Pathname:', pathname)
  console.log('Method:', method)
  console.log('Client IP:', ip)
  console.log('Incoming request:', { method, pathname, ip })

  // Rate limiting check (applies to all routes)
  const rateLimitKey = `${ip}:${pathname}`
  const now = Date.now()
  const windowMs = 60000 // 1 minute
  const maxRequests = 10

  const rateData = rateLimitStore.get(rateLimitKey)
  
  if (rateData) {
    if (now < rateData.resetTime) {
      if (rateData.count >= maxRequests) {
        return NextResponse.json(
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
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateData.resetTime.toString()
            }
          }
        )
      } else {
        rateData.count++
      }
    } else {
      // Reset window
      rateLimitStore.set(rateLimitKey, { count: 1, resetTime: now + windowMs })
    }
  } else {
    rateLimitStore.set(rateLimitKey, { count: 1, resetTime: now + windowMs })
  }

  // Handle API routes with CORS headers
  if (pathname.startsWith('/api/')) {
    console.log('>>> HANDLING: API route')
    
    // Handle preflight OPTIONS requests
    if (method === 'OPTIONS') {
      console.log('>>> HANDLING: OPTIONS preflight request')
      console.log('Handling preflight OPTIONS request')
      
      const response = NextResponse.json(null, { status: 200 })
      response.headers.set('Access-Control-Allow-Origin', '*')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      console.log('=== MIDDLEWARE DEBUG END ===')
      return response
    }
    
    // Add CORS headers to API responses
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    console.log('=== MIDDLEWARE DEBUG END ===')
    return response
  }

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/']
  
  // Get token from cookie or authorization header
  const cookieToken = request.cookies.get('auth-token')?.value
  const headerAuth = request.headers.get('authorization')
  const headerToken = headerAuth?.startsWith('Bearer ') ? 
    headerAuth.substring(7) : null
  
  const token = cookieToken || headerToken
  
  console.log('Cookie token found:', !!cookieToken)
  console.log('Header token found:', !!headerToken)
  console.log('Final token:', token ? token.substring(0, 15) + '...' : 'none')
  
  // Check if the current route is public
  const isPublicRoute = publicRoutes.includes(pathname)
  console.log('Is public route:', isPublicRoute)
  console.log('Public routes list:', publicRoutes)
  
  // Allow access to public routes without authentication
  if (isPublicRoute) {
    console.log('>>> ALLOWING: Request to continue')
    console.log('Request allowed to continue')
    
    const response = NextResponse.next()
    addSecurityHeaders(response)
    console.log('=== MIDDLEWARE DEBUG END ===')
    return response
  }
  
  // Check if user has a token
  if (!token) {
    console.log('>>> REDIRECTING: No token on protected route')
    console.log('No token found, redirecting to login')
    
    const loginUrl = new URL('/login', request.url)
    console.log('=== MIDDLEWARE DEBUG END ===')
    return NextResponse.redirect(loginUrl)
  }
  
  console.log('>>> TOKEN EXISTS: Starting validation')
  
  // Validate the token
  const validationResult = validateToken(token)
  
  console.log('Token validation result:', validationResult)
  
  if (!validationResult.isValid) {
    console.log('>>> INVALID TOKEN')
    console.log('Invalid token, redirecting to login')
    
    const loginUrl = new URL('/login', request.url)
    console.log('=== MIDDLEWARE DEBUG END ===')
    return NextResponse.redirect(loginUrl)
  }
  
  console.log('>>> VALID TOKEN')
  console.log('Valid token for user:', validationResult.userEmail)
  
  // Check admin routes
  if (pathname.startsWith('/admin/')) {
    console.log('>>> CHECKING: Admin route access')
    console.log('User role:', validationResult.userRole)
    
    if (validationResult.userRole !== 'admin') {
      console.log('>>> FORBIDDEN: Non-admin accessing admin route')
      console.log('>>> RETURNING JSON 403 RESPONSE')
      
      const response = NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
      console.log('=== MIDDLEWARE DEBUG END ===')
      return response
    }
    
    console.log('>>> ADMIN ACCESS GRANTED')
  }
  
  console.log('>>> ALLOWING: Request to continue')
  console.log('Request allowed to continue')
  
  const response = NextResponse.next()
  addSecurityHeaders(response)
  console.log('=== MIDDLEWARE DEBUG END ===')
  return response
}

function addSecurityHeaders(response: NextResponse) {
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Content-Security-Policy', "frame-ancestors 'none'")
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
}

export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

// frontend/src/middleware.ts
// Version: 2.8
// Fixed rate limiting: moved rate limiting check before API route handling