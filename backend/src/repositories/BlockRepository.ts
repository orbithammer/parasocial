// backend/src/repositories/BlockRepository.ts
// Data access layer for Block operations using Prisma with proper TypeScript types

import { PrismaClient } from '@prisma/client'

/**
 * Block repository class
 * Handles database operations for user blocking
 */
export class BlockRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new block relationship
   * @param blockData - Block data to create
   * @param blockData.blockerId - ID of the user doing the blocking
   * @param blockData.blockedId - ID of the user being blocked
   * @param blockData.reason - Optional reason for blocking
   * @returns Promise<Object> Created block relationship
   */
  async create(blockData: {
    blockerId: string
    blockedId: string
    reason?: string | null
  }) {
    return await this.prisma.block.create({
      data: {
        blockerId: blockData.blockerId,
        blockedId: blockData.blockedId,
        reason: blockData.reason || null
      }
    })
  }

  /**
   * Find block relationship by blocker and blocked user
   * @param blockerId - Blocker user ID
   * @param blockedId - Blocked user ID
   * @returns Promise<Object|null> Block relationship or null if not found
   */
  async findByBlockerAndBlocked(blockerId: string, blockedId: string) {
    return await this.prisma.block.findFirst({
      where: {
        blockerId: blockerId,
        blockedId: blockedId
      }
    })
  }

  /**
   * Find block relationship by ID
   * @param id - Block relationship ID
   * @returns Promise<Object|null> Block relationship or null if not found
   */
  async findById(id: string) {
    return await this.prisma.block.findUnique({
      where: { id }
    })
  }

  /**
   * Get users blocked by a specific user with pagination
   * @param userId - User ID to get blocked users for
   * @param options - Pagination options
   * @param options.offset - Number of records to skip
   * @param options.limit - Number of records to return
   * @returns Promise<Object> Blocked users array and total count
   */
  async findBlockedByUserId(userId: string, options: { offset?: number; limit?: number } = {}) {
    const { offset = 0, limit = 20 } = options

    const [blocked, totalCount] = await Promise.all([
      this.prisma.block.findMany({
        where: {
          blockerId: userId
        },
        select: {
          id: true,
          blockedId: true,
          reason: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      this.prisma.block.count({
        where: {
          blockerId: userId
        }
      })
    ])

    return {
      blocked,
      totalCount
    }
  }

  /**
   * Delete block relationship by ID
   * @param id - Block relationship ID
   * @returns Promise<Object> Deleted block relationship
   */
  async delete(id: string) {
    return await this.prisma.block.delete({
      where: { id }
    })
  }

  /**
   * Delete block relationship by blocker and blocked
   * @param blockerId - Blocker user ID
   * @param blockedId - Blocked user ID
   * @returns Promise<Object> Deleted block relationship
   */
  async deleteByBlockerAndBlocked(blockerId: string, blockedId: string) {
    return await this.prisma.block.deleteMany({
      where: {
        blockerId: blockerId,
        blockedId: blockedId
      }
    })
  }

  /**
   * Check if user A has blocked user B
   * @param blockerId - Potential blocker ID
   * @param blockedId - Potential blocked user ID
   * @returns Promise<boolean> True if blocked, false otherwise
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.findByBlockerAndBlocked(blockerId, blockedId)
    return block !== null
  }

  /**
   * Get count of users blocked by a user
   * @param userId - User ID to count blocked users for
   * @returns Promise<number> Number of blocked users
   */
  async getBlockedCount(userId: string): Promise<number> {
    return await this.prisma.block.count({
      where: {
        blockerId: userId
      }
    })
  }

  /**
   * Check if any blocking relationship exists between two users
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns Promise<boolean> True if either user blocks the other
   */
  async hasBlockingRelationship(userId1: string, userId2: string): Promise<boolean> {
    const blockCount = await this.prisma.block.count({
      where: {
        OR: [
          {
            blockerId: userId1,
            blockedId: userId2
          },
          {
            blockerId: userId2,
            blockedId: userId1
          }
        ]
      }
    })

    return blockCount > 0
  }

  /**
   * Get all users that have blocked a specific user
   * @param userId - User ID to check who has blocked them
   * @returns Promise<Array> Array of user IDs that have blocked this user
   */
  async getUsersWhoBlocked(userId: string): Promise<string[]> {
    const blocks = await this.prisma.block.findMany({
      where: {
        blockedId: userId
      },
      select: {
        blockerId: true
      }
    })

    return blocks.map(block => block.blockerId)
  }
}