// backend/src/repositories/FollowRepository.ts
// Complete data access layer for Follow operations using Prisma with proper TypeScript types

import { PrismaClient } from '@prisma/client'

interface FollowCreateData {
  followerId: string    // Required - either local user ID or external actor ID
  followedId: string    // Required - always a ParaSocial user ID
  actorId?: string | null | undefined // Optional - ActivityPub actor URI for federation
}

interface PaginationOptions {
  offset?: number | undefined
  limit?: number | undefined
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
    // Prevent self-following
    if (followData.followerId === followData.followedId) {
      throw new Error('Users cannot follow themselves')
    }

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
    const offset = Math.max(0, options.offset || 0)
    const limit = Math.max(1, Math.min(100, options.limit || 20))

    // Get followers with pagination
    const followers = await this.prisma.follow.findMany({
      where: {
        followedId: userId,
        isAccepted: true
      },
      select: {
        id: true,
        followerId: true,
        actorId: true,
        createdAt: true,
        // Include followed user details
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
    })

    // Get total count for pagination metadata
    const totalCount = await this.prisma.follow.count({
      where: {
        followedId: userId,
        isAccepted: true
      }
    })

    return {
      followers,
      totalCount,
      hasMore: offset + limit < totalCount
    }
  }

  /**
   * Get users that a specific user is following with pagination
   * @param userId - User ID to get following list for
   * @param options - Pagination options
   * @returns Promise<Object> Following array and total count
   */
  async findFollowingByUserId(userId: string, options: PaginationOptions = {}) {
    const offset = Math.max(0, options.offset || 0)
    const limit = Math.max(1, Math.min(100, options.limit || 20))

    // Get following list with pagination
    const following = await this.prisma.follow.findMany({
      where: {
        OR: [
          { followerId: userId },
          { actorId: userId }
        ],
        isAccepted: true
      },
      select: {
        id: true,
        followedId: true,
        createdAt: true,
        // Include followed user data
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
    })

    // Get total count for pagination metadata
    const totalCount = await this.prisma.follow.count({
      where: {
        OR: [
          { followerId: userId },
          { actorId: userId }
        ],
        isAccepted: true
      }
    })

    return {
      following,
      totalCount,
      hasMore: offset + limit < totalCount
    }
  }

  /**
   * Get follow statistics for a user
   * @param userId - User ID to get stats for
   * @returns Promise<FollowStats> Follow statistics
   */
  async getFollowStats(userId: string): Promise<FollowStats> {
    // Count followers
    const followerCount = await this.prisma.follow.count({
      where: {
        followedId: userId,
        isAccepted: true
      }
    })

    // Count following (handles both local and ActivityPub)
    const followingCount = await this.prisma.follow.count({
      where: {
        OR: [
          { followerId: userId },
          { actorId: userId }
        ],
        isAccepted: true
      }
    })

    return {
      followerCount,
      followingCount
    }
  }

  /**
   * Check if a user is following another user
   * @param followerId - Follower ID or actor ID
   * @param followedId - Followed user ID
   * @returns Promise<boolean> True if following, false otherwise
   */
  async isFollowing(followerId: string, followedId: string): Promise<boolean> {
    const follow = await this.prisma.follow.findFirst({
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

    // Return true only if follow exists AND is accepted
    return follow !== null && follow.isAccepted === true
  }

  /**
   * Bulk check follow status for multiple users (for efficient UI updates)
   * @param followerId - Follower ID or actor ID
   * @param userIds - Array of user IDs to check
   * @returns Promise<Record<string, boolean>> Map of user ID to follow status
   */
  async bulkCheckFollowing(followerId: string, userIds: string[]): Promise<Record<string, boolean>> {
    // Get all follows for this follower to the specified users
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

    // Create a map of followed user IDs
    const followedUserIds = new Set(follows.map(f => f.followedId))

    // Return a map with all requested user IDs
    const result: Record<string, boolean> = {}
    for (const userId of userIds) {
      result[userId] = followedUserIds.has(userId)
    }

    return result
  }

  /**
   * Get recent followers for a user (for notifications/activity feed)
   * @param userId - User ID to get recent followers for
   * @param limit - Maximum number of followers to return
   * @returns Promise<Array> Array of recent follow relationships with follower details
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
        // Include follower user details for notifications
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
      take: Math.max(1, Math.min(50, limit))
    })
  }

  // Compatibility methods for integration tests

  /**
   * Get followers for a specific user with page-based pagination
   * This method provides compatibility for tests that expect page/limit interface
   * @param userId - User ID to get followers for
   * @param options - Page-based pagination options
   * @returns Promise<Array> Array of follow relationships
   */
  async getFollowers(userId: string, options: { page?: number; limit?: number | undefined } = {}) {
    const page = Math.max(1, options.page || 1)
    const limit = Math.max(1, Math.min(100, options.limit || 20))
    const offset = (page - 1) * limit

    // Use existing findFollowersByUserId method with converted pagination
    const result = await this.findFollowersByUserId(userId, { offset, limit })
    
    // Return just the followers array for test compatibility
    return result.followers
  }

  /**
   * Delete follow relationship using follower and followed IDs
   * This method provides compatibility for tests that expect simple delete interface
   * @param followerId - Follower ID or actor ID
   * @param followedId - Followed user ID
   * @returns Promise<Object|null> Deleted follow relationship or null if not found
   */
  async delete(followerId: string, followedId: string) {
    // Use existing deleteByFollowerAndFollowed method
    return await this.deleteByFollowerAndFollowed(followerId, followedId)
  }
}