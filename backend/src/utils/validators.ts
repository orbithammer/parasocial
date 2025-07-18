// backend/src/utils/validators.ts
// Version: 1.0.0 - Initial implementation of comprehensive validation schemas
// Added: Complete Zod validation schemas for all ParaSocial entities and operations

import { z } from 'zod'

// =============================================================================
// COMMON VALIDATION SCHEMAS
// =============================================================================

/**
 * Common ID validation schema
 * Validates CUID format used by Prisma
 */
export const idSchema = z.string()
  .min(1, 'ID is required')
  .max(255, 'ID too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'ID contains invalid characters')

/**
 * Username validation schema
 * Enforces username rules for ParaSocial platform
 */
export const usernameSchema = z.string()
  .min(2, 'Username must be at least 2 characters')
  .max(30, 'Username cannot exceed 30 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .refine(
    (username) => !username.startsWith('_') && !username.endsWith('_'),
    'Username cannot start or end with underscore'
  )

/**
 * Email validation schema
 */
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email address too long')
  .toLowerCase()

/**
 * Password validation schema
 * Enforces strong password requirements
 */
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')

/**
 * URL validation schema
 * Validates HTTP/HTTPS URLs
 */
export const urlSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL too long')
  .refine(
    (url) => url.startsWith('https://') || url.startsWith('http://'),
    'URL must start with http:// or https://'
  )

/**
 * Pagination validation schema
 */
export const paginationSchema = z.object({
  page: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 1)
    .refine((val) => val >= 1, 'Page must be 1 or greater')
    .refine((val) => val <= 1000, 'Page cannot exceed 1000'),
  
  limit: z.string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 20)
    .refine((val) => val >= 1, 'Limit must be 1 or greater')
    .refine((val) => val <= 100, 'Limit cannot exceed 100'),
  
  offset: z.number()
    .int()
    .min(0, 'Offset cannot be negative')
    .max(10000, 'Offset cannot exceed 10000')
    .optional()
})

// =============================================================================
// USER VALIDATION SCHEMAS
// =============================================================================

/**
 * User registration validation schema
 */
export const userRegistrationSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(50, 'Display name cannot exceed 50 characters')
    .trim()
    .optional()
})

/**
 * User login validation schema
 */
export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password too long')
})

/**
 * User profile update validation schema
 */
export const userProfileUpdateSchema = z.object({
  displayName: z.string()
    .min(1, 'Display name cannot be empty')
    .max(50, 'Display name cannot exceed 50 characters')
    .trim()
    .optional(),
  
  bio: z.string()
    .max(500, 'Bio cannot exceed 500 characters')
    .trim()
    .optional()
    .nullable(),
  
  website: urlSchema
    .optional()
    .nullable(),
  
  avatar: urlSchema
    .optional()
    .nullable()
})

/**
 * Username parameter validation schema
 */
export const usernameParamSchema = z.object({
  username: usernameSchema
})

// =============================================================================
// POST VALIDATION SCHEMAS
// =============================================================================

/**
 * Post content validation schema
 */
export const postContentSchema = z.string()
  .min(1, 'Post content cannot be empty')
  .max(5000, 'Post content cannot exceed 5000 characters')
  .trim()

/**
 * Content warning validation schema
 */
export const contentWarningSchema = z.string()
  .max(100, 'Content warning cannot exceed 100 characters')
  .trim()
  .optional()
  .nullable()

/**
 * Post creation validation schema
 */
export const postCreationSchema = z.object({
  content: postContentSchema,
  
  contentWarning: contentWarningSchema,
  
  isScheduled: z.boolean()
    .optional()
    .default(false),
  
  scheduledFor: z.string()
    .datetime('Invalid datetime format')
    .optional()
    .nullable()
    .refine((date) => {
      if (!date) return true
      const scheduledDate = new Date(date)
      const now = new Date()
      return scheduledDate > now
    }, 'Scheduled date must be in the future'),
  
  isPublished: z.boolean()
    .optional()
    .default(true)
})

/**
 * Post update validation schema
 */
export const postUpdateSchema = z.object({
  content: postContentSchema.optional(),
  
  contentWarning: contentWarningSchema,
  
  isPublished: z.boolean().optional()
})

/**
 * Post ID parameter validation schema
 */
export const postIdParamSchema = z.object({
  id: idSchema
})

/**
 * Post query parameters validation schema
 */
export const postQuerySchema = z.object({
  authorId: idSchema.optional(),
  
  includeScheduled: z.string()
    .optional()
    .transform((val) => val === 'true')
    .refine((val) => typeof val === 'boolean', 'includeScheduled must be true or false'),
  
  hasContentWarning: z.string()
    .optional()
    .transform((val) => val === 'true')
    .refine((val) => typeof val === 'boolean', 'hasContentWarning must be true or false'),
  
  publishedAfter: z.string()
    .datetime('Invalid datetime format')
    .optional(),
  
  publishedBefore: z.string()
    .datetime('Invalid datetime format')
    .optional()
}).merge(paginationSchema)

// =============================================================================
// FOLLOW VALIDATION SCHEMAS
// =============================================================================

/**
 * ActivityPub actor ID validation schema
 * Validates federated actor identifiers
 */
export const actorIdSchema = z.string()
  .url('Actor ID must be a valid URL')
  .max(2048, 'Actor ID too long')
  .refine(
    (actorId) => actorId.startsWith('https://'),
    'Actor ID must use HTTPS'
  )

/**
 * Follow request validation schema
 */
export const followRequestSchema = z.object({
  actorId: actorIdSchema
    .optional()
    .nullable()
})

/**
 * Unfollow request validation schema
 */
export const unfollowRequestSchema = z.object({
  actorId: actorIdSchema
    .optional()
    .nullable()
})

/**
 * WebFinger resource validation schema
 */
export const webfingerResourceSchema = z.object({
  resource: z.string()
    .min(1, 'Resource parameter is required')
    .max(255, 'Resource parameter too long')
    .refine((resource) => {
      // Check for acct:user@domain.com format
      const acctRegex = /^acct:[a-zA-Z0-9_.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      // Check for https URL format
      const httpsRegex = /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/.*$/
      
      return acctRegex.test(resource) || httpsRegex.test(resource)
    }, 'Resource must be in acct:user@domain.com or https://domain.com/users/user format')
})

// =============================================================================
// BLOCK VALIDATION SCHEMAS
// =============================================================================

/**
 * Block user validation schema
 */
export const blockUserSchema = z.object({
  reason: z.string()
    .max(500, 'Block reason cannot exceed 500 characters')
    .trim()
    .optional()
    .nullable()
})

/**
 * Unblock user validation schema
 */
export const unblockUserSchema = z.object({
  // No additional fields required for unblocking
})

// =============================================================================
// REPORT VALIDATION SCHEMAS
// =============================================================================

/**
 * Report type validation schema
 */
export const reportTypeSchema = z.enum([
  'SPAM',
  'HARASSMENT',
  'HATE_SPEECH',
  'VIOLENCE',
  'SEXUAL_CONTENT',
  'MISINFORMATION',
  'COPYRIGHT',
  'ILLEGAL_CONTENT',
  'OTHER'
])

/**
 * Report status validation schema
 */
export const reportStatusSchema = z.enum([
  'PENDING',
  'REVIEWING',
  'RESOLVED',
  'DISMISSED'
])

/**
 * Content report validation schema
 */
export const reportCreationSchema = z.object({
  type: reportTypeSchema,
  
  description: z.string()
    .min(10, 'Report description must be at least 10 characters')
    .max(1000, 'Report description cannot exceed 1000 characters')
    .trim(),
  
  reportedUserId: idSchema.optional(),
  
  reportedPostId: idSchema.optional()
}).refine(
  (data) => data.reportedUserId || data.reportedPostId,
  'Either reportedUserId or reportedPostId must be provided'
)

/**
 * Report query validation schema
 */
export const reportQuerySchema = z.object({
  status: reportStatusSchema.optional(),
  
  type: reportTypeSchema.optional(),
  
  reportedUserId: idSchema.optional(),
  
  reportedPostId: idSchema.optional()
}).merge(paginationSchema)

// =============================================================================
// MEDIA VALIDATION SCHEMAS
// =============================================================================

/**
 * Media upload validation schema
 */
export const mediaUploadSchema = z.object({
  altText: z.string()
    .max(500, 'Alt text cannot exceed 500 characters')
    .trim()
    .optional()
    .nullable()
})

/**
 * Allowed MIME types for media uploads
 */
export const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm'
] as const

/**
 * MIME type validation schema
 */
export const mimeTypeSchema = z.enum(allowedMimeTypes)

// =============================================================================
// VALIDATION HELPER FUNCTIONS
// =============================================================================

/**
 * Validates and transforms query string parameters to proper types
 */
export function validateQueryParams<T extends z.ZodSchema>(
  schema: T,
  params: unknown
): z.infer<T> {
  return schema.parse(params)
}

/**
 * Validates request body data
 */
export function validateRequestBody<T extends z.ZodSchema>(
  schema: T,
  body: unknown
): z.infer<T> {
  return schema.parse(body)
}

/**
 * Validates URL parameters
 */
export function validateUrlParams<T extends z.ZodSchema>(
  schema: T,
  params: unknown
): z.infer<T> {
  return schema.parse(params)
}

/**
 * Safe validation that returns success/error result
 */
export function safeValidate<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error }
  }
}

// =============================================================================
// EXPORTED VALIDATION SCHEMAS
// =============================================================================

/**
 * Complete validation schema collection for easy import
 */
export const ValidationSchemas = {
  // Common
  id: idSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  url: urlSchema,
  pagination: paginationSchema,
  
  // User
  userRegistration: userRegistrationSchema,
  userLogin: userLoginSchema,
  userProfileUpdate: userProfileUpdateSchema,
  usernameParam: usernameParamSchema,
  
  // Post
  postContent: postContentSchema,
  postCreation: postCreationSchema,
  postUpdate: postUpdateSchema,
  postIdParam: postIdParamSchema,
  postQuery: postQuerySchema,
  
  // Follow
  actorId: actorIdSchema,
  followRequest: followRequestSchema,
  unfollowRequest: unfollowRequestSchema,
  webfingerResource: webfingerResourceSchema,
  
  // Block
  blockUser: blockUserSchema,
  unblockUser: unblockUserSchema,
  
  // Report
  reportType: reportTypeSchema,
  reportStatus: reportStatusSchema,
  reportCreation: reportCreationSchema,
  reportQuery: reportQuerySchema,
  
  // Media
  mediaUpload: mediaUploadSchema,
  mimeType: mimeTypeSchema
} as const

// Type exports for TypeScript consumers
export type UserRegistrationData = z.infer<typeof userRegistrationSchema>
export type UserLoginData = z.infer<typeof userLoginSchema>
export type UserProfileUpdateData = z.infer<typeof userProfileUpdateSchema>
export type PostCreationData = z.infer<typeof postCreationSchema>
export type PostUpdateData = z.infer<typeof postUpdateSchema>
export type FollowRequestData = z.infer<typeof followRequestSchema>
export type ReportCreationData = z.infer<typeof reportCreationSchema>
export type PaginationData = z.infer<typeof paginationSchema>
export type MediaUploadData = z.infer<typeof mediaUploadSchema>