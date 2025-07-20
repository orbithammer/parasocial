// backend\src\__tests__\helpers\databaseSetup.ts
// Version: 1.0.2
// Removed method using followingId property which doesn't exist in FollowWhereInput type

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Database setup helper for test environment
 * Provides utilities for creating and cleaning test data
 */
export class DatabaseSetup {
  /**
   * Clean up follow relationships for testing
   * Fixed: Changed followingId to followedId to match Prisma schema
   */
  static async cleanupFollows(userIds: string[]): Promise<void> {
    await prisma.follow.deleteMany({
      where: {
        followedId: { in: userIds }
      }
    })
  }

  /**
   * Alternative cleanup method using followerId if that's the correct field name
   */
  static async cleanupFollowsByFollower(userIds: string[]): Promise<void> {
    await prisma.follow.deleteMany({
      where: {
        followerId: { in: userIds }
      }
    })
  }

  /**
   * Create test follow relationship
   * @param followerId - ID of the user who is following
   * @param followedId - ID of the user being followed
   */
  static async createTestFollow(followerId: string, followedId: string): Promise<void> {
    await prisma.follow.create({
      data: {
        followerId,
        followedId
      }
    })
  }

  /**
   * Clean up all test data
   */
  static async cleanup(): Promise<void> {
    await prisma.follow.deleteMany()
    await prisma.user.deleteMany()
  }

  /**
   * Disconnect from database
   */
  static async disconnect(): Promise<void> {
    await prisma.$disconnect()
  }
}

export default DatabaseSetup

// backend\src\__tests__\helpers\databaseSetup.ts
// Version: 1.0.2
// Removed method using followingId property which doesn't exist in FollowWhereInput type