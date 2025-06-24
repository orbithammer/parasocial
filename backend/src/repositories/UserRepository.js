// backend/src/repositories/UserRepository.js
// Enhanced user repository with methods for posts and follows

import { User } from '../models/User.js'

/**
 * User repository class
 * Handles database operations for users
 */
export class UserRepository {
  constructor(prismaClient) {
    this.prisma = prismaClient
  }

  /**
   * Create a new user
   * @param {Object} userData - User data to create
   * @returns {Promise<User>} Created user instance
   */
  async create(userData) {
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
   * @param {string} id - User ID
   * @returns {Promise<User|null>} User instance or null if not found
   */
  async findById(id) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id }
    })

    return dbUser ? new User(dbUser) : null
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<User|null>} User instance or null if not found
   */
  async findByEmail(email) {
    const dbUser = await this.prisma.user.findUnique({
      where: { email }
    })

    return dbUser ? new User(dbUser) : null
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<User|null>} User instance or null if not found
   */
  async findByUsername(username) {
    const dbUser = await this.prisma.user.findUnique({
      where: { username }
    })

    return dbUser ? new User(dbUser) : null
  }

  /**
   * Find user by email or username
   * @param {string} email - User email
   * @param {string} username - Username
   * @returns {Promise<User|null>} User instance or null if not found
   */
  async findByEmailOrUsername(email, username) {
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
   * @param {string} username - Username
   * @returns {Promise<User|null>} User instance with counts or null if not found
   */
  async findByUsernameWithCounts(username) {
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
    user.followersCount = dbUser._count.followers
    user.postsCount = dbUser._count.posts

    return user
  }

  /**
   * Update user by ID
   * @param {string} id - User ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<User>} Updated user instance
   */
  async update(id, updateData) {
    const dbUser = await this.prisma.user.update({
      where: { id },
      data: updateData
    })

    return new User(dbUser)
  }

  /**
   * Delete user by ID (soft delete by setting isActive to false)
   * @param {string} id - User ID
   * @returns {Promise<User>} Updated user instance
   */
  async delete(id) {
    const dbUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false }
    })

    return new User(dbUser)
  }

  /**
   * Search users by username or display name
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @param {number} options.offset - Number of records to skip
   * @param {number} options.limit - Number of records to return
   * @returns {Promise<Object>} Users array and total count
   */
  async searchUsers(query, options = {}) {
    const { offset = 0, limit = 20 } = options

    const searchCondition = {
      AND: [
        { isActive: true },
        {
          OR: [
            {
              username: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              displayName: {
                contains: query,
                mode: 'insensitive'
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
      user.followersCount = dbUser._count.followers
      user.postsCount = dbUser._count.posts
      return user
    })

    return {
      users,
      totalCount
    }
  }

  /**
   * Get all verified users
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Verified users array and total count
   */
  async findVerifiedUsers(options = {}) {
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
      user.followersCount = dbUser._count.followers
      user.postsCount = dbUser._count.posts
      return user
    })

    return {
      users,
      totalCount
    }
  }

  /**
   * Check if username is available
   * @param {string} username - Username to check
   * @param {string} excludeUserId - User ID to exclude from check (for updates)
   * @returns {Promise<boolean>} True if username is available
   */
  async isUsernameAvailable(username, excludeUserId = null) {
    const where = { username }
    if (excludeUserId) {
      where.id = { not: excludeUserId }
    }

    const user = await this.prisma.user.findFirst({ where })
    return user === null
  }

  /**
   * Check if email is available
   * @param {string} email - Email to check
   * @param {string} excludeUserId - User ID to exclude from check (for updates)
   * @returns {Promise<boolean>} True if email is available
   */
  async isEmailAvailable(email, excludeUserId = null) {
    const where = { email }
    if (excludeUserId) {
      where.id = { not: excludeUserId }
    }

    const user = await this.prisma.user.findFirst({ where })
    return user === null
  }

  /**
   * Get user statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(userId) {
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