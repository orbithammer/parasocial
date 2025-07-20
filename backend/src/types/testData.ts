// src/types/testData.ts
// Version: 1.0.0
// Initial creation of test data types to resolve TypeScript errors

/**
 * Interface for test user data structure
 * Matches the actual database schema properties
 */
export interface TestUser {
  id: string
  email: string
  username: string
  displayName: string | null
  bio: string | null
  avatar: string | null
  website: string | null
  passwordHash: string
  isVerified: boolean
  verificationTier: string
  createdAt: Date | string
  updatedAt: Date | string
  deletedAt: Date | string | null
  publicKey: string | null
  privateKey: string | null
  // Adding the missing properties that were causing the type error
  lastLoginAt: Date | string | null
  followersCount: number
  followingCount: number
  postsCount: number
}

/**
 * Interface for test post data structure
 */
export interface TestPost {
  id: string
  content: string
  authorId: string
  createdAt: Date | string
  updatedAt: Date | string
  deletedAt: Date | string | null
  likesCount: number
  repliesCount: number
  repostsCount: number
  isPublic: boolean
}

/**
 * Complete test data structure interface
 */
export interface TestData {
  users: TestUser[]
  posts: TestPost[]
}

// src/types/testData.ts
// Version: 1.0.0
// Initial creation of test data types to resolve TypeScript errors