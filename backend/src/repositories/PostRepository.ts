// backend/src/repositories/PostRepository.ts - Version 5.0.0
// Complete PostRepository implementation with all methods for Phase 2 functionality
// Added: All CRUD operations, user feed support, and comprehensive type safety

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
  orderBy?: 'publishedAt' | 'createdAt' | 'updatedAt' | 'scheduledFor'
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
    verificationTier: string | null
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
   * @returns Promise<PostWithRelations> Created post with basic relations
   */
  async create(postData: PostCreateData): Promise<PostWithRelations> {
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
   * Find post by ID with minimal data
   * @param id - Post ID
   * @returns Promise<Object|null> Post or null if not found
   */
  async findById(id: string) {
    return await this.prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        content: true,
        contentWarning: true,
        isScheduled: true,
        scheduledFor: true,
        isPublished: true,
        publishedAt: true,
        authorId: true,
        createdAt: true,
        updatedAt: true,
        activityId: true
      }
    })
  }

  /**
   * Find post by ID with author and media relationships
   * @param id - Post ID
   * @returns Promise<PostWithRelations|null> Post with relations or null if not found
   */
  async findByIdWithAuthorAndMedia(id: string): Promise<PostWithRelations | null> {
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
   * Find posts by author with pagination and filters
   * @param authorId - Author ID
   * @param options - Pagination and filter options
   * @returns Promise<Object> Posts with pagination info
   */
  async findByAuthor(authorId: string, options: PaginationOptions & { includeUnpublished?: boolean } = {}) {
    const { offset = 0, limit = 20, orderBy = 'publishedAt', orderDirection = 'desc', includeUnpublished = false } = options

    const where: any = {
      authorId
    }

    if (!includeUnpublished) {
      where.isPublished = true
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

    return { 
      posts, 
      totalCount, 
      hasMore: offset + limit < totalCount 
    }
  }

  /**
   * Find published posts with pagination and filtering
   * @param options - Query options with pagination and filters
   * @returns Promise<Object> Posts with pagination info
   */
  async findPublished(options: PaginationOptions & PostFilterOptions & { 
    includeAuthor?: boolean
    includeMedia?: boolean
    onlyPublished?: boolean
  } = {}) {
    const { 
      offset = 0, 
      limit = 20, 
      orderBy = 'publishedAt', 
      orderDirection = 'desc',
      authorId,
      hasContentWarning,
      publishedAfter,
      publishedBefore,
      includeAuthor = true,
      includeMedia = true,
      onlyPublished = true
    } = options

    const where: any = {}
    
    if (onlyPublished) {
      where.isPublished = true
    }

    if (authorId) {
      where.authorId = authorId
    }

    if (hasContentWarning !== undefined) {
      where.contentWarning = hasContentWarning ? { not: null } : null
    }

    if (publishedAfter || publishedBefore) {
      where.publishedAt = {}
      if (publishedAfter) where.publishedAt.gte = publishedAfter
      if (publishedBefore) where.publishedAt.lte = publishedBefore
    }

    const include: any = {
      _count: {
        select: {
          media: true
        }
      }
    }

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
    }

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

    return { posts, totalCount, hasMore: offset + limit < totalCount }
  }

  /**
   * Get posts from multiple user IDs (for user feed)
   * @param userIds - Array of user IDs to get posts from
   * @param limit - Maximum number of posts to return
   * @param offset - Number of posts to skip for pagination
   * @returns Promise<PostWithRelations[]> Array of posts with full relations
   */
  async getPostsByUserIds(userIds: string[], limit: number = 20, offset: number = 0): Promise<PostWithRelations[]> {
    if (userIds.length === 0) {
      return []
    }

    return await this.prisma.post.findMany({
      where: {
        authorId: {
          in: userIds
        },
        isPublished: true
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
      },
      orderBy: {
        publishedAt: 'desc'
      },
      skip: offset,
      take: limit
    })
  }

  /**
   * Count total posts from multiple user IDs (for user feed pagination)
   * @param userIds - Array of user IDs to count posts from
   * @returns Promise<number> Total count of published posts from these users
   */
  async countPostsByUserIds(userIds: string[]): Promise<number> {
    if (userIds.length === 0) {
      return 0
    }

    return await this.prisma.post.count({
      where: {
        authorId: {
          in: userIds
        },
        isPublished: true
      }
    })
  }

  /**
   * Find scheduled posts for a specific author
   * @param authorId - Author ID
   * @param options - Pagination options
   * @returns Promise<Object> Scheduled posts with pagination
   */
  async findScheduled(authorId: string, options: PaginationOptions = {}) {
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
   * @returns Promise<PostWithRelations|null> Updated post with relations or null if not found
   */
  async update(id: string, updateData: PostUpdateData): Promise<PostWithRelations | null> {
    const updatePayload: any = {
      ...updateData,
      updatedAt: new Date()
    }

    // Set publishedAt when transitioning to published for the first time
    if (updateData.isPublished === true && updateData.publishedAt === undefined) {
      updatePayload.publishedAt = new Date()
    }

    try {
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
    } catch (error: any) {
      if (error.code === 'P2025') {
        return null // Post not found
      }
      throw error
    }
  }

  /**
   * Delete a post by ID
   * @param id - Post ID to delete
   * @returns Promise<Object|null> Deleted post or null if not found
   */
  async delete(id: string) {
    try {
      return await this.prisma.post.delete({
        where: { id }
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        return null // Post not found
      }
      throw error
    }
  }

  /**
   * Check if post exists and is owned by specific author
   * @param id - Post ID
   * @param authorId - Author ID
   * @returns Promise<boolean> True if post exists and is owned by author
   */
  async existsByIdAndAuthor(id: string, authorId: string): Promise<boolean> {
    const post = await this.prisma.post.findFirst({
      where: {
        id,
        authorId
      },
      select: { id: true }
    })
    return post !== null
  }

  /**
   * Get author statistics
   * @param authorId - Author ID
   * @returns Promise<Object> Author statistics
   */
  async getAuthorStats(authorId: string) {
    const [
      totalPosts,
      publishedPosts,
      scheduledPosts,
      draftPosts
    ] = await Promise.all([
      this.prisma.post.count({
        where: { authorId }
      }),
      this.prisma.post.count({
        where: { 
          authorId,
          isPublished: true
        }
      }),
      this.prisma.post.count({
        where: { 
          authorId,
          isScheduled: true,
          isPublished: false
        }
      }),
      this.prisma.post.count({
        where: { 
          authorId,
          isPublished: false,
          isScheduled: false
        }
      })
    ])

    return {
      totalPosts,
      publishedPosts,
      scheduledPosts,
      draftPosts
    }
  }

  /**
   * Find post by ActivityPub activity ID
   * @param activityId - ActivityPub activity ID
   * @returns Promise<Object|null> Post or null if not found
   */
  async findByActivityId(activityId: string) {
    return await this.prisma.post.findFirst({
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
   * Find posts ready to be published (scheduled posts past their scheduled time)
   * @param limit - Maximum number of posts to return
   * @returns Promise<Array> Posts ready to publish
   */
  async findReadyToPublish(limit: number = 50) {
    const now = new Date()
    
    return await this.prisma.post.findMany({
      where: {
        isScheduled: true,
        isPublished: false,
        scheduledFor: {
          lte: now
        }
      },
      take: limit,
      orderBy: {
        scheduledFor: 'asc'
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

  /**
   * Find many posts with pagination for public feeds
   * @param options - Pagination and filtering options
   * @returns Promise<Object> Posts array and total count
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
      includeAuthor = true,
      includeMedia = true,
      onlyPublished = true,
      authorId
    } = options

    const where: any = {}
    
    if (onlyPublished) {
      where.isPublished = true
    }
    
    if (authorId) {
      where.authorId = authorId
    }

    const include: any = {
      _count: {
        select: {
          media: true
        }
      }
    }

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
    }

    const [posts, totalCount] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include,
        orderBy: {
          publishedAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      this.prisma.post.count({ where })
    ])

    return { posts, totalCount, hasMore: offset + limit < totalCount }
  }
}