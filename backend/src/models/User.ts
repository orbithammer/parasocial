// backend/src/models/User.ts
// Version: 1.2.0 - Fixed exactOptionalPropertyTypes compatibility for createdAt/updatedAt
// Changed: Made createdAt/updatedAt required properties with constructor defaults

import { z } from 'zod'

// Validation schemas
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
    email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format'),
    password: z.string().trim().min(1, 'Password is required')
  }),

  // Profile update validation
  updateProfile: z.object({
    displayName: z.string()
      .trim()
      .min(1, 'Display name cannot be empty')
      .max(50, 'Display name must be less than 50 characters')
      .optional(),
    bio: z.string()
      .max(500, 'Bio must be less than 500 characters')
      .optional(),
    website: z.string()
      .url('Invalid website URL')
      .refine((url) => url.startsWith('http://') || url.startsWith('https://'), {
        message: 'Invalid website URL'
      })
      .optional()
      .or(z.literal(''))
  })
}

// User data interface - allows null and undefined values for fields that constructor handles
interface UserData {
  id: string
  email: string
  username: string
  displayName?: string | null | undefined
  bio?: string | null | undefined
  avatar?: string | null | undefined
  website?: string | null | undefined
  isVerified?: boolean | null | undefined
  verificationTier?: string | null | undefined
  createdAt?: Date | undefined
  updatedAt?: Date | undefined
  passwordHash?: string | undefined
  isActive?: boolean | undefined
  actorId?: string | null | undefined
  publicKey?: string | null | undefined
  privateKey?: string | null | undefined
}

// Public profile interface
interface PublicProfile {
  id: string
  username: string
  displayName: string
  bio: string
  avatar: string | null
  website: string | null
  isVerified: boolean
  verificationTier: string
}

// Private profile interface (extends public)
interface PrivateProfile extends PublicProfile {
  email: string
  createdAt: Date
  updatedAt: Date
}

/**
 * User model class for database operations
 */
export class User {
  public id: string
  public email: string
  public username: string
  public displayName: string
  public bio: string
  public avatar: string | null
  public website: string | null
  public isVerified: boolean
  public verificationTier: string
  public createdAt: Date  // Changed from optional to required
  public updatedAt: Date  // Changed from optional to required
  public passwordHash?: string | undefined
  public isActive?: boolean | undefined
  public actorId?: string | null | undefined
  public publicKey?: string | null | undefined
  public privateKey?: string | null | undefined

  constructor(data: UserData) {
    this.id = data.id
    this.email = data.email
    this.username = data.username
    // Handle displayName: use provided value, or fallback to username if null/undefined/empty
    this.displayName = data.displayName || data.username
    // Handle bio: use provided value, or default to empty string if null/undefined
    this.bio = data.bio || ''
    // Handle avatar: convert empty string to null, keep null as null
    this.avatar = data.avatar || null
    // Handle website: convert empty string to null, keep null as null
    this.website = data.website || null
    // Handle isVerified: default to false if null/undefined
    this.isVerified = data.isVerified || false
    // Handle verificationTier: default to 'none' if null/undefined
    this.verificationTier = data.verificationTier || 'none'
    // Handle dates: provide current date if undefined to satisfy exactOptionalPropertyTypes
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
    this.passwordHash = data.passwordHash
    this.isActive = data.isActive
    this.actorId = data.actorId
    this.publicKey = data.publicKey
    this.privateKey = data.privateKey
  }

  /**
   * Get user's public profile data (safe for API responses)
   */
  getPublicProfile(): PublicProfile {
    return {
      id: this.id,
      username: this.username,
      displayName: this.displayName,
      bio: this.bio,
      avatar: this.avatar,
      website: this.website,
      isVerified: this.isVerified,
      verificationTier: this.verificationTier,
      ...(this as any).followersCount !== undefined && { followersCount: (this as any).followersCount },
      ...(this as any).postsCount !== undefined && { postsCount: (this as any).postsCount }
    }
  }

  /**
   * Get user's private profile data (includes email, for authenticated user only)
   * Note: createdAt/updatedAt are now always available due to constructor defaults
   */
  getPrivateProfile(): PrivateProfile {
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
  static validateRegistration(data: unknown) {
    return UserSchemas.register.safeParse(data)
  }

  static validateLogin(data: unknown) {
    return UserSchemas.login.safeParse(data)
  }

  static validateProfileUpdate(data: unknown) {
    return UserSchemas.updateProfile.safeParse(data)
  }
}

// Export types for use in other files
export type {
  UserData,
  PublicProfile,
  PrivateProfile
}