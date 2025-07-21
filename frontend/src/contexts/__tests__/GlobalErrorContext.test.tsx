// frontend/src/context/__tests__/GlobalErrorContext.test.tsx - Version 1.0.0
// Unit tests for GlobalErrorContext provider and hook functionality
// Created: Comprehensive test suite covering all error management features

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, renderHook, act } from '@testing-library/react'
import { ReactNode } from 'react'
import {
  GlobalErrorProvider,
  useGlobalError,
  ErrorType,
  ErrorSeverity,
  AppError,
  ErrorDetails
} from '../GlobalErrorContext'

/**
 * Mock timer functions for testing auto-hide functionality
 * Allows us to control timing in tests without waiting for real timeouts
 */
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

/**
 * Test wrapper component that provides GlobalErrorContext
 * Used to wrap components that need access to the error context
 */
interface TestWrapperProps {
  children: ReactNode
  maxErrors?: number
  defaultAutoHideDuration?: number
}

function TestWrapper({ children, maxErrors, defaultAutoHideDuration }: TestWrapperProps) {
  return (
    <GlobalErrorProvider 
      maxErrors={maxErrors} 
      defaultAutoHideDuration={defaultAutoHideDuration}
    >
      {children}
    </GlobalErrorProvider>
  )
}

/**
 * Helper function to create test error objects
 * Provides consistent test data with sensible defaults
 */
function createTestError(overrides: Partial<AppError> = {}): Omit<AppError, 'id' | 'timestamp' | 'dismissed'> {
  return {
    type: 'VALIDATION_ERROR',
    message: 'Test error message',
    severity: 'warning',
    ...overrides
  }
}

describe('GlobalErrorContext', () => {
  
  describe('Provider Setup', () => {
    /**
     * Test that the provider renders children correctly
     * Ensures basic provider functionality works
     */
    it('should render children without errors', () => {
      const TestChild = () => <div data-testid="test-child">Test Content</div>
      
      const { getByTestId } = render(
        <TestWrapper>
          <TestChild />
        </TestWrapper>
      )
      
      expect(getByTestId('test-child')).toBeInTheDocument()
    })

    /**
     * Test that useGlobalError throws error when used outside provider
     * Ensures proper context usage enforcement
     */
    it('should throw error when useGlobalError is used outside provider', () => {
      // Suppress console.error for this test since we expect an error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        renderHook(() => useGlobalError())
      }).toThrow('useGlobalError must be used within a GlobalErrorProvider')
      
      consoleSpy.mockRestore()
    })
  })

  describe('Initial State', () => {
    /**
     * Test that the context initializes with correct default state
     * Verifies empty error state and proper initial values
     */
    it('should initialize with empty error state', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      expect(result.current.errors).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.lastError).toBeNull()
      expect(result.current.getActiveErrors()).toEqual([])
    })
  })

  describe('Adding Errors', () => {
    /**
     * Test that addError creates error with proper structure
     * Verifies error creation and ID generation
     */
    it('should add error to state with generated ID and timestamp', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      const testError = createTestError({
        message: 'Test validation error'
      })

      let errorId: string
      act(() => {
        errorId = result.current.addError(testError)
      })

      expect(result.current.errors).toHaveLength(1)
      expect(result.current.errors[0]).toMatchObject({
        ...testError,
        id: errorId!,
        dismissed: false
      })
      expect(result.current.errors[0].timestamp).toBeInstanceOf(Date)
      expect(result.current.lastError).toEqual(result.current.errors[0])
    })

    /**
     * Test automatic severity assignment based on error type
     * Ensures proper severity mapping for different error types
     */
    it('should automatically assign severity based on error type', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      const testCases: Array<{ type: ErrorType; expectedSeverity: ErrorSeverity }> = [
        { type: 'VALIDATION_ERROR', expectedSeverity: 'warning' },
        { type: 'UNAUTHORIZED', expectedSeverity: 'error' },
        { type: 'NOT_FOUND', expectedSeverity: 'info' },
        { type: 'INTERNAL_ERROR', expectedSeverity: 'critical' },
        { type: 'NETWORK_ERROR', expectedSeverity: 'critical' }
      ]

      testCases.forEach(({ type, expectedSeverity }) => {
        act(() => {
          result.current.addError({
            type,
            message: `Test ${type} error`
          })
        })
      })

      // Errors are added to front of array (newest first), so reverse the expected order
      testCases.reverse().forEach(({ expectedSeverity }, index) => {
        expect(result.current.errors[index].severity).toBe(expectedSeverity)
      })
    })

    /**
     * Test that custom severity overrides automatic assignment
     * Verifies manual severity specification works correctly
     */
    it('should use custom severity when provided', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.addError({
          type: 'VALIDATION_ERROR', // would normally be 'warning'
          message: 'Critical validation error',
          severity: 'critical'
        })
      })

      expect(result.current.errors[0].severity).toBe('critical')
    })

    /**
     * Test that error limit is enforced correctly
     * Ensures old errors are removed when limit is exceeded
     */
    it('should enforce maximum error limit', () => {
      const maxErrors = 3
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: (props) => <TestWrapper {...props} maxErrors={maxErrors} />
      })

      // Add more errors than the limit
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.addError(createTestError({
            message: `Error ${i}`
          }))
        })
      }

      expect(result.current.errors).toHaveLength(maxErrors)
      // Most recent errors should be kept (newest first)
      expect(result.current.errors[0].message).toBe('Error 4')
      expect(result.current.errors[1].message).toBe('Error 3')
      expect(result.current.errors[2].message).toBe('Error 2')
    })
  })

  describe('Auto-hide Functionality', () => {
    /**
     * Test that errors auto-hide after specified duration
     * Verifies timeout-based error dismissal
     */
    it('should auto-hide errors after default duration', async () => {
      const autoHideDuration = 1000
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: (props) => <TestWrapper {...props} defaultAutoHideDuration={autoHideDuration} />
      })

      act(() => {
        result.current.addError(createTestError({
          message: 'Auto-hide error'
        }))
      })

      expect(result.current.getActiveErrors()).toHaveLength(1)

      // Fast-forward time past auto-hide duration
      act(() => {
        vi.advanceTimersByTime(autoHideDuration + 100)
      })

      // Check immediately after advancing timers
      expect(result.current.getActiveErrors()).toHaveLength(0)
    })

    /**
     * Test that critical errors don't auto-hide
     * Ensures important errors remain visible
     */
    it('should not auto-hide critical system errors', async () => {
      const autoHideDuration = 1000
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: (props) => <TestWrapper {...props} defaultAutoHideDuration={autoHideDuration} />
      })

      // Use handleApiError to simulate API responses that would generate these error types
      const criticalResponses = [
        { status: 500 }, // INTERNAL_ERROR
        { name: 'TypeError', message: 'Failed to fetch' }, // NETWORK_ERROR
        { someUnknownProperty: 'value' } // UNKNOWN_ERROR
      ]
      
      criticalResponses.forEach(response => {
        act(() => {
          result.current.handleApiError(response)
        })
      })

      expect(result.current.getActiveErrors()).toHaveLength(3)

      // Fast-forward time past auto-hide duration
      act(() => {
        vi.advanceTimersByTime(autoHideDuration + 100)
      })

      // Critical errors should still be active
      expect(result.current.getActiveErrors()).toHaveLength(3)
    })

    /**
     * Test custom auto-hide duration on individual errors
     * Verifies per-error duration configuration
     */
    it('should respect custom duration for individual errors', async () => {
      const customDuration = 2000
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.addError({
          ...createTestError(),
          duration: customDuration
        })
      })

      expect(result.current.getActiveErrors()).toHaveLength(1)

      // Fast-forward to just before custom duration
      act(() => {
        vi.advanceTimersByTime(customDuration - 100)
      })

      expect(result.current.getActiveErrors()).toHaveLength(1)

      // Fast-forward past custom duration
      act(() => {
        vi.advanceTimersByTime(200)
      })

      // Check immediately after advancing timers
      expect(result.current.getActiveErrors()).toHaveLength(0)
    })
  })

  describe('Error Management', () => {
    /**
     * Test dismissing individual errors
     * Verifies manual error dismissal functionality
     */
    it('should dismiss individual errors', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      let errorId: string
      act(() => {
        errorId = result.current.addError(createTestError())
      })

      expect(result.current.getActiveErrors()).toHaveLength(1)

      act(() => {
        result.current.dismissError(errorId!)
      })

      expect(result.current.getActiveErrors()).toHaveLength(0)
      expect(result.current.errors).toHaveLength(1) // Still in state but dismissed
      expect(result.current.errors[0].dismissed).toBe(true)
    })

    /**
     * Test removing errors completely from state
     * Verifies permanent error removal
     */
    it('should remove errors from state completely', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      let errorId: string
      act(() => {
        errorId = result.current.addError(createTestError())
      })

      expect(result.current.errors).toHaveLength(1)

      act(() => {
        result.current.removeError(errorId!)
      })

      expect(result.current.errors).toHaveLength(0)
    })

    /**
     * Test clearing all errors at once
     * Verifies bulk error management
     */
    it('should clear all errors from state', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      // Add multiple errors
      act(() => {
        result.current.addError(createTestError({ message: 'Error 1' }))
        result.current.addError(createTestError({ message: 'Error 2' }))
        result.current.addError(createTestError({ message: 'Error 3' }))
      })

      expect(result.current.errors).toHaveLength(3)

      act(() => {
        result.current.clearAllErrors()
      })

      expect(result.current.errors).toHaveLength(0)
      expect(result.current.lastError).toBeNull()
    })
  })

  describe('Loading State Management', () => {
    /**
     * Test loading state updates
     * Verifies global loading state management
     */
    it('should manage loading state correctly', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      expect(result.current.isLoading).toBe(false)

      act(() => {
        result.current.setLoading(true)
      })

      expect(result.current.isLoading).toBe(true)

      act(() => {
        result.current.setLoading(false)
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Error Filtering', () => {
    /**
     * Test filtering errors by type
     * Verifies error categorization functionality
     */
    it('should filter errors by type correctly', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.addError({ type: 'VALIDATION_ERROR', message: 'Validation 1' })
        result.current.addError({ type: 'UNAUTHORIZED', message: 'Auth error' })
        result.current.addError({ type: 'VALIDATION_ERROR', message: 'Validation 2' })
      })

      const validationErrors = result.current.getErrorsByType('VALIDATION_ERROR')
      const authErrors = result.current.getErrorsByType('UNAUTHORIZED')
      const notFoundErrors = result.current.getErrorsByType('NOT_FOUND')

      expect(validationErrors).toHaveLength(2)
      expect(authErrors).toHaveLength(1)
      expect(notFoundErrors).toHaveLength(0)
    })

    /**
     * Test getting only active (non-dismissed) errors
     * Verifies active error filtering
     */
    it('should return only active errors', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      let errorId1: string, errorId2: string, errorId3: string

      act(() => {
        errorId1 = result.current.addError(createTestError({ message: 'Error 1' }))
        errorId2 = result.current.addError(createTestError({ message: 'Error 2' }))
        errorId3 = result.current.addError(createTestError({ message: 'Error 3' }))
      })

      expect(result.current.getActiveErrors()).toHaveLength(3)

      // Dismiss one error
      act(() => {
        result.current.dismissError(errorId2!)
      })

      const activeErrors = result.current.getActiveErrors()
      expect(activeErrors).toHaveLength(2)
      expect(activeErrors.map(e => e.message)).toEqual(['Error 3', 'Error 1'])
    })
  })

  describe('API Error Handling', () => {
    /**
     * Test handling backend API error responses
     * Verifies integration with backend error format
     */
    it('should handle backend API error responses correctly', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      const backendErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: [
            { field: 'email', message: 'Email is required' },
            { field: 'password', message: 'Password too short' }
          ]
        }
      }

      act(() => {
        result.current.handleApiError(backendErrorResponse)
      })

      expect(result.current.errors).toHaveLength(1)
      
      const error = result.current.errors[0]
      expect(error.type).toBe('VALIDATION_ERROR')
      expect(error.message).toBe('Invalid input data')
      expect(error.details).toHaveLength(2)
      expect(error.details![0]).toMatchObject({
        field: 'email',
        message: 'Email is required'
      })
    })

    /**
     * Test handling HTTP status code responses
     * Verifies mapping of HTTP status to error types
     */
    it('should handle HTTP status code responses', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      const httpResponses = [
        { status: 400, expectedType: 'VALIDATION_ERROR', expectedMessage: 'Invalid request data' },
        { status: 401, expectedType: 'UNAUTHORIZED', expectedMessage: 'Authentication required' },
        { status: 403, expectedType: 'FORBIDDEN', expectedMessage: 'Access denied' },
        { status: 404, expectedType: 'NOT_FOUND', expectedMessage: 'Resource not found' },
        { status: 409, expectedType: 'CONFLICT', expectedMessage: 'Resource conflict' },
        { status: 429, expectedType: 'RATE_LIMIT_EXCEEDED', expectedMessage: 'Too many requests' },
        { status: 500, expectedType: 'INTERNAL_ERROR', expectedMessage: 'Server error occurred' }
      ]

      httpResponses.forEach(({ status, expectedType, expectedMessage }) => {
        act(() => {
          result.current.handleApiError({ status })
        })
      })

      expect(result.current.errors).toHaveLength(httpResponses.length)
      
      // Errors are added to front of array (newest first), so reverse the expected order
      httpResponses.reverse().forEach(({ expectedType, expectedMessage }, index) => {
        expect(result.current.errors[index].type).toBe(expectedType)
        expect(result.current.errors[index].message).toBe(expectedMessage)
      })
    })

    /**
     * Test handling network errors
     * Verifies network error detection and handling
     */
    it('should handle network errors correctly', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      const networkError = {
        name: 'TypeError',
        message: 'Failed to fetch'
      }

      act(() => {
        result.current.handleApiError(networkError)
      })

      const error = result.current.errors[0]
      expect(error.type).toBe('NETWORK_ERROR')
      expect(error.message).toBe('Network connection failed')
    })

    /**
     * Test fallback error handling for unknown errors
     * Verifies graceful handling of unexpected error formats
     */
    it('should use fallback message for unknown error formats', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      const unknownError = { someRandomProperty: 'value' }
      const customFallback = 'Custom fallback message'

      act(() => {
        result.current.handleApiError(unknownError, customFallback)
      })

      const error = result.current.errors[0]
      expect(error.type).toBe('UNKNOWN_ERROR')
      expect(error.message).toBe(customFallback)
    })
  })

  describe('Edge Cases', () => {
    /**
     * Test that dismissing non-existent error doesn't cause issues
     * Ensures robustness against invalid operations
     */
    it('should handle dismissing non-existent errors gracefully', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      expect(() => {
        act(() => {
          result.current.dismissError('non-existent-id')
        })
      }).not.toThrow()

      expect(result.current.errors).toHaveLength(0)
    })

    /**
     * Test that removing non-existent error doesn't cause issues
     * Ensures robustness against invalid operations
     */
    it('should handle removing non-existent errors gracefully', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      expect(() => {
        act(() => {
          result.current.removeError('non-existent-id')
        })
      }).not.toThrow()

      expect(result.current.errors).toHaveLength(0)
    })

    /**
     * Test error handling with minimal data
     * Verifies handling of incomplete error objects
     */
    it('should handle errors with minimal required data', () => {
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.addError({
          type: 'UNKNOWN_ERROR',
          message: 'Minimal error'
        })
      })

      const error = result.current.errors[0]
      expect(error.type).toBe('UNKNOWN_ERROR')
      expect(error.message).toBe('Minimal error')
      expect(error.severity).toBe('error') // Auto-assigned
      expect(error.details).toBeUndefined()
    })
  })
})