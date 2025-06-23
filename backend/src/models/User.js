// backend/src/models/User.js
// User model with validation schema using Zod

import { z } from 'zod'

/**
 * User validation schemas for different operations
 */
export const UserSchemas = {
  // Registration validation
  register: z.object({
    email: z.string().email('Invalid email format'),
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be less than 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    displayName: z.string()
      .min(1, 'Display name cannot be empty')
      .max(50, 'Display name must be less than 50 characters')
      .optional()
  }),

  // Login validation
  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  }),

  // Profile update validation
  updateProfile: z.object({
    displayName: z.string()
      .min(1, 'Display name cannot be empty')
      .max(50, 'Display name must be less than 50 characters')
      .optional(),
    bio: z.string()
      .max(500, 'Bio must be less than 500 characters')
      .optional(),
    website: z.string()
      .url('Invalid website URL')
      .optional()
      .or(z.literal(''))
  })
}

/**
 * User model class for database operations
 */
export class User {
  constructor(data) {
    this.id = data.id
    this.email = data.email
    this.username = data.username
    this.displayName = data.displayName || data.username
    this.bio = data.bio || ''
    this.avatar = data.avatar || null
    this.website = data.website || null
    this.isVerified = data.isVerified || false
    this.verificationTier = data.verificationTier || 'none'
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
  }

  /**
   * Get user's public profile data (safe for API responses)
   */
  getPublicProfile() {
    return {
      id: this.id,
      username: this.username,
      displayName: this.displayName,
      bio: this.bio,
      avatar: this.avatar,
      website: this.website,
      isVerified: this.isVerified,
      verificationTier: this.verificationTier
    }
  }

  /**
   * Get user's private profile data (includes email, for authenticated user only)
   */
  getPrivateProfile() {
    return {
      ...this.getPublicProfile(),
      email: this.email,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * Validate user data against schema
   */
  static validateRegistration(data) {
    return UserSchemas.register.safeParse(data)
  }

  static validateLogin(data) {
    return UserSchemas.login.safeParse(data)
  }

  static validateProfileUpdate(data) {
    return UserSchemas.updateProfile.safeParse(data)
  }
}