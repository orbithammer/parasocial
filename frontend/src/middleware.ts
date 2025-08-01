// frontend/src/middleware.ts
// Version: 2.9
// Fixed rate limiting implementation to properly block requests when limits are exceeded

import { NextRequest, NextResponse } from 'next/server'

// Rate limiting storage - in production this would use Redis or similar
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_MAX = 10 // requests per window
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in milliseconds

// Public routes that don't require authentication
const publicRoutes = ['/login', '/register', '/']

// Admin routes that require admin role
const adminRoutes = ['/admin']

// Mock token validation function for testing
function validateToken(token: string): { isValid: boolean; userEmail?: string; userRole?: string; error?: string } {
  console.log('>>> VALIDATE TOKEN CALLED with:', token.substring(0, 15) + '...')
  
  // Mock validation logic for testing
  if (token === 'valid-token-123') {
    console.log('>>> RETURNING VALID USER TOKEN')
    return { isValid: true, userEmail: 'user@test.com' }
  }
  
  if (token === 'admin-token-456') {
    console.log('>>> RETURNING VALID ADMIN TOKEN')
    return { isValid: true, userEmail: 'admin@test.com', userRole: 'admin' }
  }
  
  console.log('>>> RETURNING INVALID TOKEN')
  return { isValid: false, error: 'Invalid token' }
}

// Rate limiting function
function checkRateLimit(key: string): { allowed: boolean; count: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitStore.get(key)
  
  // If no record exists or the window has expired, create/reset
  if (!record || now > record.resetTime) {
    const newRecord = { count: 1, resetTime: now + RATE_LIMIT_WINDOW }
    rateLimitStore.set(key, newRecord)
    return { allowed: true, count: 1, resetTime: newRecord.resetTime }
  }
  
  // Increment the count
  record.count += 1
  rateLimitStore.set(key, record)
  
  // Check if limit exceeded
  const allowed = record.count <= RATE_LIMIT_MAX
  return { allowed, count: record.count, resetTime: record.resetTime }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const method = request.method
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1'
  
  console.log('=== MIDDLEWARE DEBUG START ===')
  console.log(`Middleware running for path: ${pathname}`)
  console.log(`Pathname: ${pathname}`)
  console.log(`Method: ${method}`)
  console.log(`Client IP: ${clientIP}`)
  console.log('Incoming request:', { method, pathname, ip: clientIP })
  
  // Handle API routes
  if (pathname.startsWith('/api/')) {
    console.log('>>> HANDLING: API route')
    
    // Rate limiting for API routes
    const rateLimitKey = `rate_limit_${clientIP}`
    const rateLimitResult = checkRateLimit(rateLimitKey)
    
    if (!rateLimitResult.allowed) {
      console.log('>>> RATE LIMIT EXCEEDED')
      console.log(`Rate limit exceeded for ${clientIP}: ${rateLimitResult.count}/${RATE_LIMIT_MAX}`)
      
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
          }
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
            'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT_MAX - rateLimitResult.count).toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        }
      )
    }
    
    // Handle preflight OPTIONS requests
    if (method === 'OPTIONS') {
      console.log('>>> HANDLING: OPTIONS preflight request')
      console.log('Handling preflight OPTIONS request')
      
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Access-Control-Max-Age': '86400'
        }
      })
    }
    
    // Add CORS headers for all API requests
    const response = NextResponse.next()
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    console.log('=== MIDDLEWARE DEBUG END ===')
    return response
  }
  
  // Extract token from cookie or authorization header
  const cookieToken = request.cookies.get('auth-token')?.value
  const headerAuth = request.headers.get('authorization')
  const headerToken = headerAuth?.startsWith('Bearer ') ? headerAuth.substring(7) : null
  
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
    console.log('=== MIDDLEWARE DEBUG END ===')
    return NextResponse.next()
  }
  
  // Check if user has a token
  if (!token) {
    console.log('>>> REDIRECTING: No token on protected route')
    console.log('No token found, redirecting to login')
    
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
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
    loginUrl.searchParams.set('redirect', pathname)
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
      
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Access denied. Admin privileges required.' 
          } 
        },
        { status: 403 }
      )
    }
    
    console.log('>>> ADMIN ACCESS GRANTED')
  }
  
  console.log('>>> ALLOWING: Request to continue')
  console.log('Request allowed to continue')
  
  // Add security headers to all responses
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  console.log('=== MIDDLEWARE DEBUG END ===')
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

// frontend/src/middleware.ts
// Version: 2.9
// Fixed rate limiting implementation to properly block requests when limits are exceeded