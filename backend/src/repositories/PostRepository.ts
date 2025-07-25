// backend/src/repositories/PostRepository.ts - Version 5.3.1
// Fixed to match test expectations: proper defaults, missing methods, correct query patterns
// Changed: Fixed findReadyToPublish method to include media and _count relations

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
   * Find post by ID with full relations (for detailed view)
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
   * Find post by ID with minimal data (for internal operations)
   * @param id - Post ID
   * @returns Promise<Post|null> Basic post data or null if not found
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
      orderBy = 'createdAt', // Default to createdAt as expected by tests
      orderDirection = 'desc',
      isPublished,
      isScheduled 
    } = options

    // Build where clause - only add filters if explicitly provided
    const where: any = {
      authorId
    }

    // Only add these filters if explicitly provided (not undefined)
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

    // Build where clause for published posts
    const where: any = {
      isPublished: true,
      publishedAt: { not: null } // Ensure posts have been actually published
    }

    // Add optional filters
    if (authorId) {
      where.authorId = authorId
    }

    if (hasContentWarning !== undefined) {
      where.contentWarning = hasContentWarning ? { not: null } : null
    }

    if (publishedAfter || publishedBefore) {
      // Merge with existing publishedAt filter
      const publishedAtFilter: any = { not: null }
      if (publishedAfter) publishedAtFilter.gte = publishedAfter
      if (publishedBefore) publishedAtFilter.lte = publishedBefore
      where.publishedAt = publishedAtFilter
    }

    // Execute query with proper pagination
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
      orderBy: { scheduledFor: 'asc' }
    })
  }

  /**
   * Find future scheduled posts with pagination
   * @param authorId - Optional author filter
   * @param options - Pagination options
   * @returns Promise<Object> Scheduled posts with pagination info
   */
  async findScheduled(authorId?: string, options: PaginationOptions = {}) {
    const { 
      offset = 0, 
      limit = 20 
    } = options

    const where: any = {
      isScheduled: true,
      isPublished: false,
      scheduledFor: { gt: new Date() }
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
        orderBy: { scheduledFor: 'asc' },
        skip: offset,
        take: limit
      }),
      this.prisma.post.count({ where })
    ])

    return { posts, totalCount, hasMore: offset + limit < totalCount }
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
   * Get comprehensive post statistics for an author
   * @param authorId - Author ID
   * @returns Promise<AuthorStats> Post statistics
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
   * Batch publish expired scheduled posts
   * @param limit - Maximum number of posts to publish (default 50)
   * @returns Promise<Array> Array of published posts
   */
  async publishExpiredScheduled(limit: number = 50) {
    const now = new Date()

    // Find expired scheduled posts
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

    // Batch update all expired posts
    await this.prisma.post.updateMany({
      where: { id: { in: expiredPosts.map(p => p.id) } },
      data: {
        isPublished: true,
        publishedAt: now,
        updatedAt: now
      }
    })

    return expiredPosts
  }

  /**
   * Update post by ID
   * @param id - Post ID
   * @param updateData - Data to update
   * @returns Promise<PostWithRelations|null> Updated post or null if not found
   */
  async update(id: string, updateData: PostUpdateData): Promise<PostWithRelations | null> {
    try {
      const now = new Date()
      
      // Always set updatedAt
      const dataToUpdate = {
        ...updateData,
        updatedAt: now
      }

      // Handle publishing transition - check if we need to set publishedAt
      if (updateData.isPublished === true && !updateData.publishedAt) {
        // Check if post was previously unpublished
        const existingPost = await this.prisma.post.findUnique({
          where: { id },
          select: { isPublished: true, publishedAt: true }
        })

        if (existingPost && !existingPost.isPublished) {
          dataToUpdate.publishedAt = now
        }
      }

      return await this.prisma.post.update({
        where: { id },
        data: dataToUpdate,
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
    } catch (error) {
      return null
    }
  }

  /**
   * Delete post by ID
   * @param id - Post ID
   * @returns Promise<Object|null> Deleted post with media info or null if not found
   */
  async delete(id: string) {
    try {
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
    } catch (error) {
      return null
    }
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
    return post !== null
  }
}

// backend/src/repositories/PostRepository.ts - Version 5.3.1