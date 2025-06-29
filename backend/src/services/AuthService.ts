// backend/src/services/AuthService.ts
// Authentication service for handling passwords, JWT tokens, and validation
// Complete implementation with proper error handling for tests

import bcrypt from 'bcrypt'
import jwt, { SignOptions } from 'jsonwebtoken'
import { z } from 'zod'
import crypto from 'crypto'

/**
 * JWT payload interface
 */
interface JWTPayload {
  userId: string
  email: string
  username: string
  iat?: number
  exp?: number
}

/**
 * Token verification result
 */
interface TokenVerificationResult {
  valid: boolean
  payload?: JWTPayload
  error?: string
}

/**
 * Validation result interface
 */
interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: z.ZodError | { errors: any[] }
}

/**
 * Registration data interface
 */
interface RegistrationData {
  email: string
  username: string
  password: string
  displayName?: string
}

/**
 * Login data interface
 */
interface LoginData {
  email: string
  password: string
}

/**
 * User data for token generation
 */
interface UserTokenData {
  id: string
  email: string
  username: string
}

/**
 * Authentication service class
 * Handles password hashing, JWT tokens, and user validation
 */
export class AuthService {
  private readonly JWT_SECRET: string
  private readonly JWT_EXPIRES_IN: string
  private readonly BCRYPT_ROUNDS: number

  // Validation schemas
  private readonly registrationSchema = z.object({
    email: z.string()
      .email('Invalid email format')
      .max(255, 'Email must be less than 255 characters'),
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be less than 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be less than 128 characters')
      .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
      .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
      .regex(/(?=.*\d)/, 'Password must contain at least one number'),
    displayName: z.string()
      .min(1, 'Display name cannot be empty')
      .max(50, 'Display name must be less than 50 characters')
      .optional()
  })

  private readonly loginSchema = z.object({
    email: z.string()
      .email('Invalid email format'),
    password: z.string()
      .min(1, 'Password is required')
  })

  constructor() {
    // Use environment variables or defaults
    this.JWT_SECRET = process.env.JWT_SECRET || this.generateDefaultSecret()
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
    this.BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10)

    // Ensure JWT_SECRET is valid
    if (!this.JWT_SECRET || this.JWT_SECRET.length === 0) {
      throw new Error('JWT_SECRET must be provided and non-empty')
    }

    // Warn about default secret in development
    if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
      console.warn('⚠️  No JWT_SECRET provided, using generated secret. Set JWT_SECRET in production!')
    }
  }

  /**
   * Generate a default JWT secret for development/testing
   */
  private generateDefaultSecret(): string {
    return crypto.randomBytes(64).toString('hex')
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const saltRounds = this.BCRYPT_ROUNDS
      return await bcrypt.hash(password, saltRounds)
    } catch (error) {
      throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(hashedPassword: string, password: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword)
    } catch (error) {
      throw new Error(`Password verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user: UserTokenData): string {
    try {
      const payload: JWTPayload = {
        userId: user.id,
        email: user.email,
        username: user.username
      }

      // Explicitly type the expiresIn value for JWT library compatibility
      const expiresIn = this.JWT_EXPIRES_IN as any
      const options: SignOptions = {
        expiresIn
      }

      return jwt.sign(payload, this.JWT_SECRET, options)
    } catch (error) {
      throw new Error(`Token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify JWT token and return payload
   */
  verifyToken(token: string): JWTPayload {
    try {
      const payload = jwt.verify(token, this.JWT_SECRET) as JWTPayload
      return payload
    } catch (error) {
      throw new Error(`Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract token from Authorization header
   * Throws error if header is invalid (required for middleware compatibility)
   */
  extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new Error('Authorization header is required')
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header must start with "Bearer "')
    }

    // Extract token and trim any extra spaces
    const token = authHeader.substring(7).trim()
    
    if (!token) {
      throw new Error('Token is required')
    }

    return token
  }

  /**
   * Validate registration data
   * Returns format expected by tests
   */
  validateRegistrationData(data: unknown): ValidationResult<RegistrationData> {
    try {
      const validatedData = this.registrationSchema.parse(data)
      return {
        success: true,
        data: validatedData
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof z.ZodError ? {
          errors: error.errors.map(err => ({
            code: err.code,
            path: err.path,
            message: err.message
          }))
        } : { errors: [{ message: 'Validation failed' }] }
      }
    }
  }

  /**
   * Validate login data
   * Returns format expected by tests
   */
  validateLoginData(data: unknown): ValidationResult<LoginData> {
    try {
      const validatedData = this.loginSchema.parse(data)
      return {
        success: true,
        data: validatedData
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof z.ZodError ? {
          errors: error.errors.map(err => ({
            code: err.code,
            path: err.path,
            message: err.message
          }))
        } : { errors: [{ message: 'Validation failed' }] }
      }
    }
  }

  /**
   * Verify token and return validation result (non-throwing version)
   */
  verifyTokenSafe(token: string): TokenVerificationResult {
    try {
      const payload = this.verifyToken(token)
      return {
        valid: true,
        payload
      }
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Extract and verify token from Authorization header (non-throwing version)
   */
  extractAndVerifyToken(authHeader: string | undefined): TokenVerificationResult {
    try {
      const token = this.extractTokenFromHeader(authHeader)
      return this.verifyTokenSafe(token)
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}