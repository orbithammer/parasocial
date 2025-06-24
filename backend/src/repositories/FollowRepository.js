// backend/src/repositories/FollowRepository.js
// Data access layer for Follow operations using Prisma

/**
 * Follow repository class
 * Handles database operations for follow relationships
 */
export class FollowRepository {
  constructor(prismaClient) {
    this.prisma = prismaClient
  }

  /**
   * Create a new follow relationship
   * @param {Object} followData - Follow data to create
   * @param {string} followData.followerId - ID of the follower (can be external)
   * @param {string} followData.followedId - ID of the followed user (ParaSocial user)
   * @param {string} followData.actorId - ActivityPub actor ID (for federated follows)
   * @returns {Promise<Object>} Created follow relationship
   */
  async create(followData) {
    return await this.prisma.follow.create({
      data: {
        followerId: followData.followerId,
        followedId: followData.followedId,
        actorId: followData.actorId || null
      }
    })
  }

  /**
   * Find follow relationship by follower and followed user
   * @param {string} followerId - Follower ID or actor ID
   * @param {string} followedId - Followed user ID
   * @returns {Promise<Object|null>} Follow relationship or null if not found
   */
  async findByFollowerAndFollowed(followerId, followedId) {
    return await this.prisma.follow.findFirst({
      where: {
        OR: [
          {
            followerId: followerId,
            followedId: followedId
          },
          {
            actorId: followerId,
            followedId: followedId
          }
        ]
      }
    })
  }

  /**
   * Find follow relationship by ID
   * @param {string} id - Follow relationship ID
   * @returns {Promise<Object|null>} Follow relationship or null if not found
   */
  async findById(id) {
    return await this.prisma.follow.findUnique({
      where: { id }
    })
  }

  /**
   * Get followers for a specific user with pagination
   * @param {string} userId - User ID to get followers for
   * @param {Object} options - Pagination options
   * @param {number} options.offset - Number of records to skip
   * @param {number} options.limit - Number of records to return
   * @returns {Promise<Object>} Followers array and total count
   */
  async findFollowersByUserId(userId, options = {}) {
    const { offset = 0, limit = 20 } = options

    const [followers, totalCount] = await Promise.all([
      this.prisma.follow.findMany({
        where: {
          followedId: userId
        },
        select: {
          id: true,
          followerId: true,
          actorId: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      this.prisma.follow.count({
        where: {
          followedId: userId
        }
      })
    ])

    return {
      followers,
      totalCount
    }
  }

  /**
   * Get users that a specific user is following
   * @param {string} userId - User ID to get following for
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Following array and total count
   */
  async findFollowingByUserId(userId, options = {}) {
    const { offset = 0, limit = 20 } = options

    const [following, totalCount] = await Promise.all([
      this.prisma.follow.findMany({
        where: {
          followerId: userId
        },
        include: {
          followed: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true,
              verificationTier: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      this.prisma.follow.count({
        where: {
          followerId: userId
        }
      })
    ])

    return {
      following,
      totalCount
    }
  }

  /**
   * Delete follow relationship by ID
   * @param {string} id - Follow relationship ID
   * @returns {Promise<Object>} Deleted follow relationship
   */
  async delete(id) {
    return await this.prisma.follow.delete({
      where: { id }
    })
  }

  /**
   * Delete follow relationship by follower and followed
   * @param {string} followerId - Follower ID
   * @param {string} followedId - Followed user ID
   * @returns {Promise<Object>} Deleted follow relationship
   */
  async deleteByFollowerAndFollowed(followerId, followedId) {
    return await this.prisma.follow.deleteMany({
      where: {
        OR: [
          {
            followerId: followerId,
            followedId: followedId
          },
          {
            actorId: followerId,
            followedId: followedId
          }
        ]
      }
    })
  }

  /**
   * Get follower count for a user
   * @param {string} userId - User ID to count followers for
   * @returns {Promise<number>} Number of followers
   */
  async getFollowerCount(userId) {
    return await this.prisma.follow.count({
      where: {
        followedId: userId
      }
    })
  }

  /**
   * Get following count for a user
   * @param {string} userId - User ID to count following for
   * @returns {Promise<number>} Number of users being followed
   */
  async getFollowingCount(userId) {
    return await this.prisma.follow.count({
      where: {
        followerId: userId
      }
    })
  }

  /**
   * Check if user A follows user B
   * @param {string} followerId - Potential follower ID
   * @param {string} followedId - Potential followed user ID
   * @returns {Promise<boolean>} True if following, false otherwise
   */
  async isFollowing(followerId, followedId) {
    const follow = await this.findByFollowerAndFollowed(followerId, followedId)
    return follow !== null
  }

  /**
   * Get all followers for a user (for ActivityPub delivery)
   * @param {string} userId - User ID to get followers for
   * @returns {Promise<Array>} Array of follower actor IDs
   */
  async getAllFollowerActorIds(userId) {
    const follows = await this.prisma.follow.findMany({
      where: {
        followedId: userId
      },
      select: {
        followerId: true,
        actorId: true
      }
    })

    // Return actor IDs for federated followers, or follower IDs for local followers
    return follows.map(follow => follow.actorId || follow.followerId)
  }
}