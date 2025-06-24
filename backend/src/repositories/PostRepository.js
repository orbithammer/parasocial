// backend/src/repositories/PostRepository.js
// Data access layer for Post operations using Prisma

/**
 * Post repository class
 * Handles database operations for posts
 */
export class PostRepository {
  constructor(prismaClient) {
    this.prisma = prismaClient
  }

  /**
   * Create a new post
   * @param {Object} postData - Post data to create
   * @returns {Promise<Object>} Created post with author information
   */
  async create(postData) {
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
   * @param {string} id - Post ID
   * @returns {Promise<Object|null>} Post or null if not found
   */
  async findById(id) {
    return await this.prisma.post.findUnique({
      where: { id }
    })
  }

  /**
   * Find post by ID with author and media information
   * @param {string} id - Post ID
   * @returns {Promise<Object|null>} Post with relations or null if not found
   */
  async findByIdWithAuthorAndMedia(id) {
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
   * @param {Object} options - Query options
   * @param {number} options.offset - Number of posts to skip
   * @param {number} options.limit - Number of posts to return
   * @param {boolean} options.includeAuthor - Include author information
   * @param {boolean} options.includeMedia - Include media attachments
   * @param {boolean} options.onlyPublished - Only return published posts
   * @returns {Promise<Object>} Posts array and total count
   */
  async findManyWithPagination(options = {}) {
    const {
      offset = 0,
      limit = 20,
      includeAuthor = false,
      includeMedia = false,
      onlyPublished = true
    } = options

    // Build where clause
    const where = {}
    if (onlyPublished) {
      where.isPublished = true
    }

    // Build include clause
    const include = {}
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
   * @param {string} authorId - Author's user ID
   * @param {Object} options - Query options (same as findManyWithPagination)
   * @returns {Promise<Object>} Posts array and total count
   */
  async findManyByAuthorId(authorId, options = {}) {
    const {
      offset = 0,
      limit = 20,
      includeAuthor = false,
      includeMedia = false,
      onlyPublished = true
    } = options

    // Build where clause
    const where = { authorId }
    if (onlyPublished) {
      where.isPublished = true
    }

    // Build include clause
    const include = {}
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
   * @param {string} id - Post ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated post
   */
  async update(id, updateData) {
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
   * @param {string} id - Post ID
   * @returns {Promise<Object>} Deleted post
   */
  async delete(id) {
    return await this.prisma.post.delete({
      where: { id }
    })
  }

  /**
   * Find scheduled posts that are ready to be published
   * @returns {Promise<Array>} Array of posts ready for publication
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
   * @param {string} id - Post ID
   * @returns {Promise<Object>} Updated post
   */
  async publishScheduledPost(id) {
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
   * @param {string} authorId - Author's user ID
   * @param {boolean} onlyPublished - Only count published posts
   * @returns {Promise<number>} Number of posts
   */
  async getCountByAuthorId(authorId, onlyPublished = true) {
    const where = { authorId }
    if (onlyPublished) {
      where.isPublished = true
    }

    return await this.prisma.post.count({ where })
  }
}