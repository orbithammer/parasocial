// backend/src/services/AuthService.ts
// Version: 1.2.0
// Added extractTokenFromHeader method for middleware compatibility

import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import type * as ms from 'ms'

// Type definitions for authentication-related data structures
export interface User {
  id: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  role: UserRole
}

export interface CreateUserData {
  email: string
  password: string
  firstName: string
  lastName: string
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
  role: UserRole
  iat?: number
  exp?: number
}

export type UserRole = 'admin' | 'user' | 'moderator'

export interface PasswordResetData {
  email: string
  newPassword: string
  resetToken: string
}

export class AuthService {
  // In-memory storage for users (in production, this would be a database)
  private users: Map<string, User> = new Map()
  private resetTokens: Map<string, { userId: string; expiresAt: Date }> = new Map()
  
  // Environment configuration with proper validation
  private readonly jwtSecret: string
  private readonly jwtExpiresIn: string
  private readonly saltRounds: number

  constructor() {
    // Validate and set required environment variables
    this.jwtSecret = this.getRequiredEnvVar('JWT_SECRET')
    this.jwtExpiresIn = this.getEnvVar('JWT_EXPIRES_IN', '24h')
    this.saltRounds = parseInt(this.getEnvVar('BCRYPT_SALT_ROUNDS', '12'))
  }

  /**
   * Registers a new user with email and password
   * @param userData - User registration data
   * @returns Promise resolving to authentication result
   * @throws Error if validation fails or user already exists
   */
  async register(userData: CreateUserData): Promise<AuthResult> {
    // Validate input data
    this.validateUserData(userData)

    // Check if user already exists
    const existingUser = await this.findUserByEmail(userData.email)
    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, this.saltRounds)

    // Create new user
    const now = new Date()
    const user: User = {
      id: randomUUID(),
      email: userData.email.toLowerCase().trim(),
      passwordHash,
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      createdAt: now,
      updatedAt: now,
      isActive: true,
      role: userData.role ?? 'user'
    }

    // Store user
    this.users.set(user.id, user)

    // Generate JWT token
    const token = this.generateToken(user)

    return {
      user: this.sanitizeUser(user),
      token,
      expiresIn: this.jwtExpiresIn
    }
  }

  /**
   * Authenticates user with email and password
   * @param credentials - Login credentials
   * @returns Promise resolving to authentication result
   * @throws Error if credentials are invalid
   */
  async login(credentials: LoginCredentials): Promise<AuthResult> {
    // Validate credentials
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required')
    }

    // Find user by email
    const user = await this.findUserByEmail(credentials.email)
    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated')
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash)
    if (!isPasswordValid) {
      throw new Error('Invalid email or password')
    }

    // Generate JWT token
    const token = this.generateToken(user)

    return {
      user: this.sanitizeUser(user),
      token,
      expiresIn: this.jwtExpiresIn
    }
  }

  /**
   * Verifies and decodes a JWT token
   * @param token - JWT token to verify
   * @returns Promise resolving to JWT payload
   * @throws Error if token is invalid or expired
   */
  async verifyToken(token: string): Promise<JwtPayload> {
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
      throw new Error('Token verification failed')
    }
  }

  /**
   * Extracts JWT token from Authorization header
   * @param authHeader - Authorization header value (e.g., "Bearer token123")
   * @returns Extracted token string or null if not found
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || typeof authHeader !== 'string' || authHeader.trim() === '') {
      return null
    }

    // Check if header follows "Bearer <token>" format
    const trimmedHeader = authHeader.trim()
    const parts = trimmedHeader.split(' ')
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null
    }

    const token = parts[1]
    return token && token.trim() !== '' ? token.trim() : null
  }

  /**
   * Gets user by ID
   * @param userId - User ID
   * @returns Promise resolving to user or null if not found
   * @throws Error if user ID is invalid
   */
  async getUserById(userId: string): Promise<Omit<User, 'passwordHash'> | null> {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required')
    }

    const user = this.users.get(userId.trim())
    return user ? this.sanitizeUser(user) : null
  }

  /**
   * Updates user password
   * @param userId - User ID
   * @param currentPassword - Current password for verification
   * @param newPassword - New password
   * @returns Promise resolving to success boolean
   * @throws Error if validation fails
   */
  async updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    if (!userId || !currentPassword || !newPassword) {
      throw new Error('User ID, current password, and new password are required')
    }

    const user = this.users.get(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect')
    }

    // Validate new password
    this.validatePassword(newPassword)

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds)

    // Update user
    const updatedUser: User = {
      ...user,
      passwordHash: newPasswordHash,
      updatedAt: new Date()
    }

    this.users.set(userId, updatedUser)
    return true
  }

  /**
   * Initiates password reset process
   * @param email - User email
   * @returns Promise resolving to reset token
   * @throws Error if user not found
   */
  async requestPasswordReset(email: string): Promise<string> {
    if (!email || email.trim() === '') {
      throw new Error('Email is required')
    }

    const user = await this.findUserByEmail(email)
    if (!user) {
      throw new Error('User not found')
    }

    // Generate reset token
    const resetToken = randomUUID()
    const expiresAt = new Date(Date.now() + 3600000) // 1 hour from now

    // Store reset token
    this.resetTokens.set(resetToken, {
      userId: user.id,
      expiresAt
    })

    return resetToken
  }

  /**
   * Resets password using reset token
   * @param resetData - Password reset data
   * @returns Promise resolving to success boolean
   * @throws Error if token is invalid or expired
   */
  async resetPassword(resetData: PasswordResetData): Promise<boolean> {
    const { email, newPassword, resetToken } = resetData

    if (!email || !newPassword || !resetToken) {
      throw new Error('Email, new password, and reset token are required')
    }

    // Verify reset token
    const tokenData = this.resetTokens.get(resetToken)
    if (!tokenData) {
      throw new Error('Invalid reset token')
    }

    if (new Date() > tokenData.expiresAt) {
      this.resetTokens.delete(resetToken)
      throw new Error('Reset token has expired')
    }

    // Get user
    const user = this.users.get(tokenData.userId)
    if (!user || user.email !== email.toLowerCase().trim()) {
      throw new Error('Invalid reset request')
    }

    // Validate new password
    this.validatePassword(newPassword)

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, this.saltRounds)

    // Update user
    const updatedUser: User = {
      ...user,
      passwordHash: newPasswordHash,
      updatedAt: new Date()
    }

    this.users.set(user.id, updatedUser)

    // Clean up reset token
    this.resetTokens.delete(resetToken)

    return true
  }

  /**
   * Deactivates a user account
   * @param userId - User ID to deactivate
   * @returns Promise resolving to success boolean
   * @throws Error if user not found
   */
  async deactivateUser(userId: string): Promise<boolean> {
    if (!userId || userId.trim() === '') {
      throw new Error('User ID is required')
    }

    const user = this.users.get(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const updatedUser: User = {
      ...user,
      isActive: false,
      updatedAt: new Date()
    }

    this.users.set(userId, updatedUser)
    return true
  }

  /**
   * Finds user by email address
   * @param email - Email to search for
   * @returns Promise resolving to user or null
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim()
    const users = Array.from(this.users.values())
    return users.find(user => user.email === normalizedEmail) ?? null
  }

  /**
   * Generates JWT token for user
   * @param user - User to generate token for
   * @returns JWT token string
   */
  private generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    }

    const options: jwt.SignOptions = {
      expiresIn: this.jwtExpiresIn as ms.StringValue
    }

    return jwt.sign(payload, this.jwtSecret as jwt.Secret, options)
  }

  /**
   * Removes sensitive data from user object
   * @param user - User object to sanitize
   * @returns User object without password hash
   */
  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...sanitizedUser } = user
    return sanitizedUser
  }

  /**
   * Validates user registration data
   * @param userData - User data to validate
   * @throws Error if validation fails
   */
  private validateUserData(userData: CreateUserData): void {
    if (!userData.email || userData.email.trim() === '') {
      throw new Error('Email is required')
    }

    if (!this.isValidEmail(userData.email)) {
      throw new Error('Invalid email format')
    }

    if (!userData.firstName || userData.firstName.trim() === '') {
      throw new Error('First name is required')
    }

    if (!userData.lastName || userData.lastName.trim() === '') {
      throw new Error('Last name is required')
    }

    this.validatePassword(userData.password)
  }

  /**
   * Validates password strength
   * @param password - Password to validate
   * @throws Error if password doesn't meet requirements
   */
  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter')
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter')
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number')
    }
  }

  /**
   * Validates email format
   * @param email - Email to validate
   * @returns Boolean indicating if email is valid
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Gets required environment variable with validation
   * @param key - Environment variable key
   * @returns Environment variable value
   * @throws Error if variable is not set
   */
  private getRequiredEnvVar(key: string): string {
    const value = process.env[key]
    if (!value || value.trim() === '') {
      throw new Error(`Required environment variable ${key} is not set`)
    }
    return value.trim()
  }

  /**
   * Gets environment variable with default value
   * @param key - Environment variable key
   * @param defaultValue - Default value if not set
   * @returns Environment variable value or default
   */
  private getEnvVar(key: string, defaultValue: string): string {
    const value = process.env[key]
    return value && value.trim() !== '' ? value.trim() : defaultValue
  }
}