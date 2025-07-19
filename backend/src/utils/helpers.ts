// backend/src/utils/__tests__/helpers.test.ts
// Version: 1.2.0
// Unit tests for helper utility functions - Fixed to import actual functions
// Changed: Removed mock implementations, added proper imports from helpers.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  // String utilities
  truncateText,
  slugify,
  capitalizeWords,

  // Validation utilities
  isValidEmail,
  isValidUrl,
  isEmpty,

  // UUID generation
  generateUUID,

  // Pagination utilities
  calculatePagination,
  type PaginationParams,
  type PaginationResult,

  // API response utilities
  createApiResponse,
  createSuccessResponse,
  createErrorResponse,
  type ApiResponse,

  // Async utilities
  delay,
  withTimeout,

  // Object utilities
  removeNullish,
  deepClone,
  pick,
  omit,

  // Array utilities
  unique,
  chunk,

  // Number utilities
  roundToDecimals,
  clamp
} from '../helpers'

console.log('Test setup initialized')

// =============================================================================
// TEST CLEANUP
// =============================================================================

beforeEach(() => {
  // Reset any global state before each test
  vi.clearAllTimers()
})

afterEach(() => {
  console.log('Starting test cleanup...')
  
  // Clean up any pending timers
  vi.clearAllTimers()
  
  // Reset all mocks
  vi.clearAllMocks()
  
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

describe('delay', () => {
  it('should delay execution', async () => {
    const start = Date.now()
    await delay(50)
    const end = Date.now()
    
    expect(end - start).toBeGreaterThanOrEqual(45) // Allow for some timing variance
  })
})

describe('withTimeout', () => {
  it('should resolve when function completes within timeout', async () => {
    const asyncFn = async () => {
      await delay(10)
      return 'success'
    }
    
    const result = await withTimeout(asyncFn, 100)
    expect(result).toBe('success')
  })

  it('should reject when function exceeds timeout', async () => {
    const asyncFn = async () => {
      await delay(100)
      return 'success'
    }
    
    await expect(withTimeout(asyncFn, 10)).rejects.toThrow('Operation timed out')
  })
})

// =============================================================================
// OBJECT UTILITIES TESTS
// =============================================================================

describe('removeNullish', () => {
  it('should remove null and undefined values', () => {
    const obj = {
      a: 'value',
      b: null,
      c: undefined,
      d: 0,
      e: '',
      f: false
    }
    
    const result = removeNullish(obj)
    
    expect(result).toEqual({
      a: 'value',
      d: 0,
      e: '',
      f: false
    })
  })
})

describe('deepClone', () => {
  it('should create deep copy of object', () => {
    const original = { a: 1, b: { c: 2 } }
    const cloned = deepClone(original)
    
    cloned.b.c = 3
    
    expect(original.b.c).toBe(2)
    expect(cloned.b.c).toBe(3)
  })
})

describe('pick', () => {
  it('should pick specified properties', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 }
    const result = pick(obj, ['a', 'c'])
    
    expect(result).toEqual({ a: 1, c: 3 })
  })
})

describe('omit', () => {
  it('should omit specified properties', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 }
    const result = omit(obj, ['b', 'd'])
    
    expect(result).toEqual({ a: 1, c: 3 })
  })
})

// =============================================================================
// VALIDATION UTILITIES TESTS
// =============================================================================

describe('isValidUrl', () => {
  it('should validate correct URLs', () => {
    const validUrls = [
      'https://example.com',
      'http://test.org',
      'https://sub.domain.co.uk/path'
    ]
    
    validUrls.forEach(url => {
      expect(isValidUrl(url)).toBe(true)
    })
  })

  it('should reject invalid URLs', () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://invalid',
      'javascript:alert(1)'
    ]
    
    invalidUrls.forEach(url => {
      expect(isValidUrl(url)).toBe(false)
    })
  })
})

describe('isEmpty', () => {
  it('should detect empty values', () => {
    expect(isEmpty(null)).toBe(true)
    expect(isEmpty(undefined)).toBe(true)
    expect(isEmpty('')).toBe(true)
    expect(isEmpty('   ')).toBe(true)
    expect(isEmpty([])).toBe(true)
    expect(isEmpty({})).toBe(true)
  })

  it('should detect non-empty values', () => {
    expect(isEmpty('text')).toBe(false)
    expect(isEmpty([1])).toBe(false)
    expect(isEmpty({ a: 1 })).toBe(false)
    expect(isEmpty(0)).toBe(false)
    expect(isEmpty(false)).toBe(false)
  })
})

// =============================================================================
// ARRAY UTILITIES TESTS
// =============================================================================

describe('unique', () => {
  it('should remove duplicates while preserving order', () => {
    const array = [1, 2, 2, 3, 1, 4]
    const result = unique(array)
    
    expect(result).toEqual([1, 2, 3, 4])
  })
})

describe('chunk', () => {
  it('should split array into chunks', () => {
    const array = [1, 2, 3, 4, 5, 6, 7]
    const result = chunk(array, 3)
    
    expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]])
  })

  it('should handle edge cases', () => {
    expect(chunk([1, 2, 3], 0)).toEqual([])
    expect(chunk([], 2)).toEqual([])
  })
})

// =============================================================================
// NUMBER UTILITIES TESTS
// =============================================================================

describe('roundToDecimals', () => {
  it('should round to specified decimal places', () => {
    expect(roundToDecimals(3.14159, 2)).toBe(3.14)
    expect(roundToDecimals(2.5, 0)).toBe(3)
  })
})

describe('clamp', () => {
  it('should clamp values between min and max', () => {
    expect(clamp(5, 1, 10)).toBe(5)
    expect(clamp(-5, 1, 10)).toBe(1)
    expect(clamp(15, 1, 10)).toBe(10)
  })
})

// backend/src/utils/__tests__/helpers.test.ts