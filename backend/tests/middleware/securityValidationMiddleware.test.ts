// backend/tests/middleware/securityValidationMiddleware.test.ts
// Fixed TypeScript Request mocking issues

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

interface MockSocket {
  remoteAddress?: string
}

interface MockTestRequest {
  clientIP?: string
  connection?: MockSocket
  socket?: MockSocket
  headers?: Record<string, string>
  ip?: string
  params?: Record<string, string>
  query?: Record<string, string>
  body?: any
  method?: string
}

describe('Security Validation Middleware', () => {
  let mockReq: MockTestRequest
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let jsonSpy: any
  let statusSpy: any
  let setHeaderSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    jsonSpy = vi.fn()
    statusSpy = vi.fn().mockReturnThis()
    setHeaderSpy = vi.fn()
    
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
      setHeader: setHeaderSpy
    }
    
    mockNext = vi.fn()
    process.env.ALLOWED_ORIGINS = 'http://localhost:3000'
  })

  afterEach(() => {
    delete process.env.ALLOWED_ORIGINS
  })

  describe('validateIdParam', () => {
    it('should pass validation with valid alphanumeric ID', () => {
      mockReq.params = { id: 'abc123def456' }
      
      validateIdParam(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
      expect(statusSpy).not.toHaveBeenCalled()
    })

    it('should pass validation with hyphens and underscores', () => {
      mockReq.params = { id: 'user-123_abc' }
      
      validateIdParam(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should reject empty ID', () => {
      mockReq.params = { id: '' }
      
      validateIdParam(mockReq as Request, mockRes as Response, mockNext)
      
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalled()
    })

    it('should reject missing ID parameter', () => {
      mockReq.params = {}
      
      validateIdParam(mockReq as Request, mockRes as Response, mockNext)
      
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalled()
    })

    it('should reject ID with invalid characters', () => {
      const invalidIds = ['id@domain', 'id.with.dots', 'id with spaces']
      
      invalidIds.forEach(id => {
        vi.clearAllMocks()
        mockReq.params = { id }
        
        validateIdParam(mockReq as Request, mockRes as Response, mockNext)
        
        expect(statusSpy).toHaveBeenCalledWith(400)
        expect(jsonSpy).toHaveBeenCalled()
      })
    })

    it('should reject ID that is too long', () => {
      mockReq.params = { id: 'a'.repeat(256) }
      
      validateIdParam(mockReq as Request, mockRes as Response, mockNext)
      
      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalled()
    })
  })

  describe('setSecurityHeaders', () => {
    it('should set all required security headers', () => {
      mockReq.method = 'GET'
      
      setSecurityHeaders(mockReq as Request, mockRes as Response, mockNext)
      
      expect(setHeaderSpy).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
      expect(setHeaderSpy).toHaveBeenCalledWith('X-Frame-Options', 'DENY')
      expect(setHeaderSpy).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block')
      expect(setHeaderSpy).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin')
      expect(mockNext).toHaveBeenCalledOnce()
    })
  })

  describe('sanitizeInput', () => {
    it('should sanitize control characters from strings', () => {
      mockReq.body = {
        title: 'Hello\x00World\x1F',
        description: 'Test\x08content\x7F'
      }
      
      sanitizeInput(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockReq.body.title).toBe('HelloWorld')
      expect(mockReq.body.description).toBe('Testcontent')
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should handle nested objects and arrays', () => {
      mockReq.body = {
        user: {
          name: 'Test\x00User',
          bio: 'Bio\x1Ftext'
        },
        tags: ['tag1\x08', 'clean-tag', 'tag3\x7F']
      }
      
      sanitizeInput(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockReq.body.user.name).toBe('TestUser')
      expect(mockReq.body.user.bio).toBe('Biotext')
      expect(mockReq.body.tags).toEqual(['tag1', 'clean-tag', 'tag3'])
      expect(mockNext).toHaveBeenCalledOnce()
    })
  })

  describe('validateAndLogIP', () => {
    it('should extract IP from connection.remoteAddress', () => {
      mockReq.connection = { remoteAddress: '192.168.1.100' }
      mockReq.headers = {}
      
      validateAndLogIP(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockReq.clientIP).toBe('192.168.1.100')
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should extract IP from x-forwarded-for header', () => {
      mockReq.headers = { 'x-forwarded-for': '203.0.113.1, 192.168.1.1' }
      mockReq.connection = { remoteAddress: '192.168.1.1' }
      
      validateAndLogIP(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockReq.clientIP).toBe('203.0.113.1, 192.168.1.1')
      expect(mockNext).toHaveBeenCalledOnce()
    })

    it('should handle missing IP gracefully', () => {
      mockReq.connection = {}
      mockReq.socket = undefined
      mockReq.headers = {}
      mockReq.ip = undefined
      
      validateAndLogIP(mockReq as Request, mockRes as Response, mockNext)
      
      expect(mockReq.clientIP).toBe('unknown')
      expect(mockNext).toHaveBeenCalledOnce()
    })
  })
})