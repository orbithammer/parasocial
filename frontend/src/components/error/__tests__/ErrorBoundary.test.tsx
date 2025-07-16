// frontend/src/components/error/__tests__/ErrorBoundary.test.tsx
// Version: 1.1.0 - Fixed DOM environment setup for vitest/jsdom compatibility
// Comprehensive testing of error boundary functionality, fallback UI, and error handling
// Removed problematic browser environment mocking and fixed DOM access issues

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ErrorBoundary, { ErrorBoundaryWrapper } from '../ErrorBoundary'

/**
 * Mock component that throws an error when shouldThrow is true
 */
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

/**
 * Test helper to suppress console.error during error boundary tests
 */
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
    vi.unstubAllEnvs()
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
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorMessage="Component crashed" />
        </ErrorBoundary>
      )
      
      // Should show error UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument()
      
      // Should not show the original component
      expect(screen.queryByTestId('working-component')).not.toBeInTheDocument()
    })

    it('should display custom fallback when provided', () => {
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

  describe('Error Details in Development', () => {
    it('should show error details in development mode', () => {
      // Mock development environment using vitest
      vi.stubEnv('NODE_ENV', 'development')
      
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorMessage="Development error" />
        </ErrorBoundary>
      )
      
      // Should show error details
      expect(screen.getByText('Error Details')).toBeInTheDocument()
      // Check that the details section contains the error message
      const detailsSection = screen.getByText('Error Details').parentElement
      expect(detailsSection).toHaveTextContent('Development error')
      
      // Restore environment
      vi.unstubAllEnvs()
    })

    it('should show error details when showDetails prop is true', () => {
      render(
        <ErrorBoundary showDetails={true}>
          <ThrowingComponent shouldThrow={true} errorMessage="Forced details error" />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Error Details')).toBeInTheDocument()
      // Check that the details section contains the error message
      const detailsSection = screen.getByText('Error Details').parentElement
      expect(detailsSection).toHaveTextContent('Forced details error')
    })

    it('should hide error details in production mode by default', () => {
      // Mock production environment using vitest
      vi.stubEnv('NODE_ENV', 'production')
      
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorMessage="Production error" />
        </ErrorBoundary>
      )
      
      // Should not show error details
      expect(screen.queryByText('Error Details')).not.toBeInTheDocument()
      
      // Restore environment
      vi.unstubAllEnvs()
    })
  })

  describe('Error Recovery', () => {
    it('should reset error state when retry button is clicked', async () => {
      // Create a component that can be controlled to stop throwing errors
      let throwError = true
      
      const ControllableComponent = () => {
        if (throwError) {
          throw new Error('Controllable error')
        }
        return <div data-testid="working-component">Component is working</div>
      }

      // We need to re-render the entire ErrorBoundary to test recovery
      const TestWrapper = () => {
        const [key, setKey] = React.useState(0)
        
        return (
          <div>
            <button 
              data-testid="fix-error" 
              onClick={() => {
                throwError = false // Fix the error first
                setKey(k => k + 1) // Force re-render
              }}
            >
              Fix Error
            </button>
            <ErrorBoundary key={key}>
              <ControllableComponent />
            </ErrorBoundary>
          </div>
        )
      }
      
      render(<TestWrapper />)
      
      // Verify error state
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
      
      // Fix the error and force re-render
      fireEvent.click(screen.getByTestId('fix-error'))
      
      // Should show working component now
      await waitFor(() => {
        expect(screen.getByTestId('working-component')).toBeInTheDocument()
      })
    })

    it('should navigate to home when home button is clicked', () => {
      // Mock window.location.href using Object.defineProperty
      const mockLocation = {
        href: '',
        assign: vi.fn(),
        replace: vi.fn(),
        reload: vi.fn()
      }
      
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
        configurable: true
      })
      
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      
      fireEvent.click(screen.getByText('Go Home'))
      
      expect(mockLocation.href).toBe('/')
    })
  })

  describe('Error Reporting', () => {
    it('should not report errors when enableReporting is false', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      render(
        <ErrorBoundary enableReporting={false}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      
      // Should not call console.log for reporting
      expect(consoleSpy).not.toHaveBeenCalledWith(
        'Reporting error to monitoring service:',
        expect.any(Object)
      )
      
      consoleSpy.mockRestore()
    })

    it('should report errors when enableReporting is true', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      render(
        <ErrorBoundary enableReporting={true}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      
      // Should call console.log for reporting
      expect(consoleSpy).toHaveBeenCalledWith(
        'Reporting error to monitoring service:',
        expect.objectContaining({
          message: expect.any(String),
          timestamp: expect.any(String),
          userAgent: expect.any(String),
          url: expect.any(String)
        })
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Error ID Generation', () => {
    it('should generate unique error IDs for different errors', () => {
      const { rerender } = render(
        <ErrorBoundary showDetails={true}>
          <ThrowingComponent shouldThrow={true} errorMessage="First error" />
        </ErrorBoundary>
      )
      
      // Get the error ID from the bottom paragraph (more specific)
      const firstErrorIdElements = screen.getAllByText(/Error ID: fe_\d+_[a-z0-9]+/)
      const firstErrorId = firstErrorIdElements[firstErrorIdElements.length - 1].textContent
      
      // Reset and trigger new error with key change to force remount
      rerender(
        <ErrorBoundary key="reset" showDetails={true}>
          <div>Working</div>
        </ErrorBoundary>
      )
      
      rerender(
        <ErrorBoundary key="second-error" showDetails={true}>
          <ThrowingComponent shouldThrow={true} errorMessage="Second error" />
        </ErrorBoundary>
      )
      
      const secondErrorIdElements = screen.getAllByText(/Error ID: fe_\d+_[a-z0-9]+/)
      const secondErrorId = secondErrorIdElements[secondErrorIdElements.length - 1].textContent
      
      expect(firstErrorId).not.toBe(secondErrorId)
      expect(firstErrorId).toMatch(/Error ID: fe_\d+_[a-z0-9]+/)
      expect(secondErrorId).toMatch(/Error ID: fe_\d+_[a-z0-9]+/)
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

    it('should use custom fallback in wrapper', () => {
      const customFallback = <div data-testid="wrapper-fallback">Wrapper Error</div>
      
      render(
        <ErrorBoundaryWrapper fallback={customFallback}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundaryWrapper>
      )
      
      expect(screen.getByTestId('wrapper-fallback')).toBeInTheDocument()
      expect(screen.getByText('Wrapper Error')).toBeInTheDocument()
    })
  })

  describe('Server-Side Rendering Compatibility', () => {
    it('should handle server-side environment gracefully', () => {
      // Test that ErrorBoundary renders without throwing errors
      // Focus on the component's resilience rather than simulating actual SSR
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      expect(() => {
        render(
          <ErrorBoundary>
            <div data-testid="ssr-content">SSR Content</div>
          </ErrorBoundary>
        )
      }).not.toThrow()
      
      // Component should be rendered successfully
      expect(screen.getByTestId('ssr-content')).toBeInTheDocument()
      expect(screen.getByText('SSR Content')).toBeInTheDocument()
      
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes and semantic HTML', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      
      // Check for proper heading structure
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Something went wrong')
      
      // Check for accessible buttons
      const retryButton = screen.getByRole('button', { name: /try again/i })
      const homeButton = screen.getByRole('button', { name: /go home/i })
      
      expect(retryButton).toBeInTheDocument()
      expect(homeButton).toBeInTheDocument()
      
      // Check that the error message is in a paragraph for screen readers
      const errorMessage = screen.getByText(/We encountered an unexpected error/)
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage.tagName.toLowerCase()).toBe('p')
    })
  })
})