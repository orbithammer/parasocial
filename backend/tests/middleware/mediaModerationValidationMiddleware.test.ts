// backend/tests/middleware/mediaModerationValidationMiddleware.test.ts
// Version: 1.0
// Comprehensive tests for media upload and moderation validation middleware

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import {
  validateMediaUpload,
  validateCreateReport,
  validateBlockUser,
  validateUsernameParam
} from '../../src/middleware/mediaModerationValidationMiddleware'

// Extended request interface for file uploads
interface TestFileUploadRequest extends Request {
  file?: {
    fieldname: string
    originalname: string
    encoding: string
    mimetype: string
    size: number
    destination?: string
    filename?: string
    path?: string
    buffer?: Buffer
  }
}

describe('Media & Moderation Validation Middleware', () => {
  let mockReq: Partial<TestFileUploadRequest>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let jsonSpy: any
  let statusSpy: any

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Create fresh mock objects for each test
    jsonSpy = vi.fn()
    statusSpy = vi.fn().mockReturnThis()
    
    mockReq = {
      body: {},
      params: {},
      file: undefined
    }
    
    mockRes = {
      status: statusSpy,
      json: jsonSpy
    }
    
    mockNext = vi.fn()
  })

  describe('validateMediaUpload', () => {
    describe('Valid Media Uploads', () => {
      it('should pass validation with valid image file', () => {
        // Arrange - Valid JPEG image upload
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test-image.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1024 * 1024, // 1MB
          filename: 'test-image.jpg',
          path: '/uploads/test-image.jpg',
          buffer: Buffer.from('fake-image-data')
        }
        mockReq.body = {
          altText: 'A beautiful test image'
        }

        // Act
        validateMediaUpload(mockReq as TestFileUploadRequest, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
        expect(jsonSpy).not.toHaveBeenCalled()
      })

      it('should pass validation with all supported image types', () => {
        const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        
        supportedTypes.forEach(mimetype => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.file = {
            fieldname: 'file',
            originalname: `test.${mimetype.split('/')[1]}`,
            encoding: '7bit',
            mimetype,
            size: 500000, // 500KB
            filename: `test.${mimetype.split('/')[1]}`,
            path: `/uploads/test.${mimetype.split('/')[1]}`,
            buffer: Buffer.from('fake-data')
          }

          // Act
          validateMediaUpload(mockReq as TestFileUploadRequest, mockRes as Response, mockNext)

          // Assert
          expect(mockNext).toHaveBeenCalledOnce()
        })
      })

      it('should pass validation with supported video types', () => {
        // Arrange - Valid MP4 video upload
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test-video.mp4',
          encoding: '7bit',
          mimetype: 'video/mp4',
          size: 5 * 1024 * 1024, // 5MB
          filename: 'test-video.mp4',
          path: '/uploads/test-video.mp4',
          buffer: Buffer.from('fake-video-data')
        }

        // Act
        validateMediaUpload(mockReq as TestFileUploadRequest, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should pass validation without alt text', () => {
        // Arrange - Upload without alt text (optional field)
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.png',
          encoding: '7bit',
          mimetype: 'image/png',
          size: 1000,
          filename: 'test.png',
          path: '/uploads/test.png',
          buffer: Buffer.from('fake-data')
        }
        mockReq.body = {} // No alt text

        // Act
        validateMediaUpload(mockReq as TestFileUploadRequest, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should pass validation with empty alt text', () => {
        // Arrange - Upload with empty alt text
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.png',
          encoding: '7bit',
          mimetype: 'image/png',
          size: 1000,
          filename: 'test.png',
          path: '/uploads/test.png',
          buffer: Buffer.from('fake-data')
        }
        mockReq.body = {
          altText: ''
        }

        // Act
        validateMediaUpload(mockReq as TestFileUploadRequest, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })

    describe('Invalid Media Uploads', () => {
      it('should reject upload without file', () => {
        // Arrange - No file in request
        mockReq.file = undefined
        mockReq.body = {
          altText: 'Alt text without file'
        }

        // Act
        validateMediaUpload(mockReq as TestFileUploadRequest, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).not.toHaveBeenCalled()
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'File is required for upload'
          }
        })
      })

      it('should reject unsupported file types', () => {
        const unsupportedTypes = ['text/plain', 'application/pdf', 'audio/mp3', 'video/avi']
        
        unsupportedTypes.forEach(mimetype => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.file = {
            fieldname: 'file',
            originalname: 'test.txt',
            encoding: '7bit',
            mimetype,
            size: 1000,
            filename: 'test.txt',
            path: '/uploads/test.txt',
            buffer: Buffer.from('fake-data')
          }

          // Act
          validateMediaUpload(mockReq as TestFileUploadRequest, mockRes as Response, mockNext)

          // Assert
          expect(statusSpy).toHaveBeenCalledWith(400)
          expect(jsonSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                code: 'VALIDATION_ERROR',
                details: expect.arrayContaining([
                  expect.objectContaining({
                    field: 'mimetype',
                    message: 'File type not supported. Use JPEG, PNG, GIF, WEBP, MP4, or WEBM'
                  })
                ])
              })
            })
          )
        })
      })

      it('should reject files that are too large', () => {
        // Arrange - File exceeding 10MB limit
        mockReq.file = {
          fieldname: 'file',
          originalname: 'huge-file.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 11 * 1024 * 1024, // 11MB (exceeds 10MB limit)
          filename: 'huge-file.jpg',
          path: '/uploads/huge-file.jpg',
          buffer: Buffer.from('fake-data')
        }

        // Act
        validateMediaUpload(mockReq as TestFileUploadRequest, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'size',
                  message: 'File size must be less than 10MB'
                })
              ])
            })
          })
        )
      })

      it('should reject empty files', () => {
        // Arrange - File with zero size
        mockReq.file = {
          fieldname: 'file',
          originalname: 'empty.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 0, // Empty file
          filename: 'empty.jpg',
          path: '/uploads/empty.jpg',
          buffer: Buffer.from('')
        }

        // Act
        validateMediaUpload(mockReq as TestFileUploadRequest, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'size',
                  message: 'File cannot be empty'
                })
              ])
            })
          })
        )
      })

      it('should reject alt text that is too long', () => {
        // Arrange - Alt text exceeding limit
        mockReq.file = {
          fieldname: 'file',
          originalname: 'test.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          size: 1000,
          filename: 'test.jpg',
          path: '/uploads/test.jpg',
          buffer: Buffer.from('fake-data')
        }
        mockReq.body = {
          altText: 'x'.repeat(1001) // Exceeds 1000 character limit
        }

        // Act
        validateMediaUpload(mockReq as TestFileUploadRequest, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'altText',
                  message: 'Alt text must be less than 1000 characters'
                })
              ])
            })
          })
        )
      })
    })
  })

  describe('validateCreateReport', () => {
    describe('Valid Report Creation', () => {
      it('should pass validation for user report', () => {
        // Arrange - Valid user report
        mockReq.body = {
          type: 'HARASSMENT',
          description: 'This user is sending inappropriate messages to multiple people.',
          reportedUserId: 'user123'
        }

        // Act
        validateCreateReport(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
      })

      it('should pass validation for post report', () => {
        // Arrange - Valid post report
        mockReq.body = {
          type: 'SPAM',
          description: 'This post contains spam content and promotional links.',
          reportedPostId: 'post456'
        }

        // Act
        validateCreateReport(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should pass validation for all report types', () => {
        const reportTypes = [
          'HARASSMENT',
          'SPAM',
          'MISINFORMATION',
          'INAPPROPRIATE_CONTENT',
          'COPYRIGHT',
          'OTHER'
        ]

        reportTypes.forEach(type => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.body = {
            type,
            description: `This is a ${type} report with sufficient detail.`,
            reportedUserId: 'user123'
          }

          // Act
          validateCreateReport(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(mockNext).toHaveBeenCalledOnce()
        })
      })

      it('should pass validation with maximum length description', () => {
        // Arrange - Description at character limit
        mockReq.body = {
          type: 'OTHER',
          description: 'x'.repeat(1000), // Maximum allowed length
          reportedUserId: 'user123'
        }

        // Act
        validateCreateReport(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })

    describe('Invalid Report Creation', () => {
      it('should reject invalid report type', () => {
        // Arrange - Invalid report type
        mockReq.body = {
          type: 'INVALID_TYPE',
          description: 'Valid description',
          reportedUserId: 'user123'
        }

        // Act
        validateCreateReport(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'type',
                  message: 'Report type must be one of: HARASSMENT, SPAM, MISINFORMATION, INAPPROPRIATE_CONTENT, COPYRIGHT, OTHER'
                })
              ])
            })
          })
        )
      })

      it('should reject description that is too short', () => {
        // Arrange - Description too short
        mockReq.body = {
          type: 'SPAM',
          description: 'Too short', // Less than 10 characters
          reportedUserId: 'user123'
        }

        // Act
        validateCreateReport(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'description',
                  message: 'Report description must be at least 10 characters'
                })
              ])
            })
          })
        )
      })

      it('should reject description that is too long', () => {
        // Arrange - Description exceeding limit
        mockReq.body = {
          type: 'HARASSMENT',
          description: 'x'.repeat(1001), // Exceeds 1000 character limit
          reportedUserId: 'user123'
        }

        // Act
        validateCreateReport(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'description',
                  message: 'Report description must be less than 1000 characters'
                })
              ])
            })
          })
        )
      })

      it('should reject report with both user and post IDs', () => {
        // Arrange - Report targeting both user and post (not allowed)
        mockReq.body = {
          type: 'HARASSMENT',
          description: 'Valid description',
          reportedUserId: 'user123',
          reportedPostId: 'post456' // Should not have both
        }

        // Act
        validateCreateReport(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  message: 'Must report either a user or a post, not both'
                })
              ])
            })
          })
        )
      })

      it('should reject report with neither user nor post ID', () => {
        // Arrange - Report without target
        mockReq.body = {
          type: 'SPAM',
          description: 'Valid description'
          // Missing both reportedUserId and reportedPostId
        }

        // Act
        validateCreateReport(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  message: 'Must report either a user or a post, not both'
                })
              ])
            })
          })
        )
      })
    })
  })

  describe('validateBlockUser', () => {
    describe('Valid User Blocking', () => {
      it('should pass validation with reason', () => {
        // Arrange - Block with reason
        mockReq.body = {
          reason: 'User posting inappropriate content'
        }

        // Act
        validateBlockUser(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
      })

      it('should pass validation without reason', () => {
        // Arrange - Block without reason (optional)
        mockReq.body = {}

        // Act
        validateBlockUser(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should pass validation with empty reason', () => {
        // Arrange - Block with empty reason
        mockReq.body = {
          reason: ''
        }

        // Act
        validateBlockUser(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })

    describe('Invalid User Blocking', () => {
      it('should reject reason that is too long', () => {
        // Arrange - Reason exceeding character limit
        mockReq.body = {
          reason: 'x'.repeat(501) // Exceeds 500 character limit
        }

        // Act
        validateBlockUser(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'reason',
                  message: 'Block reason must be less than 500 characters'
                })
              ])
            })
          })
        )
      })
    })
  })

  describe('validateUsernameParam', () => {
    describe('Valid Usernames', () => {
      it('should pass validation with valid username', () => {
        // Arrange - Valid username
        mockReq.params = {
          username: 'validuser123'
        }

        // Act
        validateUsernameParam(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
      })

      it('should pass validation with minimum length username', () => {
        // Arrange - Minimum length username (3 characters)
        mockReq.params = {
          username: 'abc'
        }

        // Act
        validateUsernameParam(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should pass validation with maximum length username', () => {
        // Arrange - Maximum length username (30 characters)
        mockReq.params = {
          username: 'a'.repeat(30)
        }

        // Act
        validateUsernameParam(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should pass validation with underscores', () => {
        // Arrange - Username with underscores
        mockReq.params = {
          username: 'user_name_123'
        }

        // Act
        validateUsernameParam(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })

    describe('Invalid Usernames', () => {
      it('should reject username that is too short', () => {
        // Arrange - Username too short
        mockReq.params = {
          username: 'ab' // Less than 3 characters
        }

        // Act
        validateUsernameParam(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'username',
                  message: 'Username must be at least 3 characters'
                })
              ])
            })
          })
        )
      })

      it('should reject username that is too long', () => {
        // Arrange - Username too long
        mockReq.params = {
          username: 'a'.repeat(31) // Exceeds 30 characters
        }

        // Act
        validateUsernameParam(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'username',
                  message: 'Username must be less than 30 characters'
                })
              ])
            })
          })
        )
      })

      it('should reject username with invalid characters', () => {
        const invalidUsernames = [
          'user@name',    // @ symbol
          'user.name',    // dot
          'user-name',    // hyphen
          'user name',    // space
          'user#name',    // hash
          'user!name'     // exclamation
        ]

        invalidUsernames.forEach(username => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.params = { username }

          // Act
          validateUsernameParam(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(statusSpy).toHaveBeenCalledWith(400)
          expect(jsonSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                details: expect.arrayContaining([
                  expect.objectContaining({
                    field: 'username',
                    message: 'Username can only contain letters, numbers, and underscores'
                  })
                ])
              })
            })
          )
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', () => {
      // Arrange - Force an internal error
      const originalConsoleError = console.error
      console.error = vi.fn() // Suppress error logging during test
      
      // Mock request with corrupted body that throws non-ZodError
      const mockReqWithCorruptedBody = {
        body: {
          get type() {
            throw new Error('Simulated internal error')
          }
        }
      }

      // Act
      validateCreateReport(mockReqWithCorruptedBody as Request, mockRes as Response, mockNext)

      // Assert - Should handle internal errors
      expect(statusSpy).toHaveBeenCalledWith(500)
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during validation'
        }
      })

      // Cleanup
      console.error = originalConsoleError
    })
  })
})