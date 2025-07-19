// backend/src/utils/helpers.ts
// Version: 1.6.0
// Utility helper functions for backend operations
// Fixed isValidEmail validation and truncateText length calculation

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Interface for pagination parameters
 */
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

/**
 * Interface for pagination result
 */
export interface PaginationResult {
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
export interface ApiResponse<T = unknown> {
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
// STRING UTILITIES
// =============================================================================

/**
 * Truncates text to specified length with ellipsis
 * Ensures final result (including ellipsis) is exactly maxLength characters
 * @param text - Text to truncate
 * @param maxLength - Maximum length including ellipsis
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  // Handle edge cases
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  if (text.length <= maxLength) {
    return text
  }
  
  // If maxLength is too small for ellipsis, return just ellipsis
  if (maxLength <= 3) {
    return '...'
  }
  
  // Truncate to make room for ellipsis (exactly maxLength total)
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * Slugifies a string for URL-safe usage
 * @param text - Text to convert to slug
 * @returns URL-safe slug string
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

/**
 * Capitalizes first letter of each word
 * @param text - Text to capitalize
 * @returns Text with first letter of each word capitalized
 */
export function capitalizeWords(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }
  
  return text.replace(/\b\w/g, char => char.toUpperCase())
}

// =============================================================================
// UUID GENERATION
// =============================================================================

/**
 * Generates a random UUID v4 string
 * Uses crypto.randomUUID() if available, falls back to Math.random()
 * @returns UUID v4 string in format xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUID(): string {
  // Use native crypto.randomUUID if available (Node.js 16.7.0+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback implementation using Math.random()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// =============================================================================
// PAGINATION UTILITIES
// =============================================================================

/**
 * Calculates pagination values from parameters and total count
 * @param params - Pagination parameters (page, limit, offset)
 * @param totalCount - Total number of items
 * @returns Calculated pagination result with all metadata
 */
export function calculatePagination(params: PaginationParams, totalCount: number): PaginationResult {
  // Ensure safe values with defaults and bounds
  const page = Math.max(1, params.page || 1)
  const limit = Math.min(100, Math.max(1, params.limit || 10))
  const safeTotal = Math.max(0, totalCount)
  
  // Calculate offset from page or use provided offset
  const offset = params.offset !== undefined 
    ? Math.max(0, params.offset)
    : (page - 1) * limit
  
  // Calculate total pages
  const totalPages = Math.ceil(safeTotal / limit)
  
  return {
    page,
    limit,
    offset,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  }
}

// =============================================================================
// API RESPONSE UTILITIES
// =============================================================================

/**
 * Creates standardized API response object with consistent structure
 * @param success - Whether the operation was successful
 * @param data - Response data (for successful operations)
 * @param error - Error information (for failed operations)
 * @param meta - Additional metadata (pagination, etc.)
 * @returns Standardized API response object
 */
export function createApiResponse<T>(
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

  // Add data for successful responses
  if (success && data !== undefined) {
    response.data = data
  }

  // Add error for failed responses
  if (!success && error) {
    response.error = error
  }

  return response
}

/**
 * Creates a successful API response with data
 * @param data - Response data
 * @param meta - Optional metadata
 * @returns Success API response
 */
export function createSuccessResponse<T>(
  data: T, 
  meta?: { pagination?: PaginationResult }
): ApiResponse<T> {
  return createApiResponse(true, data, undefined, meta)
}

/**
 * Creates an error API response
 * @param code - Error code
 * @param message - Error message
 * @param details - Optional error details
 * @returns Error API response
 */
export function createErrorResponse(
  code: string, 
  message: string, 
  details?: unknown[]
): ApiResponse<undefined> {
  const error: { code: string; message: string; details?: unknown[] } = { code, message }
  if (details !== undefined) {
    error.details = details
  }
  return createApiResponse(false, undefined, error)
}

// =============================================================================
// ASYNC UTILITIES
// =============================================================================

/**
 * Creates a promise that resolves after specified milliseconds
 * Useful for rate limiting, testing, or adding delays
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Executes async function with timeout
 * @param asyncFn - Async function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that rejects if timeout exceeded
 */
export async function withTimeout<T>(
  asyncFn: () => Promise<T>, 
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
  )

  return Promise.race([asyncFn(), timeoutPromise])
}

// =============================================================================
// OBJECT UTILITIES
// =============================================================================

/**
 * Removes null and undefined values from an object
 * Creates a new object without modifying the original
 * @param obj - Object to clean
 * @returns New object without null/undefined values
 */
export function removeNullish<T extends Record<string, unknown>>(obj: T): Partial<T> {
  if (!obj || typeof obj !== 'object') {
    return {}
  }

  const cleaned: Partial<T> = {}
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) {
      cleaned[key as keyof T] = value as T[keyof T]
    }
  }
  
  return cleaned
}

/**
 * Deep clones an object using JSON parse/stringify
 * Note: This method has limitations (functions, dates, etc.)
 * @param obj - Object to clone
 * @returns Deep cloned object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Picks specified properties from an object
 * @param obj - Source object
 * @param keys - Keys to pick
 * @returns New object with only specified keys
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T, 
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>
  
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  
  return result
}

/**
 * Omits specified properties from an object
 * @param obj - Source object
 * @param keys - Keys to omit
 * @returns New object without specified keys
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T, 
  keys: K[]
): Omit<T, K> {
  const result = { ...obj }
  
  for (const key of keys) {
    delete result[key]
  }
  
  return result
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validates email format using comprehensive validation rules
 * Rejects emails with consecutive dots, leading/trailing dots, spaces, and other invalid patterns
 * @param email - Email string to validate
 * @returns Boolean indicating if email format is valid
 */
export function isValidEmail(email: string): boolean {
  // Handle null, undefined, and non-string values
  if (!email || typeof email !== 'string') {
    return false
  }

  const trimmedEmail = email.trim()
  
  // Check for empty string after trimming
  if (!trimmedEmail) {
    return false
  }
  
  // Reject emails with spaces anywhere
  if (trimmedEmail.includes(' ')) {
    return false
  }
  
  // Must contain exactly one @ symbol
  const atCount = (trimmedEmail.match(/@/g) || []).length
  if (atCount !== 1) {
    return false
  }
  
  // Split email into local and domain parts
  const [localPart, domainPart] = trimmedEmail.split('@')
  
  // Both parts must exist and not be empty
  if (!localPart || !domainPart) {
    return false
  }
  
  // Domain must contain at least one dot
  if (!domainPart.includes('.')) {
    return false
  }
  
  // Check for consecutive dots in local part
  if (localPart.includes('..')) {
    return false
  }
  
  // Check for leading or trailing dots in local part
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    return false
  }
  
  // Check for consecutive dots in domain part
  if (domainPart.includes('..')) {
    return false
  }
  
  // Check for leading or trailing dots in domain part
  if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
    return false
  }
  
  // Basic character validation for local part
  const validLocalChars = /^[a-zA-Z0-9._+-]+$/
  if (!validLocalChars.test(localPart)) {
    return false
  }
  
  // Basic character validation for domain part
  const validDomainChars = /^[a-zA-Z0-9.-]+$/
  if (!validDomainChars.test(domainPart)) {
    return false
  }

  return true
}

/**
 * Validates URL format
 * @param url - URL string to validate
 * @returns Boolean indicating if URL format is valid
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }

  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param value - Value to check
 * @returns Boolean indicating if value is empty
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

// =============================================================================
// ARRAY UTILITIES
// =============================================================================

/**
 * Removes duplicate values from array while preserving order
 * @param array - Array to deduplicate
 * @returns New array without duplicates
 */
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)]
}

/**
 * Chunks array into smaller arrays of specified size
 * @param array - Array to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) return []
  
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  
  return chunks
}

// =============================================================================
// NUMBER UTILITIES
// =============================================================================

/**
 * Rounds number to specified decimal places
 * @param num - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
export function roundToDecimals(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(num * factor) / factor
}

/**
 * Clamps number between min and max values
 * @param num - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped number
 */
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max)
}

// backend/src/utils/helpers.ts