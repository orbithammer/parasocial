// backend/src/repositories/MediaRepository.ts
// Version: 1.8
// Temporarily removed null filtering methods - incompatible with current required postId schema

import { PrismaClient } from '@prisma/client'

interface MediaCreateData {
  id: string
  filename: string
  url: string
  mimeType: string
  size: number
  altText?: string
  width?: number
  height?: number
  postId: string  // Required in current schema
}

interface MediaUpdateData {
  altText?: string
  postId?: string
  width?: number
  height?: number
}

interface MediaFilterOptions {
  postId?: string  // Specific post ID to filter by
  mimeType?: string
  hasAltText?: boolean
  createdAfter?: Date
  createdBefore?: Date
}

interface PaginationOptions {
  offset?: number
  limit?: number
  orderBy?: 'createdAt' | 'updatedAt' | 'size'
  orderDirection?: 'asc' | 'desc'
}

/**
 * Media repository class
 * Handles all database operations for media attachments
 */
export class MediaRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new media record
   * @param mediaData - Media metadata to save
   * @returns Promise<Object> Created media record
   */
  async create(mediaData: MediaCreateData) {
    // Filter out undefined values to avoid Prisma type issues
    const data: any = {
      id: mediaData.id,
      filename: mediaData.filename,
      url: mediaData.url,
      mimeType: mediaData.mimeType,
      size: mediaData.size,
      postId: mediaData.postId  // Required in current schema
    }

    // Only include optional fields if they have values
    if (mediaData.altText !== undefined) {
      data.altText = mediaData.altText
    }
    if (mediaData.width !== undefined) {
      data.width = mediaData.width
    }
    if (mediaData.height !== undefined) {
      data.height = mediaData.height
    }

    return await this.prisma.media.create({ data })
  }

  /**
   * Find media by ID
   * @param id - Media ID to find
   * @returns Promise<Object|null> Media record or null if not found
   */
  async findById(id: string) {
    return await this.prisma.media.findUnique({
      where: { id },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        }
      }
    })
  }

  /**
   * Find media by filename
   * @param filename - Filename to search for
   * @returns Promise<Object|null> Media record or null if not found
   */
  async findByFilename(filename: string) {
    return await this.prisma.media.findFirst({
      where: { filename }
    })
  }

  /**
   * Update media record
   * @param id - Media ID to update
   * @param updateData - Data to update
   * @returns Promise<Object> Updated media record
   */
  async update(id: string, updateData: MediaUpdateData) {
    // Filter out undefined values to avoid Prisma type issues
    const data: any = {}

    if (updateData.altText !== undefined) {
      data.altText = updateData.altText
    }
    if (updateData.postId !== undefined) {
      data.postId = updateData.postId
    }
    if (updateData.width !== undefined) {
      data.width = updateData.width
    }
    if (updateData.height !== undefined) {
      data.height = updateData.height
    }

    return await this.prisma.media.update({
      where: { id },
      data
    })
  }

  /**
   * Delete media record
   * @param id - Media ID to delete
   * @returns Promise<Object> Deleted media record
   */
  async delete(id: string) {
    return await this.prisma.media.delete({
      where: { id }
    })
  }

  /**
   * Find media with filters and pagination
   * @param filters - Filter options
   * @param pagination - Pagination options
   * @returns Promise<Array> List of media records
   */
  async findMany(
    filters: MediaFilterOptions = {},
    pagination: PaginationOptions = {}
  ) {
    const {
      postId,
      mimeType,
      hasAltText,
      createdAfter,
      createdBefore
    } = filters

    const {
      offset = 0,
      limit = 20,
      orderBy = 'createdAt',
      orderDirection = 'desc'
    } = pagination

    const where: any = {}

    // Apply filters
    if (postId) {
      where.postId = postId
    }

    if (mimeType) {
      where.mimeType = {
        startsWith: mimeType // Allow searching by type prefix (e.g., 'image/')
      }
    }

    if (hasAltText !== undefined) {
      if (hasAltText) {
        where.altText = { not: null }
      }
      // Note: Filtering for media WITHOUT altText is complex due to optional field
      // For now, we only support filtering for media WITH altText
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {}
      if (createdAfter) where.createdAt.gte = createdAfter
      if (createdBefore) where.createdAt.lte = createdBefore
    }

    return await this.prisma.media.findMany({
      where,
      orderBy: { [orderBy]: orderDirection },
      skip: offset,
      take: limit,
      include: {
        post: {
          select: {
            id: true,
            content: true,
            publishedAt: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        }
      }
    })
  }

  /**
   * Count media records with filters
   * @param filters - Filter options
   * @returns Promise<number> Count of matching records
   */
  async count(filters: MediaFilterOptions = {}) {
    const {
      postId,
      mimeType,
      hasAltText,
      createdAfter,
      createdBefore
    } = filters

    const where: any = {}

    // Apply same filters as findMany
    if (postId) {
      where.postId = postId
    }

    if (mimeType) {
      where.mimeType = {
        startsWith: mimeType
      }
    }

    if (hasAltText !== undefined) {
      if (hasAltText) {
        where.altText = { not: null }
      }
      // Note: Filtering for media WITHOUT altText is complex due to optional field
      // For now, we only support filtering for media WITH altText
    }

    if (createdAfter || createdBefore) {
      where.createdAt = {}
      if (createdAfter) where.createdAt.gte = createdAfter
      if (createdBefore) where.createdAt.lte = createdBefore
    }

    return await this.prisma.media.count({ where })
  }

  /**
   * Associate media with a post
   * @param mediaIds - Array of media IDs to associate
   * @param postId - Post ID to associate with
   * @returns Promise<Object> Update result
   */
  async associateWithPost(mediaIds: string[], postId: string) {
    return await this.prisma.media.updateMany({
      where: {
        id: {
          in: mediaIds
        }
      },
      data: {
        postId
      }
    })
  }

  /**
   * Get media statistics
   * @returns Promise<Object> Usage statistics
   */
  async getStats() {
    const [
      totalCount,
      totalSize,
      imageCount,
      videoCount
    ] = await Promise.all([
      this.prisma.media.count(),
      this.prisma.media.aggregate({
        _sum: { size: true }
      }),
      this.prisma.media.count({
        where: { mimeType: { startsWith: 'image/' } }
      }),
      this.prisma.media.count({
        where: { mimeType: { startsWith: 'video/' } }
      })
    ])

    return {
      totalFiles: totalCount,
      totalSizeBytes: totalSize._sum.size || 0,
      imageFiles: imageCount,
      videoFiles: videoCount
    }
  }
}