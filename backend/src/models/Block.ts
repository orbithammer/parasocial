// backend/src/models/Block.ts
// Version: 1.0.0 - Initial Block model for user blocking functionality
// User blocking/ban model class with validation schemas using proper TypeScript types

import { z } from 'zod'

// Validation schemas for Block operations
export const BlockSchemas = {
  // Block creation validation
  create: z.object({
    blockerId: z.string()
      .trim()
      .min(1, 'Blocker ID is required')
      .uuid('Blocker ID must be a valid UUID'),
    blockedId: z.string()
      .trim()
      .min(1, 'Blocked user ID is required')
      .uuid('Blocked user ID must be a valid UUID'),
    reason: z.string()
      .trim()
      .max(500, 'Block reason must be less than 500 characters')
      .optional()
  }),

  // Block update validation (for moderator notes/reason updates)
  update: z.object({
    reason: z.string()
      .trim()
      .max(500, 'Block reason must be less than 500 characters')
      .optional()
  })
}

// Block data interface for constructor
interface BlockData {
  id: string
  blockerId: string
  blockedId: string
  reason?: string | null | undefined
  createdAt?: Date
  updatedAt?: Date
}

// Block creation data interface
interface BlockCreateData {
  blockerId: string
  blockedId: string
  reason?: string | null
}

// Block update data interface
interface BlockUpdateData {
  reason?: string | null
}

// Public block interface (minimal info for API responses)
interface PublicBlock {
  id: string
  blockedId: string
  createdAt: Date
  hasReason: boolean
}

/**
 * Block model class for user blocking functionality
 * Handles blocking relationships between users in the social network
 */
export class Block {
  public id: string
  public blockerId: string
  public blockedId: string
  public reason: string | null
  public createdAt: Date
  public updatedAt: Date

  constructor(data: BlockData) {
    this.id = data.id
    this.blockerId = data.blockerId
    this.blockedId = data.blockedId
    this.reason = data.reason || null
    this.createdAt = data.createdAt || new Date()
    this.updatedAt = data.updatedAt || new Date()
  }

  /**
   * Convert block to public format (hides sensitive information)
   * Used when showing blocked users list to the blocker
   * @returns PublicBlock object without sensitive details
   */
  toPublicBlock(): PublicBlock {
    return {
      id: this.id,
      blockedId: this.blockedId,
      createdAt: this.createdAt,
      hasReason: this.reason !== null && this.reason.length > 0
    }
  }

  /**
   * Check if this block prevents a specific interaction
   * @param interaction - Type of interaction to check
   * @returns boolean indicating if interaction is blocked
   */
  preventsInteraction(interaction: 'follow' | 'view' | 'report'): boolean {
    // Block prevents following and viewing profile
    // Reports are still allowed for moderation purposes
    switch (interaction) {
      case 'follow':
      case 'view':
        return true
      case 'report':
        return false
      default:
        return true
    }
  }

  /**
   * Validate block creation data
   * @param data - Block creation data to validate
   * @returns Validation result with parsed data or errors
   */
  static validateCreateData(data: unknown) {
    return BlockSchemas.create.safeParse(data)
  }

  /**
   * Validate block update data
   * @param data - Block update data to validate
   * @returns Validation result with parsed data or errors
   */
  static validateUpdateData(data: unknown) {
    return BlockSchemas.update.safeParse(data)
  }

  /**
   * Check if two user IDs would create a valid block relationship
   * @param blockerId - ID of user doing the blocking
   * @param blockedId - ID of user being blocked
   * @returns boolean indicating if block relationship is valid
   */
  static isValidBlockRelationship(blockerId: string, blockedId: string): boolean {
    // Users cannot block themselves
    if (blockerId === blockedId) {
      return false
    }

    // Both IDs must be provided and non-empty
    if (!blockerId?.trim() || !blockedId?.trim()) {
      return false
    }

    return true
  }

  /**
   * Create Block instance from database result
   * @param dbResult - Raw database result object
   * @returns Block instance
   */
  static fromDatabaseResult(dbResult: {
    id: string
    blockerId: string
    blockedId: string
    reason?: string | null
    createdAt: Date
    updatedAt: Date
  }): Block {
    return new Block({
      id: dbResult.id,
      blockerId: dbResult.blockerId,
      blockedId: dbResult.blockedId,
      reason: dbResult.reason,
      createdAt: dbResult.createdAt,
      updatedAt: dbResult.updatedAt
    })
  }
}

// Export interfaces for use in other modules
export type {
  BlockData,
  BlockCreateData,
  BlockUpdateData,
  PublicBlock
}