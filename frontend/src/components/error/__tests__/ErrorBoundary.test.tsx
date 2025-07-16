// frontend/src/components/error/__tests__/ErrorBoundary.test.tsx
// Version: 1.0.4 - Comprehensive TypeScript compatibility fixes for all object mocking
// Comprehensive testing of error boundary functionality, fallback UI, and error handling
// Updated to use vitest environment stubbing for proper TypeScript compatibility

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

/**
 * Mock window object for browser environment testing
 */
function mockBrowserEnvironment() {
  const originalWindow = global.window
  const originalDocument = global.document
  
  // Mock window and document using Object.defineProperty for proper TypeScript compatibility
  Object.defineProperty(global, 'window', {
    value: {
      navigator: { userAgent: 'Test Browser' },
      location: { href: 'http://localhost:3000/test' },
      document: {}
    },
    writable: true,
    configurable: true
  })
  
  Object.defineProperty(global, 'document', {
    value: {},
    writable: true,
    configurable: true
  })
  
  return () => {
    if (originalWindow) {
      global.window = originalWindow
    } else {
      delete (global as any).window
    }
    
    if (originalDocument) {
      global.document = originalDocument
    } else {
      delete (global as any).document
    }
  }
}

describe('ErrorBoundary Component', () => {
  let restoreConsole: () => void
  
  beforeEach(() => {
    // Suppress console.error for cleaner test output
    restoreConsole = suppressConsoleError()
    
    // Mock browser environment
    mockBrowserEnvironment()
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
      expect(screen.getByText(/Development error/)).toBeInTheDocument()
      
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
      expect(screen.getByText(/Forced details error/)).toBeInTheDocument()
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
      let shouldThrow = true
      
      const TestComponent = () => (
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      )
      
      const { rerender } = render(<TestComponent />)
      
      // Verify error state
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
      
      // Fix the component and retry
      shouldThrow = false
      
      // Click retry button
      fireEvent.click(screen.getByText('Try Again'))
      
      // Rerender with fixed component
      rerender(<TestComponent />)
      
      // Should show working component again
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
        writable: true
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
      
      const firstErrorId = screen.getByText(/Error ID:/).textContent
      
      // Reset and trigger new error
      rerender(
        <ErrorBoundary showDetails={true}>
          <div>Working</div>
        </ErrorBoundary>
      )
      
      rerender(
        <ErrorBoundary showDetails={true}>
          <ThrowingComponent shouldThrow={true} errorMessage="Second error" />
        </ErrorBoundary>
      )
      
      const secondErrorId = screen.getByText(/Error ID:/).textContent
      
      expect(firstErrorId).not.toBe(secondErrorId)
      expect(firstErrorId).toMatch(/Error ID: fe_\d+_[a-z0-9]+/)
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
      // Mock server environment (no window/document) using proper cleanup
      const originalWindow = global.window
      const originalDocument = global.document
      
      // Remove window and document to simulate server environment
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true
      })
      
      Object.defineProperty(global, 'document', {
        value: undefined,
        writable: true,
        configurable: true
      })
      
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      
      // Should still show error UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      
      // Should not show browser-specific buttons
      expect(screen.queryByText('Try Again')).not.toBeInTheDocument()
      expect(screen.queryByText('Go Home')).not.toBeInTheDocument()
      
      // Restore global objects
      if (originalWindow) {
        Object.defineProperty(global, 'window', {
          value: originalWindow,
          writable: true,
          configurable: true
        })
      }
      
      if (originalDocument) {
        Object.defineProperty(global, 'document', {
          value: originalDocument,
          writable: true,
          configurable: true
        })
      }
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes and semantic HTML', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      )
      
      // Check for semantic elements
      const heading = screen.getByRole('heading', { name: /something went wrong/i })
      expect(heading).toBeInTheDocument()
      expect(heading.tagName).toBe('H1')
      
      // Check for buttons with proper text
      const retryButton = screen.getByRole('button', { name: /try again/i })
      const homeButton = screen.getByRole('button', { name: /go home/i })
      
      expect(retryButton).toBeInTheDocument()
      expect(homeButton).toBeInTheDocument()
    })
  })
})