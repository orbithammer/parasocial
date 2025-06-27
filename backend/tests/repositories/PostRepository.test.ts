// backend/tests/repositories/PostRepository.test.ts
// Unit tests for PostRepository database operations

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PostRepository } from '../../src/repositories/PostRepository'

// Mock Prisma Client
const mockPrismaClient = {
  post: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    updateMany: vi.fn()
  }
}

describe('PostRepository', () => {
  let postRepository: PostRepository

  beforeEach(() => {
    vi.clearAllMocks()
    postRepository = new PostRepository(mockPrismaClient as any)
  })

  // Mock data helpers
  const createMockPost = (overrides = {}) => ({
    id: 'post-123',
    content: 'Test post content',
    contentWarning: null,
    isScheduled: false,
    scheduledFor: null,
    isPublished: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    publishedAt: new Date('2024-01-01T00:00:00Z'),
    activityId: null,
    authorId: 'user-123',
    author: {
      id: 'user-123',
      username: 'testuser',
      displayName: 'Test User',
      avatar: null,
      actorId: null,
      isVerified: true,
      verificationTier: 'email'
    },
    media: [],
    _count: { media: 0 },
    ...overrides
  })

  const createMockAuthor = () => ({
    id: 'user-123',
    username: 'testuser',
    displayName: 'Test User',
    avatar: null,
    actorId: null,
    isVerified: true,
    verificationTier: 'email'
  })

  describe('create()', () => {
    it('should create a published post with default values', async () => {
      const mockCreatedPost = createMockPost()
      mockPrismaClient.post.create.mockResolvedValue(mockCreatedPost)

      const postData = {
        content: 'Test post content',
        authorId: 'user-123'
      }

      const result = await postRepository.create(postData)

      expect(mockPrismaClient.post.create).toHaveBeenCalledWith({
        data: {
          content: 'Test post content',
          contentWarning: null,
          isScheduled: false,
          scheduledFor: null,
          isPublished: true,
          publishedAt: expect.any(Date),
          authorId: 'user-123',
          activityId: null
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

      expect(result).toEqual(mockCreatedPost)
    })

    it('should create a draft post when isPublished is false', async () => {
      const mockDraftPost = createMockPost({
        isPublished: false,
        publishedAt: null
      })
      mockPrismaClient.post.create.mockResolvedValue(mockDraftPost)

      const postData = {
        content: 'Draft content',
        authorId: 'user-123',
        isPublished: false
      }

      await postRepository.create(postData)

      expect(mockPrismaClient.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPublished: false,
            publishedAt: null
          })
        })
      )
    })

    it('should create a scheduled post', async () => {
      const futureDate = new Date('2024-02-01T00:00:00Z')
      const mockScheduledPost = createMockPost({
        isScheduled: true,
        scheduledFor: futureDate,
        isPublished: false,
        publishedAt: null
      })
      mockPrismaClient.post.create.mockResolvedValue(mockScheduledPost)

      const postData = {
        content: 'Scheduled content',
        authorId: 'user-123',
        isScheduled: true,
        scheduledFor: futureDate,
        isPublished: false
      }

      await postRepository.create(postData)

      expect(mockPrismaClient.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isScheduled: true,
            scheduledFor: futureDate,
            isPublished: false,
            publishedAt: null
          })
        })
      )
    })

    it('should handle content warning and activity ID', async () => {
      const mockPost = createMockPost({
        contentWarning: 'Content warning',
        activityId: 'https://example.com/activities/123'
      })
      mockPrismaClient.post.create.mockResolvedValue(mockPost)

      const postData = {
        content: 'Post with warning',
        contentWarning: 'Content warning',
        authorId: 'user-123',
        activityId: 'https://example.com/activities/123'
      }

      await postRepository.create(postData)

      expect(mockPrismaClient.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contentWarning: 'Content warning',
            activityId: 'https://example.com/activities/123'
          })
        })
      )
    })
  })

  describe('findById()', () => {
    it('should find post by ID with full relations', async () => {
      const mockPost = createMockPost()
      mockPrismaClient.post.findUnique.mockResolvedValue(mockPost)

      const result = await postRepository.findById('post-123')

      expect(mockPrismaClient.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'post-123' },
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

      expect(result).toEqual(mockPost)
    })

    it('should return null if post not found', async () => {
      mockPrismaClient.post.findUnique.mockResolvedValue(null)

      const result = await postRepository.findById('nonexistent-post')

      expect(result).toBeNull()
    })
  })

  describe('findByAuthor()', () => {
    it('should find posts by author with default pagination', async () => {
      const mockPosts = [createMockPost(), createMockPost({ id: 'post-456' })]
      mockPrismaClient.post.findMany.mockResolvedValue(mockPosts)
      mockPrismaClient.post.count.mockResolvedValue(2)

      const result = await postRepository.findByAuthor('user-123')

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith({
        where: { authorId: 'user-123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      })

      expect(mockPrismaClient.post.count).toHaveBeenCalledWith({
        where: { authorId: 'user-123' }
      })

      expect(result).toEqual({
        posts: mockPosts,
        totalCount: 2,
        hasMore: false
      })
    })

    it('should apply publishing status filter', async () => {
      const mockPosts = [createMockPost()]
      mockPrismaClient.post.findMany.mockResolvedValue(mockPosts)
      mockPrismaClient.post.count.mockResolvedValue(1)

      await postRepository.findByAuthor('user-123', {
        isPublished: true,
        isScheduled: false
      })

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            authorId: 'user-123',
            isPublished: true,
            isScheduled: false
          }
        })
      )
    })

    it('should handle custom pagination and ordering', async () => {
      const mockPosts = [createMockPost()]
      mockPrismaClient.post.findMany.mockResolvedValue(mockPosts)
      mockPrismaClient.post.count.mockResolvedValue(25)

      const result = await postRepository.findByAuthor('user-123', {
        offset: 10,
        limit: 5,
        orderBy: 'publishedAt',
        orderDirection: 'asc'
      })

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { publishedAt: 'asc' },
          skip: 10,
          take: 5
        })
      )

      expect(result.hasMore).toBe(true) // 10 + 5 < 25
    })
  })

  describe('findPublished()', () => {
    it('should find published posts with default options', async () => {
      const mockPosts = [createMockPost()]
      mockPrismaClient.post.findMany.mockResolvedValue(mockPosts)
      mockPrismaClient.post.count.mockResolvedValue(1)

      const result = await postRepository.findPublished()

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith({
        where: {
          isPublished: true,
          publishedAt: { not: null }
        },
        include: expect.any(Object),
        orderBy: { publishedAt: 'desc' },
        skip: 0,
        take: 20
      })

      expect(result).toEqual({
        posts: mockPosts,
        totalCount: 1,
        hasMore: false
      })
    })

    it('should filter by author ID', async () => {
      mockPrismaClient.post.findMany.mockResolvedValue([])
      mockPrismaClient.post.count.mockResolvedValue(0)

      await postRepository.findPublished({ authorId: 'user-123' })

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: 'user-123'
          })
        })
      )
    })

    it('should filter by content warning presence', async () => {
      mockPrismaClient.post.findMany.mockResolvedValue([])
      mockPrismaClient.post.count.mockResolvedValue(0)

      await postRepository.findPublished({ hasContentWarning: true })

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contentWarning: { not: null }
          })
        })
      )

      await postRepository.findPublished({ hasContentWarning: false })

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contentWarning: null
          })
        })
      )
    })

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z')
      const endDate = new Date('2024-01-31T23:59:59Z')

      mockPrismaClient.post.findMany.mockResolvedValue([])
      mockPrismaClient.post.count.mockResolvedValue(0)

      await postRepository.findPublished({
        publishedAfter: startDate,
        publishedBefore: endDate
      })

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            publishedAt: {
              not: null,
              gte: startDate,
              lte: endDate
            }
          })
        })
      )
    })
  })

  describe('findReadyToPublish()', () => {
    it('should find expired scheduled posts', async () => {
      const mockPosts = [
        createMockPost({
          isScheduled: true,
          isPublished: false,
          scheduledFor: new Date('2024-01-01T00:00:00Z')
        })
      ]
      mockPrismaClient.post.findMany.mockResolvedValue(mockPosts)

      const result = await postRepository.findReadyToPublish()

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith({
        where: {
          isScheduled: true,
          isPublished: false,
          scheduledFor: { lte: expect.any(Date) }
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

      expect(result).toEqual(mockPosts)
    })
  })

  describe('findScheduled()', () => {
    it('should find future scheduled posts', async () => {
      const mockPosts = [
        createMockPost({
          isScheduled: true,
          isPublished: false,
          scheduledFor: new Date('2025-01-01T00:00:00Z')
        })
      ]
      mockPrismaClient.post.findMany.mockResolvedValue(mockPosts)
      mockPrismaClient.post.count.mockResolvedValue(1)

      const result = await postRepository.findScheduled()

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith({
        where: {
          isScheduled: true,
          isPublished: false,
          scheduledFor: { gt: expect.any(Date) }
        },
        include: expect.any(Object),
        orderBy: { scheduledFor: 'asc' },
        skip: 0,
        take: 20
      })

      expect(result).toEqual({
        posts: mockPosts,
        totalCount: 1,
        hasMore: false
      })
    })

    it('should filter by author', async () => {
      mockPrismaClient.post.findMany.mockResolvedValue([])
      mockPrismaClient.post.count.mockResolvedValue(0)

      await postRepository.findScheduled('user-123')

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: 'user-123'
          })
        })
      )
    })
  })

  describe('update()', () => {
    it('should update post content and set updatedAt', async () => {
      const mockUpdatedPost = createMockPost({
        content: 'Updated content',
        updatedAt: new Date('2024-01-02T00:00:00Z')
      })
      mockPrismaClient.post.update.mockResolvedValue(mockUpdatedPost)

      const result = await postRepository.update('post-123', {
        content: 'Updated content'
      })

      expect(mockPrismaClient.post.update).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        data: {
          content: 'Updated content',
          updatedAt: expect.any(Date)
        },
        include: expect.any(Object)
      })

      expect(result).toEqual(mockUpdatedPost)
    })

    it('should set publishedAt when transitioning to published', async () => {
      // Mock finding existing unpublished post
      mockPrismaClient.post.findUnique.mockResolvedValue({
        isPublished: false,
        publishedAt: null
      })

      const mockPublishedPost = createMockPost({
        isPublished: true,
        publishedAt: new Date('2024-01-02T00:00:00Z')
      })
      mockPrismaClient.post.update.mockResolvedValue(mockPublishedPost)

      await postRepository.update('post-123', {
        isPublished: true
      })

      expect(mockPrismaClient.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        select: { isPublished: true, publishedAt: true }
      })

      expect(mockPrismaClient.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isPublished: true,
            publishedAt: expect.any(Date)
          })
        })
      )
    })

    it('should not set publishedAt if already published', async () => {
      mockPrismaClient.post.findUnique.mockResolvedValue({
        isPublished: true,
        publishedAt: new Date('2024-01-01T00:00:00Z')
      })

      const mockUpdatedPost = createMockPost()
      mockPrismaClient.post.update.mockResolvedValue(mockUpdatedPost)

      await postRepository.update('post-123', {
        content: 'Updated content'
      })

      expect(mockPrismaClient.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            publishedAt: expect.any(Date)
          })
        })
      )
    })
  })

  describe('delete()', () => {
    it('should delete post and return deleted post with media info', async () => {
      const mockDeletedPost = {
        ...createMockPost(),
        media: [
          { id: 'media-1', url: 'https://example.com/image.jpg', filename: 'image.jpg' }
        ]
      }
      mockPrismaClient.post.delete.mockResolvedValue(mockDeletedPost)

      const result = await postRepository.delete('post-123')

      expect(mockPrismaClient.post.delete).toHaveBeenCalledWith({
        where: { id: 'post-123' },
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

      expect(result).toEqual(mockDeletedPost)
    })
  })

  describe('existsByIdAndAuthor()', () => {
    it('should return true if post exists and belongs to author', async () => {
      mockPrismaClient.post.findFirst.mockResolvedValue({ id: 'post-123' })

      const result = await postRepository.existsByIdAndAuthor('post-123', 'user-123')

      expect(mockPrismaClient.post.findFirst).toHaveBeenCalledWith({
        where: { id: 'post-123', authorId: 'user-123' },
        select: { id: true }
      })

      expect(result).toBe(true)
    })

    it('should return false if post does not exist or belongs to different author', async () => {
      mockPrismaClient.post.findFirst.mockResolvedValue(null)

      const result = await postRepository.existsByIdAndAuthor('post-123', 'user-456')

      expect(result).toBe(false)
    })
  })

  describe('getAuthorStats()', () => {
    it('should return comprehensive post statistics for author', async () => {
      mockPrismaClient.post.count
        .mockResolvedValueOnce(10) // total posts
        .mockResolvedValueOnce(7)  // published posts
        .mockResolvedValueOnce(2)  // draft posts
        .mockResolvedValueOnce(1)  // scheduled posts

      const result = await postRepository.getAuthorStats('user-123')

      expect(mockPrismaClient.post.count).toHaveBeenCalledTimes(4)

      expect(mockPrismaClient.post.count).toHaveBeenNthCalledWith(1, {
        where: { authorId: 'user-123' }
      })

      expect(mockPrismaClient.post.count).toHaveBeenNthCalledWith(2, {
        where: { authorId: 'user-123', isPublished: true }
      })

      expect(mockPrismaClient.post.count).toHaveBeenNthCalledWith(3, {
        where: { 
          authorId: 'user-123', 
          isPublished: false, 
          isScheduled: false 
        }
      })

      expect(mockPrismaClient.post.count).toHaveBeenNthCalledWith(4, {
        where: { 
          authorId: 'user-123', 
          isScheduled: true, 
          isPublished: false,
          scheduledFor: { gt: expect.any(Date) }
        }
      })

      expect(result).toEqual({
        totalPosts: 10,
        publishedPosts: 7,
        draftPosts: 2,
        scheduledPosts: 1
      })
    })
  })

  describe('findByActivityId()', () => {
    it('should find post by ActivityPub activity ID', async () => {
      const mockPost = createMockPost({
        activityId: 'https://example.com/activities/123'
      })
      mockPrismaClient.post.findUnique.mockResolvedValue(mockPost)

      const result = await postRepository.findByActivityId('https://example.com/activities/123')

      expect(mockPrismaClient.post.findUnique).toHaveBeenCalledWith({
        where: { activityId: 'https://example.com/activities/123' },
        include: expect.any(Object)
      })

      expect(result).toEqual(mockPost)
    })
  })

  describe('publishExpiredScheduled()', () => {
    it('should batch publish expired scheduled posts', async () => {
      const expiredPosts = [
        { id: 'post-1', scheduledFor: new Date('2024-01-01T00:00:00Z') },
        { id: 'post-2', scheduledFor: new Date('2024-01-01T01:00:00Z') }
      ]

      mockPrismaClient.post.findMany.mockResolvedValue(expiredPosts)
      mockPrismaClient.post.updateMany.mockResolvedValue({ count: 2 })

      const result = await postRepository.publishExpiredScheduled(50)

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith({
        where: {
          isScheduled: true,
          isPublished: false,
          scheduledFor: { lte: expect.any(Date) }
        },
        take: 50,
        orderBy: { scheduledFor: 'asc' }
      })

      expect(mockPrismaClient.post.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['post-1', 'post-2'] } },
        data: {
          isPublished: true,
          publishedAt: expect.any(Date),
          updatedAt: expect.any(Date)
        }
      })

      expect(result).toEqual(expiredPosts)
    })

    it('should return empty array if no expired posts', async () => {
      mockPrismaClient.post.findMany.mockResolvedValue([])

      const result = await postRepository.publishExpiredScheduled()

      expect(result).toEqual([])
      expect(mockPrismaClient.post.updateMany).not.toHaveBeenCalled()
    })

    it('should use default limit of 50', async () => {
      mockPrismaClient.post.findMany.mockResolvedValue([])

      await postRepository.publishExpiredScheduled()

      expect(mockPrismaClient.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50
        })
      )
    })
  })
})