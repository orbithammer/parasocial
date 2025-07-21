// frontend/src/contexts/__tests__/GlobalErrorContext.test.tsx - Version 1.2.0
// Initial unit tests for GlobalErrorContext with comprehensive coverage
// Updated: Fixed test indexing to account for error prepending behavior

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, renderHook } from '@testing-library/react'
import { ReactNode } from 'react'
import { 
  GlobalErrorProvider, 
  useGlobalError, 
  ErrorType, 
  ErrorSeverity, 
} from '../GlobalErrorContext'

// Mock component to test the context hook
function TestComponent() {
  const { 
    errors, 
    isLoading, 
    lastError, 
    addError, 
    clearAllErrors, 
    setLoading, 
    getActiveErrors 
  } = useGlobalError()

  return (
    <div>
      <div data-testid="error-count">{errors.length}</div>
      <div data-testid="loading-state">{isLoading.toString()}</div>
      <div data-testid="last-error">{lastError?.message || 'none'}</div>
      <div data-testid="active-errors">{getActiveErrors().length}</div>
      <button 
        data-testid="add-error" 
        onClick={() => addError({ 
          type: 'VALIDATION_ERROR', 
          message: 'Test error' 
        })}
      >
        Add Error
      </button>
      <button 
        data-testid="set-loading" 
        onClick={() => setLoading(true)}
      >
        Set Loading
      </button>
      <button 
        data-testid="clear-errors" 
        onClick={() => clearAllErrors()}
      >
        Clear Errors
      </button>
    </div>
  )
}

// Test wrapper component with provider
function TestWrapper({ children, maxErrors = 10, defaultAutoHideDuration = 5000 }: {
  children: ReactNode
  maxErrors?: number
  defaultAutoHideDuration?: number
}) {
  return (
    <GlobalErrorProvider 
      maxErrors={maxErrors} 
      defaultAutoHideDuration={defaultAutoHideDuration}
    >
      {children}
    </GlobalErrorProvider>
  )
}

describe('GlobalErrorContext', () => {
  // Setup and cleanup for each test
  beforeEach(() => {
    // Clear any existing timers
    vi.clearAllTimers()
    // Use fake timers for testing auto-hide functionality
    vi.useFakeTimers()
  })

  afterEach(() => {
    // Restore real timers after each test
    vi.useRealTimers()
  })

  describe('useGlobalError hook', () => {
    it('should throw error when used outside provider', () => {
      // Test that hook throws error when used without provider
      expect(() => {
        renderHook(() => useGlobalError())
      }).toThrow('useGlobalError must be used within a GlobalErrorProvider')
    })

    it('should provide context when used within provider', () => {
      // Test that hook provides context when properly wrapped
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      expect(result.current).toBeDefined()
      expect(result.current.errors).toEqual([])
      expect(result.current.isLoading).toBe(false)
      expect(result.current.lastError).toBeNull()
    })
  })

  describe('GlobalErrorProvider', () => {
    it('should render children correctly', () => {
      // Test that provider renders its children
      render(
        <TestWrapper>
          <div data-testid="test-child">Test Child</div>
        </TestWrapper>
      )

      expect(screen.getByTestId('test-child')).toBeInTheDocument()
    })

    it('should initialize with empty error state', () => {
      // Test initial state is correct
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      expect(screen.getByTestId('error-count')).toHaveTextContent('0')
      expect(screen.getByTestId('loading-state')).toHaveTextContent('false')
      expect(screen.getByTestId('last-error')).toHaveTextContent('none')
      expect(screen.getByTestId('active-errors')).toHaveTextContent('0')
    })
  })

  describe('addError functionality', () => {
    it('should add error to state correctly', () => {
      // Test adding a basic error
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      act(() => {
        const errorId = result.current.addError({
          type: 'VALIDATION_ERROR',
          message: 'Test validation error'
        })
        expect(typeof errorId).toBe('string')
      })

      expect(result.current.errors).toHaveLength(1)
      expect(result.current.errors[0].type).toBe('VALIDATION_ERROR')
      expect(result.current.errors[0].message).toBe('Test validation error')
      expect(result.current.errors[0].severity).toBe('warning') // Default for VALIDATION_ERROR
      expect(result.current.lastError?.message).toBe('Test validation error')
    })

    it('should add error with custom severity', () => {
      // Test adding error with custom severity
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.addError({
          type: 'VALIDATION_ERROR',
          message: 'Custom severity error',
          severity: 'critical'
        })
      })

      expect(result.current.errors[0].severity).toBe('critical')
    })

    it('should auto-assign severity based on error type', () => {
      // Test that severity is auto-assigned correctly for different error types
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      const testCases: Array<{ type: ErrorType, expectedSeverity: ErrorSeverity }> = [
        { type: 'VALIDATION_ERROR', expectedSeverity: 'warning' },
        { type: 'UNAUTHORIZED', expectedSeverity: 'error' },
        { type: 'NOT_FOUND', expectedSeverity: 'info' },
        { type: 'INTERNAL_ERROR', expectedSeverity: 'critical' }
      ]

      // Add all errors first
      testCases.forEach((testCase) => {
        act(() => {
          result.current.addError({
            type: testCase.type,
            message: `Test ${testCase.type} error`
          })
        })
      })

      // Check each error - since errors are prepended, we need to check in reverse order
      testCases.forEach((testCase, index) => {
        const errorIndex = testCases.length - 1 - index // Reverse index since newest errors go to front
        expect(result.current.errors[errorIndex].severity).toBe(testCase.expectedSeverity)
        expect(result.current.errors[errorIndex].type).toBe(testCase.type)
      })
    })

    it('should respect maxErrors limit', () => {
      // Test that error limit is enforced
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: (props) => <TestWrapper {...props} maxErrors={3} />
      })

      // Add 5 errors but only 3 should be kept
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.addError({
            type: 'VALIDATION_ERROR',
            message: `Error ${i}`
          })
        }
      })

      expect(result.current.errors).toHaveLength(3)
      // Most recent errors should be kept (since they're prepended)
      expect(result.current.errors[0].message).toBe('Error 4')
      expect(result.current.errors[1].message).toBe('Error 3')
      expect(result.current.errors[2].message).toBe('Error 2')
    })

    it('should auto-hide errors with default duration', () => {
      // Test auto-hide functionality
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: (props) => <TestWrapper {...props} defaultAutoHideDuration={1000} />
      })

      act(() => {
        result.current.addError({
          type: 'VALIDATION_ERROR',
          message: 'Auto-hide test error'
        })
      })

      expect(result.current.errors[0].dismissed).toBe(false)

      // Fast-forward time to trigger auto-hide
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.errors[0].dismissed).toBe(true)
    })

    it('should not auto-hide when autoHide is false', () => {
      // Test that autoHide can be disabled
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: (props) => <TestWrapper {...props} defaultAutoHideDuration={1000} />
      })

      act(() => {
        result.current.addError({
          type: 'VALIDATION_ERROR',
          message: 'No auto-hide error',
          autoHide: false
        })
      })

      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(result.current.errors[0].dismissed).toBe(false)
    })
  })

  describe('removeError functionality', () => {
    it('should remove error by ID', () => {
      // Test removing specific error by ID
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      let errorId: string

      act(() => {
        errorId = result.current.addError({
          type: 'VALIDATION_ERROR',
          message: 'Error to remove'
        })
      })

      expect(result.current.errors).toHaveLength(1)

      act(() => {
        result.current.removeError(errorId)
      })

      expect(result.current.errors).toHaveLength(0)
    })

    it('should not affect other errors when removing one', () => {
      // Test that removing one error doesn't affect others
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      let firstErrorId: string
      let secondErrorId: string

      act(() => {
        firstErrorId = result.current.addError({
          type: 'VALIDATION_ERROR',
          message: 'First error'
        })
        secondErrorId = result.current.addError({
          type: 'UNAUTHORIZED',
          message: 'Second error'
        })
      })

      expect(result.current.errors).toHaveLength(2)

      act(() => {
        result.current.removeError(firstErrorId)
      })

      expect(result.current.errors).toHaveLength(1)
      expect(result.current.errors[0].message).toBe('Second error')
    })
  })

  describe('dismissError functionality', () => {
    it('should mark error as dismissed', () => {
      // Test dismissing error (marking as dismissed but keeping in state)
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      let errorId: string

      act(() => {
        errorId = result.current.addError({
          type: 'VALIDATION_ERROR',
          message: 'Error to dismiss'
        })
      })

      expect(result.current.errors[0].dismissed).toBe(false)

      act(() => {
        result.current.dismissError(errorId)
      })

      expect(result.current.errors).toHaveLength(1) // Still in state
      expect(result.current.errors[0].dismissed).toBe(true) // But marked as dismissed
    })
  })

  describe('clearAllErrors functionality', () => {
    it('should clear all errors and reset lastError', () => {
      // Test clearing all errors at once
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.addError({
          type: 'VALIDATION_ERROR',
          message: 'First error'
        })
        result.current.addError({
          type: 'UNAUTHORIZED',
          message: 'Second error'
        })
      })

      expect(result.current.errors).toHaveLength(2)
      expect(result.current.lastError).not.toBeNull()

      act(() => {
        result.current.clearAllErrors()
      })

      expect(result.current.errors).toHaveLength(0)
      expect(result.current.lastError).toBeNull()
    })
  })

  describe('setLoading functionality', () => {
    it('should update loading state', () => {
      // Test loading state management
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

  describe('getErrorsByType functionality', () => {
    it('should filter errors by type', () => {
      // Test filtering errors by type
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.addError({
          type: 'VALIDATION_ERROR',
          message: 'Validation error'
        })
        result.current.addError({
          type: 'UNAUTHORIZED',
          message: 'Auth error'
        })
        result.current.addError({
          type: 'VALIDATION_ERROR',
          message: 'Another validation error'
        })
      })

      const validationErrors = result.current.getErrorsByType('VALIDATION_ERROR')
      const authErrors = result.current.getErrorsByType('UNAUTHORIZED')
      const notFoundErrors = result.current.getErrorsByType('NOT_FOUND')

      expect(validationErrors).toHaveLength(2)
      expect(authErrors).toHaveLength(1)
      expect(notFoundErrors).toHaveLength(0)
    })
  })

  describe('getActiveErrors functionality', () => {
    it('should return only non-dismissed errors', () => {
      // Test filtering active (non-dismissed) errors
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      let firstErrorId: string
      let secondErrorId: string

      act(() => {
        firstErrorId = result.current.addError({
          type: 'VALIDATION_ERROR',
          message: 'Active error'
        })
        secondErrorId = result.current.addError({
          type: 'UNAUTHORIZED',
          message: 'Dismissed error'
        })
      })

      // Dismiss second error (which is at index 0 since it was added last)
      act(() => {
        result.current.dismissError(secondErrorId)
      })

      const activeErrors = result.current.getActiveErrors()
      expect(activeErrors).toHaveLength(1)
      expect(activeErrors[0].message).toBe('Active error')
    })
  })

  describe('handleApiError functionality', () => {
    it('should handle backend API error response format', () => {
      // Test handling structured backend error responses
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      const apiErrorResponse = {
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
        const errorId = result.current.handleApiError(apiErrorResponse)
        expect(typeof errorId).toBe('string')
      })

      expect(result.current.errors).toHaveLength(1)
      expect(result.current.errors[0].type).toBe('VALIDATION_ERROR')
      expect(result.current.errors[0].message).toBe('Invalid input data')
      expect(result.current.errors[0].details).toHaveLength(2)
    })

    it('should handle HTTP status code errors', () => {
      // Test handling HTTP status code based errors
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      const httpErrorResponse = {
        status: 401
      }

      act(() => {
        result.current.handleApiError(httpErrorResponse)
      })

      expect(result.current.errors[0].type).toBe('UNAUTHORIZED')
      expect(result.current.errors[0].message).toBe('Authentication required')
    })

    it('should handle network errors', () => {
      // Test handling network/fetch errors
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

      expect(result.current.errors[0].type).toBe('NETWORK_ERROR')
      expect(result.current.errors[0].message).toBe('Network connection failed')
    })

    it('should use fallback message for unknown errors', () => {
      // Test fallback message for unrecognized errors
      const { result } = renderHook(() => useGlobalError(), {
        wrapper: TestWrapper
      })

      act(() => {
        result.current.handleApiError(null, 'Custom fallback message')
      })

      expect(result.current.errors[0].type).toBe('UNKNOWN_ERROR')
      expect(result.current.errors[0].message).toBe('Custom fallback message')
    })
  })
})

// frontend/src/contexts/__tests__/GlobalErrorContext.test.tsx - Version 1.2.0
// Initial unit tests for GlobalErrorContext with comprehensive coverage
// Updated: Fixed test indexing to account for error prepending behavior