// backend/tests/middleware/followValidationMiddleware.test.ts
// Version: 1.0
// Comprehensive tests for follow operations validation middleware

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import {
  validateFollowRequest,
  validateUnfollowRequest,
  validateFollowerQuery,
  validateWebFingerQuery,
  validateActivityPubInbox
} from '../../src/middleware/followValidationMiddleware'

describe('Follow Validation Middleware', () => {
  let mockReq: Partial<Request>
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
      query: {},
      headers: {}
    }
    
    mockRes = {
      status: statusSpy,
      json: jsonSpy
    }
    
    mockNext = vi.fn()
  })

  describe('validateFollowRequest', () => {
    describe('Valid Follow Requests', () => {
      it('should pass validation with valid username and no actorId', () => {
        // Arrange - Local follow request
        mockReq.params = {
          username: 'validuser123'
        }
        mockReq.body = {}

        // Act
        validateFollowRequest(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
        expect(jsonSpy).not.toHaveBeenCalled()
      })

      it('should pass validation with valid ActivityPub actor ID', () => {
        // Arrange - Federation follow request
        mockReq.params = {
          username: 'testuser'
        }
        mockReq.body = {
          actorId: 'https://mastodon.social/users/testuser'
        }

        // Act
        validateFollowRequest(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should pass validation with various valid usernames', () => {
        const validUsernames = [
          'user123',
          'test_user',
          'abc',           // minimum length
          'a'.repeat(30)   // maximum length
        ]

        validUsernames.forEach(username => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.params = { username }
          mockReq.body = {}

          // Act
          validateFollowRequest(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(mockNext).toHaveBeenCalledOnce()
        })
      })

      it('should pass validation with various valid ActivityPub URLs', () => {
        const validActorIds = [
          'https://mastodon.social/users/testuser',
          'https://pleroma.instance.com/users/username',
          'https://pixelfed.social/users/photographer',
          'https://friendica.example.org/profile/user123'
        ]

        validActorIds.forEach(actorId => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.params = { username: 'testuser' }
          mockReq.body = { actorId }

          // Act
          validateFollowRequest(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(mockNext).toHaveBeenCalledOnce()
        })
      })

      it('should pass validation with null actorId', () => {
        // Arrange - Explicit null actorId
        mockReq.params = {
          username: 'testuser'
        }
        mockReq.body = {
          actorId: null
        }

        // Act
        validateFollowRequest(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })

    describe('Invalid Follow Requests', () => {
      it('should reject invalid username', () => {
        const invalidUsernames = [
          'ab',              // too short
          'a'.repeat(31),    // too long
          'user@domain',     // @ symbol
          'user.name',       // dot
          'user-name',       // hyphen
          'user name',       // space
          ''                 // empty
        ]

        invalidUsernames.forEach(username => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.params = { username }
          mockReq.body = {}

          // Act
          validateFollowRequest(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(statusSpy).toHaveBeenCalledWith(400)
          expect(jsonSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                code: 'VALIDATION_ERROR',
                message: 'Invalid follow request data'
              })
            })
          )
        })
      })

      it('should reject invalid ActivityPub actor URLs', () => {
        const invalidActorIds = [
          'http://insecure.com/users/test',      // HTTP instead of HTTPS
          'not-a-url',                           // not a URL at all
          'ftp://wrong.protocol.com/user',       // wrong protocol
          'https://',                            // incomplete URL
          'https://domain-only.com',             // no path
          'mailto:user@domain.com'               // wrong protocol
        ]

        invalidActorIds.forEach(actorId => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.params = { username: 'testuser' }
          mockReq.body = { actorId }

          // Act
          validateFollowRequest(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(statusSpy).toHaveBeenCalledWith(400)
          expect(jsonSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                details: expect.arrayContaining([
                  expect.objectContaining({
                    field: 'actorId',
                    message: 'Actor ID must be a valid HTTPS URL'
                  })
                ])
              })
            })
          )
        })
      })
    })
  })

  describe('validateUnfollowRequest', () => {
    describe('Valid Unfollow Requests', () => {
      it('should pass validation with valid username', () => {
        // Arrange - Valid unfollow request
        mockReq.params = {
          username: 'usertofollow'
        }

        // Act
        validateUnfollowRequest(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
      })

      it('should pass validation with various valid usernames', () => {
        const validUsernames = [
          'user123',
          'test_user_name',
          'abc',
          'a'.repeat(30)
        ]

        validUsernames.forEach(username => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.params = { username }

          // Act
          validateUnfollowRequest(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(mockNext).toHaveBeenCalledOnce()
        })
      })
    })

    describe('Invalid Unfollow Requests', () => {
      it('should reject invalid usernames', () => {
        const invalidUsernames = [
          'ab',              // too short
          'a'.repeat(31),    // too long
          'user@domain',     // invalid characters
          '',                // empty
          'user space'       // contains space
        ]

        invalidUsernames.forEach(username => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.params = { username }

          // Act
          validateUnfollowRequest(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(statusSpy).toHaveBeenCalledWith(400)
          expect(jsonSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                code: 'VALIDATION_ERROR',
                message: 'Invalid unfollow request'
              })
            })
          )
        })
      })
    })
  })

  describe('validateFollowerQuery', () => {
    describe('Valid Follower Queries', () => {
      it('should pass validation with default parameters', () => {
        // Arrange - Default query parameters
        mockReq.params = {
          username: 'testuser'
        }
        mockReq.query = {}

        // Act
        validateFollowerQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(mockReq.query.page).toBe(1)
        expect(mockReq.query.limit).toBe(20)
        expect(mockReq.query.includeInactive).toBe(false)
      })

      it('should pass validation with valid pagination parameters', () => {
        // Arrange - Valid pagination
        mockReq.params = {
          username: 'testuser'
        }
        mockReq.query = {
          page: '5',
          limit: '50'
        }

        // Act
        validateFollowerQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(mockReq.query.page).toBe(5)
        expect(mockReq.query.limit).toBe(50)
      })

      it('should pass validation with includeInactive flag', () => {
        // Arrange - Include inactive followers
        mockReq.params = {
          username: 'testuser'
        }
        mockReq.query = {
          includeInactive: 'true'
        }

        // Act
        validateFollowerQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(mockReq.query.includeInactive).toBe(true)
      })

      it('should handle includeInactive false correctly', () => {
        // Arrange - Explicitly false includeInactive
        mockReq.params = {
          username: 'testuser'
        }
        mockReq.query = {
          includeInactive: 'false'
        }

        // Act
        validateFollowerQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(mockReq.query.includeInactive).toBe(false)
      })
    })

    describe('Invalid Follower Queries', () => {
      it('should reject invalid username in params', () => {
        // Arrange - Invalid username
        mockReq.params = {
          username: 'ab' // too short
        }
        mockReq.query = {}

        // Act
        validateFollowerQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
      })

      it('should reject page number that is too high', () => {
        // Arrange - Page exceeding limit
        mockReq.params = {
          username: 'testuser'
        }
        mockReq.query = {
          page: '1001' // exceeds maximum of 1000
        }

        // Act
        validateFollowerQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'page',
                  message: 'Page must be between 1 and 1000'
                })
              ])
            })
          })
        )
      })

      it('should reject limit that is too high', () => {
        // Arrange - Limit exceeding maximum
        mockReq.params = {
          username: 'testuser'
        }
        mockReq.query = {
          limit: '101' // exceeds maximum of 100
        }

        // Act
        validateFollowerQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'limit',
                  message: 'Limit must be between 1 and 100'
                })
              ])
            })
          })
        )
      })

      it('should reject zero or negative page numbers', () => {
        const invalidPageNumbers = ['0', '-1', '-5']

        invalidPageNumbers.forEach(page => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.params = { username: 'testuser' }
          mockReq.query = { page }

          // Act
          validateFollowerQuery(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(statusSpy).toHaveBeenCalledWith(400)
        })
      })
    })
  })

  describe('validateWebFingerQuery', () => {
    describe('Valid WebFinger Queries', () => {
      it('should pass validation with acct: format', () => {
        // Arrange - Standard acct: format
        mockReq.query = {
          resource: 'acct:user@mastodon.social'
        }

        // Act
        validateWebFingerQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
      })

      it('should pass validation with HTTPS URL format', () => {
        // Arrange - HTTPS URL format
        mockReq.query = {
          resource: 'https://mastodon.social/users/testuser'
        }

        // Act
        validateWebFingerQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should pass validation with various acct: formats', () => {
        const validAcctFormats = [
          'acct:user@domain.com',
          'acct:test.user@sub.domain.org',
          'acct:user_name@mastodon.social',
          'acct:123user@pleroma.site'
        ]

        validAcctFormats.forEach(resource => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.query = { resource }

          // Act
          validateWebFingerQuery(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(mockNext).toHaveBeenCalledOnce()
        })
      })

      it('should pass validation with various HTTPS URL formats', () => {
        const validUrlFormats = [
          'https://mastodon.social/users/testuser',
          'https://pleroma.example.com/users/username',
          'https://sub.domain.org/profile/user123',
          'https://pixelfed.social/users/photographer'
        ]

        validUrlFormats.forEach(resource => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.query = { resource }

          // Act
          validateWebFingerQuery(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(mockNext).toHaveBeenCalledOnce()
        })
      })
    })

    describe('Invalid WebFinger Queries', () => {
      it('should reject invalid resource formats', () => {
        const invalidResources = [
          '',                                    // empty
          'user@domain.com',                     // missing acct: prefix
          'acct:user',                          // missing domain
          'acct:@domain.com',                   // missing username
          'http://insecure.com/users/test',     // HTTP instead of HTTPS
          'ftp://wrong.protocol.com/user',      // wrong protocol
          'not-a-valid-format',                 // completely invalid
          'acct:user@',                         // incomplete acct format
          'https://',                           // incomplete URL
        ]

        invalidResources.forEach(resource => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.query = { resource }

          // Act
          validateWebFingerQuery(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(statusSpy).toHaveBeenCalledWith(400)
          expect(jsonSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                details: expect.arrayContaining([
                  expect.objectContaining({
                    field: 'resource',
                    message: 'Resource must be in acct:user@domain.com or https://domain.com/users/user format'
                  })
                ])
              })
            })
          )
        })
      })

      it('should reject missing resource parameter', () => {
        // Arrange - No resource parameter
        mockReq.query = {}

        // Act
        validateWebFingerQuery(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'resource',
                  message: 'Resource parameter is required'
                })
              ])
            })
          })
        )
      })
    })
  })

  describe('validateActivityPubInbox', () => {
    describe('Valid ActivityPub Inbox Requests', () => {
      it('should pass validation with valid ActivityPub request', () => {
        // Arrange - Valid ActivityPub inbox request
        mockReq.headers = {
          'content-type': 'application/activity+json'
        }
        mockReq.params = {
          username: 'testuser'
        }
        mockReq.body = {
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: 'Follow',
          actor: 'https://mastodon.social/users/follower'
        }

        // Act
        validateActivityPubInbox(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
      })

      it('should pass validation with extended ActivityPub content type', () => {
        // Arrange - Content-Type with charset
        mockReq.headers = {
          'content-type': 'application/activity+json; charset=utf-8'
        }
        mockReq.params = {
          username: 'testuser'
        }
        mockReq.body = {
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: 'Undo',
          actor: 'https://mastodon.social/users/follower',
          object: {
            type: 'Follow',
            actor: 'https://mastodon.social/users/follower'
          }
        }

        // Act
        validateActivityPubInbox(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should pass validation with all required ActivityPub fields', () => {
        // Arrange - Complete ActivityPub activity
        mockReq.headers = {
          'content-type': 'application/activity+json'
        }
        mockReq.params = {
          username: 'recipient'
        }
        mockReq.body = {
          '@context': ['https://www.w3.org/ns/activitystreams'],
          type: 'Create',
          actor: 'https://example.com/users/creator',
          object: {
            type: 'Note',
            content: 'Hello, ActivityPub world!'
          }
        }

        // Act
        validateActivityPubInbox(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })

    describe('Invalid ActivityPub Inbox Requests', () => {
      it('should reject non-ActivityPub content type', () => {
        // Arrange - Wrong content type
        mockReq.headers = {
          'content-type': 'application/json'
        }
        mockReq.params = {
          username: 'testuser'
        }
        mockReq.body = {}

        // Act
        validateActivityPubInbox(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Content-Type must be application/activity+json for ActivityPub requests'
          }
        })
      })

      it('should reject missing content type', () => {
        // Arrange - No content type header
        mockReq.headers = {}
        mockReq.params = {
          username: 'testuser'
        }
        mockReq.body = {}

        // Act
        validateActivityPubInbox(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Content-Type must be application/activity+json for ActivityPub requests'
          }
        })
      })

      it('should reject invalid username', () => {
        // Arrange - Invalid username in params
        mockReq.headers = {
          'content-type': 'application/activity+json'
        }
        mockReq.params = {
          username: 'ab' // too short
        }
        mockReq.body = {
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: 'Follow',
          actor: 'https://mastodon.social/users/follower'
        }

        // Act
        validateActivityPubInbox(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
      })

      it('should reject non-object request body', () => {
        const invalidBodies = [
          null,
          'string',
          123,
          [],
          undefined
        ]

        invalidBodies.forEach(body => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.headers = {
            'content-type': 'application/activity+json'
          }
          mockReq.params = {
            username: 'testuser'
          }
          mockReq.body = body

          // Act
          validateActivityPubInbox(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(statusSpy).toHaveBeenCalledWith(400)
          expect(jsonSpy).toHaveBeenCalledWith({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request body must be a valid JSON object'
            }
          })
        })
      })

      it('should reject ActivityPub activities missing required fields', () => {
        const incompleteActivities = [
          {
            // Missing @context
            type: 'Follow',
            actor: 'https://mastodon.social/users/follower'
          },
          {
            // Missing type
            '@context': 'https://www.w3.org/ns/activitystreams',
            actor: 'https://mastodon.social/users/follower'
          },
          {
            // Missing actor
            '@context': 'https://www.w3.org/ns/activitystreams',
            type: 'Follow'
          },
          {
            // Missing all required fields
          }
        ]

        incompleteActivities.forEach(body => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.headers = {
            'content-type': 'application/activity+json'
          }
          mockReq.params = {
            username: 'testuser'
          }
          mockReq.body = body

          // Act
          validateActivityPubInbox(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(statusSpy).toHaveBeenCalledWith(400)
          expect(jsonSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                code: 'VALIDATION_ERROR',
                message: expect.stringContaining('Missing required ActivityPub fields')
              })
            })
          )
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle validation errors properly', () => {
      // Arrange - Create invalid data that will trigger validation error
      mockReq.params = {
        username: 'ab' // Too short username will trigger validation error
      }
      mockReq.body = {}

      // Act
      validateFollowRequest(mockReq as Request, mockRes as Response, mockNext)

      // Assert - Should return validation error
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
            message: 'Invalid follow request data'
          })
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })
  })
})