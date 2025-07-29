// frontend/src/types/user.ts  
// Version: 1.0.0
// User type definitions for ParaSocial frontend
// Added: displayName, username, verification properties for creator dashboard

// Base user interface for ParaSocial creators
export interface User {
  id: string
  email: string
  name: string
  username: string
  displayName: string | null
  bio?: string | null
  avatar?: string | null
  website?: string | null
  isVerified: boolean
  verificationStatus: 'email_verified' | 'phone_verified' | 'identity_verified' | 'notable_verified'
  followerCount: number
  createdAt: Date
  updatedAt: Date
}

// Public profile view (what other users see)
export interface PublicProfile {
  id: string
  username: string
  displayName: string | null
  bio: string | null
  avatar: string | null
  website: string | null
  isVerified: boolean
  verificationStatus: string
  followerCount: number
}

// User authentication response
export interface AuthUser {
  id: string
  email: string
  name: string
  username: string
  displayName: string | null
  isVerified: boolean
  verificationStatus: string
  followerCount: number
}

// Verification tier levels
export type VerificationTier = 
  | 'email_verified'
  | 'phone_verified' 
  | 'identity_verified'
  | 'notable_verified'

// User role types  
export type UserRole = 'creator' | 'admin' | 'moderator'

// frontend/src/types/user.ts  
// Version: 1.0.0
// User type definitions for ParaSocial frontend
// Added: displayName, username, verification properties for creator dashboard