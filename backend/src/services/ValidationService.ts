// backend/src/services/ValidationService.ts
// Version: 1.2.0 - Fixed ValidationResult interface for exactOptionalPropertyTypes
// Changes: Updated ValidationResult interface to explicitly allow undefined for optional properties

import { z } from 'zod'

/**
 * Generic validation result interface
 */
interface ValidationResult<T> {
  success: boolean
  data?: T | undefined
  error?: z.ZodError | { message: string; errors?: any[] } | undefined
}

/**
 * User registration data interface
 */
interface UserRegistrationData {
  email: string
  username: string
  password: string
  displayName?: string | undefined
  bio?: string | undefined
  website?: string | undefined
}

/**
 * User update data interface
 */
interface UserUpdateData {
  displayName?: string | undefined
  bio?: string | undefined
  website?: string | undefined
  avatar?: string | undefined
}

/**
 * Post creation data interface
 */
interface PostCreationData {
  content: string
  mediaIds?: string[] | undefined
  parentId?: string | undefined
}

/**
 * Media upload data interface
 */
interface MediaUploadData {
  filename: string
  mimetype: string
  size: number
}

/**
 * Pagination parameters interface
 */
interface PaginationParams {
  page?: number | undefined
  limit?: number | undefined
}

/**
 * ValidationService class
 * Provides comprehensive validation for all application data types
 */
export class ValidationService {
  // User validation schemas
  private readonly userRegistrationSchema = z.object({
    email: z.string()
      .email('Invalid email format')
      .max(255, 'Email must be less than 255 characters'),
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be less than 30 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be less than 128 characters')
      .regex(/(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
      .regex(/(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
      .regex(/(?=.*\d)/, 'Password must contain at least one number')
      .regex(/(?=.*[!@#$%^&*(),.?":{}|<>])/, 'Password must contain at least one special character'),
    displayName: z.string()
      .max(100, 'Display name must be less than 100 characters')
      .optional(),
    bio: z.string()
      .max(500, 'Bio must be less than 500 characters')
      .optional(),
    website: z.string()
      .url('Website must be a valid URL')
      .max(255, 'Website URL must be less than 255 characters')
      .optional()
  })

  private readonly userUpdateSchema = z.object({
    displayName: z.string()
      .max(100, 'Display name must be less than 100 characters')
      .optional(),
    bio: z.string()
      .max(500, 'Bio must be less than 500 characters')
      .optional(),
    website: z.string()
      .url('Website must be a valid URL')
      .max(255, 'Website URL must be less than 255 characters')
      .optional(),
    avatar: z.string()
      .max(255, 'Avatar URL must be less than 255 characters')
      .optional()
  })

  // Post validation schemas
  private readonly postCreationSchema = z.object({
    content: z.string()
      .min(3, 'Post content must be at least 3 characters')
      .max(500, 'Post content must be less than 500 characters')
      .refine(content => content.trim().length > 0, 'Post content cannot be only whitespace'),
    mediaIds: z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/, 'Invalid media ID format'))
      .max(4, 'Cannot attach more than 4 media files')
      .optional(),
    parentId: z.string()
      .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid parent post ID format')
      .optional()
  })

  // Media validation schemas
  private readonly mediaUploadSchema = z.object({
    filename: z.string()
      .min(1, 'Filename cannot be empty')
      .max(255, 'Filename must be less than 255 characters')
      .regex(/^[a-zA-Z0-9._-]+\.[a-zA-Z0-9]+$/, 'Invalid filename format')
      .refine(filename => !this.isReservedFilename(filename), 'Filename is reserved'),
    mimetype: z.string()
      .refine(mimetype => this.isSupportedMimeType(mimetype), 'Unsupported file type'),
    size: z.number()
      .min(1, 'File size must be greater than 0')
      .max(10 * 1024 * 1024, 'File size cannot exceed 10MB')
  })

  // ID validation schema
  private readonly idSchema = z.string()
    .min(1, 'ID cannot be empty')
    .max(255, 'ID cannot exceed 255 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'ID must contain only alphanumeric characters, hyphens, and underscores')

  // Pagination validation schema
  private readonly paginationSchema = z.object({
    page: z.number()
      .int('Page must be an integer')
      .min(1, 'Page must be at least 1')
      .default(1),
    limit: z.number()
      .int('Limit must be an integer')
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .default(10)
  })

  /**
   * Validate user registration data
   */
  validateUserRegistration(data: unknown): ValidationResult<UserRegistrationData> {
    return this.validateWithSchema(this.userRegistrationSchema, data)
  }

  /**
   * Validate user update data
   */
  validateUserUpdate(data: unknown): ValidationResult<UserUpdateData> {
    return this.validateWithSchema(this.userUpdateSchema, data)
  }

  /**
   * Validate post creation data
   */
  validatePostCreation(data: unknown): ValidationResult<PostCreationData> {
    return this.validateWithSchema(this.postCreationSchema, data)
  }

  /**
   * Validate media upload data
   */
  validateMediaUpload(data: unknown): ValidationResult<MediaUploadData> {
    return this.validateWithSchema(this.mediaUploadSchema, data)
  }

  /**
   * Validate ID parameter
   */
  validateId(id: unknown): ValidationResult<string> {
    return this.validateWithSchema(this.idSchema, id)
  }

  /**
   * Validate pagination parameters
   */
  validatePaginationParams(params: unknown): ValidationResult<Required<PaginationParams>> {
    try {
      if (params === null || params === undefined) {
        params = {}
      }

      // Ensure we have an object to work with
      const inputParams = typeof params === 'object' ? params : {}
      
      // Apply defaults and validate
      const result = this.paginationSchema.parse(inputParams)
      
      // Return with required properties (defaults applied by schema)
      return {
        success: true,
        data: {
          page: result.page,
          limit: result.limit
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error
        }
      }
      
      return {
        success: false,
        error: { message: 'Pagination validation failed' }
      }
    }
  }

  /**
   * Generic schema validation method
   */
  validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      if (data === null || data === undefined) {
        return {
          success: false,
          error: { message: 'Input data cannot be null or undefined' }
        }
      }

      const result = schema.parse(data)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error
        }
      }
      
      return {
        success: false,
        error: { message: 'Validation failed' }
      }
    }
  }

  /**
   * Sanitize string by removing control characters
   */
  sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return ''
    }
    
    // Remove control characters (0x00-0x1F and 0x7F)
    return input.replace(/[\x00-\x1F\x7F]/g, '')
  }

  /**
   * Sanitize object by recursively cleaning all string properties
   */
  sanitizeObject<T>(obj: T): T {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj) as T
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item)) as T
    }

    if (obj && typeof obj === 'object' && obj !== null) {
      const sanitized: Record<string, unknown> = {}
      
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value)
      }
      
      return sanitized as T
    }

    return obj
  }

  /**
   * Check if filename is reserved (Windows reserved names)
   */
  private isReservedFilename(filename: string): boolean {
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL',
      'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
      'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ]

    const nameWithoutExtension = filename.split('.')[0]?.toUpperCase()
    return reservedNames.includes(nameWithoutExtension || '')
  }

  /**
   * Check if MIME type is supported
   */
  private isSupportedMimeType(mimetype: string): boolean {
    const supportedTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      
      // Videos
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      
      // Audio
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      
      // Documents
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    return supportedTypes.includes(mimetype.toLowerCase())
  }

  /**
   * Validate email format using more comprehensive regex
   */
  validateEmailFormat(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    return emailRegex.test(email)
  }

  /**
   * Validate username availability format
   */
  validateUsernameFormat(username: string): ValidationResult<string> {
    try {
      const usernameSchema = z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be less than 30 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
        .refine(name => !name.startsWith('_'), 'Username cannot start with underscore')
        .refine(name => !name.endsWith('_'), 'Username cannot end with underscore')
        .refine(name => !/_{2,}/.test(name), 'Username cannot contain consecutive underscores')

      const result = usernameSchema.parse(username)
      return {
        success: true,
        data: result
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error
        }
      }
      
      return {
        success: false,
        error: { message: 'Username validation failed' }
      }
    }
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): ValidationResult<{ strength: string; score: number }> {
    try {
      let score = 0
      const feedback: string[] = []

      // Length check
      if (password.length >= 8) score += 1
      else feedback.push('Password should be at least 8 characters')

      if (password.length >= 12) score += 1

      // Character variety checks
      if (/[a-z]/.test(password)) score += 1
      else feedback.push('Add lowercase letters')

      if (/[A-Z]/.test(password)) score += 1
      else feedback.push('Add uppercase letters')

      if (/\d/.test(password)) score += 1
      else feedback.push('Add numbers')

      if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1
      else feedback.push('Add special characters')

      // Bonus points for longer passwords
      if (password.length >= 16) score += 1

      const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
      const strength = strengthLevels[Math.min(score, 5)] || 'Very Weak'

      return {
        success: score >= 4, // Require at least 'Good' strength
        data: { strength, score },
        error: score < 4 ? { message: 'Password too weak', errors: feedback } : undefined
      }
    } catch (error) {
      return {
        success: false,
        error: { message: 'Password validation failed' }
      }
    }
  }
}