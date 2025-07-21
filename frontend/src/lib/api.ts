// frontend/src/lib/api.ts
// Version: 1.0.0
// API library implementation with type-safe HTTP methods and error handling

// Base types for API responses and errors
export interface ApiResponse<T = unknown> {
  data: T
  status: number
  message?: string
}

export interface ApiError extends Error {
  status: number
  code?: string
}

// Options for API requests
export interface RequestOptions {
  token?: string
  headers?: Record<string, string>
}

// Custom error class for API errors
class ApiErrorClass extends Error implements ApiError {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

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

/**
 * Generic HTTP request function
 * @param url - Request URL
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
    const config: RequestInit = {
      method,
      headers: createHeaders(options)
    }

    // Add body for methods that support it
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(body)
    }

    const response = await fetch(url, config)

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

/**
 * Performs GET request
 * @param url - Request URL
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
 * @param url - Request URL
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
 * @param url - Request URL
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
 * @param url - Request URL
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
 * @param url - Request URL
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

// frontend/src/lib/api.ts
// Version: 1.0.0
// API library implementation with type-safe HTTP methods and error handling