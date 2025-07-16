// frontend/src/context/GlobalErrorContext.tsx
// Global error context provider for managing frontend error state
// Version: 1.0.0 - Initial global error context with toast notifications and API error handling

'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

// Error severity levels matching backend error codes
export type ErrorSeverity = 'error' | 'warning' | 'info' | 'success'

// Individual error interface
export interface AppError {
  id: string
  code: string
  message: string
  severity: ErrorSeverity
  timestamp: Date
  persistent?: boolean // If true, error stays until manually dismissed
  autoDisappear?: boolean // If true, error disappears after timeout
  details?: Record<string, unknown>
  source?: string // Component or API endpoint that generated the error
}

// Error context state interface
export interface ErrorState {
  errors: AppError[]
  hasErrors: boolean
  hasErrorType: (severity: ErrorSeverity) => boolean
  latestError: AppError | null
}

// API error response interface matching backend format
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  request_id?: string
  timestamp?: string
}

// Context methods interface
export interface GlobalErrorContextType extends ErrorState {
  // Add error methods
  addError: (error: Omit<AppError, 'id' | 'timestamp'>) => string
  addApiError: (apiError: ApiErrorResponse, source?: string) => string
  
  // Quick helper methods for common error types
  showError: (message: string, options?: Partial<Pick<AppError, 'code' | 'persistent' | 'details' | 'source'>>) => string
  showWarning: (message: string, options?: Partial<Pick<AppError, 'code' | 'persistent' | 'details' | 'source'>>) => string
  showInfo: (message: string, options?: Partial<Pick<AppError, 'code' | 'persistent' | 'details' | 'source'>>) => string
  showSuccess: (message: string, options?: Partial<Pick<AppError, 'code' | 'persistent' | 'details' | 'source'>>) => string
  
  // Remove error methods
  removeError: (errorId: string) => void
  removeErrorsByCode: (code: string) => void
  removeErrorsBySeverity: (severity: ErrorSeverity) => void
  clearAllErrors: () => void
  
  // Utility methods
  getErrorsByCode: (code: string) => AppError[]
  getErrorsBySeverity: (severity: ErrorSeverity) => AppError[]
}

// Create the global error context
const GlobalErrorContext = createContext<GlobalErrorContextType | null>(null)

// Custom hook to use the error context with type safety
export function useGlobalError(): GlobalErrorContextType {
  const context = useContext(GlobalErrorContext)
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider')
  }
  return context
}

// GlobalErrorProvider component props
interface GlobalErrorProviderProps {
  children: ReactNode
  autoRemoveTimeout?: number // Default timeout for auto-disappearing errors (ms)
  maxErrors?: number // Maximum number of errors to keep in state
}

/**
 * Global error provider component that manages application-wide error state
 * Handles API errors, user notifications, form validation errors, and toast messages
 * Provides centralized error management with automatic cleanup and categorization
 */
export function GlobalErrorProvider({
  children,
  autoRemoveTimeout = 5000, // 5 seconds default
  maxErrors = 50 // Prevent memory leaks with too many errors
}: GlobalErrorProviderProps) {
  // Error state
  const [errors, setErrors] = useState<AppError[]>([])

  // Generate unique error ID
  const generateErrorId = useCallback((): string => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `err_${timestamp}_${random}`
  }, [])

  // Add error to state
  const addError = useCallback((error: Omit<AppError, 'id' | 'timestamp'>): string => {
    const errorId = generateErrorId()
    const newError: AppError = {
      ...error,
      id: errorId,
      timestamp: new Date(),
      autoDisappear: error.autoDisappear ?? !error.persistent // Auto-disappear unless persistent
    }

    setErrors(prevErrors => {
      // Add new error
      const updatedErrors = [newError, ...prevErrors]
      
      // Enforce max errors limit
      if (updatedErrors.length > maxErrors) {
        return updatedErrors.slice(0, maxErrors)
      }
      
      return updatedErrors
    })

    // Set up auto-removal for non-persistent errors
    if (newError.autoDisappear && !newError.persistent) {
      setTimeout(() => {
        removeError(errorId)
      }, autoRemoveTimeout)
    }

    return errorId
  }, [generateErrorId, maxErrors, autoRemoveTimeout])

  // Add API error from backend response
  const addApiError = useCallback((apiError: ApiErrorResponse, source?: string): string => {
    return addError({
      code: apiError.error.code,
      message: apiError.error.message,
      severity: mapApiErrorCodeToSeverity(apiError.error.code),
      details: {
        ...apiError.error.details,
        request_id: apiError.request_id,
        api_timestamp: apiError.timestamp
      },
      source: source || 'API',
      persistent: false // API errors auto-disappear by default
    })
  }, [addError])

  // Quick helper methods for common error types
  const showError = useCallback((message: string, options?: Partial<Pick<AppError, 'code' | 'persistent' | 'details' | 'source'>>): string => {
    return addError({
      message,
      severity: 'error',
      code: options?.code || 'USER_ERROR',
      persistent: options?.persistent ?? false,
      details: options?.details,
      source: options?.source
    })
  }, [addError])

  const showWarning = useCallback((message: string, options?: Partial<Pick<AppError, 'code' | 'persistent' | 'details' | 'source'>>): string => {
    return addError({
      message,
      severity: 'warning',
      code: options?.code || 'USER_WARNING',
      persistent: options?.persistent ?? false,
      details: options?.details,
      source: options?.source
    })
  }, [addError])

  const showInfo = useCallback((message: string, options?: Partial<Pick<AppError, 'code' | 'persistent' | 'details' | 'source'>>): string => {
    return addError({
      message,
      severity: 'info',
      code: options?.code || 'USER_INFO',
      persistent: options?.persistent ?? false,
      details: options?.details,
      source: options?.source
    })
  }, [addError])

  const showSuccess = useCallback((message: string, options?: Partial<Pick<AppError, 'code' | 'persistent' | 'details' | 'source'>>): string => {
    return addError({
      message,
      severity: 'success',
      code: options?.code || 'USER_SUCCESS',
      persistent: options?.persistent ?? false,
      details: options?.details,
      source: options?.source
    })
  }, [addError])

  // Remove specific error by ID
  const removeError = useCallback((errorId: string): void => {
    setErrors(prevErrors => prevErrors.filter(error => error.id !== errorId))
  }, [])

  // Remove errors by code
  const removeErrorsByCode = useCallback((code: string): void => {
    setErrors(prevErrors => prevErrors.filter(error => error.code !== code))
  }, [])

  // Remove errors by severity
  const removeErrorsBySeverity = useCallback((severity: ErrorSeverity): void => {
    setErrors(prevErrors => prevErrors.filter(error => error.severity !== severity))
  }, [])

  // Clear all errors
  const clearAllErrors = useCallback((): void => {
    setErrors([])
  }, [])

  // Utility methods
  const getErrorsByCode = useCallback((code: string): AppError[] => {
    return errors.filter(error => error.code === code)
  }, [errors])

  const getErrorsBySeverity = useCallback((severity: ErrorSeverity): AppError[] => {
    return errors.filter(error => error.severity === severity)
  }, [errors])

  const hasErrorType = useCallback((severity: ErrorSeverity): boolean => {
    return errors.some(error => error.severity === severity)
  }, [errors])

  // Computed state values
  const hasErrors = errors.length > 0
  const latestError = errors.length > 0 ? errors[0] : null

  // Context value object
  const contextValue: GlobalErrorContextType = {
    errors,
    hasErrors,
    hasErrorType,
    latestError,
    addError,
    addApiError,
    showError,
    showWarning,
    showInfo,
    showSuccess,
    removeError,
    removeErrorsByCode,
    removeErrorsBySeverity,
    clearAllErrors,
    getErrorsByCode,
    getErrorsBySeverity
  }

  return (
    <GlobalErrorContext.Provider value={contextValue}>
      {children}
    </GlobalErrorContext.Provider>
  )
}

/**
 * Map backend API error codes to frontend severity levels
 * Customize this based on your backend error codes
 */
function mapApiErrorCodeToSeverity(errorCode: string): ErrorSeverity {
  switch (errorCode) {
    // Success-like codes
    case 'SUCCESS':
    case 'CREATED':
    case 'UPDATED':
      return 'success'
    
    // Info-like codes
    case 'NO_CONTENT':
    case 'NOT_MODIFIED':
      return 'info'
    
    // Warning-like codes
    case 'BAD_REQUEST':
    case 'VALIDATION_ERROR':
    case 'INVALID_INPUT':
    case 'DUPLICATE_ENTRY':
    case 'RATE_LIMIT_EXCEEDED':
      return 'warning'
    
    // Error-like codes
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
    case 'NOT_FOUND':
    case 'CONFLICT':
    case 'INTERNAL_ERROR':
    case 'SERVICE_UNAVAILABLE':
    case 'UNKNOWN_ERROR':
    default:
      return 'error'
  }
}

/**
 * Custom hook for creating error-aware async functions
 * Returns a function that automatically handles errors and adds them to global error state
 */
export function useErrorHandler(source?: string) {
  const { addApiError, showError } = useGlobalError()
  
  const handleError = useCallback(async <T>(
    asyncFunction: () => Promise<T>
  ): Promise<T | null> => {
    try {
      return await asyncFunction()
    } catch (error) {
      // Handle API error responses
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error.response as ApiErrorResponse
        if (apiError && !apiError.success && apiError.error) {
          addApiError(apiError, source)
          return null
        }
      }
      
      // Handle generic errors
      if (error instanceof Error) {
        showError(error.message, { source })
      } else {
        showError('An unexpected error occurred', { source })
      }
      
      return null
    }
  }, [addApiError, showError, source])
  
  return { handleError }
}

/**
 * Custom hook for error-aware API calls
 * Automatically adds API errors to global error state
 */
export function useApiCall() {
  const { addApiError, showError } = useGlobalError()
  
  const callApi = useCallback(
    async function<T>(
      apiCall: () => Promise<T>,
      source?: string
    ): Promise<T | null> {
      try {
        return await apiCall()
      } catch (error) {
        // Handle API error responses
        if (error && typeof error === 'object' && 'response' in error) {
          const apiError = error.response as ApiErrorResponse
          if (apiError && !apiError.success && apiError.error) {
            addApiError(apiError, source)
            return null
          }
        }
        
        // Handle generic errors
        if (error instanceof Error) {
          showError(error.message, { source })
        } else {
          showError('An unexpected error occurred', { source })
        }
        
        return null
      }
    },
    [addApiError, showError]
  )
  
  return { callApi }
}