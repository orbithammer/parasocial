// backend/src/models/User.ts
// User model class with validation schemas using proper TypeScript types

import { z } from 'zod'

// Validation schemas
export const UserSchemas = {
  // Registration validation
  register: z.object({
    email: z.string().email('Invalid email format'),
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be less than 20 characters')
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

// User data interface
interface UserData {
  id: string
  email: string
  username: string
  displayName?: string | null
  bio?: string | null
  avatar?: string | null
  website?: string | null
  isVerified?: boolean
  verificationTier?: string
  createdAt?: Date
  updatedAt?: Date
  passwordHash?: string
  isActive?: boolean
  actorId?: string | null
  publicKey?: string | null
  privateKey?: string | null
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
  public createdAt?: Date
  public updatedAt?: Date
  public passwordHash?: string
  public isActive?: boolean
  public actorId?: string | null
  public publicKey?: string | null
  public privateKey?: string | null

  constructor(data: UserData) {
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
   */
  getPrivateProfile(): PrivateProfile {
    return {
      ...this.getPublicProfile(),
      email: this.email,
      createdAt: this.createdAt || new Date(),
      updatedAt: this.updatedAt || new Date()
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