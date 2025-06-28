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
   * @returns Promise<{posts: Array, totalCount: number}> Posts and count
   */
  async findManyByAuthorId(authorId: string, options: {
    offset?: number
    limit?: number
    orderBy?: 'publishedAt' | 'createdAt' | 'updatedAt'
    orderDirection?: 'asc' | 'desc'
    includeAuthor?: boolean
    includeMedia?: boolean
    onlyPublished?: boolean
  } = {}) {
    const {
      offset = 0,
      limit = 20,
      orderBy = 'publishedAt',
      orderDirection = 'desc',
      includeAuthor = false,
      includeMedia = false,
      onlyPublished = false
    } = options

    // Build where clause
    const where: any = { authorId }
    if (onlyPublished) {
      where.isPublished = true
      where.publishedAt = { not: null }
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
        orderBy: { [orderBy]: orderDirection },
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

  /**
   * Find a post by ID with author and media relations included
   * @param id - Post ID to find
   * @returns Promise<Object|null> Post object with author and media or null if not found
   */
  async findByIdWithAuthorAndMedia(id: string) {
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

  /**
   * Publish expired scheduled posts in batch
   * Finds posts that are scheduled but whose scheduled time has passed,
   * then updates them to be published
   * @param limit - Maximum number of posts to publish (default: 50)
   * @returns Promise<Array> Array of posts that were published
   */
  async publishExpiredScheduled(limit: number = 50) {
    const now = new Date()
    
    // Find expired scheduled posts that haven't been published yet
    const expiredPosts = await this.prisma.post.findMany({
      where: {
        isScheduled: true,
        isPublished: false,
        scheduledFor: { lte: now }
      },
      take: limit,
      orderBy: { scheduledFor: 'asc' }
    })
    
    // If no expired posts found, return empty array
    if (expiredPosts.length === 0) {
      return []
    }
    
    // Extract post IDs for batch update
    const postIds = expiredPosts.map(post => post.id)
    
    // Update all expired posts to be published
    await this.prisma.post.updateMany({
      where: { id: { in: postIds } },
      data: {
        isPublished: true,
        publishedAt: now,
        updatedAt: now
      }
    })
    
    // Return the posts that were published
    return expiredPosts
  }

  /**
   * Find a post by its ActivityPub activity ID
   * Used for ActivityPub federation to locate posts by their federated identifiers
   * @param activityId - The ActivityPub activity ID to search for
   * @returns Promise<Object|null> Post object with relations or null if not found
   */
  async findByActivityId(activityId: string) {
    return await this.prisma.post.findUnique({
      where: { activityId },
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
   * Get comprehensive post statistics for an author
   * Returns counts for total, published, draft, and scheduled posts
   * @param authorId - The author ID to get statistics for
   * @returns Promise<Object> Statistics object with post counts
   */
  async getAuthorStats(authorId: string) {
    const now = new Date()
    
    // Execute all count queries in parallel for better performance
    const [
      totalPosts,
      publishedPosts, 
      draftPosts,
      scheduledPosts
    ] = await Promise.all([
      // Count all posts by this author
      this.prisma.post.count({
        where: { authorId }
      }),
      
      // Count published posts
      this.prisma.post.count({
        where: { authorId, isPublished: true }
      }),
      
      // Count draft posts (not published and not scheduled)
      this.prisma.post.count({
        where: { 
          authorId, 
          isPublished: false, 
          isScheduled: false 
        }
      }),
      
      // Count scheduled posts (scheduled but not yet published, with future scheduled date)
      this.prisma.post.count({
        where: { 
          authorId, 
          isScheduled: true, 
          isPublished: false,
          scheduledFor: { gt: now }
        }
      })
    ])
    
    return {
      totalPosts,
      publishedPosts,
      draftPosts,
      scheduledPosts
    }
  }
}