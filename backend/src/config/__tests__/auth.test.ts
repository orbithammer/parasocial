// backend/src/config/__tests__/auth.test.ts
// Version: 1.3.0 - Fixed module caching and environment isolation issues for reliable test execution

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Test suite for authentication configuration
 * Tests environment validation, configuration parsing, and security settings
 */
describe('Auth Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env }
    
    // Reset all mocks
    vi.clearAllMocks()
    
    // Clear the module cache to ensure fresh imports
    vi.resetModules()
  })

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv
    
    // Clear module cache again to prevent state leakage
    vi.resetModules()
  })

  /**
   * Test basic configuration functionality
   */
  describe('Configuration Loading', () => {
    it('should have required configuration exports', async () => {
      // Arrange: Set required environment variables
      process.env['JWT_SECRET'] = 'test-jwt-secret-key-that-is-long-enough-for-validation'
      process.env['NODE_ENV'] = 'test'
      
      // Act: Import auth config
      const authModule = await import('../auth')
      
      // Assert: Should export required functions
      expect(typeof authModule.getAuthConfig).toBe('function')
      expect(typeof authModule.isProduction).toBe('function')
      expect(typeof authModule.isDevelopment).toBe('function')
      expect(typeof authModule.isTest).toBe('function')
    })

    it('should detect test environment correctly', async () => {
      // Arrange: Set test environment
      process.env['JWT_SECRET'] = 'test-environment-secret-key-long-enough'
      process.env['NODE_ENV'] = 'test'
      
      // Act: Import and check environment
      const authModule = await import('../auth')
      
      // Assert: Should correctly identify test environment
      expect(authModule.isTest()).toBe(true)
      expect(authModule.isProduction()).toBe(false)
      expect(authModule.isDevelopment()).toBe(false)
    })

    it('should detect development environment correctly', async () => {
      // Arrange: Set development environment
      process.env['JWT_SECRET'] = 'development-environment-secret-key-long-enough'
      process.env['NODE_ENV'] = 'development'
      
      // Act: Import and check environment
      const authModule = await import('../auth')
      
      // Assert: Should correctly identify development environment
      expect(authModule.isTest()).toBe(false)
      expect(authModule.isProduction()).toBe(false)
      expect(authModule.isDevelopment()).toBe(true)
    })

    it('should load configuration with valid environment variables', async () => {
      // Arrange: Set valid environment variables
      process.env['JWT_SECRET'] = 'valid-jwt-secret-key-that-meets-length-requirements'
      process.env['NODE_ENV'] = 'test'
      process.env['DOMAIN'] = 'test.example.com'
      process.env['JWT_EXPIRES_IN'] = '30m'
      
      // Act: Load configuration
      const authModule = await import('../auth')
      const config = authModule.getAuthConfig()
      
      // Assert: Should return valid configuration object
      expect(config).toBeDefined()
      expect(config.environment).toBe('test')
      expect(config.domain).toBe('test.example.com')
      expect(config.jwt).toBeDefined()
      expect(config.jwt.secret).toBe('valid-jwt-secret-key-that-meets-length-requirements')
      expect(config.jwt.expiresIn).toBe('30m')
    })

    it('should use default values for optional environment variables', async () => {
      // Arrange: Set only required environment variables
      process.env['JWT_SECRET'] = 'required-jwt-secret-key-with-sufficient-length'
      // Explicitly remove optional variables
      delete process.env['NODE_ENV']
      delete process.env['DOMAIN']
      delete process.env['JWT_EXPIRES_IN']
      
      // Act: Load configuration
      const authModule = await import('../auth')
      const config = authModule.getAuthConfig()
      
      // Assert: Should use default values
      expect(config.environment).toBe('development') // Default NODE_ENV
      expect(config.domain).toBe('localhost') // Default DOMAIN
      expect(config.jwt.expiresIn).toBe('15m') // Default JWT_EXPIRES_IN
    })
  })

  /**
   * Test JWT configuration
   */
  describe('JWT Configuration', () => {
    it('should configure JWT settings correctly', async () => {
      // Arrange: Set JWT-specific environment variables
      process.env['JWT_SECRET'] = 'jwt-configuration-test-secret-key-long-enough'
      process.env['JWT_EXPIRES_IN'] = '1h'
      process.env['JWT_REFRESH_EXPIRES_IN'] = '30d'
      process.env['DOMAIN'] = 'jwt-test.com'
      
      // Act: Load configuration
      const authModule = await import('../auth')
      const config = authModule.getAuthConfig()
      
      // Assert: JWT configuration should be correct
      expect(config.jwt.secret).toBe('jwt-configuration-test-secret-key-long-enough')
      expect(config.jwt.expiresIn).toBe('1h')
      expect(config.jwt.refreshExpiresIn).toBe('30d')
      expect(config.jwt.issuer).toBe('parasocial-jwt-test.com')
      expect(config.jwt.audience).toBe('jwt-test.com')
    })

    it('should provide JWT secret accessor function', async () => {
      // Arrange: Set JWT secret
      process.env['JWT_SECRET'] = 'accessor-function-test-secret-key-long-enough'
      
      // Act: Get JWT secret via accessor
      const authModule = await import('../auth')
      const secret = authModule.getJwtSecret()
      
      // Assert: Should return correct secret
      expect(secret).toBe('accessor-function-test-secret-key-long-enough')
    })
  })

  /**
   * Test password configuration
   */
  describe('Password Configuration', () => {
    it('should configure password settings correctly', async () => {
      // Arrange: Set password-related environment variables
      process.env['JWT_SECRET'] = 'password-config-test-secret-key-long-enough'
      process.env['BCRYPT_SALT_ROUNDS'] = '10'
      process.env['PASSWORD_MIN_LENGTH'] = '6'
      process.env['PASSWORD_MAX_LENGTH'] = '100'
      process.env['NODE_ENV'] = 'development'
      
      // Act: Load configuration
      const authModule = await import('../auth')
      const config = authModule.getAuthConfig()
      
      // Assert: Password configuration should be correct
      expect(config.password.saltRounds).toBe(10)
      expect(config.password.minLength).toBe(6)
      expect(config.password.maxLength).toBe(100)
      expect(config.password.requireUppercase).toBe(false) // Development mode
      expect(config.password.requireLowercase).toBe(true)
      expect(config.password.requireNumbers).toBe(false) // Development mode
      expect(config.password.requireSpecialChars).toBe(false) // Development mode
    })

    it('should enforce stricter password requirements in production', async () => {
      // Arrange: Set production environment with strong secret
      process.env['JWT_SECRET'] = 'ProductionJWTKey123!@#$%^&*()_+ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
      process.env['NODE_ENV'] = 'production'
      
      // Act: Load configuration
      const authModule = await import('../auth')
      const config = authModule.getAuthConfig()
      
      // Assert: Production should have stricter requirements
      expect(config.password.requireUppercase).toBe(true)
      expect(config.password.requireNumbers).toBe(true)
      expect(config.password.requireSpecialChars).toBe(true)
    })

    it('should provide salt rounds accessor function', async () => {
      // Arrange: Set salt rounds
      process.env['JWT_SECRET'] = 'salt-rounds-test-secret-key-long-enough'
      process.env['BCRYPT_SALT_ROUNDS'] = '14'
      
      // Act: Get salt rounds via accessor
      const authModule = await import('../auth')
      const saltRounds = authModule.getSaltRounds()
      
      // Assert: Should return correct salt rounds
      expect(saltRounds).toBe(14)
    })
  })

  /**
   * Test session configuration
   */
  describe('Session Configuration', () => {
    it('should configure session settings for development', async () => {
      // Arrange: Set development environment
      process.env['JWT_SECRET'] = 'session-development-test-secret-key-long-enough'
      process.env['NODE_ENV'] = 'development'
      
      // Act: Load configuration
      const authModule = await import('../auth')
      const config = authModule.getAuthConfig()
      
      // Assert: Development session configuration
      expect(config.session.cookieName).toBe('parasocial-session')
      expect(config.session.secure).toBe(false) // Development
      expect(config.session.httpOnly).toBe(true)
      expect(config.session.sameSite).toBe('lax') // Development
    })

    it('should configure secure session settings for production', async () => {
      // Arrange: Set production environment with strong secret
      process.env['JWT_SECRET'] = 'ProductionJWTKey123!@#$%^&*()_+ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
      process.env['NODE_ENV'] = 'production'
      
      // Act: Load configuration
      const authModule = await import('../auth')
      const config = authModule.getAuthConfig()
      
      // Assert: Production session configuration
      expect(config.session.secure).toBe(true) // Production
      expect(config.session.sameSite).toBe('strict') // Production
    })
  })

  /**
   * Test rate limiting configuration
   */
  describe('Rate Limiting Configuration', () => {
    it('should configure rate limiting settings correctly', async () => {
      // Arrange: Set rate limiting environment variables
      process.env['JWT_SECRET'] = 'rate-limiting-test-secret-key-long-enough'
      process.env['AUTH_RATE_LIMIT_WINDOW'] = '600000' // 10 minutes
      process.env['AUTH_RATE_LIMIT_MAX'] = '3'
      process.env['AUTH_BLOCK_DURATION'] = '1800000' // 30 minutes
      
      // Act: Load configuration
      const authModule = await import('../auth')
      const config = authModule.getAuthConfig()
      
      // Assert: Rate limiting configuration should be correct
      expect(config.rateLimit.windowMs).toBe(600000)
      expect(config.rateLimit.maxAttempts).toBe(3)
      expect(config.rateLimit.blockDuration).toBe(1800000)
      expect(config.rateLimit.skipSuccessfulRequests).toBe(true)
    })
  })

  /**
   * Test configuration caching and reset
   */
  describe('Configuration Caching', () => {
    it('should cache configuration after first load', async () => {
      // Arrange: Set environment
      process.env['JWT_SECRET'] = 'caching-test-secret-key-long-enough'
      process.env['NODE_ENV'] = 'test'
      
      // Act: Load configuration multiple times
      const authModule = await import('../auth')
      const config1 = authModule.getAuthConfig()
      const config2 = authModule.getAuthConfig()
      
      // Assert: Should return same object reference (cached)
      expect(config1).toBe(config2)
    })

    it('should allow configuration reset', async () => {
      // Arrange: Set environment and load config
      process.env['JWT_SECRET'] = 'reset-test-secret-key-long-enough'
      const authModule = await import('../auth')
      const config1 = authModule.getAuthConfig()
      
      // Act: Reset and load again
      authModule.resetAuthConfig()
      const config2 = authModule.getAuthConfig()
      
      // Assert: Should return different object reference after reset
      expect(config1).not.toBe(config2)
      expect(config1.jwt.secret).toBe(config2.jwt.secret) // Same values though
    })
  })

  /**
   * Test error handling
   */
  describe('Error Handling', () => {
    it('should throw error when JWT_SECRET is too short', async () => {
      // Arrange: Set short JWT secret
      process.env['JWT_SECRET'] = 'short'
      
      // Act & Assert: Should throw validation error
      const authModule = await import('../auth')
      expect(() => authModule.getAuthConfig()).toThrow('JWT_SECRET must be at least 32 characters long')
    })

    it('should throw error when JWT_SECRET is missing', async () => {
      // Arrange: Remove JWT_SECRET
      delete process.env['JWT_SECRET']
      
      // Act & Assert: Should throw validation error
      const authModule = await import('../auth')
      expect(() => authModule.getAuthConfig()).toThrow('Environment validation failed')
    })
  })
})

// backend/src/config/__tests__/auth.test.ts
// Version: 1.3.0 - Fixed module caching and environment isolation issues for reliable test execution