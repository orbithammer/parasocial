// backend/tests/repositories/PostRepository.create.test.js
// Fixed tests to match our enhanced PostRepository

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PostRepository } from '../../src/repositories/PostRepository.js'

describe('PostRepository - Post Creation', () => {
  let postRepository
  let mockPrismaClient
  let mockPost

  // Updated mock data to match our enhanced PostRepository
  const mockAuthor = {
    id: 'user123',
    username: 'testuser',
    displayName: 'Test User',
    avatar: 'https://example.com/avatar.jpg',
    actorId: null,
    isVerified: true,
    verificationTier: 'email'
  }

  const mockMedia = [
    {
      id: 'media123',
      filename: 'image.jpg',
      url: 'https://example.com/image.jpg',
      mimeType: 'image/jpeg',
      altText: 'Test image',
      width: 800,
      height: 600
    }
  ]

  const validPostData = {
    content: 'This is a test post with valid content',
    contentWarning: null,
    isScheduled: false,
    scheduledFor: null,
    isPublished: true,
    authorId: 'user123'
  }

  beforeEach(() => {
    // Mock Prisma client
    mockPrismaClient = {
      post: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn()
      }
    }

    // Create repository instance
    postRepository = new PostRepository(mockPrismaClient)

    // Setup default mock post response to match our enhanced repository
    mockPost = {
      id: 'post123',
      content: validPostData.content,
      contentWarning: null,
      isScheduled: false,
      scheduledFor: null,
      isPublished: true,
      publishedAt: expect.any(Date),
      authorId: 'user123',
      createdAt: new Date('2024-01-01T12:00:00Z'),
      updatedAt: new Date('2024-01-01T12:00:00Z'),
      activityId: null,
      author: mockAuthor,
      media: [],
      _count: { media: 0 }
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Successful Post Creation', () => {
    it('should create a basic post with minimal data', async () => {
      // Updated expected call to match our enhanced PostRepository
      const expectedDbCall = {
        data: {
          content: validPostData.content,
          contentWarning: null,
          isScheduled: false,
          scheduledFor: null,
          isPublished: true,
          publishedAt: expect.any(Date),
          authorId: 'user123',
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
      }

      mockPrismaClient.post.create.mockResolvedValue(mockPost)

      // Act
      const result = await postRepository.create(validPostData)

      // Assert
      expect(mockPrismaClient.post.create).toHaveBeenCalledOnce()
      expect(mockPrismaClient.post.create).toHaveBeenCalledWith(expectedDbCall)
      expect(result).toEqual(mockPost)
    })

    it('should create a post with content warning', async () => {
      // Arrange
      const postDataWithWarning = {
        ...validPostData,
        contentWarning: 'Contains sensitive content'
      }

      const postWithWarning = {
        ...mockPost,
        contentWarning: 'Contains sensitive content'
      }

      mockPrismaClient.post.create.mockResolvedValue(postWithWarning)

      // Act
      const result = await postRepository.create(postDataWithWarning)

      // Assert
      expect(mockPrismaClient.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contentWarning: 'Contains sensitive content'
          })
        })
      )
      expect(result.contentWarning).toBe('Contains sensitive content')
    })

    it('should create a scheduled post', async () => {
      // Arrange
      const futureDate = new Date('2024-12-31T23:59:59Z')
      const scheduledPostData = {
        ...validPostData,
        isScheduled: true,
        scheduledFor: futureDate,
        isPublished: false
      }

      const scheduledPost = {
        ...mockPost,
        isScheduled: true,
        scheduledFor: futureDate,
        isPublished: false,
        publishedAt: null
      }

      mockPrismaClient.post.create.mockResolvedValue(scheduledPost)

      // Act
      const result = await postRepository.create(scheduledPostData)

      // Assert
      expect(result.isScheduled).toBe(true)
      expect(result.scheduledFor).toEqual(futureDate)
      expect(result.isPublished).toBe(false)
      expect(result.publishedAt).toBeNull()
    })

    it('should create a post with media attachments', async () => {
      // Arrange
      const postWithMedia = {
        ...mockPost,
        media: mockMedia,
        _count: { media: 1 }
      }

      mockPrismaClient.post.create.mockResolvedValue(postWithMedia)

      // Act
      const result = await postRepository.create(validPostData)

      // Assert
      expect(result.media).toEqual(mockMedia)
      expect(result._count.media).toBe(1)
    })

    it('should include author information in response', async () => {
      // Arrange
      mockPrismaClient.post.create.mockResolvedValue(mockPost)

      // Act
      const result = await postRepository.create(validPostData)

      // Assert
      expect(result.author).toEqual(mockAuthor)
      expect(result.author).toHaveProperty('username')
      expect(result.author).toHaveProperty('displayName')
      expect(result.author).toHaveProperty('isVerified')
      expect(result.author).toHaveProperty('verificationTier')
      expect(result.author).toHaveProperty('actorId')
      expect(result.author).not.toHaveProperty('email') // Should not include sensitive data
    })

    it('should handle different author verification states', async () => {
      // Arrange
      const unverifiedAuthor = {
        ...mockAuthor,
        isVerified: false,
        verificationTier: 'none'
      }

      const postWithUnverifiedAuthor = {
        ...mockPost,
        author: unverifiedAuthor
      }

      mockPrismaClient.post.create.mockResolvedValue(postWithUnverifiedAuthor)

      // Act
      const result = await postRepository.create(validPostData)

      // Assert
      expect(result.author.isVerified).toBe(false)
      expect(result.author.verificationTier).toBe('none')
    })
  })

  describe('Post Creation with Edge Cases', () => {
    it('should handle posts with maximum content length', async () => {
      // Arrange
      const maxContentLength = 5000
      const longContent = 'a'.repeat(maxContentLength)
      const longPostData = {
        ...validPostData,
        content: longContent
      }

      const longPost = {
        ...mockPost,
        content: longContent
      }

      mockPrismaClient.post.create.mockResolvedValue(longPost)

      // Act
      const result = await postRepository.create(longPostData)

      // Assert
      expect(result.content).toBe(longContent)
      expect(result.content).toHaveLength(maxContentLength)
    })

    it('should handle posts with special characters', async () => {
      // Arrange
      const specialContent = 'Test with émojis 🎉 and spëcial çharacters!'
      const specialPostData = {
        ...validPostData,
        content: specialContent
      }

      const specialPost = {
        ...mockPost,
        content: specialContent
      }

      mockPrismaClient.post.create.mockResolvedValue(specialPost)

      // Act
      const result = await postRepository.create(specialPostData)

      // Assert
      expect(result.content).toBe(specialContent)
    })

    it('should handle posts with newlines and formatting', async () => {
      // Arrange
      const formattedContent = 'Line 1\n\nLine 2 with spaces\t\nLine 3'
      const formattedPostData = {
        ...validPostData,
        content: formattedContent
      }

      const formattedPost = {
        ...mockPost,
        content: formattedContent
      }

      mockPrismaClient.post.create.mockResolvedValue(formattedPost)

      // Act
      const result = await postRepository.create(formattedPostData)

      // Assert
      expect(result.content).toBe(formattedContent)
    })

    it('should handle null optional fields correctly', async () => {
      // Arrange
      const minimalPostData = {
        content: 'Minimal post',
        contentWarning: null,
        isScheduled: false,
        scheduledFor: null,
        isPublished: true,
        authorId: 'user123'
      }

      const minimalPost = {
        ...mockPost,
        content: 'Minimal post',
        contentWarning: null,
        scheduledFor: null
      }

      mockPrismaClient.post.create.mockResolvedValue(minimalPost)

      // Act
      const result = await postRepository.create(minimalPostData)

      // Assert
      expect(result.contentWarning).toBeNull()
      expect(result.scheduledFor).toBeNull()
    })
  })

  describe('Database Integration', () => {
    it('should pass correct include parameters to Prisma', async () => {
      // Arrange
      mockPrismaClient.post.create.mockResolvedValue(mockPost)

      // Act
      await postRepository.create(validPostData)

      // Assert
      const callArgs = mockPrismaClient.post.create.mock.calls[0][0]
      
      expect(callArgs.include).toHaveProperty('author')
      expect(callArgs.include.author).toHaveProperty('select')
      expect(callArgs.include.author.select).toEqual({
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        actorId: true,
        isVerified: true,
        verificationTier: true
      })
      expect(callArgs.include).toHaveProperty('media')
      expect(callArgs.include.media).toHaveProperty('select')
      expect(callArgs.include).toHaveProperty('_count')
    })

    it('should handle Prisma create response correctly', async () => {
      // Arrange
      const prismaResponse = {
        id: 'generated-id',
        content: validPostData.content,
        contentWarning: validPostData.contentWarning,
        isScheduled: validPostData.isScheduled,
        scheduledFor: validPostData.scheduledFor,
        isPublished: validPostData.isPublished,
        publishedAt: expect.any(Date),
        authorId: validPostData.authorId,
        createdAt: new Date(),
        updatedAt: new Date(),
        activityId: null,
        author: mockAuthor,
        media: [],
        _count: { media: 0 }
      }

      mockPrismaClient.post.create.mockResolvedValue(prismaResponse)

      // Act
      const result = await postRepository.create(validPostData)

      // Assert
      expect(result).toEqual(prismaResponse)
      expect(result).toHaveProperty('author')
      expect(result).toHaveProperty('media')
      expect(result).toHaveProperty('_count')
    })
  })

  describe('Error Handling', () => {
    it('should propagate database connection errors', async () => {
      // Arrange
      const connectionError = new Error('Database connection failed')
      mockPrismaClient.post.create.mockRejectedValue(connectionError)

      // Act & Assert
      await expect(postRepository.create(validPostData)).rejects.toThrow('Database connection failed')
    })

    it('should propagate unique constraint violations', async () => {
      // Arrange
      const uniqueConstraintError = new Error('Unique constraint failed on the fields: (`activityId`)')
      mockPrismaClient.post.create.mockRejectedValue(uniqueConstraintError)

      // Act & Assert
      await expect(postRepository.create(validPostData)).rejects.toThrow('Unique constraint failed')
    })

    it('should propagate foreign key constraint violations', async () => {
      // Arrange
      const foreignKeyError = new Error('Foreign key constraint failed on the field: `authorId`')
      mockPrismaClient.post.create.mockRejectedValue(foreignKeyError)

      // Act & Assert
      await expect(postRepository.create(validPostData)).rejects.toThrow('Foreign key constraint failed')
    })

    it('should handle invalid data type errors', async () => {
      // Arrange
      const typeError = new Error('Invalid value provided. Expected DateTime, provided String.')
      mockPrismaClient.post.create.mockRejectedValue(typeError)

      // Act & Assert
      await expect(postRepository.create(validPostData)).rejects.toThrow('Invalid value provided')
    })
  })

  describe('Performance and Optimization', () => {
    it('should call database create method exactly once', async () => {
      // Arrange
      mockPrismaClient.post.create.mockResolvedValue(mockPost)

      // Act
      await postRepository.create(validPostData)

      // Assert
      expect(mockPrismaClient.post.create).toHaveBeenCalledOnce()
    })

    it('should not make additional database calls after creation', async () => {
      // Arrange
      mockPrismaClient.post.create.mockResolvedValue(mockPost)

      // Act
      await postRepository.create(validPostData)

      // Assert
      expect(mockPrismaClient.post.findUnique).not.toHaveBeenCalled()
      expect(mockPrismaClient.post.findMany).not.toHaveBeenCalled()
      expect(mockPrismaClient.post.update).not.toHaveBeenCalled()
    })

    it('should handle concurrent post creation calls', async () => {
      // Arrange
      const postData1 = { ...validPostData, content: 'Post 1' }
      const postData2 = { ...validPostData, content: 'Post 2' }
      
      const mockPost1 = { ...mockPost, id: 'post1', content: 'Post 1' }
      const mockPost2 = { ...mockPost, id: 'post2', content: 'Post 2' }

      mockPrismaClient.post.create
        .mockResolvedValueOnce(mockPost1)
        .mockResolvedValueOnce(mockPost2)

      // Act
      const [result1, result2] = await Promise.all([
        postRepository.create(postData1),
        postRepository.create(postData2)
      ])

      // Assert
      expect(mockPrismaClient.post.create).toHaveBeenCalledTimes(2)
      expect(result1.content).toBe('Post 1')
      expect(result2.content).toBe('Post 2')
    })
  })

  describe('Data Validation and Sanitization', () => {
    it('should preserve exact content without modification', async () => {
      // Arrange
      const exactContent = 'Content with    multiple   spaces\nand\nnewlines'
      const exactPostData = {
        ...validPostData,
        content: exactContent
      }

      const exactPost = {
        ...mockPost,
        content: exactContent
      }

      mockPrismaClient.post.create.mockResolvedValue(exactPost)

      // Act
      const result = await postRepository.create(exactPostData)

      // Assert
      expect(result.content).toBe(exactContent)
      // Verify the exact content was passed to Prisma
      expect(mockPrismaClient.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: exactContent
          })
        })
      )
    })

    it('should handle date objects correctly', async () => {
      // Arrange
      const specificDate = new Date('2024-06-15T10:30:00Z')
      const datePostData = {
        ...validPostData,
        scheduledFor: specificDate
      }

      const datePost = {
        ...mockPost,
        scheduledFor: specificDate
      }

      mockPrismaClient.post.create.mockResolvedValue(datePost)

      // Act
      const result = await postRepository.create(datePostData)

      // Assert
      expect(result.scheduledFor).toEqual(specificDate)
    })

    it('should handle boolean values correctly', async () => {
      // Arrange
      const booleanPostData = {
        ...validPostData,
        isScheduled: true,
        isPublished: false
      }

      const booleanPost = {
        ...mockPost,
        isScheduled: true,
        isPublished: false
      }

      mockPrismaClient.post.create.mockResolvedValue(booleanPost)

      // Act
      const result = await postRepository.create(booleanPostData)

      // Assert
      expect(result.isScheduled).toBe(true)
      expect(result.isPublished).toBe(false)
    })
  })
})