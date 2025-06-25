// backend/src/repositories/FollowRepository.ts
// Data access layer for Follow operations using Prisma with proper TypeScript types

import { PrismaClient } from '@prisma/client'

interface FollowCreateData {
  followerId: string    // Required - either local user ID or external actor ID
  followedId: string    // Required - always a ParaSocial user ID
  actorId?: string | null // Optional - ActivityPub actor URI for federation
}

interface PaginationOptions {
  offset?: number
  limit?: number
}

/**
 * Follow repository class
 * Handles database operations for follow relationships
 */
export class FollowRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new follow relationship
   * @param followData - Follow data to create
   * @returns Promise<Object> Created follow relationship
   */
  async create(followData: FollowCreateData) {
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
   * @param followerId - Follower ID or actor ID
   * @param followedId - Followed user ID
   * @returns Promise<Object|null> Follow relationship or null if not found
   */
  async findByFollowerAndFollowed(followerId: string, followedId: string) {
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
   * @param id - Follow relationship ID
   * @returns Promise<Object|null> Follow relationship or null if not found
   */
  async findById(id: string) {
    return await this.prisma.follow.findUnique({
      where: { id }
    })
  }

  /**
   * Get followers for a specific user with pagination
   * @param userId - User ID to get followers for
   * @param options - Pagination options
   * @returns Promise<Object> Followers array and total count
   */
  async findFollowersByUserId(userId: string, options: PaginationOptions = {}) {
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
   * @param userId - User ID to get following for
   * @param options - Pagination options
   * @returns Promise<Object> Following array and total count
   */
  async findFollowingByUserId(userId: string, options: PaginationOptions = {}) {
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
   * @param id - Follow relationship ID
   * @returns Promise<Object> Deleted follow relationship
   */
  async delete(id: string) {
    return await this.prisma.follow.delete({
      where: { id }
    })
  }

  /**
   * Delete follow relationship by follower and followed
   * @param followerId - Follower ID
   * @param followedId - Followed user ID
   * @returns Promise<Object> Deleted follow relationship
   */
  async deleteByFollowerAndFollowed(followerId: string, followedId: string) {
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
   * @param userId - User ID to count followers for
   * @returns Promise<number> Number of followers
   */
  async getFollowerCount(userId: string): Promise<number> {
    return await this.prisma.follow.count({
      where: {
        followedId: userId
      }
    })
  }

  /**
   * Get following count for a user
   * @param userId - User ID to count following for
   * @returns Promise<number> Number of users being followed
   */
  async getFollowingCount(userId: string): Promise<number> {
    return await this.prisma.follow.count({
      where: {
        followerId: userId
      }
    })
  }

  /**
   * Check if user A follows user B
   * @param followerId - Potential follower ID
   * @param followedId - Potential followed user ID
   * @returns Promise<boolean> True if following, false otherwise
   */
  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    const follow = await this.findByFollowerAndFollowed(followerId, followedId)
    return follow !== null
  }

  /**
   * Get all followers for a user (for ActivityPub delivery)
   * @param userId - User ID to get followers for
   * @returns Promise<Array> Array of follower actor IDs
   */
  async getAllFollowerActorIds(userId: string): Promise<string[]> {
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
    return follows
      .map(follow => follow.actorId || follow.followerId)
      .filter((id): id is string => Boolean(id))
  }
}