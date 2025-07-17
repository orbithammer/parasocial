// backend/src/repositories/PostRepository.ts - Version 5.2.0
// Fixed findByAuthor to use createdAt ordering to match test expectations
// Fixed findPublished to include publishedAt: { not: null } condition
// Added missing getAuthorStats method
// Fixed delete method to include media relations
// Fixed findReadyToPublish and publishExpiredScheduled methods

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

interface AuthorStats {
  totalPosts: number
  publishedPosts: number
  draftPosts: number
  scheduledPosts: number
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
   * Find post by ID with full relations (author, media, counts)
   * @param id - Post ID
   * @returns Promise<PostWithRelations|null> Post with relations or null if not found
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
   * Find posts by author with pagination and filters
   * @param authorId - Author ID
   * @param options - Pagination and filter options
   * @returns Promise<Object> Posts with pagination info
   */
  async findByAuthor(authorId: string, options: PaginationOptions & PostFilterOptions = {}) {
    const { 
      offset = 0, 
      limit = 20, 
      orderBy = 'createdAt',  // Changed from 'publishedAt' to 'createdAt' to match test expectations
      orderDirection = 'desc',
      isPublished = true,
      isScheduled 
    } = options

    const where: any = {
      authorId,
      isPublished,
      isScheduled
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
   * Find published posts with pagination and filters
   * @param options - Filter and pagination options
   * @returns Promise<Object> Posts with pagination info
   */
  async findPublished(options: PostFilterOptions & PaginationOptions = {}) {
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
      publishedAt: { not: null }  // Added to match test expectations
    }

    if (authorId) {
      where.authorId = authorId
    }

    if (hasContentWarning !== undefined) {
      where.contentWarning = hasContentWarning ? { not: null } : null
    }

    if (publishedAfter || publishedBefore) {
      where.publishedAt = { ...where.publishedAt }
      if (publishedAfter) {
        where.publishedAt.gte = publishedAfter
      }
      if (publishedBefore) {
        where.publishedAt.lte = publishedBefore
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
   * @param limit - Maximum number of posts to return
   * @returns Promise<PostWithRelations[]> Ready to publish posts
   */
  async findReadyToPublish(limit: number = 50): Promise<PostWithRelations[]> {
    const now = new Date()
    
    return await this.prisma.post.findMany({
      where: {
        isPublished: false,
        isScheduled: true,
        scheduledFor: { lte: now }
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
      orderBy: { scheduledFor: 'asc' },
      take: limit
    })
  }

  /**
   * Find scheduled posts with pagination
   * @param options - Filter and pagination options
   * @returns Promise<Object> Scheduled posts with pagination info
   */
  async findScheduled(options: PaginationOptions & { authorId?: string } = {}) {
    const { 
      offset = 0, 
      limit = 20, 
      orderBy = 'scheduledFor', 
      orderDirection = 'asc',
      authorId
    } = options

    const now = new Date()
    const where: any = {
      isPublished: false,
      isScheduled: true,
      scheduledFor: { gt: now }
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
   * Update a post
   * @param id - Post ID
   * @param updateData - Data to update
   * @returns Promise<PostWithRelations|null> Updated post or null if not found
   */
  async update(id: string, updateData: PostUpdateData): Promise<PostWithRelations | null> {
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
   * Delete a post
   * @param id - Post ID
   * @returns Promise<PostWithRelations|null> Deleted post with media info or null if not found
   */
  async delete(id: string): Promise<PostWithRelations | null> {
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
   * @param authorId - Author ID
   * @returns Promise<boolean> True if post exists and belongs to author
   */
  async existsByIdAndAuthor(id: string, authorId: string): Promise<boolean> {
    const post = await this.prisma.post.findFirst({
      where: { id, authorId },
      select: { id: true }
    })
    return !!post
  }

  /**
   * Get comprehensive post statistics for an author
   * @param authorId - Author ID
   * @returns Promise<AuthorStats> Author's post statistics
   */
  async getAuthorStats(authorId: string): Promise<AuthorStats> {
    const now = new Date()
    
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

  /**
   * Publish expired scheduled posts in batches
   * @param limit - Maximum number of posts to publish
   * @returns Promise<PostWithRelations[]> Published posts
   */
  async publishExpiredScheduled(limit: number = 50): Promise<PostWithRelations[]> {
    const now = new Date()
    
    // First, find expired scheduled posts
    const expiredPosts = await this.prisma.post.findMany({
      where: {
        isPublished: false,
        isScheduled: true,
        scheduledFor: { lte: now }
      },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
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

    if (expiredPosts.length === 0) {
      return []
    }

    // Update all expired posts to published status
    await this.prisma.post.updateMany({
      where: {
        id: { in: expiredPosts.map(post => post.id) }
      },
      data: {
        isPublished: true,
        isScheduled: false,
        publishedAt: now
      }
    })

    // Return the published posts with updated data
    return await this.prisma.post.findMany({
      where: {
        id: { in: expiredPosts.map(post => post.id) }
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
}