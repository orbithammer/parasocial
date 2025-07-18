// backend/src/models/__tests__/Block.test.ts
// Version: 1.0.0 - Initial Block model test suite using Vitest
// Comprehensive unit tests for Block model class covering all methods and edge cases

import { describe, it, expect, beforeEach } from 'vitest'
import { Block, BlockSchemas } from '../Block'
import type { BlockData } from '../Block'

/**
 * Test suite for Block model class
 * Tests constructor, instance methods, static methods, and validation
 */
describe('Block Model', () => {
  // Sample test data for creating Block instances
  const mockBlockData: BlockData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    blockerId: '223e4567-e89b-12d3-a456-426614174000', 
    blockedId: '323e4567-e89b-12d3-a456-426614174000',
    reason: 'Test block reason',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z')
  }

  let testBlock: Block

  /**
   * Setup fresh Block instance before each test
   * Ensures isolated test conditions
   */
  beforeEach(() => {
    testBlock = new Block(mockBlockData)
  })

  /**
   * Test Block constructor functionality
   * Verifies proper initialization of all properties
   */
  describe('Constructor', () => {
    it('should create Block instance with all provided data', () => {
      expect(testBlock.id).toBe(mockBlockData.id)
      expect(testBlock.blockerId).toBe(mockBlockData.blockerId)
      expect(testBlock.blockedId).toBe(mockBlockData.blockedId)
      expect(testBlock.reason).toBe(mockBlockData.reason)
      expect(testBlock.createdAt).toEqual(mockBlockData.createdAt)
      expect(testBlock.updatedAt).toEqual(mockBlockData.updatedAt)
    })

    it('should handle null reason correctly', () => {
      const dataWithNullReason: BlockData = {
        ...mockBlockData,
        reason: null
      }
      const blockWithNullReason = new Block(dataWithNullReason)
      
      expect(blockWithNullReason.reason).toBeNull()
    })

    it('should handle undefined reason correctly', () => {
      const dataWithUndefinedReason: BlockData = {
        ...mockBlockData,
        reason: undefined
      }
      const blockWithUndefinedReason = new Block(dataWithUndefinedReason)
      
      expect(blockWithUndefinedReason.reason).toBeNull()
    })

    it('should set default dates when not provided', () => {
      const dataWithoutDates: BlockData = {
        id: mockBlockData.id,
        blockerId: mockBlockData.blockerId,
        blockedId: mockBlockData.blockedId
      }
      const blockWithDefaultDates = new Block(dataWithoutDates)
      
      expect(blockWithDefaultDates.createdAt).toBeInstanceOf(Date)
      expect(blockWithDefaultDates.updatedAt).toBeInstanceOf(Date)
    })
  })

  /**
   * Test toPublicBlock method
   * Verifies correct formatting of public block data
   */
  describe('toPublicBlock', () => {
    it('should return public block format with correct fields', () => {
      const publicBlock = testBlock.toPublicBlock()
      
      expect(publicBlock).toEqual({
        id: mockBlockData.id,
        blockedId: mockBlockData.blockedId,
        createdAt: mockBlockData.createdAt,
        hasReason: true
      })
    })

    it('should show hasReason as false when reason is null', () => {
      const blockWithoutReason = new Block({
        ...mockBlockData,
        reason: null
      })
      const publicBlock = blockWithoutReason.toPublicBlock()
      
      expect(publicBlock.hasReason).toBe(false)
    })

    it('should show hasReason as false when reason is empty string', () => {
      const blockWithEmptyReason = new Block({
        ...mockBlockData,
        reason: ''
      })
      const publicBlock = blockWithEmptyReason.toPublicBlock()
      
      expect(publicBlock.hasReason).toBe(false)
    })

    it('should not expose sensitive blocker information', () => {
      const publicBlock = testBlock.toPublicBlock()
      
      expect(publicBlock).not.toHaveProperty('blockerId')
      expect(publicBlock).not.toHaveProperty('reason')
      expect(publicBlock).not.toHaveProperty('updatedAt')
    })
  })

  /**
   * Test preventsInteraction method
   * Verifies correct blocking behavior for different interaction types
   */
  describe('preventsInteraction', () => {
    it('should prevent follow interactions', () => {
      expect(testBlock.preventsInteraction('follow')).toBe(true)
    })

    it('should prevent view interactions', () => {
      expect(testBlock.preventsInteraction('view')).toBe(true)
    })

    it('should allow report interactions for moderation', () => {
      expect(testBlock.preventsInteraction('report')).toBe(false)
    })

    it('should prevent unknown interaction types by default', () => {
      // TypeScript will complain about this, but testing runtime behavior
      const unknownInteraction = 'unknown' as 'follow'
      expect(testBlock.preventsInteraction(unknownInteraction)).toBe(true)
    })
  })

  /**
   * Test validateCreateData static method
   * Verifies validation of block creation data
   */
  describe('validateCreateData', () => {
    const validCreateData = {
      blockerId: '223e4567-e89b-12d3-a456-426614174000',
      blockedId: '323e4567-e89b-12d3-a456-426614174000',
      reason: 'Valid reason'
    }

    it('should validate correct block creation data', () => {
      const result = Block.validateCreateData(validCreateData)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validCreateData)
      }
    })

    it('should validate data without optional reason', () => {
      const dataWithoutReason = {
        blockerId: validCreateData.blockerId,
        blockedId: validCreateData.blockedId
      }
      const result = Block.validateCreateData(dataWithoutReason)
      
      expect(result.success).toBe(true)
    })

    it('should reject data with missing blockerId', () => {
      const invalidData = {
        blockedId: validCreateData.blockedId,
        reason: validCreateData.reason
      }
      const result = Block.validateCreateData(invalidData)
      
      expect(result.success).toBe(false)
    })

    it('should reject data with missing blockedId', () => {
      const invalidData = {
        blockerId: validCreateData.blockerId,
        reason: validCreateData.reason
      }
      const result = Block.validateCreateData(invalidData)
      
      expect(result.success).toBe(false)
    })

    it('should reject data with invalid UUID format for blockerId', () => {
      const invalidData = {
        ...validCreateData,
        blockerId: 'invalid-uuid'
      }
      const result = Block.validateCreateData(invalidData)
      
      expect(result.success).toBe(false)
    })

    it('should reject data with invalid UUID format for blockedId', () => {
      const invalidData = {
        ...validCreateData,
        blockedId: 'invalid-uuid'
      }
      const result = Block.validateCreateData(invalidData)
      
      expect(result.success).toBe(false)
    })

    it('should reject data with reason exceeding 500 characters', () => {
      const invalidData = {
        ...validCreateData,
        reason: 'a'.repeat(501)
      }
      const result = Block.validateCreateData(invalidData)
      
      expect(result.success).toBe(false)
    })

    it('should accept data with empty string blockerId and fail validation', () => {
      const invalidData = {
        ...validCreateData,
        blockerId: ''
      }
      const result = Block.validateCreateData(invalidData)
      
      expect(result.success).toBe(false)
    })
  })

  /**
   * Test validateUpdateData static method  
   * Verifies validation of block update data
   */
  describe('validateUpdateData', () => {
    it('should validate correct update data with reason', () => {
      const updateData = { reason: 'Updated reason' }
      const result = Block.validateUpdateData(updateData)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(updateData)
      }
    })

    it('should validate empty update data', () => {
      const result = Block.validateUpdateData({})
      
      expect(result.success).toBe(true)
    })

    it('should reject update data with reason exceeding 500 characters', () => {
      const invalidData = { reason: 'a'.repeat(501) }
      const result = Block.validateUpdateData(invalidData)
      
      expect(result.success).toBe(false)
    })

    it('should validate update data with undefined reason', () => {
      const updateData = { reason: undefined }
      const result = Block.validateUpdateData(updateData)
      
      expect(result.success).toBe(true)
    })
  })

  /**
   * Test isValidBlockRelationship static method
   * Verifies validation of block relationship logic
   */
  describe('isValidBlockRelationship', () => {
    const validBlockerId = '223e4567-e89b-12d3-a456-426614174000'
    const validBlockedId = '323e4567-e89b-12d3-a456-426614174000'

    it('should return true for valid different user IDs', () => {
      const isValid = Block.isValidBlockRelationship(validBlockerId, validBlockedId)
      
      expect(isValid).toBe(true)
    })

    it('should return false when user tries to block themselves', () => {
      const isValid = Block.isValidBlockRelationship(validBlockerId, validBlockerId)
      
      expect(isValid).toBe(false)
    })

    it('should return false when blockerId is empty', () => {
      const isValid = Block.isValidBlockRelationship('', validBlockedId)
      
      expect(isValid).toBe(false)
    })

    it('should return false when blockedId is empty', () => {
      const isValid = Block.isValidBlockRelationship(validBlockerId, '')
      
      expect(isValid).toBe(false)
    })

    it('should return false when blockerId is only whitespace', () => {
      const isValid = Block.isValidBlockRelationship('   ', validBlockedId)
      
      expect(isValid).toBe(false)
    })

    it('should return false when blockedId is only whitespace', () => {
      const isValid = Block.isValidBlockRelationship(validBlockerId, '   ')
      
      expect(isValid).toBe(false)
    })

    it('should return false when both IDs are missing', () => {
      const isValid = Block.isValidBlockRelationship('', '')
      
      expect(isValid).toBe(false)
    })
  })

  /**
   * Test fromDatabaseResult static method
   * Verifies correct conversion from database results to Block instances
   */
  describe('fromDatabaseResult', () => {
    const dbResult = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      blockerId: '223e4567-e89b-12d3-a456-426614174000',
      blockedId: '323e4567-e89b-12d3-a456-426614174000',
      reason: 'Database reason',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T11:00:00Z')
    }

    it('should create Block instance from database result', () => {
      const block = Block.fromDatabaseResult(dbResult)
      
      expect(block).toBeInstanceOf(Block)
      expect(block.id).toBe(dbResult.id)
      expect(block.blockerId).toBe(dbResult.blockerId)
      expect(block.blockedId).toBe(dbResult.blockedId)
      expect(block.reason).toBe(dbResult.reason)
      expect(block.createdAt).toEqual(dbResult.createdAt)
      expect(block.updatedAt).toEqual(dbResult.updatedAt)
    })

    it('should handle database result with null reason', () => {
      const dbResultWithNullReason = {
        ...dbResult,
        reason: null
      }
      const block = Block.fromDatabaseResult(dbResultWithNullReason)
      
      expect(block.reason).toBeNull()
    })

    it('should handle database result with undefined reason', () => {
      const dbResultWithUndefinedReason = {
        ...dbResult,
        reason: undefined
      }
      const block = Block.fromDatabaseResult(dbResultWithUndefinedReason)
      
      expect(block.reason).toBeNull()
    })
  })

  /**
   * Test Block schema validation directly
   * Verifies Zod schemas work correctly
   */
  describe('Block Schemas', () => {
    describe('create schema', () => {
      it('should trim whitespace from string fields', () => {
        const dataWithWhitespace = {
          blockerId: '  223e4567-e89b-12d3-a456-426614174000  ',
          blockedId: '  323e4567-e89b-12d3-a456-426614174000  ',
          reason: '  Trimmed reason  '
        }
        const result = BlockSchemas.create.safeParse(dataWithWhitespace)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.blockerId).toBe('223e4567-e89b-12d3-a456-426614174000')
          expect(result.data.blockedId).toBe('323e4567-e89b-12d3-a456-426614174000')
          expect(result.data.reason).toBe('Trimmed reason')
        }
      })
    })

    describe('update schema', () => {
      it('should trim whitespace from reason field', () => {
        const dataWithWhitespace = {
          reason: '  Updated reason  '
        }
        const result = BlockSchemas.update.safeParse(dataWithWhitespace)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.reason).toBe('Updated reason')
        }
      })
    })
  })
})