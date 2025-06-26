// backend/src/services/AuthService.ts
// Authentication service for handling passwords, JWT tokens, and validation

import bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'
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
  error?: z.ZodError
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
      .email('Invalid email format')
      .max(255, 'Email must be less than 255 characters'),
    password: z.string()
      .min(1, 'Password is required')
      .max(128, 'Password must be less than 128 characters')
  })

  constructor() {
    // Get configuration from environment variables
    this.JWT_SECRET = process.env.JWT_SECRET || this.generateDefaultSecret()
    this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
    this.BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12')

    // Validate JWT secret in production
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required in production')
    }

    // Warn about default secret in development
    if (process.env.NODE_ENV === 'development' && !process.env.JWT_SECRET) {
      console.warn('⚠️  Using default JWT secret in development. Set JWT_SECRET environment variable.')
    }
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hashedPassword = await bcrypt.hash(password, this.BCRYPT_ROUNDS)
      return hashedPassword
    } catch (error) {
      throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    try {
      const isValid = await bcrypt.compare(plainPassword, hashedPassword)
      return isValid
    } catch (error) {
      throw new Error(`Failed to verify password: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate a JWT token for a user
   */
  generateToken(user: UserTokenData): string {
    try {
      const payload = {
        userId: user.id,
        email: user.email,
        username: user.username
      }

      // Simplified approach to avoid TypeScript issues
      const token = jwt.sign(payload, this.JWT_SECRET, { expiresIn: '7d' })

      return token
    } catch (error) {
      throw new Error(`Failed to generate token: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Verify and decode a JWT token
   */
  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload
      return decoded
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired')
      }
      if (error instanceof jwt.NotBeforeError) {
        throw new Error('Token not yet valid')
      }
      throw new Error(`Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new Error('Authorization header is required')
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Authorization header must start with "Bearer "')
    }

    const token = authHeader.substring(7) // Remove "Bearer " prefix
    
    if (!token) {
      throw new Error('Token is required')
    }

    return token
  }

  /**
   * Validate registration data
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
        error: error instanceof z.ZodError ? error : undefined
      }
    }
  }

  /**
   * Validate login data
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
        error: error instanceof z.ZodError ? error : undefined
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

  /**
   * Get token expiration date
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload | null
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000) // Convert from seconds to milliseconds
      }
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Check if token is expired without verifying signature
   */
  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token)
    if (!expiration) {
      return true // If we can't determine expiration, consider it expired
    }
    return expiration < new Date()
  }

  /**
   * Generate a secure random secret for development
   * @private
   */
  private generateDefaultSecret(): string {
    return crypto.randomBytes(64).toString('hex')
  }

  /**
   * Get service configuration info
   */
  getConfig() {
    return {
      jwtExpiresIn: this.JWT_EXPIRES_IN,
      bcryptRounds: this.BCRYPT_ROUNDS,
      hasCustomSecret: !!process.env.JWT_SECRET
    }
  }
}

export type { 
  JWTPayload, 
  TokenVerificationResult, 
  ValidationResult, 
  RegistrationData, 
  LoginData, 
  UserTokenData 
}