// backend/src/middleware/__tests__/postValidationMiddleware.test.ts
// Version: 2.0.0
// Updated tests to match actual middleware implementation - fixed authentication requirements and response format

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { validatePostCreation, PostValidationError } from '../postValidationMiddleware'

// Mock Express types for testing
interface MockRequest extends Partial<Request> {
  body: {
    content?: string
    contentWarning?: string
    isPublished?: boolean
    scheduledFor?: string
    mediaIds?: string[]
    activityId?: string
  }
  user?: {
    id: string
    email: string
    username: string
  }
}

interface MockResponse extends Partial<Response> {
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
}

describe('validatePostCreation middleware', () => {
  let mockRequest: MockRequest
  let mockResponse: MockResponse
  let mockNext: NextFunction

  beforeEach(() => {
    // Reset mocks before each test
    mockRequest = {
      body: {},
      user: {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser'
      }
    }
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    } as MockResponse
    mockNext = vi.fn()
  })

  it('should call next() when authenticated user provides valid content', () => {
    // Arrange: Set up valid post data with authenticated user
    mockRequest.body = {
      content: 'This is valid post content',
      isPublished: true
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify next() was called and no error response was sent
    expect(mockNext).toHaveBeenCalledOnce()
    expect(mockResponse.status).not.toHaveBeenCalled()
    expect(mockResponse.json).not.toHaveBeenCalled()
  })

  it('should return 401 error when user is not authenticated', () => {
    // Arrange: Remove user authentication
    mockRequest.user = undefined
    mockRequest.body = {
      content: 'This is test content'
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify 401 error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(401)
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: PostValidationError.MISSING_AUTHENTICATION,
        message: 'Authentication required for post creation'
      }
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when content is empty and no media is provided', () => {
    // Arrange: Set up post data with empty content and no media
    mockRequest.body = {
      content: '   ', // Only whitespace
      mediaIds: []
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify 400 error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: PostValidationError.EMPTY_POST_CONTENT,
        message: 'Post must have content or media attachments'
      }
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when content is not a string', () => {
    // Arrange: Set up post data with invalid content type
    mockRequest.body = {
      content: 123 as any // Invalid type
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify 400 error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: PostValidationError.INVALID_CONTENT,
        message: 'Content must be a string'
      }
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when content exceeds maximum length', () => {
    // Arrange: Set up post data with content that is too long
    const longContent = 'a'.repeat(5001) // Exceeds MAX_CONTENT_LENGTH of 5000
    mockRequest.body = {
      content: longContent
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify 400 error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: PostValidationError.CONTENT_TOO_LONG,
        message: 'Content cannot exceed 5000 characters'
      }
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when contentWarning exceeds maximum length', () => {
    // Arrange: Set up post data with content warning that is too long
    const longWarning = 'a'.repeat(281) // Exceeds MAX_CONTENT_WARNING_LENGTH of 280
    mockRequest.body = {
      content: 'Valid content',
      contentWarning: longWarning
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify 400 error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: PostValidationError.INVALID_CONTENT_WARNING,
        message: 'Content warning cannot exceed 280 characters'
      }
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when scheduledFor is invalid date format', () => {
    // Arrange: Set up post data with invalid scheduled date
    mockRequest.body = {
      content: 'Valid content',
      scheduledFor: 'invalid-date'
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify 400 error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: PostValidationError.INVALID_SCHEDULE_DATE,
        message: 'Invalid scheduled date format'
      }
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when scheduledFor is in the past', () => {
    // Arrange: Set up post data with past scheduled date
    const pastDate = new Date(Date.now() - 86400000).toISOString() // Yesterday
    mockRequest.body = {
      content: 'Valid content',
      scheduledFor: pastDate
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify 400 error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: PostValidationError.INVALID_SCHEDULE_DATE,
        message: 'Scheduled date must be in the future'
      }
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when mediaIds is not an array', () => {
    // Arrange: Set up post data with invalid mediaIds type
    mockRequest.body = {
      content: 'Valid content',
      mediaIds: 'not-an-array' as any
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify 400 error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: PostValidationError.INVALID_MEDIA_IDS,
        message: 'Media IDs must be an array'
      }
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when too many media attachments provided', () => {
    // Arrange: Set up post data with too many media attachments
    mockRequest.body = {
      content: 'Valid content',
      mediaIds: ['media1', 'media2', 'media3', 'media4', 'media5'] // 5 items, max is 4
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify 400 error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: PostValidationError.TOO_MANY_MEDIA_ATTACHMENTS,
        message: 'Cannot attach more than 4 media files'
      }
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when mediaId has invalid format', () => {
    // Arrange: Set up post data with invalid media ID format
    mockRequest.body = {
      content: 'Valid content',
      mediaIds: ['valid-id', 'invalid@id#'] // Second ID has invalid characters
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify 400 error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: PostValidationError.INVALID_MEDIA_IDS,
        message: 'Invalid media ID format'
      }
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when activityId has invalid format', () => {
    // Arrange: Set up post data with invalid ActivityPub activity ID
    mockRequest.body = {
      content: 'Valid content',
      activityId: 'not-a-valid-url'
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify 400 error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: PostValidationError.INVALID_ACTIVITY_ID,
        message: 'Invalid ActivityPub activity ID format'
      }
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when isPublished is not a boolean', () => {
    // Arrange: Set up post data with invalid isPublished type
    mockRequest.body = {
      content: 'Valid content',
      isPublished: 'true' as any // String instead of boolean
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify 400 error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: PostValidationError.INVALID_CONTENT,
        message: 'isPublished must be a boolean value'
      }
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should pass validation with valid content and media attachments', () => {
    // Arrange: Set up valid post data with both content and media
    mockRequest.body = {
      content: 'This is valid post content',
      contentWarning: 'Mild content warning',
      isPublished: true,
      mediaIds: ['media1', 'media2'],
      activityId: 'https://example.com/activities/123'
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify next() was called and no error response was sent
    expect(mockNext).toHaveBeenCalledOnce()
    expect(mockResponse.status).not.toHaveBeenCalled()
    expect(mockResponse.json).not.toHaveBeenCalled()
  })

  it('should pass validation with only media attachments and no content', () => {
    // Arrange: Set up post data with only media (no text content)
    mockRequest.body = {
      content: '', // Empty content but has media
      mediaIds: ['media1']
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify next() was called and no error response was sent
    expect(mockNext).toHaveBeenCalledOnce()
    expect(mockResponse.status).not.toHaveBeenCalled()
    expect(mockResponse.json).not.toHaveBeenCalled()
  })

  it('should pass validation with valid future scheduled date', () => {
    // Arrange: Set up post data with valid future scheduled date
    const futureDate = new Date(Date.now() + 86400000).toISOString() // Tomorrow
    mockRequest.body = {
      content: 'This will be published tomorrow',
      scheduledFor: futureDate,
      isPublished: false
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify next() was called and no error response was sent
    expect(mockNext).toHaveBeenCalledOnce()
    expect(mockResponse.status).not.toHaveBeenCalled()
    expect(mockResponse.json).not.toHaveBeenCalled()
  })
})