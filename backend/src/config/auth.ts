// backend/src/config/auth.ts
// Version: 1.0.0 - Initial authentication configuration with JWT settings, security parameters, and environment validation

import { z } from 'zod'

/**
 * User role enumeration for type safety
 * Defines available user roles in the system
 */
export type UserRole = 'admin' | 'user' | 'moderator'

/**
 * JWT token configuration interface
 * Defines structure for JWT token settings
 */
export interface JwtConfig {
  secret: string
  expiresIn: string
  refreshExpiresIn: string
  issuer: string
  audience: string
}

/**
 * Password security configuration interface
 * Defines password hashing and validation settings
 */
export interface PasswordConfig {
  saltRounds: number
  minLength: number
  maxLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
}

/**
 * Session configuration interface
 * Defines session management settings
 */
export interface SessionConfig {
  cookieName: string
  maxAge: number
  secure: boolean
  httpOnly: boolean
  sameSite: 'strict' | 'lax' | 'none'
}

/**
 * Rate limiting configuration interface
 * Defines authentication rate limiting settings
 */
export interface RateLimitConfig {
  windowMs: number
  maxAttempts: number
  blockDuration: number
  skipSuccessfulRequests: boolean
}

/**
 * Complete authentication configuration interface
 * Combines all auth-related configuration settings
 */
export interface AuthConfig {
  jwt: JwtConfig
  password: PasswordConfig
  session: SessionConfig
  rateLimit: RateLimitConfig
  environment: string
  domain: string
  allowedOrigins: string[]
}

/**
 * Environment variables validation schema
 * Ensures required environment variables are present and valid
 */
const envSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DOMAIN: z.string().default('localhost'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  SESSION_SECRET: z.string().optional(),
  BCRYPT_SALT_ROUNDS: z.string().transform(Number).default('12'),
  PASSWORD_MIN_LENGTH: z.string().transform(Number).default('8'),
  PASSWORD_MAX_LENGTH: z.string().transform(Number).default('128'),
  AUTH_RATE_LIMIT_WINDOW: z.string().transform(Number).default('900000'), // 15 minutes
  AUTH_RATE_LIMIT_MAX: z.string().transform(Number).default('5'),
  AUTH_BLOCK_DURATION: z.string().transform(Number).default('3600000') // 1 hour
})

/**
 * Parse and validate environment variables
 * @returns Validated environment configuration
 * @throws Error if validation fails
 */
function parseEnvironment(): z.infer<typeof envSchema> {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`)
    }
    throw error
  }
}

/**
 * Create JWT configuration from environment variables
 * @param env - Validated environment variables
 * @returns JWT configuration object
 */
function createJwtConfig(env: z.infer<typeof envSchema>): JwtConfig {
  return {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    issuer: `parasocial-${env.DOMAIN}`,
    audience: env.DOMAIN
  }
}

/**
 * Create password configuration from environment variables
 * @param env - Validated environment variables
 * @returns Password configuration object
 */
function createPasswordConfig(env: z.infer<typeof envSchema>): PasswordConfig {
  return {
    saltRounds: env.BCRYPT_SALT_ROUNDS,
    minLength: env.PASSWORD_MIN_LENGTH,
    maxLength: env.PASSWORD_MAX_LENGTH,
    requireUppercase: env.NODE_ENV === 'production',
    requireLowercase: true,
    requireNumbers: env.NODE_ENV === 'production',
    requireSpecialChars: env.NODE_ENV === 'production'
  }
}

/**
 * Create session configuration from environment variables
 * @param env - Validated environment variables
 * @returns Session configuration object
 */
function createSessionConfig(env: z.infer<typeof envSchema>): SessionConfig {
  return {
    cookieName: 'parasocial-session',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    secure: env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}

/**
 * Create rate limiting configuration from environment variables
 * @param env - Validated environment variables
 * @returns Rate limiting configuration object
 */
function createRateLimitConfig(env: z.infer<typeof envSchema>): RateLimitConfig {
  return {
    windowMs: env.AUTH_RATE_LIMIT_WINDOW,
    maxAttempts: env.AUTH_RATE_LIMIT_MAX,
    blockDuration: env.AUTH_BLOCK_DURATION,
    skipSuccessfulRequests: true
  }
}

/**
 * Parse allowed origins from environment string
 * @param originsString - Comma-separated origins string
 * @returns Array of allowed origins
 */
function parseAllowedOrigins(originsString: string): string[] {
  return originsString
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0)
}

/**
 * Validate JWT secret strength for production
 * @param secret - JWT secret to validate
 * @param environment - Current environment
 * @throws Error if secret is weak in production
 */
function validateJwtSecret(secret: string, environment: string): void {
  if (environment === 'production') {
    // Production requirements: at least 64 characters, mix of characters
    if (secret.length < 64) {
      throw new Error('JWT_SECRET must be at least 64 characters in production')
    }
    
    const hasUppercase = /[A-Z]/.test(secret)
    const hasLowercase = /[a-z]/.test(secret)
    const hasNumbers = /\d/.test(secret)
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(secret)
    
    if (!(hasUppercase && hasLowercase && hasNumbers && hasSpecialChars)) {
      console.warn('WARNING: JWT_SECRET should contain uppercase, lowercase, numbers, and special characters for maximum security')
    }
  }
  
  // Check for obviously weak secrets
  const weakSecrets = [
    'secret',
    'password',
    'dev-secret',
    'jwt-secret',
    'your-secret-key',
    'change-me',
    'development-secret'
  ]
  
  const lowerSecret = secret.toLowerCase()
  for (const weak of weakSecrets) {
    if (lowerSecret.includes(weak)) {
      if (environment === 'production') {
        throw new Error(`JWT_SECRET contains weak pattern "${weak}" which is not allowed in production`)
      } else {
        console.warn(`WARNING: JWT_SECRET contains weak pattern "${weak}". Consider using a stronger secret.`)
      }
    }
  }
}

/**
 * Create complete authentication configuration
 * Parses environment variables and creates typed configuration object
 * @returns Complete authentication configuration
 * @throws Error if environment validation fails
 */
function createAuthConfig(): AuthConfig {
  // Parse and validate environment variables
  const env = parseEnvironment()
  
  // Validate JWT secret strength
  validateJwtSecret(env.JWT_SECRET, env.NODE_ENV)
  
  // Create configuration objects
  const jwt = createJwtConfig(env)
  const password = createPasswordConfig(env)
  const session = createSessionConfig(env)
  const rateLimit = createRateLimitConfig(env)
  const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS)
  
  return {
    jwt,
    password,
    session,
    rateLimit,
    environment: env.NODE_ENV,
    domain: env.DOMAIN,
    allowedOrigins
  }
}

/**
 * Cached authentication configuration
 * Created once on module load to avoid repeated parsing
 */
let authConfigCache: AuthConfig | null = null

/**
 * Get authentication configuration
 * Returns cached configuration or creates new one if not cached
 * @returns Authentication configuration object
 */
export function getAuthConfig(): AuthConfig {
  if (!authConfigCache) {
    authConfigCache = createAuthConfig()
    
    // Log configuration status (without sensitive data)
    console.log(`Auth configuration loaded for ${authConfigCache.environment} environment`)
    console.log(`Domain: ${authConfigCache.domain}`)
    console.log(`JWT expires in: ${authConfigCache.jwt.expiresIn}`)
    console.log(`Password min length: ${authConfigCache.password.minLength}`)
    console.log(`Rate limit: ${authConfigCache.rateLimit.maxAttempts} attempts per ${authConfigCache.rateLimit.windowMs / 1000} seconds`)
  }
  
  return authConfigCache
}

/**
 * Check if current environment is production
 * @returns True if running in production environment
 */
export function isProduction(): boolean {
  return getAuthConfig().environment === 'production'
}

/**
 * Check if current environment is development
 * @returns True if running in development environment
 */
export function isDevelopment(): boolean {
  return getAuthConfig().environment === 'development'
}

/**
 * Check if current environment is test
 * @returns True if running in test environment
 */
export function isTest(): boolean {
  return getAuthConfig().environment === 'test'
}

/**
 * Get JWT secret for token operations
 * @returns JWT secret string
 */
export function getJwtSecret(): string {
  return getAuthConfig().jwt.secret
}

/**
 * Get password hashing salt rounds
 * @returns Number of salt rounds for bcrypt
 */
export function getSaltRounds(): number {
  return getAuthConfig().password.saltRounds
}

/**
 * Reset configuration cache
 * Useful for testing or when environment changes
 */
export function resetAuthConfig(): void {
  authConfigCache = null
}

/**
 * Default export for convenient access to auth configuration
 */
export default getAuthConfig

// backend/src/config/auth.ts
// Version: 1.0.0 - Initial authentication configuration with JWT settings, security parameters, and environment validation