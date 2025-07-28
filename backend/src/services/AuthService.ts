// backend/src/services/AuthService.ts
// Version: 2.1.0
// Fixed extractTokenFromHeader to return null instead of throwing errors

import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { z } from 'zod'

// Type definitions for authentication-related data structures
export interface User {
  id: string
  email: string
  username: string
  passwordHash?: string | undefined
  displayName?: string
  bio?: string | null
  avatar?: string | null
  website?: string | null
  isVerified?: boolean
  verificationTier?: string
  role?: UserRole
  createdAt?: Date
  updatedAt?: Date
  isActive?: boolean | undefined
}

export interface CreateUserData {
  email: string
  username: string
  password: string
  displayName?: string
  role?: UserRole
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResult {
  user: Omit<User, 'passwordHash'>
  token: string
  expiresIn: string
}

export interface JwtPayload {
  userId: string
  email: string
  username: string
  role?: UserRole // Made optional to match test expectations
  iat?: number
  exp?: number
}

export type UserRole = 'admin' | 'user' | 'moderator'

// Validation schemas using Zod
const registrationSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().optional()
})

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

export class AuthService {
  // Environment configuration with sensible defaults
  private readonly jwtSecret: string
  private readonly saltRounds: number = 12

  constructor() {
    // Get JWT secret from environment or use development default
    this.jwtSecret = process.env['JWT_SECRET'] || 'dev-secret-key-change-this-in-production-please-make-it-long-and-secure'
    
    if (process.env['NODE_ENV'] === 'production' && this.jwtSecret === 'dev-secret-key-change-this-in-production-please-make-it-long-and-secure') {
      console.warn('WARNING: Using default JWT secret in production. Set JWT_SECRET environment variable.')
    }
  }

  /**
   * Hashes a password using bcrypt
   * @param password - Plain text password to hash
   * @returns Promise resolving to hashed password
   * @throws Error if hashing fails
   */
  async hashPassword(password: string): Promise<string> {
    try {
      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string')
      }
      
      const hashedPassword = await bcrypt.hash(password, this.saltRounds)
      return hashedPassword
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Password hashing failed')
    }
  }

  /**
   * Verifies a password against its hash
   * @param hashedPassword - The stored password hash
   * @param plainPassword - The plain text password to verify
   * @returns Promise resolving to boolean indicating if password is correct
   */
  async verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    try {
      if (!hashedPassword || !plainPassword) {
        return false
      }
      
      const isValid = await bcrypt.compare(plainPassword, hashedPassword)
      return isValid
    } catch (error) {
      // Log error for debugging but don't expose details
      console.error('Password verification error:', error)
      return false
    }
  }

  /**
   * Generates JWT token for user
   * @param user - User object to generate token for
   * @returns JWT token string
   */
  generateToken(user: User): string {
    const payload: any = {
      userId: user.id,
      email: user.email,
      username: user.username
    }

    // Only include role if it exists on the user object
    if (user.role) {
      payload.role = user.role
    }

    return jwt.sign(payload, this.jwtSecret, { expiresIn: '7d' })
  }

  /**
   * Verifies and decodes a JWT token
   * @param token - JWT token to verify
   * @returns JWT payload
   * @throws Error if token is invalid or expired
   */
  verifyToken(token: string): JwtPayload {
    if (!token || token.trim() === '') {
      throw new Error('Token is required')
    }

    try {
      const decoded = jwt.verify(token.trim(), this.jwtSecret) as JwtPayload
      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      // For any other error (including generic Error from mocked jwt.verify), throw "Invalid token"
      throw new Error('Invalid token')
    }
  }

  /**
   * Extracts JWT token from Authorization header
   * @param authHeader - Authorization header value (e.g., "Bearer token123")
   * @returns Extracted token string or null if header is invalid
   */
  extractTokenFromHeader(authHeader: string): string | null {
    // Return null for invalid/missing headers instead of throwing
    if (!authHeader || typeof authHeader !== 'string' || authHeader.trim() === '') {
      return null
    }

    // Check if header follows "Bearer <token>" format
    const trimmedHeader = authHeader.trim()
    const parts = trimmedHeader.split(' ')
    
    // Return null for invalid format instead of throwing
    if (parts.length !== 2) {
      return null
    }

    if (parts[0]?.toLowerCase() !== 'bearer') {
      return null
    }

    const token = parts[1]
    if (!token || token.trim() === '') {
      return null
    }

    return token.trim()
  }

  /**
   * Validates user registration data
   * @param userData - User registration data to validate
   * @returns Validation result with success flag and data or error details
   */
  validateRegistrationData(userData: CreateUserData): { success: boolean; data?: CreateUserData; error?: any } {
    try {
      const validatedData = registrationSchema.parse(userData)
      return {
        success: true,
        data: validatedData as CreateUserData
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        }
      }
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }
      }
    }
  }

  /**
   * Validates user login data
   * @param loginData - Login credentials to validate
   * @returns Validation result with success flag and data or error details
   */
  validateLoginData(loginData: LoginCredentials): { success: boolean; data?: LoginCredentials; error?: any } {
    try {
      const validatedData = loginSchema.parse(loginData)
      return {
        success: true,
        data: validatedData as LoginCredentials
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        }
      }
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }
      }
    }
  }
}

// backend/src/services/AuthService.ts
// Version: 2.1.0
// Fixed extractTokenFromHeader to return null instead of throwing errors