// backend/src/repositories/PostRepository.ts
// Data access layer for Post operations using Prisma with proper TypeScript types

import { PrismaClient } from '@prisma/client'

interface PostCreateData {
  content: string
  contentWarning?: string | null
  isScheduled?: boolean
  scheduledFor?: Date | null
  isPublished?: boolean
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
        isPublished: postData.isPublished !== undefined ? postData.isPublished : true,
        publishedAt: (postData.isPublished !== false) ? now : null,
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
   * Find post by ID with full relations
   * @param id - Post ID
   * @returns Promise<Object|null> Post with relations or null if not found
   */
  async findById(id: string): Promise<PostWithRelations | null> {
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
   * Find posts by author with pagination and filtering
   * @param authorId - Author's user ID
   * @param options - Pagination and filtering options
   * @returns Promise<Object> Posts array and total count
   */
  async findByAuthor(
    authorId: string, 
    options: PaginationOptions & Pick<PostFilterOptions, 'isPublished' | 'isScheduled'> = {}
  ) {
    const { 
      offset = 0, 
      limit = 20, 
      orderBy = 'createdAt', 
      orderDirection = 'desc',
      isPublished,
      isScheduled
    } = options

    const where: any = { authorId }
    
    if (isPublished !== undefined) {
      where.isPublished = isPublished
    }
    
    if (isScheduled !== undefined) {
      where.isScheduled = isScheduled
    }

    const [posts, totalCount] = await Promise.all([
      this.prisma.post.findMany({
        where,
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
      }),
      this.prisma.post.count({ where })
    ])

    return { posts, totalCount, hasMore: offset + limit < totalCount }
  }

  /**
   * Find published posts for public feeds with pagination
   * @param options - Pagination and filtering options
   * @returns Promise<Object> Public posts array and pagination info
   */
  async findPublished(options: PaginationOptions & PostFilterOptions = {}) {
    const { 
      offset = 0, 
      limit = 20, 
      orderBy = 'publishedAt', 
      orderDirection = 'desc',
      authorId,
      hasContentWarning,
      publishedAfter,
      publishedBefore
    } = options

    const where: any = { 
      isPublished: true,
      publishedAt: { not: null }
    }
    
    if (authorId) {
      where.authorId = authorId
    }
    
    if (hasContentWarning !== undefined) {
      where.contentWarning = hasContentWarning 
        ? { not: null } 
        : null
    }
    
    if (publishedAfter || publishedBefore) {
      where.publishedAt = {
        ...where.publishedAt,
        ...(publishedAfter && { gte: publishedAfter }),
        ...(publishedBefore && { lte: publishedBefore })
      }
    }

    const [posts, totalCount] = await Promise.all([
      this.prisma.post.findMany({
        where,
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
      }),
      this.prisma.post.count({ where })
    ])

    return { posts, totalCount, hasMore: offset + limit < totalCount }
  }

  /**
   * Find scheduled posts that are ready to be published
   * @returns Promise<Array> Posts ready for publication
   */
  async findReadyToPublish() {
    const now = new Date()
    
    return await this.prisma.post.findMany({
      where: {
        isScheduled: true,
        isPublished: false,
        scheduledFor: {
          lte: now
        }
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
        }
      },
      orderBy: { scheduledFor: 'asc' }
    })
  }

  /**
   * Find posts scheduled for the future
   * @param authorId - Optional author filter
   * @param options - Pagination options
   * @returns Promise<Object> Scheduled posts and pagination info
   */
  async findScheduled(authorId?: string, options: PaginationOptions = {}) {
    const { offset = 0, limit = 20, orderBy = 'scheduledFor', orderDirection = 'asc' } = options
    const now = new Date()

    const where: any = {
      isScheduled: true,
      isPublished: false,
      scheduledFor: {
        gt: now
      }
    }
    
    if (authorId) {
      where.authorId = authorId
    }

    const [posts, totalCount] = await Promise.all([
      this.prisma.post.findMany({
        where,
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
          _count: {
            select: {
              media: true
            }
          }
        },
        orderBy: { [orderBy]: orderDirection },
        skip: offset,
        take: limit
      }),
      this.prisma.post.count({ where })
    ])

    return { posts, totalCount, hasMore: offset + limit < totalCount }
  }

  /**
   * Update an existing post
   * @param id - Post ID to update
   * @param updateData - Data to update
   * @returns Promise<Object|null> Updated post with relations or null if not found
   */
  async update(id: string, updateData: PostUpdateData): Promise<PostWithRelations | null> {
    const updatePayload: any = {
      ...updateData,
      updatedAt: new Date()
    }

    // Set publishedAt when transitioning to published for the first time
    if (updateData.isPublished === true && updateData.publishedAt === undefined) {
      const existingPost = await this.prisma.post.findUnique({
        where: { id },
        select: { isPublished: true, publishedAt: true }
      })
      
      if (existingPost && !existingPost.isPublished && !existingPost.publishedAt) {
        updatePayload.publishedAt = new Date()
      }
    }

    return await this.prisma.post.update({
      where: { id },
      data: updatePayload,
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
   * Delete a post and all associated media
   * @param id - Post ID to delete
   * @returns Promise<Object|null> Deleted post or null if not found
   */
  async delete(id: string) {
    return await this.prisma.post.delete({
      where: { id },
      include: {
        media: {
          select: {
            id: true,
            url: true,
            filename: true
          }
        }
      }
    })
  }

  /**
   * Check if post exists and belongs to author
   * @param id - Post ID
   * @param authorId - Author ID to verify ownership
   * @returns Promise<boolean> True if post exists and belongs to author
   */
  async existsByIdAndAuthor(id: string, authorId: string): Promise<boolean> {
    const post = await this.prisma.post.findFirst({
      where: { id, authorId },
      select: { id: true }
    })
    
    return Boolean(post)
  }

  /**
   * Get post statistics for an author
   * @param authorId - Author ID
   * @returns Promise<Object> Post statistics
   */
  async getAuthorStats(authorId: string) {
    const [totalPosts, publishedPosts, draftPosts, scheduledPosts] = await Promise.all([
      this.prisma.post.count({
        where: { authorId }
      }),
      this.prisma.post.count({
        where: { authorId, isPublished: true }
      }),
      this.prisma.post.count({
        where: { 
          authorId, 
          isPublished: false, 
          isScheduled: false 
        }
      }),
      this.prisma.post.count({
        where: { 
          authorId, 
          isScheduled: true, 
          isPublished: false,
          scheduledFor: { gt: new Date() }
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

  /**
   * Find posts by ActivityPub activity ID
   * @param activityId - ActivityPub activity URI
   * @returns Promise<Object|null> Post with relations or null if not found
   */
  async findByActivityId(activityId: string): Promise<PostWithRelations | null> {
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
   * Batch publish expired scheduled posts
   * @param limit - Maximum number of posts to publish in one batch
   * @returns Promise<Array> Published posts
   */
  async publishExpiredScheduled(limit: number = 50) {
    const now = new Date()
    
    const expiredPosts = await this.prisma.post.findMany({
      where: {
        isScheduled: true,
        isPublished: false,
        scheduledFor: { lte: now }
      },
      take: limit,
      orderBy: { scheduledFor: 'asc' }
    })

    if (expiredPosts.length === 0) {
      return []
    }

    const postIds = expiredPosts.map(post => post.id)

    await this.prisma.post.updateMany({
      where: { id: { in: postIds } },
      data: {
        isPublished: true,
        publishedAt: now,
        updatedAt: now
      }
    })

    return expiredPosts
  }
}