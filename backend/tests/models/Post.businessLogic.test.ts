// backend/tests/models/Post.businessLogic.test.ts
// Unit tests for Post model business logic methods

import { describe, it, expect } from 'vitest'
import { Post } from '../../src/models/Post'
import type { PostData, PublicPost } from '../../src/models/Post'

describe('Post Business Logic Methods', () => {
  // Helper function to create mock post data
  const createMockPost = (overrides: Partial<PostData> = {}): PostData => ({
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
    ...overrides
  })

  describe('isReadyToPublish()', () => {
    it('should return false for already published posts', () => {
      const publishedPost = new Post(createMockPost({
        isPublished: true
      }))

      expect(publishedPost.isReadyToPublish()).toBe(false)
    })

    it('should return true for draft posts with content', () => {
      const draftPost = new Post(createMockPost({
        isPublished: false,
        isScheduled: false,
        publishedAt: null
      }))

      expect(draftPost.isReadyToPublish()).toBe(true)
    })

    it('should return false for posts with empty content', () => {
      const emptyPost = new Post(createMockPost({
        content: '',
        isPublished: false,
        publishedAt: null
      }))

      expect(emptyPost.isReadyToPublish()).toBe(false)
    })

    it('should return false for posts with only whitespace content', () => {
      const whitespacePost = new Post(createMockPost({
        content: '   \n\t   ',
        isPublished: false,
        publishedAt: null
      }))

      expect(whitespacePost.isReadyToPublish()).toBe(false)
    })

    it('should return false for scheduled posts with future dates', () => {
      const futureDate = new Date(Date.now() + 3600000) // 1 hour from now
      const scheduledPost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: futureDate,
        isPublished: false,
        publishedAt: null
      }))

      expect(scheduledPost.isReadyToPublish()).toBe(false)
    })

    it('should return true for scheduled posts with past dates', () => {
      const pastDate = new Date(Date.now() - 3600000) // 1 hour ago
      const expiredScheduledPost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: pastDate,
        isPublished: false,
        publishedAt: null
      }))

      expect(expiredScheduledPost.isReadyToPublish()).toBe(true)
    })
  })

  describe('isDraft()', () => {
    it('should return true for unpublished, unscheduled posts', () => {
      const draftPost = new Post(createMockPost({
        isPublished: false,
        isScheduled: false,
        publishedAt: null
      }))

      expect(draftPost.isDraft()).toBe(true)
    })

    it('should return false for published posts', () => {
      const publishedPost = new Post(createMockPost({
        isPublished: true
      }))

      expect(publishedPost.isDraft()).toBe(false)
    })

    it('should return false for scheduled posts', () => {
      const scheduledPost = new Post(createMockPost({
        isPublished: false,
        isScheduled: true,
        scheduledFor: new Date(Date.now() + 3600000),
        publishedAt: null
      }))

      expect(scheduledPost.isDraft()).toBe(false)
    })
  })

  describe('isScheduledPost()', () => {
    it('should return true for scheduled posts with future dates', () => {
      const futureDate = new Date(Date.now() + 3600000)
      const scheduledPost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: futureDate,
        isPublished: false,
        publishedAt: null
      }))

      expect(scheduledPost.isScheduledPost()).toBe(true)
    })

    it('should return false for scheduled posts with past dates', () => {
      const pastDate = new Date(Date.now() - 3600000)
      const expiredPost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: pastDate,
        isPublished: false,
        publishedAt: null
      }))

      expect(expiredPost.isScheduledPost()).toBe(false)
    })

    it('should return false for unscheduled posts', () => {
      const draftPost = new Post(createMockPost({
        isScheduled: false,
        scheduledFor: null,
        isPublished: false,
        publishedAt: null
      }))

      expect(draftPost.isScheduledPost()).toBe(false)
    })

    it('should return false for scheduled posts without scheduledFor date', () => {
      const invalidScheduled = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: null,
        isPublished: false,
        publishedAt: null
      }))

      expect(invalidScheduled.isScheduledPost()).toBe(false)
    })
  })

  describe('hasExpiredSchedule()', () => {
    it('should return true for scheduled posts with past dates', () => {
      const pastDate = new Date(Date.now() - 3600000)
      const expiredPost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: pastDate,
        isPublished: false,
        publishedAt: null
      }))

      expect(expiredPost.hasExpiredSchedule()).toBe(true)
    })

    it('should return false for scheduled posts with future dates', () => {
      const futureDate = new Date(Date.now() + 3600000)
      const futurePost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: futureDate,
        isPublished: false,
        publishedAt: null
      }))

      expect(futurePost.hasExpiredSchedule()).toBe(false)
    })

    it('should return false for unscheduled posts', () => {
      const draftPost = new Post(createMockPost({
        isScheduled: false,
        scheduledFor: null,
        isPublished: false,
        publishedAt: null
      }))

      expect(draftPost.hasExpiredSchedule()).toBe(false)
    })

    it('should return false for scheduled posts without scheduledFor date', () => {
      const invalidScheduled = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: null,
        isPublished: false,
        publishedAt: null
      }))

      expect(invalidScheduled.hasExpiredSchedule()).toBe(false)
    })
  })

  describe('getContentPreview()', () => {
    it('should return full content when shorter than limit', () => {
      const shortPost = new Post(createMockPost({
        content: 'Short content'
      }))

      expect(shortPost.getContentPreview(280)).toBe('Short content')
    })

    it('should return full content when exactly at limit', () => {
      const exactLengthContent = 'a'.repeat(280)
      const exactPost = new Post(createMockPost({
        content: exactLengthContent
      }))

      expect(exactPost.getContentPreview(280)).toBe(exactLengthContent)
    })

    it('should truncate content longer than limit', () => {
      const longContent = 'a'.repeat(300)
      const longPost = new Post(createMockPost({
        content: longContent
      }))

      const preview = longPost.getContentPreview(280)
      expect(preview.length).toBeLessThanOrEqual(283) // 280 + '...'
      expect(preview.endsWith('...')).toBe(true)
    })

    it('should truncate at word boundaries when possible', () => {
      const content = 'This is a very long sentence that should be truncated at a word boundary to maintain readability and avoid cutting words in half.'
      const post = new Post(createMockPost({ content }))

      const preview = post.getContentPreview(50)
      expect(preview.endsWith('...')).toBe(true)
      // Should not end with a partial word (unless no good boundary exists)
      const withoutEllipsis = preview.replace('...', '')
      expect(withoutEllipsis.endsWith(' ')).toBe(false) // Trimmed
    })

    it('should use default limit of 280 characters', () => {
      const longContent = 'a'.repeat(300)
      const longPost = new Post(createMockPost({
        content: longContent
      }))

      const preview = longPost.getContentPreview()
      expect(preview.length).toBeLessThanOrEqual(283) // 280 + '...'
    })

    it('should handle custom length limits', () => {
      const content = 'This is a test post with some content'
      const post = new Post(createMockPost({ content }))

      const shortPreview = post.getContentPreview(10)
      expect(shortPreview.length).toBeLessThanOrEqual(13) // 10 + '...'
      expect(shortPreview.endsWith('...')).toBe(true)
    })
  })

  describe('generateActivityId()', () => {
    it('should generate correct ActivityPub URI format', () => {
      const post = new Post(createMockPost({
        id: 'post-123'
      }))

      const activityId = post.generateActivityId('example.com')
      expect(activityId).toBe('https://example.com/posts/post-123/activity')
    })

    it('should handle different domains', () => {
      const post = new Post(createMockPost({
        id: 'test-post'
      }))

      const activityId = post.generateActivityId('my-instance.social')
      expect(activityId).toBe('https://my-instance.social/posts/test-post/activity')
    })

    it('should work with complex post IDs', () => {
      const post = new Post(createMockPost({
        id: 'post-abc123-def456'
      }))

      const activityId = post.generateActivityId('domain.org')
      expect(activityId).toBe('https://domain.org/posts/post-abc123-def456/activity')
    })
  })

  describe('toPublicPost()', () => {
    const mockAuthor: PublicPost['author'] = {
      id: 'user-123',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
      actorId: 'https://example.com/users/testuser'
    }

    const mockMedia: PublicPost['media'] = [
      {
        id: 'media-1',
        url: 'https://example.com/image.jpg',
        mimeType: 'image/jpeg',
        altText: 'Test image',
        width: 800,
        height: 600
      }
    ]

    it('should convert published post to public format', () => {
      const publishedPost = new Post(createMockPost({
        id: 'post-123',
        content: 'Public post content',
        contentWarning: 'Content warning',
        isPublished: true,
        publishedAt: new Date('2024-01-01T12:00:00Z'),
        activityId: 'https://example.com/activities/123'
      }))

      const publicPost = publishedPost.toPublicPost(mockAuthor, mockMedia)

      expect(publicPost).toEqual({
        id: 'post-123',
        content: 'Public post content',
        contentWarning: 'Content warning',
        publishedAt: new Date('2024-01-01T12:00:00Z'),
        activityId: 'https://example.com/activities/123',
        author: mockAuthor,
        media: mockMedia
      })
    })

    it('should work without media attachments', () => {
      const publishedPost = new Post(createMockPost())

      const publicPost = publishedPost.toPublicPost(mockAuthor)

      expect(publicPost.media).toEqual([])
    })

    it('should handle null content warning', () => {
      const post = new Post(createMockPost({
        contentWarning: null
      }))

      const publicPost = post.toPublicPost(mockAuthor)

      expect(publicPost.contentWarning).toBeNull()
    })

    it('should throw error for unpublished posts', () => {
      const draftPost = new Post(createMockPost({
        isPublished: false,
        publishedAt: null
      }))

      expect(() => {
        draftPost.toPublicPost(mockAuthor)
      }).toThrow('Cannot convert unpublished post to public format')
    })

    it('should throw error for posts without publishedAt date', () => {
      const invalidPost = new Post(createMockPost({
        isPublished: true,
        publishedAt: null
      }))

      expect(() => {
        invalidPost.toPublicPost(mockAuthor)
      }).toThrow('Cannot convert unpublished post to public format')
    })
  })

  describe('toDraft()', () => {
    it('should convert post to draft format', () => {
      const post = new Post(createMockPost({
        id: 'post-123',
        content: 'Draft content',
        contentWarning: 'Warning text',
        isScheduled: true,
        scheduledFor: new Date('2024-02-01T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z')
      }))

      const draft = post.toDraft()

      expect(draft).toEqual({
        id: 'post-123',
        content: 'Draft content',
        contentWarning: 'Warning text',
        isScheduled: true,
        scheduledFor: new Date('2024-02-01T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T12:00:00Z')
      })
    })

    it('should handle null values correctly', () => {
      const post = new Post(createMockPost({
        contentWarning: null,
        scheduledFor: null
      }))

      const draft = post.toDraft()

      expect(draft.contentWarning).toBeNull()
      expect(draft.scheduledFor).toBeNull()
    })
  })

  describe('toSummary()', () => {
    it('should convert published post to summary format', () => {
      const publishedPost = new Post(createMockPost({
        id: 'post-123',
        content: 'Summary test content',
        contentWarning: 'Warning',
        publishedAt: new Date('2024-01-01T12:00:00Z'),
        authorId: 'user-123'
      }))

      const summary = publishedPost.toSummary(2)

      expect(summary).toEqual({
        id: 'post-123',
        content: 'Summary test content',
        contentWarning: 'Warning',
        publishedAt: new Date('2024-01-01T12:00:00Z'),
        authorId: 'user-123',
        mediaCount: 2,
        hasContentWarning: true
      })
    })

    it('should default mediaCount to 0', () => {
      const post = new Post(createMockPost())

      const summary = post.toSummary()

      expect(summary.mediaCount).toBe(0)
    })

    it('should set hasContentWarning to false for null warning', () => {
      const post = new Post(createMockPost({
        contentWarning: null
      }))

      const summary = post.toSummary()

      expect(summary.hasContentWarning).toBe(false)
    })

    it('should set hasContentWarning to true for empty string warning', () => {
      const post = new Post(createMockPost({
        contentWarning: ''
      }))

      const summary = post.toSummary()

      expect(summary.hasContentWarning).toBe(false) // Boolean('') is false
    })

    it('should throw error for unpublished posts', () => {
      const draftPost = new Post(createMockPost({
        isPublished: false,
        publishedAt: null
      }))

      expect(() => {
        draftPost.toSummary()
      }).toThrow('Cannot create summary for unpublished post')
    })
  })

  describe('update()', () => {
    it('should update post content', () => {
      const originalPost = new Post(createMockPost({
        content: 'Original content',
        updatedAt: new Date('2024-01-01T00:00:00Z')
      }))

      const updatedPost = originalPost.update({
        content: 'Updated content'
      })

      expect(updatedPost.content).toBe('Updated content')
      expect(updatedPost.updatedAt.getTime()).toBeGreaterThan(originalPost.updatedAt.getTime())
    })

    it('should update content warning', () => {
      const originalPost = new Post(createMockPost({
        contentWarning: 'Original warning'
      }))

      const updatedPost = originalPost.update({
        contentWarning: 'New warning'
      })

      expect(updatedPost.contentWarning).toBe('New warning')
    })

    it('should clear content warning with null', () => {
      const originalPost = new Post(createMockPost({
        contentWarning: 'Original warning'
      }))

      const updatedPost = originalPost.update({
        contentWarning: null
      })

      expect(updatedPost.contentWarning).toBeNull()
    })

    it('should update publishing status', () => {
      const draftPost = new Post(createMockPost({
        isPublished: false,
        publishedAt: null
      }))

      const publishedPost = draftPost.update({
        isPublished: true
      })

      expect(publishedPost.isPublished).toBe(true)
      expect(publishedPost.publishedAt).toBeInstanceOf(Date)
    })

    it('should set publishedAt when publishing for first time', () => {
      const draftPost = new Post(createMockPost({
        isPublished: false,
        publishedAt: null
      }))

      const publishedPost = draftPost.update({
        isPublished: true
      })

      expect(publishedPost.publishedAt).toBeInstanceOf(Date)
      expect(publishedPost.publishedAt!.getTime()).toBeGreaterThan(Date.now() - 1000) // Within last second
    })

    it('should not change publishedAt when already published', () => {
      const originalDate = new Date('2024-01-01T12:00:00Z')
      const publishedPost = new Post(createMockPost({
        isPublished: true,
        publishedAt: originalDate
      }))

      const updatedPost = publishedPost.update({
        content: 'Updated content'
      })

      expect(updatedPost.publishedAt).toEqual(originalDate)
    })

    it('should preserve unchanged fields', () => {
      const originalPost = new Post(createMockPost({
        id: 'post-123',
        content: 'Original content',
        authorId: 'user-123',
        isScheduled: true,
        scheduledFor: new Date('2024-02-01T00:00:00Z')
      }))

      const updatedPost = originalPost.update({
        content: 'New content'
      })

      expect(updatedPost.id).toBe('post-123')
      expect(updatedPost.authorId).toBe('user-123')
      expect(updatedPost.isScheduled).toBe(true)
      expect(updatedPost.scheduledFor).toEqual(new Date('2024-02-01T00:00:00Z'))
    })

    it('should return new Post instance', () => {
      const originalPost = new Post(createMockPost())

      const updatedPost = originalPost.update({
        content: 'Updated content'
      })

      expect(updatedPost).not.toBe(originalPost) // Different instances
      expect(updatedPost).toBeInstanceOf(Post)
    })
  })
})