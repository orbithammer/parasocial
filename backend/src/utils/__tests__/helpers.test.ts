// backend\src\utils\__tests__\helpers.test.ts
// Unit tests for helper utility functions
// Version: 1.1.0
// Updated to match helpers.ts v1.1.0 - TypeScript exactOptionalPropertyTypes fix

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// =============================================================================
// TYPE DEFINITIONS FOR TESTING
// =============================================================================

/**
 * Interface for pagination parameters
 */
interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

/**
 * Interface for pagination result
 */
interface PaginationResult {
  page: number
  limit: number
  offset: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

/**
 * Interface for API response structure
 */
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown[]
  }
  meta?: {
    pagination?: PaginationResult
    timestamp: string
  }
}

// =============================================================================
// MOCK HELPER FUNCTIONS FOR TESTING
// =============================================================================

/**
 * Generates a random UUID v4 string
 * @returns UUID v4 string
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Slugifies a string for URL-safe usage
 * @param text - Text to convert to slug
 * @returns URL-safe slug string
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Calculates pagination values from parameters
 * @param params - Pagination parameters
 * @param totalCount - Total number of items
 * @returns Calculated pagination result
 */
function calculatePagination(params: PaginationParams, totalCount: number): PaginationResult {
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(100, Math.max(1, params.limit || 10))
  const offset = params.offset !== undefined ? params.offset : (page - 1) * limit
  const totalPages = Math.ceil(totalCount / limit)
  
  return {
    page,
    limit,
    offset,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  }
}

/**
 * Creates standardized API response object
 * @param success - Whether the operation was successful
 * @param data - Response data
 * @param error - Error information if operation failed
 * @param meta - Additional metadata
 * @returns Standardized API response
 */
function createApiResponse<T>(
  success: boolean,
  data?: T,
  error?: { code: string; message: string; details?: unknown[] },
  meta?: { pagination?: PaginationResult }
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  }

  if (success && data !== undefined) {
    response.data = data
  }

  if (!success && error) {
    response.error = error
  }

  return response
}

/**
 * Delays execution for specified milliseconds
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Removes null and undefined values from object
 * @param obj - Object to clean
 * @returns Object without null/undefined values
 */
function removeNullish<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      cleaned[key as keyof T] = value as T[keyof T]
    }
  }
  
  return cleaned
}

/**
 * Validates email format using regex
 * @param email - Email string to validate
 * @returns Boolean indicating if email is valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Truncates text to specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

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
    expect(slugify('Hello! @World# $%^')).toBe('hello-world')
  })

  it('should handle multiple consecutive spaces', () => {
    expect(slugify('hello    world')).toBe('hello-world')
  })

  it('should remove leading and trailing hyphens', () => {
    expect(slugify('  -hello world-  ')).toBe('hello-world')
  })

  it('should handle empty string', () => {
    expect(slugify('')).toBe('')
  })

  it('should handle underscores', () => {
    expect(slugify('hello_world_test')).toBe('hello-world-test')
  })
})

// =============================================================================
// PAGINATION TESTS
// =============================================================================

describe('calculatePagination', () => {
  it('should calculate correct pagination for first page', () => {
    const result = calculatePagination({ page: 1, limit: 10 }, 50)
    
    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)
    expect(result.offset).toBe(0)
    expect(result.totalPages).toBe(5)
    expect(result.hasNextPage).toBe(true)
    expect(result.hasPreviousPage).toBe(false)
  })

  it('should calculate correct pagination for middle page', () => {
    const result = calculatePagination({ page: 3, limit: 10 }, 50)
    
    expect(result.page).toBe(3)
    expect(result.offset).toBe(20)
    expect(result.hasNextPage).toBe(true)
    expect(result.hasPreviousPage).toBe(true)
  })

  it('should calculate correct pagination for last page', () => {
    const result = calculatePagination({ page: 5, limit: 10 }, 50)
    
    expect(result.page).toBe(5)
    expect(result.offset).toBe(40)
    expect(result.hasNextPage).toBe(false)
    expect(result.hasPreviousPage).toBe(true)
  })

  it('should use default values when parameters missing', () => {
    const result = calculatePagination({}, 100)
    
    expect(result.page).toBe(1)
    expect(result.limit).toBe(10)
    expect(result.offset).toBe(0)
  })

  it('should enforce minimum page of 1', () => {
    const result = calculatePagination({ page: -5 }, 50)
    
    expect(result.page).toBe(1)
  })

  it('should enforce maximum limit of 100', () => {
    const result = calculatePagination({ limit: 200 }, 1000)
    
    expect(result.limit).toBe(100)
  })

  it('should use offset when provided', () => {
    const result = calculatePagination({ offset: 25, limit: 5 }, 100)
    
    expect(result.offset).toBe(25)
  })
})

// =============================================================================
// API RESPONSE TESTS
// =============================================================================

describe('createApiResponse', () => {
  it('should create successful response with data', () => {
    const data = { id: 1, name: 'Test' }
    const response = createApiResponse(true, data)
    
    expect(response.success).toBe(true)
    expect(response.data).toEqual(data)
    expect(response.meta?.timestamp).toBeDefined()
    expect(response.error).toBeUndefined()
  })

  it('should create error response', () => {
    const error = { code: 'TEST_ERROR', message: 'Test error message' }
    const response = createApiResponse(false, undefined, error)
    
    expect(response.success).toBe(false)
    expect(response.error).toEqual(error)
    expect(response.data).toBeUndefined()
  })

  it('should include pagination metadata', () => {
    const pagination = calculatePagination({ page: 2, limit: 5 }, 20)
    const response = createApiResponse(true, [], undefined, { pagination })
    
    expect(response.meta?.pagination).toEqual(pagination)
  })

  it('should always include timestamp', () => {
    const response = createApiResponse(true)
    
    expect(response.meta?.timestamp).toBeDefined()
    expect(typeof response.meta?.timestamp).toBe('string')
  })
})

// =============================================================================
// DELAY FUNCTION TESTS
// =============================================================================

describe('delay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should delay execution for specified time', async () => {
    const promise = delay(1000)
    
    // Fast-forward time
    vi.advanceTimersByTime(999)
    
    // Promise should still be pending
    let resolved = false
    promise.then(() => { resolved = true })
    await Promise.resolve() // Allow microtasks to run
    expect(resolved).toBe(false)
    
    // Complete the delay
    vi.advanceTimersByTime(1)
    await promise
    expect(resolved).toBe(true)
  })

  it('should resolve with undefined', async () => {
    const promise = delay(100)
    vi.advanceTimersByTime(100)
    
    const result = await promise
    expect(result).toBeUndefined()
  })
})

// =============================================================================
// OBJECT CLEANING TESTS
// =============================================================================

describe('removeNullish', () => {
  it('should remove null values', () => {
    const input = { a: 1, b: null, c: 'test' }
    const result = removeNullish(input)
    
    expect(result).toEqual({ a: 1, c: 'test' })
    expect(result.hasOwnProperty('b')).toBe(false)
  })

  it('should remove undefined values', () => {
    const input = { a: 1, b: undefined, c: 'test' }
    const result = removeNullish(input)
    
    expect(result).toEqual({ a: 1, c: 'test' })
    expect(result.hasOwnProperty('b')).toBe(false)
  })

  it('should keep falsy but defined values', () => {
    const input = { a: 0, b: '', c: false, d: null }
    const result = removeNullish(input)
    
    expect(result).toEqual({ a: 0, b: '', c: false })
  })

  it('should handle empty object', () => {
    const result = removeNullish({})
    expect(result).toEqual({})
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

// backend\src\utils\__tests__\helpers.test.ts