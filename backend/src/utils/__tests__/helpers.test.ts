// backend/src/utils/__tests__/helpers.test.ts
// Version: 1.5.0
// Unit tests for helper utility functions - Added proper static imports
// Changed: Added static imports for helpers functions

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Static imports from helpers file
import { 
  isValidEmail,
  truncateText,
  generateUUID,
  slugify,
  calculatePagination,
  createApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../helpers'

// Very basic test to check if test discovery works at all
describe('Basic Test Discovery', () => {
  it('should run a simple test', () => {
    expect(1 + 1).toBe(2)
  })
})

// =============================================================================
// EMAIL VALIDATION TESTS
// =============================================================================

describe('isValidEmail', () => {
  it('should validate correct email formats', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.org',
      'user123@test-domain.com'
    ]
    
    validEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(true)
    })
  })

  it('should reject invalid email formats', () => {
    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user..name@example.com',
      'user@example',
      'user name@example.com'
    ]
    
    invalidEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(false)
    })
  })

  it('should handle empty string', () => {
    expect(isValidEmail('')).toBe(false)
  })
})

// =============================================================================
// TEXT TRUNCATION TESTS
// =============================================================================

describe('truncateText', () => {
  it('should not modify text shorter than max length', () => {
    const text = 'Short text'
    expect(truncateText(text, 20)).toBe(text)
  })

  it('should truncate text longer than max length', () => {
    const text = 'This is a very long text that needs truncation'
    const result = truncateText(text, 20)
    
    expect(result).toHaveLength(20)
    expect(result.endsWith('...')).toBe(true)
    expect(result).toBe('This is a very l...')
  })

  it('should handle exact length text', () => {
    const text = 'Exactly twenty chars'
    expect(truncateText(text, 20)).toBe(text)
  })

  it('should handle very short max length', () => {
    const text = 'Hello'
    const result = truncateText(text, 3)
    
    expect(result).toBe('...')
  })

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('')
  })
})

console.log('Test setup initialized')

// =============================================================================
// TEST CLEANUP
// =============================================================================

beforeEach(() => {
  // Reset any global state before each test
  console.log('Test setup')
})

afterEach(() => {
  console.log('Test cleanup completed')
})

// =============================================================================
// EMAIL VALIDATION TESTS
// =============================================================================

describe('isValidEmail', () => {
  it('should validate correct email formats', () => {
    const validEmails = [
      'test@example.com',
      'user.name@domain.co.uk',
      'user+tag@example.org',
      'user123@test-domain.com'
    ]
    
    validEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(true)
    })
  })

  it('should reject invalid email formats', () => {
    const invalidEmails = [
      'notanemail',
      '@example.com',
      'user@',
      'user..name@example.com',
      'user@example',
      'user name@example.com'
    ]
    
    invalidEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(false)
    })
  })

  it('should handle empty string', () => {
    expect(isValidEmail('')).toBe(false)
  })
})

// =============================================================================
// TEXT TRUNCATION TESTS
// =============================================================================

describe('truncateText', () => {
  it('should not modify text shorter than max length', () => {
    const text = 'Short text'
    expect(truncateText(text, 20)).toBe(text)
  })

  it('should truncate text longer than max length', () => {
    const text = 'This is a very long text that needs truncation'
    const result = truncateText(text, 20)
    
    expect(result).toHaveLength(20)
    expect(result.endsWith('...')).toBe(true)
    expect(result).toBe('This is a very l...')
  })

  it('should handle exact length text', () => {
    const text = 'Exactly twenty chars'
    expect(truncateText(text, 20)).toBe(text)
  })

  it('should handle very short max length', () => {
    const text = 'Hello'
    const result = truncateText(text, 3)
    
    expect(result).toBe('...')
  })

  it('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('')
  })
})

// =============================================================================
// UUID GENERATION TESTS
// =============================================================================

describe('generateUUID', () => {
  it('should generate a valid UUID v4 format', () => {
    const uuid = generateUUID()
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    
    expect(uuid).toMatch(uuidRegex)
    expect(uuid).toHaveLength(36)
  })

  it('should generate unique UUIDs', () => {
    const uuid1 = generateUUID()
    const uuid2 = generateUUID()
    
    expect(uuid1).not.toBe(uuid2)
  })

  it('should always have version 4 indicator', () => {
    const uuid = generateUUID()
    expect(uuid.charAt(14)).toBe('4')
  })
})

// =============================================================================
// SLUGIFY TESTS
// =============================================================================

describe('slugify', () => {
  it('should convert text to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('should replace spaces with hyphens', () => {
    expect(slugify('this is a test')).toBe('this-is-a-test')
  })

  it('should remove special characters', () => {
    expect(slugify('Hello! @World#')).toBe('hello-world')
  })

  it('should handle multiple spaces and underscores', () => {
    expect(slugify('hello    world_test')).toBe('hello-world-test')
  })

  it('should remove leading/trailing hyphens', () => {
    expect(slugify('  -hello world-  ')).toBe('hello-world')
  })

  it('should handle empty string', () => {
    expect(slugify('')).toBe('')
  })
})

// =============================================================================
// PAGINATION TESTS
// =============================================================================

describe('calculatePagination', () => {
  it('should calculate pagination with default values', () => {
    const result = calculatePagination({}, 100)
    
    expect(result).toEqual({
      page: 1,
      limit: 10,
      offset: 0,
      totalPages: 10,
      hasNextPage: true,
      hasPreviousPage: false
    })
  })

  it('should calculate pagination with custom values', () => {
    const result = calculatePagination({ page: 3, limit: 20 }, 150)
    
    expect(result).toEqual({
      page: 3,
      limit: 20,
      offset: 40,
      totalPages: 8,
      hasNextPage: true,
      hasPreviousPage: true
    })
  })

  it('should handle edge cases', () => {
    const result = calculatePagination({ page: 0, limit: 0 }, 50)
    
    expect(result).toEqual({
      page: 1,
      limit: 1,
      offset: 0,
      totalPages: 50,
      hasNextPage: true,
      hasPreviousPage: false
    })
  })
})

// =============================================================================
// API RESPONSE TESTS
// =============================================================================

describe('createApiResponse', () => {
  it('should create successful response with data', () => {
    const data = { message: 'Success' }
    const response = createApiResponse(true, data)
    
    expect(response.success).toBe(true)
    expect(response.data).toEqual(data)
    expect(response.meta?.timestamp).toBeDefined()
  })

  it('should create error response', () => {
    const error = { code: 'TEST_ERROR', message: 'Test error' }
    const response = createApiResponse(false, undefined, error)
    
    expect(response.success).toBe(false)
    expect(response.error).toEqual(error)
    expect(response.data).toBeUndefined()
  })
})

describe('createSuccessResponse', () => {
  it('should create success response with data', () => {
    const testData = { id: 1, name: 'Test' }
    const response = createSuccessResponse(testData)
    
    expect(response.success).toBe(true)
    expect(response.data).toEqual(testData)
    expect(response.error).toBeUndefined()
  })
})

describe('createErrorResponse', () => {
  it('should create error response', () => {
    const response = createErrorResponse('VALIDATION_ERROR', 'Invalid input')
    
    expect(response.success).toBe(false)
    expect(response.error?.code).toBe('VALIDATION_ERROR')
    expect(response.error?.message).toBe('Invalid input')
    expect(response.data).toBeUndefined()
  })
})

// =============================================================================
// ASYNC UTILITIES TESTS
// =============================================================================

// =============================================================================
// API RESPONSE TESTS
// =============================================================================

describe('createApiResponse', () => {
  it('should create successful response with data', () => {
    const data = { message: 'Success' }
    const response = createApiResponse(true, data)
    
    expect(response.success).toBe(true)
    expect(response.data).toEqual(data)
    expect(response.meta?.timestamp).toBeDefined()
  })

  it('should create error response', () => {
    const error = { code: 'TEST_ERROR', message: 'Test error' }
    const response = createApiResponse(false, undefined, error)
    
    expect(response.success).toBe(false)
    expect(response.error).toEqual(error)
    expect(response.data).toBeUndefined()
  })
})

describe('createSuccessResponse', () => {
  it('should create success response with data', () => {
    const testData = { id: 1, name: 'Test' }
    const response = createSuccessResponse(testData)
    
    expect(response.success).toBe(true)
    expect(response.data).toEqual(testData)
    expect(response.error).toBeUndefined()
  })
})

describe('createErrorResponse', () => {
  it('should create error response', () => {
    const response = createErrorResponse('VALIDATION_ERROR', 'Invalid input')
    
    expect(response.success).toBe(false)
    expect(response.error?.code).toBe('VALIDATION_ERROR')
    expect(response.error?.message).toBe('Invalid input')
    expect(response.data).toBeUndefined()
  })
})

// backend/src/utils/__tests__/helpers.test.ts