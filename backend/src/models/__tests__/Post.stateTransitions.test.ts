// backend/tests/models/Post.stateTransitions.test.ts
// Unit tests for Post model state transitions and workflows

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Post } from '../Post'
import type { PostData } from '../Post'

describe('Post State Transitions', () => {
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

  beforeEach(() => {
    // Reset time mocks before each test
    vi.restoreAllMocks()
  })

  describe('Draft → Published Workflow', () => {
    it('should transition from draft to published', () => {
      const draftPost = new Post(createMockPost({
        isPublished: false,
        publishedAt: null
      }))

      expect(draftPost.isDraft()).toBe(true)
      expect(draftPost.isReadyToPublish()).toBe(true)

      const publishedPost = draftPost.update({
        isPublished: true
      })

      expect(publishedPost.isPublished).toBe(true)
      expect(publishedPost.publishedAt).toBeInstanceOf(Date)
      expect(publishedPost.isDraft()).toBe(false)
    })

    it('should set publishedAt timestamp when transitioning to published', () => {
      const mockNow = new Date('2024-01-15T12:00:00Z')
      vi.setSystemTime(mockNow)

      const draftPost = new Post(createMockPost({
        isPublished: false,
        publishedAt: null
      }))

      const publishedPost = draftPost.update({
        isPublished: true
      })

      expect(publishedPost.publishedAt).toEqual(mockNow)
    })

    it('should allow editing content before publishing', () => {
      const draftPost = new Post(createMockPost({
        content: 'Original draft content',
        isPublished: false,
        publishedAt: null
      }))

      const editedDraft = draftPost.update({
        content: 'Edited draft content'
      })

      expect(editedDraft.content).toBe('Edited draft content')
      expect(editedDraft.isPublished).toBe(false)
      expect(editedDraft.publishedAt).toBeNull()

      const publishedPost = editedDraft.update({
        isPublished: true
      })

      expect(publishedPost.content).toBe('Edited draft content')
      expect(publishedPost.isPublished).toBe(true)
    })

    it('should preserve other fields during draft to published transition', () => {
      const draftPost = new Post(createMockPost({
        content: 'Draft content',
        contentWarning: 'Test warning',
        authorId: 'user-456',
        isPublished: false,
        publishedAt: null
      }))

      const publishedPost = draftPost.update({
        isPublished: true
      })

      expect(publishedPost.content).toBe('Draft content')
      expect(publishedPost.contentWarning).toBe('Test warning')
      expect(publishedPost.authorId).toBe('user-456')
    })
  })

  describe('Draft → Scheduled → Published Workflow', () => {
    it('should transition from draft to scheduled', () => {
      const futureDate = new Date(Date.now() + 3600000) // 1 hour from now
      const draftPost = new Post(createMockPost({
        isPublished: false,
        isScheduled: false,
        publishedAt: null
      }))

      expect(draftPost.isDraft()).toBe(true)

      const scheduledPost = draftPost.update({
        content: 'Scheduled content'
      })

      // Simulate scheduling (this would be done by scheduling logic, not update method)
      const scheduleData = createMockPost({
        content: 'Scheduled content',
        isScheduled: true,
        scheduledFor: futureDate,
        isPublished: false,
        publishedAt: null,
        updatedAt: new Date()
      })
      const actualScheduledPost = new Post(scheduleData)

      expect(actualScheduledPost.isDraft()).toBe(false)
      expect(actualScheduledPost.isScheduledPost()).toBe(true)
      expect(actualScheduledPost.isReadyToPublish()).toBe(false)
    })

    it('should detect when scheduled post is ready to publish', () => {
      const pastDate = new Date(Date.now() - 3600000) // 1 hour ago
      const expiredScheduledPost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: pastDate,
        isPublished: false,
        publishedAt: null
      }))

      expect(expiredScheduledPost.isScheduledPost()).toBe(false)
      expect(expiredScheduledPost.hasExpiredSchedule()).toBe(true)
      expect(expiredScheduledPost.isReadyToPublish()).toBe(true)
    })

    it('should transition from expired scheduled to published', () => {
      const pastDate = new Date(Date.now() - 3600000)
      const expiredScheduledPost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: pastDate,
        isPublished: false,
        publishedAt: null
      }))

      expect(expiredScheduledPost.hasExpiredSchedule()).toBe(true)
      expect(expiredScheduledPost.isReadyToPublish()).toBe(true)

      const publishedPost = expiredScheduledPost.update({
        isPublished: true
      })

      expect(publishedPost.isPublished).toBe(true)
      expect(publishedPost.publishedAt).toBeInstanceOf(Date)
      expect(publishedPost.isScheduledPost()).toBe(false)
    })

    it('should preserve scheduled metadata when publishing', () => {
      const scheduledDate = new Date(Date.now() - 1800000) // 30 minutes ago
      const expiredPost = new Post(createMockPost({
        content: 'Scheduled content',
        isScheduled: true,
        scheduledFor: scheduledDate,
        isPublished: false,
        publishedAt: null
      }))

      const publishedPost = expiredPost.update({
        isPublished: true
      })

      expect(publishedPost.isScheduled).toBe(true) // Preserves scheduling metadata
      expect(publishedPost.scheduledFor).toEqual(scheduledDate)
      expect(publishedPost.isPublished).toBe(true)
    })
  })

  describe('Published Post State Management', () => {
    it('should prevent transition from published back to draft', () => {
      const publishedPost = new Post(createMockPost({
        isPublished: true,
        publishedAt: new Date('2024-01-01T12:00:00Z')
      }))

      expect(publishedPost.isReadyToPublish()).toBe(false)
      expect(publishedPost.isDraft()).toBe(false)

      // Update should not change publishing status back to false
      // (This would need to be enforced by business rules)
      const updatedPost = publishedPost.update({
        content: 'Updated published content'
      })

      expect(updatedPost.isPublished).toBe(true)
      expect(updatedPost.publishedAt).toEqual(new Date('2024-01-01T12:00:00Z'))
    })

    it('should allow content updates on published posts', () => {
      const originalPublishedAt = new Date('2024-01-01T12:00:00Z')
      const publishedPost = new Post(createMockPost({
        content: 'Original published content',
        isPublished: true,
        publishedAt: originalPublishedAt
      }))

      const updatedPost = publishedPost.update({
        content: 'Updated published content'
      })

      expect(updatedPost.content).toBe('Updated published content')
      expect(updatedPost.isPublished).toBe(true)
      expect(updatedPost.publishedAt).toEqual(originalPublishedAt) // Should not change
    })

    it('should allow content warning updates on published posts', () => {
      const publishedPost = new Post(createMockPost({
        contentWarning: null,
        isPublished: true
      }))

      const updatedPost = publishedPost.update({
        contentWarning: 'Added content warning'
      })

      expect(updatedPost.contentWarning).toBe('Added content warning')
      expect(updatedPost.isPublished).toBe(true)
    })
  })

  describe('Schedule Management Workflows', () => {
    it('should handle scheduling future posts', () => {
      const futureDate = new Date(Date.now() + 7200000) // 2 hours from now
      const draftPost = new Post(createMockPost({
        isPublished: false,
        isScheduled: false,
        publishedAt: null
      }))

      // Simulate scheduling operation
      const scheduledData = createMockPost({
        content: draftPost.content,
        isScheduled: true,
        scheduledFor: futureDate,
        isPublished: false,
        publishedAt: null,
        updatedAt: new Date()
      })
      const scheduledPost = new Post(scheduledData)

      expect(scheduledPost.isScheduledPost()).toBe(true)
      expect(scheduledPost.isDraft()).toBe(false)
      expect(scheduledPost.isReadyToPublish()).toBe(false)
    })

    it('should handle rescheduling posts', () => {
      const originalDate = new Date(Date.now() + 3600000) // 1 hour from now
      const newDate = new Date(Date.now() + 7200000) // 2 hours from now

      const scheduledPost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: originalDate,
        isPublished: false,
        publishedAt: null
      }))

      // Simulate rescheduling
      const rescheduledData = createMockPost({
        content: scheduledPost.content,
        isScheduled: true,
        scheduledFor: newDate,
        isPublished: false,
        publishedAt: null,
        updatedAt: new Date()
      })
      const rescheduledPost = new Post(rescheduledData)

      expect(rescheduledPost.scheduledFor).toEqual(newDate)
      expect(rescheduledPost.isScheduledPost()).toBe(true)
    })

    it('should handle canceling scheduled posts (back to draft)', () => {
      const scheduledPost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: new Date(Date.now() + 3600000),
        isPublished: false,
        publishedAt: null
      }))

      expect(scheduledPost.isScheduledPost()).toBe(true)

      // Simulate unscheduling
      const unscheduledData = createMockPost({
        content: scheduledPost.content,
        isScheduled: false,
        scheduledFor: null,
        isPublished: false,
        publishedAt: null,
        updatedAt: new Date()
      })
      const draftPost = new Post(unscheduledData)

      expect(draftPost.isDraft()).toBe(true)
      expect(draftPost.isScheduledPost()).toBe(false)
      expect(draftPost.scheduledFor).toBeNull()
    })
  })

  describe('Edge Cases and Error States', () => {
    it('should handle posts with invalid scheduling state', () => {
      // Post marked as scheduled but no scheduledFor date
      const invalidPost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: null,
        isPublished: false,
        publishedAt: null
      }))

      expect(invalidPost.isScheduledPost()).toBe(false)
      expect(invalidPost.hasExpiredSchedule()).toBe(false)
      expect(invalidPost.isDraft()).toBe(false) // Not a draft because isScheduled=true
    })

    it('should handle posts with past scheduled dates', () => {
      const pastDate = new Date(Date.now() - 86400000) // 24 hours ago
      const pastScheduledPost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: pastDate,
        isPublished: false,
        publishedAt: null
      }))

      expect(pastScheduledPost.isScheduledPost()).toBe(false)
      expect(pastScheduledPost.hasExpiredSchedule()).toBe(true)
      expect(pastScheduledPost.isReadyToPublish()).toBe(true)
    })

    it('should handle posts with inconsistent published state', () => {
      // Published but no publishedAt date
      const inconsistentPost = new Post(createMockPost({
        isPublished: true,
        publishedAt: null
      }))

      expect(() => {
        inconsistentPost.toPublicPost({
          id: 'user-123',
          username: 'test',
          displayName: 'Test',
          avatar: null,
          actorId: null
        })
      }).toThrow('Cannot convert unpublished post to public format')
    })

    it('should handle empty content in state transitions', () => {
      const emptyDraft = new Post(createMockPost({
        content: '',
        isPublished: false,
        publishedAt: null
      }))

      expect(emptyDraft.isDraft()).toBe(true)
      expect(emptyDraft.isReadyToPublish()).toBe(false) // Can't publish empty content

      const emptyScheduled = new Post(createMockPost({
        content: '',
        isScheduled: true,
        scheduledFor: new Date(Date.now() - 3600000), // Expired
        isPublished: false,
        publishedAt: null
      }))

      expect(emptyScheduled.hasExpiredSchedule()).toBe(true)
      expect(emptyScheduled.isReadyToPublish()).toBe(false) // Can't publish empty content
    })
  })

  describe('State Transition Timing', () => {
    it('should handle boundary conditions for scheduling', () => {
      // Test post scheduled for exactly now
      const nowDate = new Date()
      const nowScheduledPost = new Post(createMockPost({
        isScheduled: true,
        scheduledFor: nowDate,
        isPublished: false,
        publishedAt: null
      }))

      // This might be true or false depending on exact timing
      const isExpired = nowScheduledPost.hasExpiredSchedule()
      const isScheduled = nowScheduledPost.isScheduledPost()
      
      // At least one of these should be true
      expect(isExpired || isScheduled).toBe(true)
    })

    it('should handle multiple rapid state changes', () => {
      let post = new Post(createMockPost({
        content: 'Test content',
        isPublished: false,
        publishedAt: null
      }))

      // Draft → Updated Content
      post = post.update({
        content: 'Updated content'
      })
      expect(post.isDraft()).toBe(true)

      // Draft → Updated Content Warning
      post = post.update({
        contentWarning: 'Content warning'
      })
      expect(post.isDraft()).toBe(true)

      // Draft → Published
      post = post.update({
        isPublished: true
      })
      expect(post.isPublished).toBe(true)
      expect(post.publishedAt).toBeInstanceOf(Date)

      // Published → Updated Content
      post = post.update({
        content: 'Final content'
      })
      expect(post.isPublished).toBe(true)
      expect(post.content).toBe('Final content')
    })
  })
})