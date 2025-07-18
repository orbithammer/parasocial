// backend/src/repositories/__tests__/BlockRepository.test.ts
// Version: 1.0.0 - Initial BlockRepository test suite using Vitest
// Comprehensive unit tests for BlockRepository class covering all database operations

import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { BlockRepository } from '../BlockRepository'

/**
 * Mock Prisma client type structure
 * Provides type-safe mocking for Prisma operations
 */
type MockPrismaClient = {
  block: {
    create: MockedFunction<any>
    findFirst: MockedFunction<any>
    findUnique: MockedFunction<any>
    findMany: MockedFunction<any>
    count: MockedFunction<any>
    delete: MockedFunction<any>
    deleteMany: MockedFunction<any>
  }
}

/**
 * Test suite for BlockRepository class
 * Tests all database operations for user blocking functionality
 */
describe('BlockRepository', () => {
  let blockRepository: BlockRepository
  let mockPrisma: MockPrismaClient

  // Test data constants
  const mockBlockData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    blockerId: '223e4567-e89b-12d3-a456-426614174000',
    blockedId: '323e4567-e89b-12d3-a456-426614174000',
    reason: 'Test block reason',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z')
  }

  const mockCreateData = {
    blockerId: mockBlockData.blockerId,
    blockedId: mockBlockData.blockedId,
    reason: mockBlockData.reason
  }

  /**
   * Setup fresh mocks and repository instance before each test
   * Ensures isolated test conditions
   */
  beforeEach(() => {
    // Create mock Prisma client with all required methods
    mockPrisma = {
      block: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn()
      }
    }

    // Create repository instance with mocked Prisma
    blockRepository = new BlockRepository(mockPrisma as unknown as PrismaClient)
  })

  /**
   * Test create method
   * Verifies block relationship creation functionality
   */
  describe('create', () => {
    it('should create a new block relationship with all data', async () => {
      // Setup mock return value
      mockPrisma.block.create.mockResolvedValue(mockBlockData)

      // Execute the method
      const result = await blockRepository.create(mockCreateData)

      // Verify Prisma was called correctly
      expect(mockPrisma.block.create).toHaveBeenCalledWith({
        data: {
          blockerId: mockCreateData.blockerId,
          blockedId: mockCreateData.blockedId,
          reason: mockCreateData.reason
        }
      })

      // Verify return value
      expect(result).toEqual(mockBlockData)
    })

    it('should create block with null reason when reason is undefined', async () => {
      const createDataWithoutReason = {
        blockerId: mockCreateData.blockerId,
        blockedId: mockCreateData.blockedId
      }
      const expectedData = { ...mockBlockData, reason: null }
      mockPrisma.block.create.mockResolvedValue(expectedData)

      await blockRepository.create(createDataWithoutReason)

      // Verify reason is converted to null
      expect(mockPrisma.block.create).toHaveBeenCalledWith({
        data: {
          blockerId: createDataWithoutReason.blockerId,
          blockedId: createDataWithoutReason.blockedId,
          reason: null
        }
      })
    })

    it('should create block with null reason when reason is explicitly null', async () => {
      const createDataWithNullReason = {
        ...mockCreateData,
        reason: null
      }
      const expectedData = { ...mockBlockData, reason: null }
      mockPrisma.block.create.mockResolvedValue(expectedData)

      await blockRepository.create(createDataWithNullReason)

      expect(mockPrisma.block.create).toHaveBeenCalledWith({
        data: {
          blockerId: createDataWithNullReason.blockerId,
          blockedId: createDataWithNullReason.blockedId,
          reason: null
        }
      })
    })

    it('should propagate database errors', async () => {
      const dbError = new Error('Database connection failed')
      mockPrisma.block.create.mockRejectedValue(dbError)

      await expect(blockRepository.create(mockCreateData)).rejects.toThrow('Database connection failed')
    })
  })

  /**
   * Test findByBlockerAndBlocked method
   * Verifies finding specific block relationships
   */
  describe('findByBlockerAndBlocked', () => {
    it('should find existing block relationship', async () => {
      mockPrisma.block.findFirst.mockResolvedValue(mockBlockData)

      const result = await blockRepository.findByBlockerAndBlocked(
        mockBlockData.blockerId,
        mockBlockData.blockedId
      )

      expect(mockPrisma.block.findFirst).toHaveBeenCalledWith({
        where: {
          blockerId: mockBlockData.blockerId,
          blockedId: mockBlockData.blockedId
        }
      })

      expect(result).toEqual(mockBlockData)
    })

    it('should return null when block relationship does not exist', async () => {
      mockPrisma.block.findFirst.mockResolvedValue(null)

      const result = await blockRepository.findByBlockerAndBlocked(
        mockBlockData.blockerId,
        mockBlockData.blockedId
      )

      expect(result).toBeNull()
    })

    it('should propagate database errors', async () => {
      const dbError = new Error('Query failed')
      mockPrisma.block.findFirst.mockRejectedValue(dbError)

      await expect(
        blockRepository.findByBlockerAndBlocked(mockBlockData.blockerId, mockBlockData.blockedId)
      ).rejects.toThrow('Query failed')
    })
  })

  /**
   * Test findById method
   * Verifies finding blocks by unique ID
   */
  describe('findById', () => {
    it('should find block by ID', async () => {
      mockPrisma.block.findUnique.mockResolvedValue(mockBlockData)

      const result = await blockRepository.findById(mockBlockData.id)

      expect(mockPrisma.block.findUnique).toHaveBeenCalledWith({
        where: { id: mockBlockData.id }
      })

      expect(result).toEqual(mockBlockData)
    })

    it('should return null when block with ID does not exist', async () => {
      mockPrisma.block.findUnique.mockResolvedValue(null)

      const result = await blockRepository.findById('non-existent-id')

      expect(result).toBeNull()
    })

    it('should propagate database errors', async () => {
      const dbError = new Error('Database error')
      mockPrisma.block.findUnique.mockRejectedValue(dbError)

      await expect(blockRepository.findById(mockBlockData.id)).rejects.toThrow('Database error')
    })
  })

  /**
   * Test findBlockedByUserId method
   * Verifies pagination and listing of blocked users
   */
  describe('findBlockedByUserId', () => {
    const mockBlockedUsers = [
      {
        id: '123e4567-e89b-12d3-a456-426614174001',
        blockedId: '323e4567-e89b-12d3-a456-426614174001',
        reason: 'Reason 1',
        createdAt: new Date('2024-01-01T10:00:00Z')
      },
      {
        id: '123e4567-e89b-12d3-a456-426614174002',
        blockedId: '323e4567-e89b-12d3-a456-426614174002',
        reason: null,
        createdAt: new Date('2024-01-01T11:00:00Z')
      }
    ]

    it('should return blocked users with default pagination', async () => {
      mockPrisma.block.findMany.mockResolvedValue(mockBlockedUsers)
      mockPrisma.block.count.mockResolvedValue(2)

      const result = await blockRepository.findBlockedByUserId(mockBlockData.blockerId)

      expect(mockPrisma.block.findMany).toHaveBeenCalledWith({
        where: {
          blockerId: mockBlockData.blockerId
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
        skip: 0,
        take: 20
      })

      expect(mockPrisma.block.count).toHaveBeenCalledWith({
        where: {
          blockerId: mockBlockData.blockerId
        }
      })

      expect(result).toEqual({
        blocked: mockBlockedUsers,
        totalCount: 2
      })
    })

    it('should apply custom pagination options', async () => {
      mockPrisma.block.findMany.mockResolvedValue([mockBlockedUsers[0]])
      mockPrisma.block.count.mockResolvedValue(2)

      const options = { offset: 1, limit: 1 }
      await blockRepository.findBlockedByUserId(mockBlockData.blockerId, options)

      expect(mockPrisma.block.findMany).toHaveBeenCalledWith({
        where: {
          blockerId: mockBlockData.blockerId
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
        skip: 1,
        take: 1
      })
    })

    it('should handle empty results', async () => {
      mockPrisma.block.findMany.mockResolvedValue([])
      mockPrisma.block.count.mockResolvedValue(0)

      const result = await blockRepository.findBlockedByUserId(mockBlockData.blockerId)

      expect(result).toEqual({
        blocked: [],
        totalCount: 0
      })
    })

    it('should propagate database errors from findMany', async () => {
      const dbError = new Error('FindMany failed')
      mockPrisma.block.findMany.mockRejectedValue(dbError)
      mockPrisma.block.count.mockResolvedValue(0)

      await expect(
        blockRepository.findBlockedByUserId(mockBlockData.blockerId)
      ).rejects.toThrow('FindMany failed')
    })

    it('should propagate database errors from count', async () => {
      const dbError = new Error('Count failed')
      mockPrisma.block.findMany.mockResolvedValue([])
      mockPrisma.block.count.mockRejectedValue(dbError)

      await expect(
        blockRepository.findBlockedByUserId(mockBlockData.blockerId)
      ).rejects.toThrow('Count failed')
    })
  })

  /**
   * Test delete method
   * Verifies block deletion by ID
   */
  describe('delete', () => {
    it('should delete block by ID', async () => {
      mockPrisma.block.delete.mockResolvedValue(mockBlockData)

      const result = await blockRepository.delete(mockBlockData.id)

      expect(mockPrisma.block.delete).toHaveBeenCalledWith({
        where: { id: mockBlockData.id }
      })

      expect(result).toEqual(mockBlockData)
    })

    it('should propagate database errors', async () => {
      const dbError = new Error('Delete failed')
      mockPrisma.block.delete.mockRejectedValue(dbError)

      await expect(blockRepository.delete(mockBlockData.id)).rejects.toThrow('Delete failed')
    })
  })

  /**
   * Test deleteByBlockerAndBlocked method
   * Verifies deletion of specific block relationships
   */
  describe('deleteByBlockerAndBlocked', () => {
    it('should delete block by blocker and blocked IDs', async () => {
      const deleteResult = { count: 1 }
      mockPrisma.block.deleteMany.mockResolvedValue(deleteResult)

      const result = await blockRepository.deleteByBlockerAndBlocked(
        mockBlockData.blockerId,
        mockBlockData.blockedId
      )

      expect(mockPrisma.block.deleteMany).toHaveBeenCalledWith({
        where: {
          blockerId: mockBlockData.blockerId,
          blockedId: mockBlockData.blockedId
        }
      })

      expect(result).toEqual(deleteResult)
    })

    it('should handle case where no blocks are deleted', async () => {
      const deleteResult = { count: 0 }
      mockPrisma.block.deleteMany.mockResolvedValue(deleteResult)

      const result = await blockRepository.deleteByBlockerAndBlocked(
        'non-existent-blocker',
        'non-existent-blocked'
      )

      expect(result).toEqual(deleteResult)
    })

    it('should propagate database errors', async () => {
      const dbError = new Error('DeleteMany failed')
      mockPrisma.block.deleteMany.mockRejectedValue(dbError)

      await expect(
        blockRepository.deleteByBlockerAndBlocked(mockBlockData.blockerId, mockBlockData.blockedId)
      ).rejects.toThrow('DeleteMany failed')
    })
  })

  /**
   * Test isBlocked method
   * Verifies block status checking functionality
   */
  describe('isBlocked', () => {
    it('should return true when block relationship exists', async () => {
      mockPrisma.block.findFirst.mockResolvedValue(mockBlockData)

      const result = await blockRepository.isBlocked(
        mockBlockData.blockerId,
        mockBlockData.blockedId
      )

      expect(mockPrisma.block.findFirst).toHaveBeenCalledWith({
        where: {
          blockerId: mockBlockData.blockerId,
          blockedId: mockBlockData.blockedId
        }
      })

      expect(result).toBe(true)
    })

    it('should return false when block relationship does not exist', async () => {
      mockPrisma.block.findFirst.mockResolvedValue(null)

      const result = await blockRepository.isBlocked(
        mockBlockData.blockerId,
        mockBlockData.blockedId
      )

      expect(result).toBe(false)
    })

    it('should propagate database errors', async () => {
      const dbError = new Error('IsBlocked query failed')
      mockPrisma.block.findFirst.mockRejectedValue(dbError)

      await expect(
        blockRepository.isBlocked(mockBlockData.blockerId, mockBlockData.blockedId)
      ).rejects.toThrow('IsBlocked query failed')
    })
  })

  /**
   * Test getBlockedCount method
   * Verifies counting of blocked users
   */
  describe('getBlockedCount', () => {
    it('should return count of blocked users', async () => {
      const expectedCount = 5
      mockPrisma.block.count.mockResolvedValue(expectedCount)

      const result = await blockRepository.getBlockedCount(mockBlockData.blockerId)

      expect(mockPrisma.block.count).toHaveBeenCalledWith({
        where: {
          blockerId: mockBlockData.blockerId
        }
      })

      expect(result).toBe(expectedCount)
    })

    it('should return zero when user has no blocks', async () => {
      mockPrisma.block.count.mockResolvedValue(0)

      const result = await blockRepository.getBlockedCount(mockBlockData.blockerId)

      expect(result).toBe(0)
    })

    it('should propagate database errors', async () => {
      const dbError = new Error('Count query failed')
      mockPrisma.block.count.mockRejectedValue(dbError)

      await expect(
        blockRepository.getBlockedCount(mockBlockData.blockerId)
      ).rejects.toThrow('Count query failed')
    })
  })

  /**
   * Test edge cases and error conditions
   * Verifies robust handling of unusual scenarios
   */
  describe('Edge Cases', () => {
    it('should handle empty string parameters gracefully', async () => {
      mockPrisma.block.findFirst.mockResolvedValue(null)

      const result = await blockRepository.findByBlockerAndBlocked('', '')

      expect(mockPrisma.block.findFirst).toHaveBeenCalledWith({
        where: {
          blockerId: '',
          blockedId: ''
        }
      })

      expect(result).toBeNull()
    })

    it('should handle zero offset in pagination', async () => {
      mockPrisma.block.findMany.mockResolvedValue([])
      mockPrisma.block.count.mockResolvedValue(0)

      await blockRepository.findBlockedByUserId(mockBlockData.blockerId, { offset: 0, limit: 10 })

      expect(mockPrisma.block.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10
        })
      )
    })

    it('should handle large pagination values', async () => {
      mockPrisma.block.findMany.mockResolvedValue([])
      mockPrisma.block.count.mockResolvedValue(0)

      await blockRepository.findBlockedByUserId(mockBlockData.blockerId, { offset: 1000, limit: 100 })

      expect(mockPrisma.block.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1000,
          take: 100
        })
      )
    })
  })
})