// backend\src\middleware\__tests__\postValidationMiddleware.test.ts
// Version: 1.2.0
// Fixed import to use destructured validatePostCreation from the exported object

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { validatePostCreation } from '../postValidationMiddleware'

// Mock Express types for testing
interface MockRequest extends Partial<Request> {
  body: {
    title?: string
    content?: string
    authorId?: string
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
      body: {}
    }
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    } as MockResponse
    mockNext = vi.fn()
  })

  it('should call next() when all required fields are provided', () => {
    // Arrange: Set up valid post data
    mockRequest.body = {
      title: 'Test Post Title',
      content: 'This is test post content',
      authorId: 'user123'
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify next() was called and no error response was sent
    expect(mockNext).toHaveBeenCalledOnce()
    expect(mockResponse.status).not.toHaveBeenCalled()
    expect(mockResponse.json).not.toHaveBeenCalled()
  })

  it('should return 400 error when title is missing', () => {
    // Arrange: Set up post data without title
    mockRequest.body = {
      content: 'This is test post content',
      authorId: 'user123'
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Title is required'
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when content is missing', () => {
    // Arrange: Set up post data without content
    mockRequest.body = {
      title: 'Test Post Title',
      authorId: 'user123'
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Content is required'
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when authorId is missing', () => {
    // Arrange: Set up post data without authorId
    mockRequest.body = {
      title: 'Test Post Title',
      content: 'This is test post content'
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Author ID is required'
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when title is empty string', () => {
    // Arrange: Set up post data with empty title
    mockRequest.body = {
      title: '',
      content: 'This is test post content',
      authorId: 'user123'
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Title cannot be empty'
    })
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should return 400 error when content is empty string', () => {
    // Arrange: Set up post data with empty content
    mockRequest.body = {
      title: 'Test Post Title',
      content: '',
      authorId: 'user123'
    }

    // Act: Call the validation middleware
    validatePostCreation(mockRequest as Request, mockResponse as Response, mockNext)

    // Assert: Verify error response was sent
    expect(mockResponse.status).toHaveBeenCalledWith(400)
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Content cannot be empty'
    })
    expect(mockNext).not.toHaveBeenCalled()
  })
})