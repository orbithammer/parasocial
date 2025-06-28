// backend/src/repositories/PostRepository.ts
// Data access layer for Post operations using Prisma with proper TypeScript types

import { PrismaClient } from '@prisma/client'

interface PostCreateData {
  content: string
  contentWarning?: string | null
  isScheduled?: boolean
  scheduledFor?: Date | null
  isPublished?: boolean
  publishedAt?: Date | null  // Added to match test expectations
  authorId: string
  activityId?: string | null
}

interface PostUpdateData {
  content?: string
  contentWarning?: string | null
  isScheduled?: boolean
  scheduledFor?: Date | null
  isPublished?: boolean
  publishedAt?: Date | null
  activityId?: string | null
}

interface PostFilterOptions {
  authorId?: string
  isPublished?: boolean
  isScheduled?: boolean
  hasContentWarning?: boolean
  publishedAfter?: Date
  publishedBefore?: Date
}

interface PaginationOptions {
  offset?: number
  limit?: number
  orderBy?: 'publishedAt' | 'createdAt' | 'updatedAt'
  orderDirection?: 'asc' | 'desc'
}

interface PostWithRelations {
  id: string
  content: string
  contentWarning: string | null
  isScheduled: boolean
  scheduledFor: Date | null
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
  publishedAt: Date | null
  activityId: string | null
  authorId: string
  author: {
    id: string
    username: string
    displayName: string | null
    avatar: string | null
    actorId: string | null
    isVerified: boolean
    verificationTier: string
  }
  media: Array<{
    id: string
    filename: string
    url: string
    mimeType: string
    altText: string | null
    width: number | null
    height: number | null
  }>
  _count: {
    media: number
  }
}

/**
 * Post repository class
 * Handles database operations for posts with full relationship support
 */
export class PostRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new post
   * @param postData - Post data to create
   * @returns Promise<Object> Created post with basic relations
   */
  async create(postData: PostCreateData) {
    const now = new Date()
    
    return await this.prisma.post.create({
      data: {
        content: postData.content,
        contentWarning: postData.contentWarning || null,
        isScheduled: postData.isScheduled || false,
        scheduledFor: postData.scheduledFor || null,
        isPublished: postData.isPublished !== undefined ? 
          postData.isPublished : true,
        // Use provided publishedAt, or set automatically based on isPublished status
        publishedAt: postData.publishedAt !== undefined 
          ? postData.publishedAt 
          : (postData.isPublished !== false) ? now : null,
        authorId: postData.authorId,
        activityId: postData.activityId || null
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            actorId: true,
            isVerified: true,
            verificationTier: true
          }
        },
        media: {
          select: {
            id: true,
            filename: true,
            url: true,
            mimeType: true,
            altText: true,
            width: true,
            height: true
          }
        },
        _count: {
          select: {
            media: true
          }
        }
      }
    })
  }

  /**
   * Find a post by ID
   * @param id - Post ID to find
   * @returns Promise<Object|null> Post object or null if not found
   */
  async findById(id: string) {
    return await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            actorId: true,
            isVerified: true,
            verificationTier: true
          }
        },
        media: {
          select: {
            id: true,
            filename: true,
            url: true,
            mimeType: true,
            altText: true,
            width: true,
            height: true
          }
        },
        _count: {
          select: {
            media: true
          }
        }
      }
    })
  }

  /**
   * Delete a post by ID
   * @param id - Post ID to delete
   * @returns Promise<Object> Deleted post object
   */
  async delete(id: string) {
    return await this.prisma.post.delete({
      where: { id }
    })
  }

  /**
   * Find many posts by author ID
   * @param authorId - Author ID to filter by
   * @param options - Pagination and filtering options
   * @returns Promise<Array> Array of posts
   */
  async findManyByAuthorId(authorId: string, options: PaginationOptions = {}) {
    const {
      offset = 0,
      limit = 20,
      orderBy = 'publishedAt',
      orderDirection = 'desc'
    } = options

    return await this.prisma.post.findMany({
      where: { authorId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            actorId: true,
            isVerified: true,
            verificationTier: true
          }
        },
        media: {
          select: {
            id: true,
            filename: true,
            url: true,
            mimeType: true,
            altText: true,
            width: true,
            height: true
          }
        },
        _count: {
          select: {
            media: true
          }
        }
      },
      orderBy: { [orderBy]: orderDirection },
      skip: offset,
      take: limit
    })
  }

  /**
   * Find many posts with pagination and filtering options
   * @param options - Pagination and filtering options
   * @returns Promise<{posts: Array, totalCount: number}> Posts and count
   */
  async findManyWithPagination(options: {
    offset?: number
    limit?: number
    includeAuthor?: boolean
    includeMedia?: boolean
    onlyPublished?: boolean
    authorId?: string
  } = {}) {
    const {
      offset = 0,
      limit = 20,
      includeAuthor = false,
      includeMedia = false,
      onlyPublished = false,
      authorId
    } = options

    // Build where clause based on filters
    const where: any = {}
    
    if (onlyPublished) {
      where.isPublished = true
      where.publishedAt = { not: null }
    }
    
    if (authorId) {
      where.authorId = authorId
    }

    // Build include clause based on options
    const include: any = {}
    
    if (includeAuthor) {
      include.author = {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          actorId: true,
          isVerified: true,
          verificationTier: true
        }
      }
    }
    
    if (includeMedia) {
      include.media = {
        select: {
          id: true,
          filename: true,
          url: true,
          mimeType: true,
          altText: true,
          width: true,
          height: true
        }
      }
      include._count = {
        select: {
          media: true
        }
      }
    }

    // Execute queries in parallel for better performance
    const [posts, totalCount] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include,
        orderBy: { publishedAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.post.count({ where })
    ])

    return {
      posts,
      totalCount
    }
  }
}