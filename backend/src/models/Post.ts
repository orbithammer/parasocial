// backend/src/models/Post.ts
// Post model class with validation schemas using proper TypeScript types

import { z } from 'zod'

// Validation schemas
export const PostSchemas = {
  // Create post validation
  create: z.object({
    content: z.string()
      .trim()
      .min(1, 'Post content cannot be empty')
      .max(5000, 'Post content must be less than 5000 characters'),
    contentWarning: z.string()
      .trim()
      .max(200, 'Content warning must be less than 200 characters')
      .optional()
      .or(z.literal('')),
    isScheduled: z.boolean().default(false),
    scheduledFor: z.string()
      .datetime('Invalid scheduled date format')
      .optional()
      .nullable(),
    isPublished: z.boolean().default(true)
  }).refine((data) => {
    // If scheduled, must have scheduledFor date
    if (data.isScheduled && !data.scheduledFor) {
      return false
    }
    // If scheduled, scheduledFor must be in the future
    if (data.scheduledFor) {
      const scheduledDate = new Date(data.scheduledFor)
      return scheduledDate > new Date()
    }
    return true
  }, {
    message: 'Scheduled posts must have a future date',
    path: ['scheduledFor']
  }),

  // Update post validation
  update: z.object({
    content: z.string()
      .trim()
      .min(1, 'Post content cannot be empty')
      .max(5000, 'Post content must be less than 5000 characters')
      .optional(),
    contentWarning: z.string()
      .trim()
      .max(200, 'Content warning must be less than 200 characters')
      .optional()
      .or(z.literal('')),
    isPublished: z.boolean().optional()
  }),

  // Schedule post validation
  schedule: z.object({
    scheduledFor: z.string()
      .datetime('Invalid scheduled date format')
      .refine((date) => new Date(date) > new Date(), {
        message: 'Scheduled date must be in the future'
      })
  }),

  // Publish post validation
  publish: z.object({
    publishNow: z.boolean().default(true)
  })
}

// Post data interface (complete post with all fields)
interface PostData {
  id: string
  content: string
  contentWarning?: string | null
  isScheduled: boolean
  scheduledFor?: Date | null
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date | null
  activityId?: string | null
  authorId: string
}

// Public post interface (what federated instances see)
interface PublicPost {
  id: string
  content: string
  contentWarning?: string | null
  publishedAt: Date
  activityId?: string | null
  author: {
    id: string
    username: string
    displayName: string
    avatar: string | null
    actorId: string | null
  }
  media?: Array<{
    id: string
    url: string
    mimeType: string
    altText?: string | null
    width?: number | null
    height?: number | null
  }>
}

// Post draft interface (unpublished posts)
interface PostDraft {
  id: string
  content: string
  contentWarning?: string | null
  isScheduled: boolean
  scheduledFor?: Date | null
  createdAt: Date
  updatedAt: Date
}

// Post summary interface (for feeds and lists)
interface PostSummary {
  id: string
  content: string
  contentWarning?: string | null
  publishedAt: Date
  authorId: string
  mediaCount: number
  hasContentWarning: boolean
}

// Post creation data interface
interface PostCreateData {
  content: string
  contentWarning?: string | null
  isScheduled?: boolean
  scheduledFor?: Date | null
  isPublished?: boolean
  authorId: string
}

// Post update data interface
interface PostUpdateData {
  content?: string
  contentWarning?: string | null
  isPublished?: boolean
}

/**
 * Post model class for database operations and business logic
 */
export class Post {
  public id: string
  public content: string
  public contentWarning: string | null
  public isScheduled: boolean
  public scheduledFor: Date | null
  public isPublished: boolean
  public createdAt: Date
  public updatedAt: Date
  public publishedAt: Date | null
  public activityId: string | null
  public authorId: string

  constructor(data: PostData) {
    this.id = data.id
    this.content = data.content
    this.contentWarning = data.contentWarning || null
    this.isScheduled = data.isScheduled
    this.scheduledFor = data.scheduledFor || null
    this.isPublished = data.isPublished
    this.createdAt = data.createdAt
    this.updatedAt = data.updatedAt
    this.publishedAt = data.publishedAt || null
    this.activityId = data.activityId || null
    this.authorId = data.authorId
  }

  /**
   * Convert post to public format for ActivityPub federation
   * @param author - Author information to include
   * @param media - Media attachments to include
   * @returns PublicPost object
   */
  toPublicPost(author: PublicPost['author'], media: PublicPost['media'] = []): PublicPost {
    if (!this.isPublished || !this.publishedAt) {
      throw new Error('Cannot convert unpublished post to public format')
    }

    return {
      id: this.id,
      content: this.content,
      contentWarning: this.contentWarning,
      publishedAt: this.publishedAt,
      activityId: this.activityId,
      author,
      media
    }
  }

  /**
   * Convert post to draft format for author viewing
   * @returns PostDraft object
   */
  toDraft(): PostDraft {
    return {
      id: this.id,
      content: this.content,
      contentWarning: this.contentWarning,
      isScheduled: this.isScheduled,
      scheduledFor: this.scheduledFor,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * Convert post to summary format for feeds
   * @param mediaCount - Number of media attachments
   * @returns PostSummary object
   */
  toSummary(mediaCount: number = 0): PostSummary {
    if (!this.isPublished || !this.publishedAt) {
      throw new Error('Cannot create summary for unpublished post')
    }

    return {
      id: this.id,
      content: this.content,
      contentWarning: this.contentWarning,
      publishedAt: this.publishedAt,
      authorId: this.authorId,
      mediaCount,
      hasContentWarning: Boolean(this.contentWarning)
    }
  }

  /**
   * Check if post is ready to be published
   * @returns boolean indicating if post can be published
   */
  isReadyToPublish(): boolean {
    // Already published
    if (this.isPublished) {
      return false
    }

    // Scheduled post that hasn't reached its time yet
    if (this.isScheduled && this.scheduledFor && this.scheduledFor > new Date()) {
      return false
    }

    // Must have content
    if (!this.content.trim()) {
      return false
    }

    return true
  }

  /**
   * Check if post is a draft
   * @returns boolean indicating if post is a draft
   */
  isDraft(): boolean {
    return !this.isPublished && !this.isScheduled
  }

  /**
   * Check if post is scheduled for future publication
   * @returns boolean indicating if post is scheduled
   */
  isScheduledPost(): boolean {
    return this.isScheduled && Boolean(this.scheduledFor) && this.scheduledFor! > new Date()
  }

  /**
   * Check if post has expired schedule (should be published now)
   * @returns boolean indicating if scheduled post should be published
   */
  hasExpiredSchedule(): boolean {
    return this.isScheduled && Boolean(this.scheduledFor) && this.scheduledFor! <= new Date()
  }

  /**
   * Get content preview with truncation for feeds
   * @param maxLength - Maximum length of preview (default 280)
   * @returns Truncated content string
   */
  getContentPreview(maxLength: number = 280): string {
    if (this.content.length <= maxLength) {
      return this.content
    }

    // Find last complete word within limit
    const truncated = this.content.substring(0, maxLength)
    const lastSpaceIndex = truncated.lastIndexOf(' ')
    
    if (lastSpaceIndex > 0 && lastSpaceIndex > maxLength * 0.8) {
      return truncated.substring(0, lastSpaceIndex) + '...'
    }
    
    return truncated + '...'
  }

  /**
   * Generate ActivityPub activity ID for federation
   * @param domain - Instance domain name
   * @returns ActivityPub activity URI
   */
  generateActivityId(domain: string): string {
    return `https://${domain}/posts/${this.id}/activity`
  }

  /**
   * Update post content and metadata
   * @param updateData - Data to update
   * @returns Updated Post instance
   */
  update(updateData: PostUpdateData): Post {
    const updatedData: PostData = {
      id: this.id,
      content: updateData.content || this.content,
      contentWarning: updateData.contentWarning !== undefined ? updateData.contentWarning : this.contentWarning,
      isScheduled: this.isScheduled,
      scheduledFor: this.scheduledFor,
      isPublished: updateData.isPublished !== undefined ? updateData.isPublished : this.isPublished,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      publishedAt: this.publishedAt,
      activityId: this.activityId,
      authorId: this.authorId
    }

    // If publishing for the first time, set publishedAt
    if (updateData.isPublished && !this.isPublished && !this.publishedAt) {
      updatedData.publishedAt = new Date()
    }

    return new Post(updatedData)
  }
}

// Export types for use in other files
export type {
  PostData,
  PublicPost,
  PostDraft,
  PostSummary,
  PostCreateData,
  PostUpdateData
}