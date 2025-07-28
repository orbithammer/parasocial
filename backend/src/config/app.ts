// backend/src/config/app.ts
// Version: 1.4.0 - Fixed spread syntax error in parseArrayEnv function
// Changed: Ensured all array operations return proper arrays with Symbol.iterator

/**
 * Application configuration interface
 * Defines the structure for all app-level configuration settings
 */
export interface AppConfig {
  // Server configuration
  readonly port: number
  readonly host: string
  readonly nodeEnv: 'development' | 'production' | 'test'
  
  // Frontend configuration
  readonly frontendUrl: string
  readonly allowedOrigins: string[]
  
  // Security configuration
  readonly jwtSecret: string
  readonly jwtExpiresIn: string
  readonly bcryptRounds: number
  
  // File upload configuration
  readonly maxFileSize: number
  readonly allowedImageTypes: string[]
  readonly uploadsPath: string
  
  // Rate limiting configuration
  readonly rateLimitWindowMs: number
  readonly rateLimitMaxRequests: number
  readonly rateLimitMaxUploads: number
  
  // Database configuration
  readonly databaseUrl: string
  
  // CORS configuration
  readonly corsOptions: {
    readonly origin: string | string[]
    readonly credentials: boolean
    readonly methods: string[]
    readonly allowedHeaders: string[]
  }
  
  // Pagination defaults
  readonly defaultPageSize: number
  readonly maxPageSize: number
  
  // ActivityPub configuration (for future federation)
  readonly activityPubEnabled: boolean
  readonly instanceDomain: string
  readonly instanceName: string
}

/**
 * Validates required environment variables
 * Throws error if critical environment variables are missing
 */
function validateEnvironmentVariables(): void {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET'
  ]
  
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    )
  }
}

/**
 * Parses environment variable as integer with fallback
 */
function parseIntEnv(envVar: string | undefined, fallback: number): number {
  if (!envVar) return fallback
  
  const parsed = parseInt(envVar, 10)
  return isNaN(parsed) ? fallback : parsed
}

/**
 * Parses environment variable as boolean with fallback
 */
function parseBoolEnv(envVar: string | undefined, fallback: boolean): boolean {
  if (!envVar) return fallback
  
  return envVar.toLowerCase() === 'true'
}

/**
 * Parses comma-separated environment variable into array
 * Always returns a proper array with Symbol.iterator, never undefined or non-iterable
 * Fixed: Ensures all code paths return proper arrays to prevent spread syntax errors
 */
function parseArrayEnv(envVar: string | undefined, fallback: string[]): string[] {
  // Ensure fallback is always a proper array
  const safeFallback = Array.isArray(fallback) ? [...fallback] : []
  
  if (!envVar || envVar.trim() === '') {
    return safeFallback // Return the safe fallback copy
  }
  
  try {
    const result = envVar
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0)
    
    // Always return a proper array, even if empty
    return result.length > 0 ? result : safeFallback
  } catch (error) {
    console.warn('Error parsing array environment variable:', error)
    return safeFallback // Return safe fallback copy
  }
}

/**
 * Gets the node environment with proper typing
 */
function getNodeEnv(): 'development' | 'production' | 'test' {
  const env = process.env['NODE_ENV']?.toLowerCase()
  
  if (env === 'production' || env === 'test' || env === 'development') {
    return env
  }
  
  return 'development'
}

/**
 * Creates application configuration from environment variables
 * Validates required variables and provides sensible defaults
 */
function createAppConfig(): AppConfig {
  // Validate critical environment variables first
  validateEnvironmentVariables()
  
  const nodeEnv = getNodeEnv()
  const isDevelopment = nodeEnv === 'development'
  
  // Default frontend URL based on environment
  const defaultFrontendUrl = isDevelopment 
    ? 'http://localhost:3000' 
    : 'https://yourdomain.com'
  
  const frontendUrl = process.env['FRONTEND_URL'] || defaultFrontendUrl
  
  // Parse allowed origins (includes frontend URL by default)
  const allowedOrigins = parseArrayEnv(
    process.env['ALLOWED_ORIGINS'],
    [frontendUrl]
  )
  
  // Ensure we always have at least the frontend URL
  if (allowedOrigins.length === 0) {
    allowedOrigins.push(frontendUrl)
  }
  
  // Security settings
  const jwtSecret = process.env['JWT_SECRET'] as string // Validated above
  const jwtExpiresIn = process.env['JWT_EXPIRES_IN'] || '7d'
  const bcryptRounds = parseIntEnv(process.env['BCRYPT_ROUNDS'], 12)
  
  // File upload settings
  const maxFileSize = parseIntEnv(
    process.env['MAX_FILE_SIZE'],
    10 * 1024 * 1024 // 10MB default
  )
  
  const allowedImageTypes = parseArrayEnv(
    process.env['ALLOWED_IMAGE_TYPES'],
    ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  )
  
  const uploadsPath = process.env['UPLOADS_PATH'] || 'uploads'
  
  // Rate limiting settings
  const rateLimitWindowMs = parseIntEnv(
    process.env['RATE_LIMIT_WINDOW_MS'],
    15 * 60 * 1000 // 15 minutes default
  )
  
  const rateLimitMaxRequests = parseIntEnv(
    process.env['RATE_LIMIT_MAX_REQUESTS'],
    100 // 100 requests per window
  )
  
  const rateLimitMaxUploads = parseIntEnv(
    process.env['RATE_LIMIT_MAX_UPLOADS'],
    10 // 10 uploads per window
  )
  
  // Database configuration
  const databaseUrl = process.env['DATABASE_URL'] as string // Validated above
  
  // CORS configuration
  const corsOrigin: string | string[] = allowedOrigins.length === 1 
    ? allowedOrigins[0] as string 
    : allowedOrigins
    
  const corsOptions = {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma'
    ]
  }
  
  // Pagination settings
  const defaultPageSize = parseIntEnv(process.env['DEFAULT_PAGE_SIZE'], 20)
  const maxPageSize = parseIntEnv(process.env['MAX_PAGE_SIZE'], 100)
  
  // ActivityPub settings (for future federation)
  const activityPubEnabled = parseBoolEnv(process.env['ACTIVITYPUB_ENABLED'], false)
  const instanceDomain = process.env['INSTANCE_DOMAIN'] || 'localhost:3001'
  const instanceName = process.env['INSTANCE_NAME'] || 'ParaSocial Instance'
  
  return {
    // Server configuration
    port: parseIntEnv(process.env['PORT'], 3001),
    host: process.env['HOST'] || '0.0.0.0',
    nodeEnv,
    
    // Frontend configuration
    frontendUrl,
    allowedOrigins,
    
    // Security configuration
    jwtSecret,
    jwtExpiresIn,
    bcryptRounds,
    
    // File upload configuration
    maxFileSize,
    allowedImageTypes,
    uploadsPath,
    
    // Rate limiting configuration
    rateLimitWindowMs,
    rateLimitMaxRequests,
    rateLimitMaxUploads,
    
    // Database configuration
    databaseUrl,
    
    // CORS configuration
    corsOptions,
    
    // Pagination defaults
    defaultPageSize,
    maxPageSize,
    
    // ActivityPub configuration
    activityPubEnabled,
    instanceDomain,
    instanceName
  }
}

/**
 * Application configuration singleton
 * Exported as readonly configuration object
 */
export const appConfig: AppConfig = createAppConfig()

/**
 * Helper function to get configuration in a type-safe way
 * Useful for accessing nested configuration properties
 */
export function getAppConfig(): AppConfig {
  return appConfig
}

/**
 * Environment-specific configuration helpers
 */
export const isProduction = (): boolean => appConfig.nodeEnv === 'production'
export const isDevelopment = (): boolean => appConfig.nodeEnv === 'development'
export const isTest = (): boolean => appConfig.nodeEnv === 'test'

/**
 * Configuration validation helper
 * Useful for runtime configuration checks
 */
export function validateConfig(): boolean {
  try {
    // Test that critical configuration values are valid
    if (!appConfig.jwtSecret || appConfig.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long')
    }
    
    if (!appConfig.databaseUrl) {
      throw new Error('DATABASE_URL is required')
    }
    
    if (appConfig.port < 1 || appConfig.port > 65535) {
      throw new Error('PORT must be between 1 and 65535')
    }
    
    if (appConfig.bcryptRounds < 10 || appConfig.bcryptRounds > 15) {
      throw new Error('BCRYPT_ROUNDS should be between 10 and 15 for security and performance')
    }
    
    return true
  } catch (error) {
    console.error('Configuration validation failed:', error)
    return false
  }
}

/**
 * Exports for testing purposes
 * These functions are exported to allow unit testing of configuration logic
 */
export const __testing__ = {
  validateEnvironmentVariables,
  parseIntEnv,
  parseBoolEnv,
  parseArrayEnv,
  getNodeEnv,
  createAppConfig
}

// backend/src/config/app.ts
// Version: 1.4.0