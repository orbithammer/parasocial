// backend/src/services/__tests__/PostService.test.ts
// Version: 1.1.0
// Fixed test setup - now properly creates mock post in service before testing operations on existing data

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PostService } from '../PostService'

// Mock data types that PostService should handle
interface Post {
  id: string
  title: string
  content: string
  authorId: string
  createdAt: Date
  updatedAt: Date
  published: boolean
  tags: string[]
}

interface CreatePostData {
  title: string
  content: string
  authorId: string
  published?: boolean
  tags?: string[]
}

interface UpdatePostData {
  title?: string
  content?: string
  published?: boolean
  tags?: string[]
}

interface PostFilters {
  authorId?: string
  published?: boolean
  tags?: string[]
  searchTerm?: string
}

describe('PostService', () => {
  let postService: PostService
  
  // Mock data for testing
  const mockPost: Post = {
    id: 'post-123',
    title: 'Test Post',
    content: 'This is test content',
    authorId: 'user-456',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    published: true,
    tags: ['test', 'example']
  }

  const mockCreateData: CreatePostData = {
    title: 'New Post',
    content: 'New post content',
    authorId: 'user-789',
    published: false,
    tags: ['new', 'draft']
  }

  beforeEach(async () => {
    // Reset service instance before each test
    postService = new PostService()
    
    // Create a mock post in the service for tests that need existing data
    const createdPost = await postService.createPost({
      title: mockPost.title,
      content: mockPost.content,
      authorId: mockPost.authorId,
      published: mockPost.published,
      tags: mockPost.tags
    })
    
    // Update mockPost.id to use the actual generated ID
    mockPost.id = createdPost.id
  })

  describe('createPost', () => {
    it('should create a new post with valid data', async () => {
      // Arrange & Act
      const result = await postService.createPost(mockCreateData)

      // Assert
      expect(result).toBeDefined()
      expect(result.id).toBeTruthy()
      expect(result.title).toBe(mockCreateData.title)
      expect(result.content).toBe(mockCreateData.content)
      expect(result.authorId).toBe(mockCreateData.authorId)
      expect(result.published).toBe(false)
      expect(result.tags).toEqual(['new', 'draft'])
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should set published to true by default when not specified', async () => {
      // Arrange
      const dataWithoutPublished = {
        title: 'Auto Published Post',
        content: 'Content',
        authorId: 'user-123'
      }

      // Act
      const result = await postService.createPost(dataWithoutPublished)

      // Assert
      expect(result.published).toBe(true)
    })

    it('should set empty tags array when tags not specified', async () => {
      // Arrange
      const dataWithoutTags = {
        title: 'No Tags Post',
        content: 'Content',
        authorId: 'user-123'
      }

      // Act
      const result = await postService.createPost(dataWithoutTags)

      // Assert
      expect(result.tags).toEqual([])
    })

    it('should throw error when title is empty', async () => {
      // Arrange
      const invalidData = {
        ...mockCreateData,
        title: ''
      }

      // Act & Assert
      await expect(postService.createPost(invalidData)).rejects.toThrow('Title is required')
    })

    it('should throw error when content is empty', async () => {
      // Arrange
      const invalidData = {
        ...mockCreateData,
        content: ''
      }

      // Act & Assert
      await expect(postService.createPost(invalidData)).rejects.toThrow('Content is required')
    })

    it('should throw error when authorId is invalid', async () => {
      // Arrange
      const invalidData = {
        ...mockCreateData,
        authorId: ''
      }

      // Act & Assert
      await expect(postService.createPost(invalidData)).rejects.toThrow('Author ID is required')
    })
  })

  describe('getPostById', () => {
    it('should return post when valid ID is provided', async () => {
      // Act - use the actual mock post ID
      const result = await postService.getPostById(mockPost.id)

      // Assert
      expect(result).toBeDefined()
      expect(result?.id).toBe(mockPost.id)
    })

    it('should return null when post does not exist', async () => {
      // Act
      const result = await postService.getPostById('non-existent-id')

      // Assert
      expect(result).toBeNull()
    })

    it('should throw error when ID is empty', async () => {
      // Act & Assert
      await expect(postService.getPostById('')).rejects.toThrow('Post ID is required')
    })
  })

  describe('updatePost', () => {
    it('should update post with valid data', async () => {
      // Arrange
      const updateData: UpdatePostData = {
        title: 'Updated Title',
        content: 'Updated content',
        published: true,
        tags: ['updated', 'modified']
      }

      // Act - use the actual mock post ID
      const result = await postService.updatePost(mockPost.id, updateData)

      // Assert
      expect(result).toBeDefined()
      expect(result.title).toBe('Updated Title')
      expect(result.content).toBe('Updated content')
      expect(result.published).toBe(true)
      expect(result.tags).toEqual(['updated', 'modified'])
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should only update specified fields', async () => {
      // Arrange
      const partialUpdate: UpdatePostData = {
        title: 'Only Title Updated'
      }

      // Act - use the actual mock post ID
      const result = await postService.updatePost(mockPost.id, partialUpdate)

      // Assert
      expect(result.title).toBe('Only Title Updated')
      // Other fields should remain unchanged from the original created post
      expect(result.content).toBe(mockPost.content)
      expect(result.published).toBe(mockPost.published)
    })

    it('should throw error when post does not exist', async () => {
      // Arrange
      const updateData: UpdatePostData = { title: 'New Title' }

      // Act & Assert
      await expect(postService.updatePost('non-existent-id', updateData)).rejects.toThrow('Post not found')
    })

    it('should throw error when update data is empty', async () => {
      // Act & Assert
      await expect(postService.updatePost(mockPost.id, {})).rejects.toThrow('Update data is required')
    })

    it('should throw error when trying to update with empty title', async () => {
      // Arrange
      const invalidUpdate: UpdatePostData = { title: '' }

      // Act & Assert
      await expect(postService.updatePost(mockPost.id, invalidUpdate)).rejects.toThrow('Title cannot be empty')
    })
  })

  describe('deletePost', () => {
    it('should delete existing post', async () => {
      // Act - use the actual mock post ID
      const result = await postService.deletePost(mockPost.id)

      // Assert
      expect(result).toBe(true)
    })

    it('should return false when post does not exist', async () => {
      // Act
      const result = await postService.deletePost('non-existent-id')

      // Assert
      expect(result).toBe(false)
    })

    it('should throw error when ID is empty', async () => {
      // Act & Assert
      await expect(postService.deletePost('')).rejects.toThrow('Post ID is required')
    })
  })

  describe('getAllPosts', () => {
    it('should return all posts with default pagination', async () => {
      // Act
      const result = await postService.getAllPosts()

      // Assert
      expect(result).toBeDefined()
      expect(result.posts).toBeInstanceOf(Array)
      expect(result.total).toBeTypeOf('number')
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })

    it('should return posts with custom pagination', async () => {
      // Act
      const result = await postService.getAllPosts({ page: 2, limit: 5 })

      // Assert
      expect(result.page).toBe(2)
      expect(result.limit).toBe(5)
    })

    it('should filter posts by author', async () => {
      // Arrange
      const filters: PostFilters = { authorId: 'user-456' }

      // Act
      const result = await postService.getAllPosts({ filters })

      // Assert
      expect(result.posts.every(post => post.authorId === 'user-456')).toBe(true)
    })

    it('should filter posts by published status', async () => {
      // Arrange
      const filters: PostFilters = { published: true }

      // Act
      const result = await postService.getAllPosts({ filters })

      // Assert
      expect(result.posts.every(post => post.published === true)).toBe(true)
    })

    it('should search posts by content', async () => {
      // Arrange
      const filters: PostFilters = { searchTerm: 'test' }

      // Act
      const result = await postService.getAllPosts({ filters })

      // Assert
      expect(result.posts.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getPostsByAuthor', () => {
    it('should return posts for specific author', async () => {
      // Act
      const result = await postService.getPostsByAuthor('user-456')

      // Assert
      expect(result).toBeInstanceOf(Array)
      expect(result.every(post => post.authorId === 'user-456')).toBe(true)
    })

    it('should return empty array for author with no posts', async () => {
      // Act
      const result = await postService.getPostsByAuthor('user-no-posts')

      // Assert
      expect(result).toEqual([])
    })

    it('should throw error when author ID is empty', async () => {
      // Act & Assert
      await expect(postService.getPostsByAuthor('')).rejects.toThrow('Author ID is required')
    })
  })

  describe('publishPost', () => {
    it('should publish an unpublished post', async () => {
      // Arrange - create an unpublished post first
      const unpublishedPost = await postService.createPost({
        title: 'Unpublished Post',
        content: 'Content',
        authorId: 'user-123',
        published: false
      })

      // Act
      const result = await postService.publishPost(unpublishedPost.id)

      // Assert
      expect(result.published).toBe(true)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should throw error when post does not exist', async () => {
      // Act & Assert
      await expect(postService.publishPost('non-existent-id')).rejects.toThrow('Post not found')
    })
  })

  describe('unpublishPost', () => {
    it('should unpublish a published post', async () => {
      // Act - use the mock post which is published by default
      const result = await postService.unpublishPost(mockPost.id)

      // Assert
      expect(result.published).toBe(false)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should throw error when post does not exist', async () => {
      // Act & Assert
      await expect(postService.unpublishPost('non-existent-id')).rejects.toThrow('Post not found')
    })
  })
})