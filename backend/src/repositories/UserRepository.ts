// backend/src/repositories/UserRepository.ts
// Enhanced user repository with methods for posts and follows using proper TypeScript types

import { PrismaClient } from '@prisma/client'
import { User } from '../models/User'

interface UserCreateData {
  email: string
  username: string
  password: string
  displayName?: string
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
        passwordHash: userData.password,
        displayName: userData.displayName || userData.username
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
            posts: {
              where: {
                isPublished: true
              }
            }
          }
        }
      }
    })

    if (!dbUser) {
      return null
    }

    // Create User instance and add count properties
    const user = new User(dbUser)
    // Add dynamic properties for counts
    ;(user as any).followersCount = dbUser._count.followers
    ;(user as any).postsCount = dbUser._count.posts

    return user
  }

  /**
   * Update user by ID
   * @param id - User ID
   * @param updateData - Data to update
   * @returns Promise<User> Updated user instance
   */
  async update(id: string, updateData: UserUpdateData): Promise<User> {
    const dbUser = await this.prisma.user.update({
      where: { id },
      data: updateData
    })

    return new User(dbUser)
  }

  /**
   * Delete user by ID (soft delete by setting isActive to false)
   * @param id - User ID
   * @returns Promise<User> Updated user instance
   */
  async delete(id: string): Promise<User> {
    const dbUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false }
    })

    return new User(dbUser)
  }

  /**
   * Search users by username or display name
   * @param query - Search query
   * @param options - Search options
   * @returns Promise<Object> Users array and total count
   */
  async searchUsers(query: string, options: SearchOptions = {}) {
    const { offset = 0, limit = 20 } = options

    const searchCondition = {
      AND: [
        { isActive: true },
        {
          OR: [
            {
              username: {
                contains: query,
                mode: 'insensitive' as const
              }
            },
            {
              displayName: {
                contains: query,
                mode: 'insensitive' as const
              }
            }
          ]
        }
      ]
    }

    const [dbUsers, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: searchCondition,
        include: {
          _count: {
            select: {
              followers: true,
              posts: {
                where: {
                  isPublished: true
                }
              }
            }
          }
        },
        orderBy: [
          { isVerified: 'desc' },
          { followers: { _count: 'desc' } }
        ],
        skip: offset,
        take: limit
      }),
      this.prisma.user.count({ where: searchCondition })
    ])

    // Convert to User instances with counts
    const users = dbUsers.map(dbUser => {
      const user = new User(dbUser)
      ;(user as any).followersCount = dbUser._count.followers
      ;(user as any).postsCount = dbUser._count.posts
      return user
    })

    return {
      users,
      totalCount
    }
  }

  /**
   * Get all verified users
   * @param options - Query options
   * @returns Promise<Object> Verified users array and total count
   */
  async findVerifiedUsers(options: SearchOptions = {}) {
    const { offset = 0, limit = 20 } = options

    const [dbUsers, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          isActive: true,
          isVerified: true
        },
        include: {
          _count: {
            select: {
              followers: true,
              posts: {
                where: {
                  isPublished: true
                }
              }
            }
          }
        },
        orderBy: [
          { followers: { _count: 'desc' } },
          { createdAt: 'asc' }
        ],
        skip: offset,
        take: limit
      }),
      this.prisma.user.count({
        where: {
          isActive: true,
          isVerified: true
        }
      })
    ])

    // Convert to User instances with counts
    const users = dbUsers.map(dbUser => {
      const user = new User(dbUser)
      ;(user as any).followersCount = dbUser._count.followers
      ;(user as any).postsCount = dbUser._count.posts
      return user
    })

    return {
      users,
      totalCount
    }
  }

  /**
   * Check if username is available
   * @param username - Username to check
   * @param excludeUserId - User ID to exclude from check (for updates)
   * @returns Promise<boolean> True if username is available
   */
  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const where: any = { username }
    if (excludeUserId) {
      where.id = { not: excludeUserId }
    }

    const user = await this.prisma.user.findFirst({ where })
    return user === null
  }

  /**
   * Check if email is available
   * @param email - Email to check
   * @param excludeUserId - User ID to exclude from check (for updates)
   * @returns Promise<boolean> True if email is available
   */
  async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
    const where: any = { email }
    if (excludeUserId) {
      where.id = { not: excludeUserId }
    }

    const user = await this.prisma.user.findFirst({ where })
    return user === null
  }

  /**
   * Get user statistics
   * @param userId - User ID
   * @returns Promise<Object> User statistics
   */
  async getUserStats(userId: string) {
    const stats = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        _count: {
          select: {
            posts: {
              where: {
                isPublished: true
              }
            },
            followers: true
          }
        }
      }
    })

    return {
      postsCount: stats?._count?.posts || 0,
      followersCount: stats?._count?.followers || 0
    }
  }
}