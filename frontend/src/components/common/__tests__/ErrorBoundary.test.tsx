// frontend/src/components/common/__tests__/ErrorBoundary.test.tsx
// Version: 2.0.0
// Updated tests to match new ErrorBoundary API with separated fallback props

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ErrorBoundary, { ErrorBoundaryWrapper } from '../ErrorBoundary'

// Mock component that throws an error when shouldThrow is true
interface ThrowingComponentProps {
  shouldThrow?: boolean
  errorMessage?: string
}

function ThrowingComponent({ shouldThrow = false, errorMessage = 'Test error' }: ThrowingComponentProps) {
  if (shouldThrow) {
    throw new Error(errorMessage)
  }
  return <div data-testid="working-component">Component is working</div>
}

// Test helper to suppress console.error during error boundary tests
function suppressConsoleError() {
  const originalError = console.error
  console.error = vi.fn()
  return () => {
    console.error = originalError
  }
}

describe('ErrorBoundary Component', () => {
  let restoreConsole: () => void
  
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    restoreConsole = suppressConsoleError()
  })
  
  afterEach(() => {
    restoreConsole()
    vi.clearAllMocks()
  })

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      )
      
      expect(screen.getByTestId('working-component')).toBeInTheDocument()
      expect(screen.getByText('Component is working')).toBeInTheDocument()
    })

    it('should not show error UI when component renders successfully', () => {
      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      )
      
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
      expect(screen.getByText('Normal content')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should catch errors and display default fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorMessage="Component crashed" />
        </ErrorBoundary>
      )
      
      // Should show default error UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/We apologize for the inconvenience/)).toBeInTheDocument()
      
      // Should not show the original component
      expect(screen.queryByTestId('working-component')).not.toBeInTheDocument()
    })

    it('should display custom static fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom Error UI</div>
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
      
      // Should not show default error UI
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('should use fallbackRender function when provided', () => {
      const fallbackRender = vi.fn((error: Error, errorInfo: React.ErrorInfo) => (
        <div data-testid="function-fallback">
          Function fallback: {error.message}
        </div>
      ))
      
      render(
        <ErrorBoundary fallbackRender={fallbackRender}>
          <ThrowingComponent shouldThrow={true} errorMessage="Function fallback test" />
        </ErrorBoundary>
      )
      
      // Should call the fallbackRender function
      expect(fallbackRender).toHaveBeenCalledTimes(1)
      expect(fallbackRender).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Function fallback test'
        }),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      )
      
      // Should render the function's output
      expect(screen.getByTestId('function-fallback')).toBeInTheDocument()
      expect(screen.getByText('Function fallback: Function fallback test')).toBeInTheDocument()
    })

    it('should prioritize fallbackRender over static fallback', () => {
      const staticFallback = <div data-testid="static-fallback">Static Fallback</div>
      const fallbackRender = vi.fn(() => (
        <div data-testid="function-fallback">Function Fallback</div>
      ))
      
      render(
        <ErrorBoundary 
          fallback={staticFallback}
          fallbackRender={fallbackRender}
        >
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      
      // Should render function fallback, not static
      expect(screen.getByTestId('function-fallback')).toBeInTheDocument()
      expect(screen.queryByTestId('static-fallback')).not.toBeInTheDocument()
      expect(fallbackRender).toHaveBeenCalledTimes(1)
    })

    it('should call onError callback when error occurs', () => {
      const onErrorMock = vi.fn()
      
      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowingComponent shouldThrow={true} errorMessage="Callback test error" />
        </ErrorBoundary>
      )
      
      expect(onErrorMock).toHaveBeenCalledTimes(1)
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Callback test error'
        }),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      )
    })
  })

  describe('ErrorBoundaryWrapper Component', () => {
    it('should render with default props', () => {
      render(
        <ErrorBoundaryWrapper>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundaryWrapper>
      )
      
      expect(screen.getByTestId('working-component')).toBeInTheDocument()
    })

    it('should handle errors with wrapper', () => {
      const onErrorMock = vi.fn()
      
      render(
        <ErrorBoundaryWrapper onError={onErrorMock}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundaryWrapper>
      )
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(onErrorMock).toHaveBeenCalledTimes(1)
    })

    it('should use custom static fallback in wrapper', () => {
      const customFallback = <div data-testid="wrapper-fallback">Wrapper Error</div>
      
      render(
        <ErrorBoundaryWrapper fallback={customFallback}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundaryWrapper>
      )
      
      expect(screen.getByTestId('wrapper-fallback')).toBeInTheDocument()
      expect(screen.getByText('Wrapper Error')).toBeInTheDocument()
    })

    it('should use fallbackRender function in wrapper', () => {
      const fallbackRender = vi.fn(() => (
        <div data-testid="wrapper-function-fallback">Wrapper Function Error</div>
      ))
      
      render(
        <ErrorBoundaryWrapper fallbackRender={fallbackRender}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundaryWrapper>
      )
      
      expect(screen.getByTestId('wrapper-function-fallback')).toBeInTheDocument()
      expect(fallbackRender).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for error state', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      
      // Check for proper ARIA attributes
      const errorAlert = screen.getByRole('alert')
      expect(errorAlert).toBeInTheDocument()
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive')
      
      // Check for proper heading structure
      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Something went wrong')
    })
  })
})

// frontend/src/components/common/__tests__/ErrorBoundary.test.tsx
// Version: 2.0.0
// Updated tests to match new ErrorBoundary API with separated fallback props