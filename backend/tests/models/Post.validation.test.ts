// backend/tests/models/Post.validation.test.ts
// Unit tests for Post model creation and validation schemas

import { describe, it, expect } from 'vitest'
import { PostSchemas, Post } from '../../src/models/Post'
import type { PostData } from '../../src/models/Post'

describe('Post Creation Validation', () => {
  describe('Content Validation', () => {
    it('should accept valid content within character limits', () => {
      const validPost = {
        content: 'This is a valid post content',
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(validPost)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe('This is a valid post content')
        expect(result.data.isPublished).toBe(true) // default value
      }
    })

    it('should reject empty content', () => {
      const emptyPost = {
        content: '',
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(emptyPost)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Post content cannot be empty')
      }
    })

    it('should reject content that is only whitespace', () => {
      const whitespacePost = {
        content: '   \n\t   ',
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(whitespacePost)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Post content cannot be empty')
      }
    })

    it('should reject content exceeding 5000 characters', () => {
      const longContent = 'a'.repeat(5001)
      const longPost = {
        content: longContent,
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(longPost)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Post content must be less than 5000 characters')
      }
    })

    it('should accept content exactly at 5000 character limit', () => {
      const maxContent = 'a'.repeat(5000)
      const maxPost = {
        content: maxContent,
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(maxPost)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe(maxContent)
      }
    })

    it('should trim whitespace from content', () => {
      const paddedPost = {
        content: '  Valid content with padding  ',
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(paddedPost)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe('Valid content with padding')
      }
    })
  })

  describe('Content Warning Validation', () => {
    it('should accept valid content warning', () => {
      const postWithWarning = {
        content: 'Post with content warning',
        contentWarning: 'Sensitive topic discussion',
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(postWithWarning)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contentWarning).toBe('Sensitive topic discussion')
      }
    })

    it('should accept empty string as content warning', () => {
      const postWithEmptyWarning = {
        content: 'Post without warning',
        contentWarning: '',
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(postWithEmptyWarning)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contentWarning).toBe('')
      }
    })

    it('should accept missing content warning field', () => {
      const postWithoutWarning = {
        content: 'Post without warning field',
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(postWithoutWarning)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contentWarning).toBeUndefined()
      }
    })

    it('should reject content warning exceeding 200 characters', () => {
      const longWarning = 'a'.repeat(201)
      const postWithLongWarning = {
        content: 'Post content',
        contentWarning: longWarning,
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(postWithLongWarning)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Content warning must be less than 200 characters')
      }
    })

    it('should accept content warning exactly at 200 character limit', () => {
      const maxWarning = 'a'.repeat(200)
      const postWithMaxWarning = {
        content: 'Post content',
        contentWarning: maxWarning,
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(postWithMaxWarning)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contentWarning).toBe(maxWarning)
      }
    })

    it('should trim whitespace from content warning', () => {
      const postWithPaddedWarning = {
        content: 'Post content',
        contentWarning: '  Padded warning  ',
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(postWithPaddedWarning)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contentWarning).toBe('Padded warning')
      }
    })
  })

  describe('Scheduled Post Validation', () => {
    it('should accept scheduled post with future date', () => {
      const futureDate = new Date(Date.now() + 3600000) // 1 hour from now
      const scheduledPost = {
        content: 'Scheduled post content',
        isScheduled: true,
        scheduledFor: futureDate.toISOString(),
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(scheduledPost)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isScheduled).toBe(true)
        expect(result.data.scheduledFor).toBe(futureDate.toISOString())
      }
    })

    it('should reject scheduled post without scheduledFor date', () => {
      const invalidScheduled = {
        content: 'Scheduled post without date',
        isScheduled: true,
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(invalidScheduled)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Scheduled posts must have a future date')
      }
    })

    it('should reject scheduled post with past date', () => {
      const pastDate = new Date(Date.now() - 3600000) // 1 hour ago
      const pastScheduled = {
        content: 'Post scheduled in the past',
        isScheduled: true,
        scheduledFor: pastDate.toISOString(),
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(pastScheduled)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Scheduled posts must have a future date')
      }
    })

    it('should reject scheduled post with invalid date format', () => {
      const invalidDateFormat = {
        content: 'Post with invalid date',
        isScheduled: true,
        scheduledFor: 'not-a-date',
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(invalidDateFormat)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid scheduled date format')
      }
    })

    it('should accept non-scheduled post with scheduledFor date', () => {
      const futureDate = new Date(Date.now() + 3600000)
      const nonScheduledWithDate = {
        content: 'Non-scheduled post',
        isScheduled: false,
        scheduledFor: futureDate.toISOString(),
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(nonScheduledWithDate)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isScheduled).toBe(false)
        expect(result.data.scheduledFor).toBe(futureDate.toISOString())
      }
    })
  })

  describe('Publishing Status Validation', () => {
    it('should default isPublished to true', () => {
      const defaultPost = {
        content: 'Default publication status',
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(defaultPost)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isPublished).toBe(true)
      }
    })

    it('should accept explicit isPublished false for drafts', () => {
      const draftPost = {
        content: 'Draft post content',
        isPublished: false,
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(draftPost)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isPublished).toBe(false)
      }
    })

    it('should default isScheduled to false', () => {
      const defaultPost = {
        content: 'Default scheduling status',
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(defaultPost)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isScheduled).toBe(false)
      }
    })
  })

  describe('Complex Validation Scenarios', () => {
    it('should accept draft scheduled post', () => {
      const futureDate = new Date(Date.now() + 3600000)
      const draftScheduled = {
        content: 'Draft scheduled post',
        contentWarning: 'Future content',
        isScheduled: true,
        scheduledFor: futureDate.toISOString(),
        isPublished: false,
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(draftScheduled)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isScheduled).toBe(true)
        expect(result.data.isPublished).toBe(false)
        expect(result.data.contentWarning).toBe('Future content')
      }
    })

    it('should accept maximum length content with maximum length warning', () => {
      const maxContent = 'a'.repeat(5000)
      const maxWarning = 'b'.repeat(200)
      const maxPost = {
        content: maxContent,
        contentWarning: maxWarning,
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(maxPost)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe(maxContent)
        expect(result.data.contentWarning).toBe(maxWarning)
      }
    })

    it('should handle null scheduledFor appropriately', () => {
      const postWithNullSchedule = {
        content: 'Post with null schedule',
        isScheduled: false,
        scheduledFor: null,
        authorId: 'user-123'
      }

      const result = PostSchemas.create.safeParse(postWithNullSchedule)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.scheduledFor).toBeNull()
      }
    })
  })
})

describe('Post Model Construction', () => {
  const baseMockData: PostData = {
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
    authorId: 'user-123'
  }

  it('should create Post instance with valid data', () => {
    const post = new Post(baseMockData)
    
    expect(post.id).toBe('post-123')
    expect(post.content).toBe('Test post content')
    expect(post.authorId).toBe('user-123')
    expect(post.isPublished).toBe(true)
  })

  it('should handle optional fields correctly', () => {
    const dataWithOptionals: PostData = {
      ...baseMockData,
      contentWarning: 'Test warning',
      activityId: 'https://example.com/activities/123'
    }
    
    const post = new Post(dataWithOptionals)
    
    expect(post.contentWarning).toBe('Test warning')
    expect(post.activityId).toBe('https://example.com/activities/123')
  })

  it('should convert undefined optional fields to null', () => {
    const dataWithUndefined: PostData = {
      ...baseMockData,
      contentWarning: undefined as any,
      scheduledFor: undefined as any,
      publishedAt: undefined as any,
      activityId: undefined as any
    }
    
    const post = new Post(dataWithUndefined)
    
    expect(post.contentWarning).toBeNull()
    expect(post.scheduledFor).toBeNull()
    expect(post.publishedAt).toBeNull()
    expect(post.activityId).toBeNull()
  })
})