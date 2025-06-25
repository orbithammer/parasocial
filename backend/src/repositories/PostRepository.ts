// backend/src/repositories/PostRepository.ts
// Data access layer for Post operations using Prisma with proper TypeScript types

import { PrismaClient } from '@prisma/client'

interface PostCreateData {
  content: string
  contentWarning?: string | null
  isScheduled?: boolean
  scheduledFor?: Date | null
  isPublished?: boolean
  publishedAt?: Date | null
  authorId: string
}

interface PaginationOptions {
  offset?: number
  limit?: number
  includeAuthor?: boolean
  includeMedia?: boolean
  onlyPublished?: boolean
}

/**
 * Post repository class
 * Handles database operations for posts
 */
export class PostRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new post
   * @param postData - Post data to create
   * @returns Promise<Object> Created post with author information
   */
  async create(postData: PostCreateData) {
    return await this.prisma.post.create({
      data: postData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        },
        media: true
      }
    })
  }

  /**
   * Find post by ID
   * @param id - Post ID
   * @returns Promise<Object|null> Post or null if not found
   */
  async findById(id: string) {
    return await this.prisma.post.findUnique({
      where: { id }
    })
  }

  /**
   * Find post by ID with author and media information
   * @param id - Post ID
   * @returns Promise<Object|null> Post with relations or null if not found
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
            isVerified: true,
            verificationTier: true
          }
        },
        media: {
          select: {
            id: true,
            url: true,
            altText: true,
            mimeType: true,
            width: true,
            height: true
          }
        }
      }
    })
  }

  /**
   * Find many posts with pagination
   * @param options - Query options
   * @returns Promise<Object> Posts array and total count
   */
  async findManyWithPagination(options: PaginationOptions = {}) {
    const {
      offset = 0,
      limit = 20,
      includeAuthor = false,
      includeMedia = false,
      onlyPublished = true
    } = options

    // Build where clause
    const where: any = {}
    if (onlyPublished) {
      where.isPublished = true
    }

    // Build include clause
    const include: any = {}
    if (includeAuthor) {
      include.author = {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          isVerified: true,
          verificationTier: true
        }
      }
    }
    if (includeMedia) {
      include.media = {
        select: {
          id: true,
          url: true,
          altText: true,
          mimeType: true,
          width: true,
          height: true
        }
      }
    }

    // Execute queries in parallel
    const [posts, totalCount] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy: {
          publishedAt: 'desc'
        },
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
   * Find posts by author ID with pagination
   * @param authorId - Author's user ID
   * @param options - Query options (same as findManyWithPagination)
   * @returns Promise<Object> Posts array and total count
   */
  async findManyByAuthorId(authorId: string, options: PaginationOptions = {}) {
    const {
      offset = 0,
      limit = 20,
      includeAuthor = false,
      includeMedia = false,
      onlyPublished = true
    } = options

    // Build where clause
    const where: any = { authorId }
    if (onlyPublished) {
      where.isPublished = true
    }

    // Build include clause
    const include: any = {}
    if (includeAuthor) {
      include.author = {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          isVerified: true,
          verificationTier: true
        }
      }
    }
    if (includeMedia) {
      include.media = {
        select: {
          id: true,
          url: true,
          altText: true,
          mimeType: true,
          width: true,
          height: true
        }
      }
    }

    // Execute queries in parallel
    const [posts, totalCount] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy: {
          publishedAt: 'desc'
        },
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
   * Update post by ID
   * @param id - Post ID
   * @param updateData - Data to update
   * @returns Promise<Object> Updated post
   */
  async update(id: string, updateData: Partial<PostCreateData>) {
    return await this.prisma.post.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        },
        media: true
      }
    })
  }

  /**
   * Delete post by ID
   * @param id - Post ID
   * @returns Promise<Object> Deleted post
   */
  async delete(id: string) {
    return await this.prisma.post.delete({
      where: { id }
    })
  }

  /**
   * Find scheduled posts that are ready to be published
   * @returns Promise<Array> Array of posts ready for publication
   */
  async findScheduledPostsReadyToPublish() {
    return await this.prisma.post.findMany({
      where: {
        isScheduled: true,
        isPublished: false,
        scheduledFor: {
          lte: new Date()
        }
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            isVerified: true
          }
        },
        media: true
      }
    })
  }

  /**
   * Mark scheduled post as published
   * @param id - Post ID
   * @returns Promise<Object> Updated post
   */
  async publishScheduledPost(id: string) {
    return await this.prisma.post.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        isScheduled: false
      }
    })
  }

  /**
   * Get post count for a user
   * @param authorId - Author's user ID
   * @param onlyPublished - Only count published posts
   * @returns Promise<number> Number of posts
   */
  async getCountByAuthorId(authorId: string, onlyPublished: boolean = true): Promise<number> {
    const where: any = { authorId }
    if (onlyPublished) {
      where.isPublished = true
    }

    return await this.prisma.post.count({ where })
  }
}