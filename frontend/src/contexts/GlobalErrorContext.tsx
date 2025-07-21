// frontend/src/context/GlobalErrorContext.tsx - Version 1.0.0
// Initial global error context for centralized error handling and user notifications
// Created: Frontend error management matching backend error response structure

'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

/**
 * Error severity levels for different types of errors
 * Used to determine UI presentation and user action requirements
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

/**
 * Error types matching backend error codes
 * Provides semantic categorization for different error scenarios
 */
export type ErrorType = 
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED' 
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

/**
 * Error details interface matching backend validation error structure
 * Used for form validation and input-specific error messages
 */
export interface ErrorDetails {
  field?: string
  message: string
  code?: string
}

/**
 * Application error interface
 * Standardized error structure used throughout the frontend
 */
export interface AppError {
  id: string
  type: ErrorType
  message: string
  severity: ErrorSeverity
  details?: ErrorDetails[]
  timestamp: Date
  dismissed: boolean
  autoHide?: boolean
  duration?: number // milliseconds
}

/**
 * Global error state interface
 * Manages the collection of active errors and loading states
 */
export interface ErrorState {
  errors: AppError[]
  isLoading: boolean
  lastError: AppError | null
}

/**
 * Context methods interface for error management
 * Provides functions for adding, removing, and handling errors
 */
export interface GlobalErrorContextType extends ErrorState {
  addError: (error: Omit<AppError, 'id' | 'timestamp' | 'dismissed' | 'severity'> & { severity?: ErrorSeverity }) => string
  removeError: (errorId: string) => void
  dismissError: (errorId: string) => void
  clearAllErrors: () => void
  handleApiError: (response: any, fallbackMessage?: string) => string
  setLoading: (loading: boolean) => void
  getErrorsByType: (type: ErrorType) => AppError[]
  getActiveErrors: () => AppError[]
}

// Create the global error context
const GlobalErrorContext = createContext<GlobalErrorContextType | null>(null)

/**
 * Custom hook to use the global error context with type safety
 * Throws error if used outside of GlobalErrorProvider
 */
export function useGlobalError(): GlobalErrorContextType {
  const context = useContext(GlobalErrorContext)
  if (!context) {
    throw new Error('useGlobalError must be used within a GlobalErrorProvider')
  }
  return context
}

// Provider component props interface
interface GlobalErrorProviderProps {
  children: ReactNode
  maxErrors?: number // Maximum number of errors to keep in state
  defaultAutoHideDuration?: number // Default duration for auto-hiding errors
}

/**
 * Generate unique error ID for tracking
 * Uses timestamp and random string for uniqueness
 */
function generateErrorId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `error_${timestamp}_${random}`
}

/**
 * Map error type to severity level
 * Provides sensible defaults for error presentation
 */
function getErrorSeverity(type: ErrorType): ErrorSeverity {
  switch (type) {
    case 'VALIDATION_ERROR':
      return 'warning'
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
      return 'error'
    case 'NOT_FOUND':
      return 'info'
    case 'CONFLICT':
      return 'warning'
    case 'RATE_LIMIT_EXCEEDED':
      return 'warning'
    case 'INTERNAL_ERROR':
    case 'NETWORK_ERROR':
      return 'critical'
    case 'UNKNOWN_ERROR':
    default:
      return 'error'
  }
}

/**
 * Global error provider component that manages application-wide error state
 * Handles error storage, auto-hiding, and provides error management functions
 * Integrates with backend error response format for seamless error handling
 */
export function GlobalErrorProvider({ 
  children, 
  maxErrors = 10,
  defaultAutoHideDuration = 5000 
}: GlobalErrorProviderProps) {
  // Error state management
  const [errors, setErrors] = useState<AppError[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastError, setLastError] = useState<AppError | null>(null)

  /**
   * Add new error to the global error state
   * Automatically assigns ID, timestamp, and manages error limits
   */
  const addError = useCallback((errorData: Omit<AppError, 'id' | 'timestamp' | 'dismissed' | 'severity'> & { severity?: ErrorSeverity }): string => {
    const errorId = generateErrorId()
    const newError: AppError = {
      ...errorData,
      id: errorId,
      timestamp: new Date(),
      dismissed: false,
      severity: errorData.severity || getErrorSeverity(errorData.type)
    }

    setErrors(prev => {
      // Add new error and limit total errors
      const updated = [newError, ...prev].slice(0, maxErrors)
      return updated
    })

    setLastError(newError)

    // Auto-hide error if configured
    if (newError.autoHide !== false) {
      const duration = newError.duration || defaultAutoHideDuration
      setTimeout(() => {
        dismissError(errorId)
      }, duration)
    }

    return errorId
  }, [maxErrors, defaultAutoHideDuration])

  /**
   * Remove error completely from state
   * Used for permanent error removal
   */
  const removeError = useCallback((errorId: string) => {
    setErrors(prev => prev.filter(error => error.id !== errorId))
  }, [])

  /**
   * Mark error as dismissed but keep in state
   * Used for user-initiated error dismissal
   */
  const dismissError = useCallback((errorId: string) => {
    setErrors(prev => 
      prev.map(error => 
        error.id === errorId 
          ? { ...error, dismissed: true }
          : error
      )
    )
  }, [])

  /**
   * Clear all errors from state
   * Used for bulk error management or page navigation
   */
  const clearAllErrors = useCallback(() => {
    setErrors([])
    setLastError(null)
  }, [])

  /**
   * Handle API error responses from backend
   * Parses backend error format and creates appropriate frontend errors
   */
  const handleApiError = useCallback((response: any, fallbackMessage = 'An unexpected error occurred'): string => {
    let errorType: ErrorType = 'UNKNOWN_ERROR'
    let message = fallbackMessage
    let details: ErrorDetails[] | undefined

    // Handle backend API error response format
    if (response?.error) {
      const { code, message: apiMessage, details: apiDetails } = response.error

      // Map backend error codes to frontend types
      if (code) {
        errorType = code as ErrorType
      }

      if (apiMessage) {
        message = apiMessage
      }

      // Handle validation error details
      if (apiDetails && Array.isArray(apiDetails)) {
        details = apiDetails.map((detail: any) => ({
          field: detail.field || detail.path?.[0],
          message: detail.message,
          code: detail.code
        }))
      }
    }
    // Handle HTTP error responses
    else if (response?.status) {
      const status = response.status
      switch (status) {
        case 400:
          errorType = 'VALIDATION_ERROR'
          message = 'Invalid request data'
          break
        case 401:
          errorType = 'UNAUTHORIZED'
          message = 'Authentication required'
          break
        case 403:
          errorType = 'FORBIDDEN'
          message = 'Access denied'
          break
        case 404:
          errorType = 'NOT_FOUND'
          message = 'Resource not found'
          break
        case 409:
          errorType = 'CONFLICT'
          message = 'Resource conflict'
          break
        case 429:
          errorType = 'RATE_LIMIT_EXCEEDED'
          message = 'Too many requests'
          break
        case 500:
        default:
          errorType = 'INTERNAL_ERROR'
          message = 'Server error occurred'
          break
      }
    }
    // Handle network errors
    else if (response?.name === 'TypeError' || response?.message?.includes('fetch')) {
      errorType = 'NETWORK_ERROR'
      message = 'Network connection failed'
    }

    return addError({
      type: errorType,
      message,
      details,
      autoHide: !['INTERNAL_ERROR', 'NETWORK_ERROR', 'UNKNOWN_ERROR'].includes(errorType)
    })
  }, [addError])

  /**
   * Get errors filtered by type
   * Useful for displaying specific types of errors
   */
  const getErrorsByType = useCallback((type: ErrorType): AppError[] => {
    return errors.filter(error => error.type === type)
  }, [errors])

  /**
   * Get only active (non-dismissed) errors
   * Used for UI display of current errors
   */
  const getActiveErrors = useCallback((): AppError[] => {
    return errors.filter(error => !error.dismissed)
  }, [errors])

  // Context value with all state and methods
  const contextValue: GlobalErrorContextType = {
    errors,
    isLoading,
    lastError,
    addError,
    removeError,
    dismissError,
    clearAllErrors,
    handleApiError,
    setLoading: setIsLoading,
    getErrorsByType,
    getActiveErrors
  }

  return (
    <GlobalErrorContext.Provider value={contextValue}>
      {children}
    </GlobalErrorContext.Provider>
  )
}