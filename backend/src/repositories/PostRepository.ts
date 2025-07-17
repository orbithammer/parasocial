// backend/src/repositories/PostRepository.ts - Version 5.1.0
// Fixed findById method to use include with full relations to match test expectations
// Changed: findById() now uses include instead of select, added findByIdMinimal() for basic data needs

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
   * Find post by ID with minimal data only
   * @param id - Post ID  
   * @returns Promise<Object|null> Post with basic fields or null if not found
   */
  async findByIdMinimal(id: string) {
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
  async findByAuthor(authorId: string, options: PaginationOptions & PostFilterOptions = {}) {
    const { 
      offset = 0, 
      limit = 20, 
      orderBy = 'publishedAt', 
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
      isPublished: true
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
   * Find scheduled posts ready to be published
   * @returns Promise<PostWithRelations[]> Array of posts ready to publish
   */
  async findReadyToPublish(): Promise<PostWithRelations[]> {
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
        scheduledFor: 'asc'
      },
      take: 50
    })
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
      // Check if post was previously unpublished
      const existingPost = await this.prisma.post.findUnique({
        where: { id },
        select: { isPublished: true, publishedAt: true }
      })

      if (existingPost && !existingPost.isPublished) {
        updatePayload.publishedAt = new Date()
      }
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
    
    return !!post
  }

  /**
   * Find post by ActivityPub activity ID
   * @param activityId - ActivityPub activity ID
   * @returns Promise<PostWithRelations|null> Post or null if not found
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
   * Find scheduled posts (future posts waiting to be published)
   * @param options - Filter and pagination options
   * @returns Promise<Object> Scheduled posts with pagination info
   */
  async findScheduled(options: PostFilterOptions & PaginationOptions & { authorId?: string } = {}) {
    const { 
      offset = 0, 
      limit = 20, 
      orderBy = 'scheduledFor', 
      orderDirection = 'asc',
      authorId
    } = options

    const where: any = {
      isScheduled: true,
      isPublished: false,
      scheduledFor: {
        gt: new Date() // Future posts only
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
   * Batch publish expired scheduled posts
   * @param limit - Maximum number of posts to publish (default 50)
   * @returns Promise<PostWithRelations[]> Array of published posts
   */
  async publishExpiredScheduled(limit: number = 50): Promise<PostWithRelations[]> {
    // First, find expired scheduled posts
    const expiredPosts = await this.findReadyToPublish()
    
    if (expiredPosts.length === 0) {
      return []
    }

    // Limit the number of posts to publish
    const postsToPublish = expiredPosts.slice(0, limit)
    const postIds = postsToPublish.map(post => post.id)

    // Update all expired posts to published
    await this.prisma.post.updateMany({
      where: {
        id: {
          in: postIds
        }
      },
      data: {
        isPublished: true,
        isScheduled: false,
        publishedAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Return the updated posts with full relations
    return await this.prisma.post.findMany({
      where: {
        id: {
          in: postIds
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