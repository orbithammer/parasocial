// frontend/src/lib/api.ts
// Version: 1.1.0
// Updated: Added base URL configuration to connect to backend on port 3001

// Base types for API responses and errors
export interface ApiResponse<T = unknown> {
  data: T
  status: number
  message?: string
}

interface ApiErrorInterface extends Error {
  status: number
  code?: string
}

// Options for API requests
export interface RequestOptions {
  token?: string
  headers?: Record<string, string>
}

// Custom error class for API errors
class ApiErrorClass extends Error implements ApiErrorInterface {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

// ============================================================================
// BASE URL CONFIGURATION
// ============================================================================

/**
 * Get the base API URL from environment variables
 * Falls back to localhost:3001 if not configured
 */
function getBaseUrl(): string {
  // Use environment variable if available
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_ prefixed variable
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  } else {
    // Server-side: can use any environment variable
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  }
}

/**
 * Base URL for all API requests
 * Points to the backend server on port 3001
 */
const API_BASE_URL = getBaseUrl()

/**
 * Resolves a URL against the base API URL
 * Handles both relative and absolute URLs correctly
 * @param url - The URL to resolve (relative or absolute)
 * @returns Complete URL for the API request
 */
function resolveUrl(url: string): string {
  // If URL is already absolute (starts with http:// or https://), return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // If URL starts with '/', remove it to avoid double slashes
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url
  
  // Combine base URL with relative URL
  return `${API_BASE_URL}/${cleanUrl}`
}

// ============================================================================
// API RESPONSE AND ERROR HANDLING
// ============================================================================

/**
 * Creates standardized API response object
 * @param data - Response data
 * @param status - HTTP status code
 * @param message - Optional message
 * @returns Formatted API response
 */
export function createApiResponse<T>(
  data: T, 
  status: number, 
  message?: string
): ApiResponse<T> {
  return {
    data,
    status,
    message
  }
}

/**
 * Handles API error responses and creates proper error objects
 * @param response - Failed fetch response
 * @returns Promise that rejects with ApiError
 */
export async function handleApiError(response: Response): Promise<never> {
  let errorMessage = `HTTP Error ${response.status}`
  let errorCode: string | undefined

  try {
    // Try to parse error response body
    const errorData = await response.json()
    if (errorData.message) {
      errorMessage = errorData.message
    }
    if (errorData.code) {
      errorCode = errorData.code
    }
  } catch {
    // If parsing fails, use default message
    errorMessage = `HTTP Error ${response.status}: ${response.statusText}`
  }

  throw new ApiErrorClass(errorMessage, response.status, errorCode)
}

/**
 * Creates request headers with optional authentication
 * @param options - Request options including token and custom headers
 * @returns Headers object for fetch request
 */
function createHeaders(options?: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  // Add authorization header if token is provided
  if (options?.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  // Merge any custom headers
  if (options?.headers) {
    Object.assign(headers, options.headers)
  }

  return headers
}

// ============================================================================
// CORE HTTP REQUEST FUNCTION
// ============================================================================

/**
 * Generic HTTP request function with base URL resolution
 * @param url - Request URL (relative or absolute)
 * @param method - HTTP method
 * @param body - Request body (optional)
 * @param options - Request options
 * @returns Promise with API response
 */
async function request<T>(
  url: string,
  method: string,
  body?: unknown,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  try {
    // Resolve URL against base API URL
    const resolvedUrl = resolveUrl(url)
    
    const config: RequestInit = {
      method,
      headers: createHeaders(options)
    }

    // Add body for methods that support it
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(body)
    }

    const response = await fetch(resolvedUrl, config)

    // Handle error responses
    if (!response.ok) {
      await handleApiError(response)
    }

    // Parse response data
    const data = await response.json()

    return createApiResponse<T>(data, response.status)
  } catch (error) {
    // Re-throw API errors as-is
    if (error instanceof ApiErrorClass) {
      throw error
    }

    // Handle network errors and other exceptions
    if (error instanceof Error) {
      throw new ApiErrorClass(error.message, 0, 'NETWORK_ERROR')
    }

    // Fallback for unknown errors
    throw new ApiErrorClass('Unknown error occurred', 0, 'UNKNOWN_ERROR')
  }
}

// ============================================================================
// HTTP METHOD HELPERS
// ============================================================================

/**
 * Performs GET request
 * @param url - Request URL (relative or absolute)
 * @param options - Request options
 * @returns Promise with API response
 */
export async function get<T>(
  url: string, 
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  return request<T>(url, 'GET', undefined, options)
}

/**
 * Performs POST request
 * @param url - Request URL (relative or absolute)
 * @param data - Request body data
 * @param options - Request options
 * @returns Promise with API response
 */
export async function post<TResponse, TRequest = unknown>(
  url: string,
  data: TRequest,
  options?: RequestOptions
): Promise<ApiResponse<TResponse>> {
  return request<TResponse>(url, 'POST', data, options)
}

/**
 * Performs PUT request
 * @param url - Request URL (relative or absolute)
 * @param data - Request body data
 * @param options - Request options
 * @returns Promise with API response
 */
export async function put<TResponse, TRequest = unknown>(
  url: string,
  data: TRequest,
  options?: RequestOptions
): Promise<ApiResponse<TResponse>> {
  return request<TResponse>(url, 'PUT', data, options)
}

/**
 * Performs PATCH request
 * @param url - Request URL (relative or absolute)
 * @param data - Request body data
 * @param options - Request options
 * @returns Promise with API response
 */
export async function patch<TResponse, TRequest = unknown>(
  url: string,
  data: TRequest,
  options?: RequestOptions
): Promise<ApiResponse<TResponse>> {
  return request<TResponse>(url, 'PATCH', data, options)
}

/**
 * Performs DELETE request
 * @param url - Request URL (relative or absolute)
 * @param options - Request options
 * @returns Promise with API response
 */
export async function del(
  url: string,
  options?: RequestOptions
): Promise<ApiResponse<void>> {
  return request<void>(url, 'DELETE', undefined, options)
}

// Export the delete function with standard name as well
export { del as delete }

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

// Export API error class (serves as both type and constructor)
export { ApiErrorClass as ApiError }

// frontend/src/lib/api.ts
// Version: 1.1.0
// Updated: Added base URL configuration to connect to backend on port 3001