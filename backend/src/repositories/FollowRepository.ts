// backend/src/repositories/FollowRepository.ts
// Complete data access layer for Follow operations using Prisma with proper TypeScript types

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

interface FollowStats {
  followerCount: number
  followingCount: number
}

/**
 * Follow repository class
 * Handles database operations for follow relationships
 * Supports both local and federated follow relationships via ActivityPub
 */
export class FollowRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new follow relationship
   * @param followData - Follow data to create
   * @returns Promise<Object> Created follow relationship with included user data
   */
  async create(followData: FollowCreateData) {
    return await this.prisma.follow.create({
      data: {
        followerId: followData.followerId,
        followedId: followData.followedId,
        actorId: followData.actorId || null,
        isAccepted: true // Default to accepted for Phase 2.3
      },
      include: {
        followed: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        }
      }
    })
  }

  /**
   * Find follow relationship by follower and followed user
   * Handles both local user IDs and ActivityPub actor IDs
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
      },
      include: {
        followed: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        }
      }
    })
  }

  /**
   * Delete follow relationship
   * @param followerId - Follower ID or actor ID
   * @param followedId - Followed user ID
   * @returns Promise<Object|null> Deleted follow relationship or null if not found
   */
  async deleteByFollowerAndFollowed(followerId: string, followedId: string) {
    // First find the follow relationship to delete
    const followToDelete = await this.findByFollowerAndFollowed(followerId, followedId)
    
    if (!followToDelete) {
      return null
    }

    // Delete the found follow relationship
    return await this.prisma.follow.delete({
      where: {
        id: followToDelete.id
      },
      include: {
        followed: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        }
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
      where: { id },
      include: {
        followed: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        }
      }
    })
  }

  /**
   * Get followers for a specific user with pagination
   * Returns list of users/actors following the specified user
   * @param userId - User ID to get followers for
   * @param options - Pagination options
   * @returns Promise<Object> Followers array and total count
   */
  async findFollowersByUserId(userId: string, options: PaginationOptions = {}) {
    const { offset = 0, limit = 20 } = options

    const [followers, totalCount] = await Promise.all([
      this.prisma.follow.findMany({
        where: {
          followedId: userId,
          isAccepted: true
        },
        select: {
          id: true,
          followerId: true,
          actorId: true,
          createdAt: true,
          // Include followed user data (the ParaSocial user being followed)
          followed: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true
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
          followedId: userId,
          isAccepted: true
        }
      })
    ])

    return {
      followers,
      totalCount,
      hasMore: offset + limit < totalCount
    }
  }

  /**
   * Get users that a specific user is following
   * Note: For ParaSocial, this will mainly be empty since users are content creators,
   * but included for completeness and potential future features
   * @param followerId - Follower ID to get following list for
   * @param options - Pagination options
   * @returns Promise<Object> Following array and total count
   */
  async findFollowingByUserId(followerId: string, options: PaginationOptions = {}) {
    const { offset = 0, limit = 20 } = options

    const [following, totalCount] = await Promise.all([
      this.prisma.follow.findMany({
        where: {
          OR: [
            { followerId: followerId },
            { actorId: followerId }
          ],
          isAccepted: true
        },
        select: {
          id: true,
          followerId: true,
          actorId: true,
          createdAt: true,
          followed: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              isVerified: true
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
          OR: [
            { followerId: followerId },
            { actorId: followerId }
          ],
          isAccepted: true
        }
      })
    ])

    return {
      following,
      totalCount,
      hasMore: offset + limit < totalCount
    }
  }

  /**
   * Get follow statistics for a user
   * @param userId - User ID to get stats for
   * @returns Promise<FollowStats> Follower and following counts
   */
  async getFollowStats(userId: string): Promise<FollowStats> {
    const [followerCount, followingCount] = await Promise.all([
      this.prisma.follow.count({
        where: {
          followedId: userId,
          isAccepted: true
        }
      }),
      this.prisma.follow.count({
        where: {
          OR: [
            { followerId: userId },
            { actorId: userId }
          ],
          isAccepted: true
        }
      })
    ])

    return {
      followerCount,
      followingCount
    }
  }

  /**
   * Check if one user follows another
   * @param followerId - Follower ID or actor ID
   * @param followedId - Followed user ID
   * @returns Promise<boolean> True if follow relationship exists
   */
  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    const follow = await this.findByFollowerAndFollowed(followerId, followedId)
    return follow !== null && follow.isAccepted
  }

  /**
   * Get recent followers for a user (useful for notifications)
   * @param userId - User ID to get recent followers for
   * @param limit - Number of recent followers to return
   * @returns Promise<Array> Recent followers
   */
  async findRecentFollowers(userId: string, limit: number = 10) {
    return await this.prisma.follow.findMany({
      where: {
        followedId: userId,
        isAccepted: true
      },
      select: {
        id: true,
        followerId: true,
        actorId: true,
        createdAt: true,
        followed: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })
  }

  /**
   * Bulk check if user is following multiple other users
   * Useful for marking follow status in user lists
   * @param followerId - Follower ID or actor ID
   * @param userIds - Array of user IDs to check
   * @returns Promise<Record<string, boolean>> Map of userId -> isFollowing
   */
  async bulkCheckFollowing(followerId: string, userIds: string[]): Promise<Record<string, boolean>> {
    const follows = await this.prisma.follow.findMany({
      where: {
        OR: [
          { followerId: followerId },
          { actorId: followerId }
        ],
        followedId: { in: userIds },
        isAccepted: true
      },
      select: {
        followedId: true
      }
    })

    // Create a map with all userIds set to false, then set followed ones to true
    const result: Record<string, boolean> = {}
    userIds.forEach(userId => {
      result[userId] = false
    })
    
    follows.forEach(follow => {
      result[follow.followedId] = true
    })

    return result
  }
}