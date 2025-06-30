// backend/src/repositories/UserRepository.ts
// Enhanced user repository with methods for authentication and user management using proper TypeScript types

import { PrismaClient } from '@prisma/client'
import { User } from '../models/User'

interface UserCreateData {
  email: string
  username: string
  passwordHash: string
  displayName?: string
  bio?: string | null
  isVerified?: boolean
  verificationTier?: string
}

interface UserUpdateData {
  displayName?: string
  bio?: string
  avatar?: string
  website?: string
  isVerified?: boolean
  verificationTier?: string
  isActive?: boolean
}

interface SearchOptions {
  offset?: number
  limit?: number
}

/**
 * User repository class
 * Handles database operations for users
 */
export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new user
   * @param userData - User data to create
   * @returns Promise<User> Created user instance
   */
  async create(userData: UserCreateData): Promise<User> {
    const dbUser = await this.prisma.user.create({
      data: {
        email: userData.email,
        username: userData.username,
        passwordHash: userData.passwordHash,
        displayName: userData.displayName || userData.username,
        bio: userData.bio || '',
        isVerified: userData.isVerified ?? false,
        verificationTier: userData.verificationTier || 'none'
      }
    })

    return new User(dbUser)
  }

  /**
   * Find user by ID
   * @param id - User ID
   * @returns Promise<User|null> User instance or null if not found
   */
  async findById(id: string): Promise<User | null> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id }
    })

    return dbUser ? new User(dbUser) : null
  }

  /**
   * Find user by email
   * @param email - User email
   * @returns Promise<User|null> User instance or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    const dbUser = await this.prisma.user.findUnique({
      where: { email }
    })

    return dbUser ? new User(dbUser) : null
  }

  /**
   * Find user by username
   * @param username - Username
   * @returns Promise<User|null> User instance or null if not found
   */
  async findByUsername(username: string): Promise<User | null> {
    const dbUser = await this.prisma.user.findUnique({
      where: { username }
    })

    return dbUser ? new User(dbUser) : null
  }

  /**
   * Find user by email or username
   * @param email - User email
   * @param username - Username
   * @returns Promise<User|null> User instance or null if not found
   */
  async findByEmailOrUsername(email: string, username: string): Promise<User | null> {
    const dbUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { username: username }
        ]
      }
    })

    return dbUser ? new User(dbUser) : null
  }

  /**
   * Find user by username with follower and post counts
   * @param username - Username
   * @returns Promise<User|null> User instance with counts or null if not found
   */
  async findByUsernameWithCounts(username: string): Promise<User | null> {
    const dbUser = await this.prisma.user.findUnique({
      where: { username },
      include: {
        _count: {
          select: {
            followers: true,
            posts: true
          }
        }
      }
    })

    if (!dbUser) return null

    // Add counts to user data
    const userData = {
      ...dbUser,
      followersCount: dbUser._count.followers,
      postsCount: dbUser._count.posts
    }

    return new User(userData)
  }

  /**
   * Update user data
   * @param id - User ID
   * @param userData - Data to update
   * @returns Promise<User|null> Updated user instance or null if not found
   */
  async update(id: string, userData: UserUpdateData): Promise<User | null> {
    try {
      const dbUser = await this.prisma.user.update({
        where: { id },
        data: {
          ...userData,
          updatedAt: new Date()
        }
      })

      return new User(dbUser)
    } catch (error) {
      // User not found or other error
      return null
    }
  }

  /**
   * Delete user (soft delete by setting isActive to false)
   * @param id - User ID
   * @returns Promise<boolean> True if user was deactivated
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Hard delete user (permanently remove from database)
   * @param id - User ID
   * @returns Promise<boolean> True if user was deleted
   */
  async hardDelete(id: string): Promise<boolean> {
    try {
      await this.prisma.user.delete({
        where: { id }
      })
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Search users by username or display name
   * @param query - Search query
   * @param options - Search options (pagination)
   * @returns Promise<User[]> Array of matching users
   */
  async search(query: string, options: SearchOptions = {}): Promise<User[]> {
    const { offset = 0, limit = 20 } = options

    const dbUsers = await this.prisma.user.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { username: { contains: query } },
              { displayName: { contains: query } }
            ]
          }
        ]
      },
      skip: offset,
      take: limit,
      orderBy: {
        username: 'asc'
      }
    })

    return dbUsers.map(dbUser => new User(dbUser))
  }

  /**
   * Get user count (for admin/stats purposes)
   * @returns Promise<number> Total number of active users
   */
  async getActiveUserCount(): Promise<number> {
    return await this.prisma.user.count({
      where: { isActive: true }
    })
  }

  /**
   * Get recently registered users
   * @param limit - Number of users to return
   * @returns Promise<User[]> Array of recently registered users
   */
  async getRecentUsers(limit: number = 10): Promise<User[]> {
    const dbUsers = await this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return dbUsers.map(dbUser => new User(dbUser))
  }

  /**
   * Check if username is available
   * @param username - Username to check
   * @param excludeUserId - User ID to exclude from check (for updates)
   * @returns Promise<boolean> True if username is available
   */
  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const existingUser = await this.prisma.user.findUnique({
      where: { username }
    })

    if (!existingUser) return true
    if (excludeUserId && existingUser.id === excludeUserId) return true
    return false
  }

  /**
   * Check if email is available
   * @param email - Email to check
   * @param excludeUserId - User ID to exclude from check (for updates)
   * @returns Promise<boolean> True if email is available
   */
  async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    })

    if (!existingUser) return true
    if (excludeUserId && existingUser.id === excludeUserId) return true
    return false
  }

  /**
   * Get users by verification tier
   * @param tier - Verification tier to filter by
   * @param options - Search options (pagination)
   * @returns Promise<User[]> Array of users with specified verification tier
   */
  async getByVerificationTier(tier: string, options: SearchOptions = {}): Promise<User[]> {
    const { offset = 0, limit = 20 } = options

    const dbUsers = await this.prisma.user.findMany({
      where: {
        verificationTier: tier,
        isActive: true
      },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' }
    })

    return dbUsers.map(dbUser => new User(dbUser))
  }
}

// Export types for use in other files
export type {
  UserCreateData,
  UserUpdateData,
  SearchOptions
}