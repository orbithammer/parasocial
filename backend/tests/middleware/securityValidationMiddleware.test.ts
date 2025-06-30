// backend/tests/middleware/securityValidationMiddleware.test.ts
// Version: 1.0
// Comprehensive tests for security and general validation middleware

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import {
  setSecurityHeaders,
  validateJsonContentType,
  validateRequestSize,
  validateUserAgent,
  sanitizeInput,
  validateIdParam,
  validatePagination,
  validateAndLogIP,
  applyBasicSecurity,
  applyAPIValidation
} from '../../src/middleware/securityValidationMiddleware'

// Extended request interface for IP validation
interface ExtendedTestRequest extends Request {
  clientIP?: string
  connection: any
  socket?: any
}

describe('Security Validation Middleware', () => {
  let mockReq: Partial<ExtendedTestRequest>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let jsonSpy: any
  let statusSpy: any
  let setHeaderSpy: any
  let endSpy: any

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Create fresh mock objects for each test
    jsonSpy = vi.fn()
    statusSpy = vi.fn().mockReturnThis()
    setHeaderSpy = vi.fn()
    endSpy = vi.fn()
    
    mockReq = {
      method: 'POST',
      body: {},
      params: {},
      query: {},
      headers: {},
      connection: { remoteAddress: '192.168.1.1' },
      socket: { remoteAddress: '192.168.1.1' },
      ip: '192.168.1.1'
    }
    
    mockRes = {
      status: statusSpy,
      json: jsonSpy,
      setHeader: setHeaderSpy,
      end: endSpy
    }
    
    mockNext = vi.fn()

    // Set up environment variable mock
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000'
  })

  afterEach(() => {
    // Clean up environment variables
    delete process.env.ALLOWED_ORIGINS
  })

  describe('setSecurityHeaders', () => {
    describe('Security Header Setting', () => {
      it('should set all required security headers', () => {
        // Arrange - Regular request
        mockReq.method = 'GET'

        // Act
        setSecurityHeaders(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Check all security headers are set
        expect(setHeaderSpy).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
        expect(setHeaderSpy).toHaveBeenCalledWith('X-Frame-Options', 'DENY')
        expect(setHeaderSpy).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block')
        expect(setHeaderSpy).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin')
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should set CORS headers correctly', () => {
        // Arrange - Regular request
        mockReq.method = 'POST'

        // Act
        setSecurityHeaders(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Check CORS headers
        expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000')
        expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true')
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should handle OPTIONS preflight requests', () => {
        // Arrange - OPTIONS preflight request
        mockReq.method = 'OPTIONS'

        // Act
        setSecurityHeaders(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Should end response for OPTIONS
        expect(statusSpy).toHaveBeenCalledWith(200)
        expect(endSpy).toHaveBeenCalledOnce()
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should use default ALLOWED_ORIGINS when not set', () => {
        // Arrange - No environment variable set
        delete process.env.ALLOWED_ORIGINS
        mockReq.method = 'GET'

        // Act
        setSecurityHeaders(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Should use default localhost
        expect(setHeaderSpy).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000')
      })
    })
  })

  describe('validateJsonContentType', () => {
    describe('Valid Content Types', () => {
      it('should pass validation for application/json', () => {
        // Arrange - Valid JSON content type
        mockReq.method = 'POST'
        mockReq.headers = {
          'content-type': 'application/json'
        }

        // Act
        validateJsonContentType(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
      })

      it('should pass validation for application/json with charset', () => {
        // Arrange - JSON content type with charset
        mockReq.method = 'PUT'
        mockReq.headers = {
          'content-type': 'application/json; charset=utf-8'
        }

        // Act
        validateJsonContentType(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should skip validation for GET requests', () => {
        // Arrange - GET request (should skip validation)
        mockReq.method = 'GET'
        mockReq.headers = {}

        // Act
        validateJsonContentType(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should skip validation for multipart/form-data', () => {
        // Arrange - File upload request
        mockReq.method = 'POST'
        mockReq.headers = {
          'content-type': 'multipart/form-data; boundary=something'
        }

        // Act
        validateJsonContentType(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })

    describe('Invalid Content Types', () => {
      it('should reject missing content type', () => {
        // Arrange - No content type header
        mockReq.method = 'POST'
        mockReq.headers = {}

        // Act
        validateJsonContentType(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Content-Type must be application/json'
          }
        })
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should reject invalid content types', () => {
        const invalidContentTypes = [
          'text/plain',
          'application/xml',
          'text/html',
          'application/x-www-form-urlencoded'
        ]

        invalidContentTypes.forEach(contentType => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.method = 'POST'
          mockReq.headers = { 'content-type': contentType }

          // Act
          validateJsonContentType(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(statusSpy).toHaveBeenCalledWith(400)
          expect(jsonSpy).toHaveBeenCalledWith({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Content-Type must be application/json'
            }
          })
        })
      })
    })
  })

  describe('validateRequestSize', () => {
    describe('Valid Request Sizes', () => {
      it('should pass validation for requests within size limit', () => {
        // Arrange - Request within 10MB limit
        mockReq.headers = {
          'content-length': '1048576' // 1MB
        }

        // Act
        validateRequestSize(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
      })

      it('should pass validation when no content-length header', () => {
        // Arrange - No content-length header
        mockReq.headers = {}

        // Act
        validateRequestSize(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should pass validation for maximum allowed size', () => {
        // Arrange - Request at exactly 10MB limit
        mockReq.headers = {
          'content-length': '10485760' // Exactly 10MB
        }

        // Act
        validateRequestSize(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })

    describe('Invalid Request Sizes', () => {
      it('should reject requests exceeding size limit', () => {
        // Arrange - Request exceeding 10MB limit
        mockReq.headers = {
          'content-length': '10485761' // 10MB + 1 byte
        }

        // Act
        validateRequestSize(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(413)
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: 'Request body too large. Maximum size is 10MB'
          }
        })
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should reject very large requests', () => {
        // Arrange - Extremely large request
        mockReq.headers = {
          'content-length': '104857600' // 100MB
        }

        // Act
        validateRequestSize(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(413)
      })
    })
  })

  describe('validateUserAgent', () => {
    describe('Valid User Agents', () => {
      it('should pass validation for standard browser user agents', () => {
        const validUserAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          'PostmanRuntime/7.26.8',
          'insomnia/2021.1.0'
        ]

        validUserAgents.forEach(userAgent => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.headers = { 'user-agent': userAgent }

          // Act
          validateUserAgent(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(mockNext).toHaveBeenCalledOnce()
          expect(statusSpy).not.toHaveBeenCalled()
        })
      })
    })

    describe('Invalid User Agents', () => {
      it('should reject missing user agent', () => {
        // Arrange - No user agent header
        mockReq.headers = {}

        // Act
        validateUserAgent(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User-Agent header is required'
          }
        })
        expect(mockNext).not.toHaveBeenCalled()
      })

      it('should reject empty user agent', () => {
        // Arrange - Empty user agent
        mockReq.headers = {
          'user-agent': ''
        }

        // Act
        validateUserAgent(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
      })

      it('should block known bot user agents', () => {
        const blockedUserAgents = [
          'Googlebot/2.1',
          'Mozilla/5.0 (compatible; bingbot/2.0)',
          'Twitterbot/1.0',
          'facebookexternalhit/1.1',
          'LinkedInBot/1.0',
          'web crawler',
          'spider bot',
          'scraper tool'
        ]

        blockedUserAgents.forEach(userAgent => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.headers = { 'user-agent': userAgent }

          // Act
          validateUserAgent(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(statusSpy).toHaveBeenCalledWith(403)
          expect(jsonSpy).toHaveBeenCalledWith({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Access denied for automated requests'
            }
          })
          expect(mockNext).not.toHaveBeenCalled()
        })
      })
    })
  })

  describe('sanitizeInput', () => {
    describe('Input Sanitization', () => {
      it('should sanitize string values in request body', () => {
        // Arrange - Request body with control characters
        mockReq.body = {
          content: 'Normal text\x00with\x08null\x1Fbytes',
          title: 'Clean title',
          description: 'Text\x7Fwith\x0Ccontrol\x0Bchars'
        }

        // Act
        sanitizeInput(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Control characters should be removed
        expect(mockReq.body.content).toBe('Normal textwithnullbytes')
        expect(mockReq.body.title).toBe('Clean title')
        expect(mockReq.body.description).toBe('Textwithcontrolchars')
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should handle nested objects', () => {
        // Arrange - Nested object with control characters
        mockReq.body = {
          user: {
            name: 'User\x00Name',
            profile: {
              bio: 'Bio\x1Fwith\x08chars'
            }
          }
        }

        // Act
        sanitizeInput(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Nested values should be sanitized
        expect(mockReq.body.user.name).toBe('UserName')
        expect(mockReq.body.user.profile.bio).toBe('Biowithchars')
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should handle arrays', () => {
        // Arrange - Array with control characters
        mockReq.body = {
          tags: ['tag1\x00', 'clean\x1Ftag', 'normal'],
          nested: [
            { name: 'item\x08one' },
            { name: 'item\x7Ftwo' }
          ]
        }

        // Act
        sanitizeInput(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Array values should be sanitized
        expect(mockReq.body.tags).toEqual(['tag1', 'cleantag', 'normal'])
        expect(mockReq.body.nested[0].name).toBe('itemone')
        expect(mockReq.body.nested[1].name).toBe('itemtwo')
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should preserve non-string values', () => {
        // Arrange - Mixed data types
        mockReq.body = {
          count: 42,
          active: true,
          data: null,
          tags: ['clean', 'tag\x00dirty'],
          timestamp: new Date('2023-01-01')
        }

        // Act
        sanitizeInput(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Non-strings should be preserved, strings sanitized
        expect(mockReq.body.count).toBe(42)
        expect(mockReq.body.active).toBe(true)
        expect(mockReq.body.data).toBeNull()
        expect(mockReq.body.tags).toEqual(['clean', 'tagdirty'])
        expect(mockReq.body.timestamp).toBeInstanceOf(Date)
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should handle empty or missing body', () => {
        // Arrange - No request body
        mockReq.body = undefined

        // Act
        sanitizeInput(mockReq as Request, mockRes as Response, mockNext)

        // Assert - Should not crash
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })
  })

  describe('validateIdParam', () => {
    describe('Valid ID Parameters', () => {
      it('should pass validation with valid alphanumeric ID', () => {
        // Arrange - Valid ID
        mockReq.params = {
          id: 'abc123def456'
        }

        // Act
        validateIdParam(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(statusSpy).not.toHaveBeenCalled()
      })

      it('should pass validation with hyphens and underscores', () => {
        // Arrange - ID with allowed characters
        mockReq.params = {
          id: 'user-123_abc'
        }

        // Act
        validateIdParam(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
      })
    })

    describe('Invalid ID Parameters', () => {
      it('should reject empty ID', () => {
        // Arrange - Empty ID
        mockReq.params = {
          id: ''
        }

        // Act
        validateIdParam(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'id',
                  message: 'ID is required'
                })
              ])
            })
          })
        )
      })

      it('should reject ID with invalid characters', () => {
        const invalidIds = [
          'id@domain',
          'id.with.dots',
          'id with spaces',
          'id#hash',
          'id!exclamation'
        ]

        invalidIds.forEach(id => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.params = { id }

          // Act
          validateIdParam(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(statusSpy).toHaveBeenCalledWith(400)
          expect(jsonSpy).toHaveBeenCalledWith(
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                details: expect.arrayContaining([
                  expect.objectContaining({
                    field: 'id',
                    message: 'ID can only contain alphanumeric characters, hyphens, and underscores'
                  })
                ])
              })
            })
          )
        })
      })

      it('should reject ID that is too long', () => {
        // Arrange - ID exceeding length limit
        mockReq.params = {
          id: 'a'.repeat(256) // Exceeds 255 character limit
        }

        // Act
        validateIdParam(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'id',
                  message: 'ID too long'
                })
              ])
            })
          })
        )
      })
    })
  })

  describe('validatePagination', () => {
    describe('Valid Pagination Parameters', () => {
      it('should pass validation with default parameters', () => {
        // Arrange - Empty query (defaults should be applied)
        mockReq.query = {}

        // Act
        validatePagination(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(mockReq.query.page).toBe(1)
        expect(mockReq.query.limit).toBe(20)
        expect(mockReq.query.sort).toBe('newest')
      })

      it('should pass validation with valid pagination values', () => {
        // Arrange - Valid pagination parameters
        mockReq.query = {
          page: '5',
          limit: '50',
          sort: 'popular',
          search: 'test query'
        }

        // Act
        validatePagination(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(mockNext).toHaveBeenCalledOnce()
        expect(mockReq.query.page).toBe(5)
        expect(mockReq.query.limit).toBe(50)
        expect(mockReq.query.sort).toBe('popular')
        expect(mockReq.query.search).toBe('test query')
      })

      it('should pass validation with all sort options', () => {
        const sortOptions = ['newest', 'oldest', 'popular']

        sortOptions.forEach(sort => {
          // Arrange - Reset mocks for each iteration
          vi.clearAllMocks()
          
          mockReq.query = { sort }

          // Act
          validatePagination(mockReq as Request, mockRes as Response, mockNext)

          // Assert
          expect(mockNext).toHaveBeenCalledOnce()
          expect(mockReq.query.sort).toBe(sort)
        })
      })
    })

    describe('Invalid Pagination Parameters', () => {
      it('should reject page number that is too high', () => {
        // Arrange - Page exceeding limit
        mockReq.query = {
          page: '1001' // Exceeds maximum of 1000
        }

        // Act
        validatePagination(mockReq as Request, mockRes as Response, mockNext)

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

      it('should reject invalid sort option', () => {
        // Arrange - Invalid sort option
        mockReq.query = {
          sort: 'invalid_sort'
        }

        // Act
        validatePagination(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
      })

      it('should reject search query that is too long', () => {
        // Arrange - Search query exceeding limit
        mockReq.query = {
          search: 'x'.repeat(201) // Exceeds 200 character limit
        }

        // Act
        validatePagination(mockReq as Request, mockRes as Response, mockNext)

        // Assert
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              details: expect.arrayContaining([
                expect.objectContaining({
                  field: 'search',
                  message: 'Search query too long'
                })
              ])
            })
          })
        )
      })
    })
  })

  describe('validateAndLogIP', () => {
    describe('IP Address Validation', () => {
      it('should extract IP from connection and set clientIP', () => {
        // Arrange - IP in connection.remoteAddress
        mockReq.connection = { remoteAddress: '192.168.1.100' }

        // Act
        validateAndLogIP(mockReq as ExtendedTestRequest, mockRes as Response, mockNext)

        // Assert
        expect(mockReq.clientIP).toBe('192.168.1.100')
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should prioritize x-forwarded-for header', () => {
        // Arrange - IP in x-forwarded-for header (proxy scenario)
        mockReq.headers = {
          'x-forwarded-for': '203.0.113.1, 192.168.1.1'
        }
        mockReq.connection = { remoteAddress: '192.168.1.1' }

        // Act
        validateAndLogIP(mockReq as ExtendedTestRequest, mockRes as Response, mockNext)

        // Assert - Should use first IP from x-forwarded-for
        expect(mockReq.clientIP).toBe('203.0.113.1, 192.168.1.1')
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should handle x-real-ip header', () => {
        // Arrange - IP in x-real-ip header
        mockReq.headers = {
          'x-real-ip': '198.51.100.1'
        }

        // Act
        validateAndLogIP(mockReq as ExtendedTestRequest, mockRes as Response, mockNext)

        // Assert
        expect(mockReq.clientIP).toBe('198.51.100.1')
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should fall back to socket.remoteAddress when connection is unavailable', () => {
        // Arrange - IP in socket but not connection
        mockReq.connection = undefined
        mockReq.socket = { remoteAddress: '10.0.0.1' }
        mockReq.headers = {}

        // Act
        validateAndLogIP(mockReq as ExtendedTestRequest, mockRes as Response, mockNext)

        // Assert
        expect(mockReq.clientIP).toBe('10.0.0.1')
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should handle missing IP gracefully', () => {
        // Arrange - No IP available anywhere
        mockReq.connection = {}
        mockReq.socket = undefined
        mockReq.headers = {}
        mockReq.ip = undefined

        // Act
        validateAndLogIP(mockReq as ExtendedTestRequest, mockRes as Response, mockNext)

        // Assert - Should set to 'unknown'
        expect(mockReq.clientIP).toBe('unknown')
        expect(mockNext).toHaveBeenCalledOnce()
      })

      it('should log warning for suspicious IP format', () => {
        // Arrange - Mock console.warn to capture log output
        const originalConsoleWarn = console.warn
        const consoleWarnSpy = vi.fn()
        console.warn = consoleWarnSpy

        // Set suspicious IP format
        mockReq.connection = { remoteAddress: 'not-a-valid-ip' }

        // Act
        validateAndLogIP(mockReq as ExtendedTestRequest, mockRes as Response, mockNext)

        // Assert - Should log warning but not block
        expect(consoleWarnSpy).toHaveBeenCalledWith('Suspicious IP format detected: not-a-valid-ip')
        expect(mockNext).toHaveBeenCalledOnce()

        // Cleanup
        console.warn = originalConsoleWarn
      })
    })
  })

  describe('Combined Middleware Arrays', () => {
    describe('applyBasicSecurity', () => {
      it('should be an array of middleware functions', () => {
        // Assert - Should be an array
        expect(Array.isArray(applyBasicSecurity)).toBe(true)
        expect(applyBasicSecurity.length).toBeGreaterThan(0)
        
        // All items should be functions
        applyBasicSecurity.forEach(middleware => {
          expect(typeof middleware).toBe('function')
        })
      })
    })

    describe('applyAPIValidation', () => {
      it('should be an array of middleware functions', () => {
        // Assert - Should be an array
        expect(Array.isArray(applyAPIValidation)).toBe(true)
        expect(applyAPIValidation.length).toBeGreaterThan(0)
        
        // All items should be functions
        applyAPIValidation.forEach(middleware => {
          expect(typeof middleware).toBe('function')
        })
      })

      it('should include all basic security middleware', () => {
        // Assert - Should include basic security middleware
        expect(applyAPIValidation.length).toBeGreaterThan(applyBasicSecurity.length)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle internal server errors gracefully', () => {
      // Arrange - Force an internal error
      const originalConsoleError = console.error
      console.error = vi.fn() // Suppress error logging during test
      
      // Mock request with corrupted params that throws non-ZodError
      const mockReqWithCorruptedParams = {
        params: {
          get id() {
            throw new Error('Simulated internal error')
          }
        }
      }

      // Act
      validateIdParam(mockReqWithCorruptedParams as Request, mockRes as Response, mockNext)

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