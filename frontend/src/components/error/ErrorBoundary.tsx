// frontend/src/components/error/ErrorBoundary.tsx
// Version: 1.4.0 - Fixed JSX namespace error by replacing JSX.Element with ReactNode
// Removed JSX.Element type references and used ReactNode consistently for better TypeScript compatibility

'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * Check if code is running in browser environment
 */
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined'

/**
 * Error information interface for consistent error tracking
 */
interface ErrorDetails {
  message: string
  stack?: string
  componentStack?: string
  errorBoundary?: string
  errorBoundaryStack?: string
  timestamp: string
  userAgent: string
  url: string
}

/**
 * Props interface for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
  enableReporting?: boolean
}

/**
 * State interface for ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

/**
 * React Error Boundary component
 * Catches JavaScript errors anywhere in the child component tree
 * Logs error information and displays fallback UI
 * Compatible with Next.js SSR/SSG environments
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  /**
   * Static method called when an error is caught
   * Updates state to trigger fallback UI rendering
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `fe_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    
    return {
      hasError: true,
      error,
      errorId
    }
  }

  /**
   * Called after an error has been thrown by a descendant component
   * Used for error reporting and logging
   */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error info
    this.setState({
      errorInfo
    })

    // Create detailed error information with proper browser detection
    const errorDetails: ErrorDetails = {
      message: error.message,
      timestamp: new Date().toISOString(),
      userAgent: isBrowser ? window.navigator.userAgent : 'Server-side',
      url: isBrowser ? window.location.href : 'Server-side',
      ...(error.stack && { stack: error.stack }),
      ...(errorInfo.componentStack && { componentStack: errorInfo.componentStack })
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', {
        error,
        errorInfo,
        errorDetails
      })
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Report error to monitoring service if enabled and in browser
    if (this.props.enableReporting && isBrowser) {
      this.reportError(errorDetails)
    }
  }

  /**
   * Report error to external monitoring service
   * Can be extended to integrate with services like Sentry, LogRocket, etc.
   * Only runs in browser environment
   */
  private reportError = async (errorDetails: ErrorDetails): Promise<void> => {
    if (!isBrowser) {
      return
    }

    try {
      // In a real app, send to your error monitoring service
      // Example: Sentry, LogRocket, or custom endpoint
      console.log('Reporting error to monitoring service:', errorDetails)
      
      // Example API call to send to your backend
      // await fetch('/api/errors/report', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorDetails)
      // })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  /**
   * Reset error boundary state to retry rendering
   */
  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  /**
   * Navigate to home page
   * Only works in browser environment
   */
  private handleGoHome = (): void => {
    if (isBrowser) {
      window.location.href = '/'
    }
  }

  /**
   * Render method - shows fallback UI when error occurs
   */
  render(): ReactNode {
    // If there's an error, render fallback UI
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            {/* Error Icon */}
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>

            {/* Error Title */}
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h1>

            {/* Error Message */}
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Please try again or return to the home page.
            </p>

            {/* Error Details (only in development or if showDetails is true) */}
            {(process.env.NODE_ENV === 'development' || this.props.showDetails) && this.state.error && (
              <details className="text-left mb-6 p-3 bg-gray-100 rounded text-sm">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Error Details
                </summary>
                <div className="space-y-2 text-gray-600">
                  <p><strong>Error:</strong> {this.state.error.message}</p>
                  {this.state.errorId && (
                    <p><strong>Error ID:</strong> {this.state.errorId}</p>
                  )}
                  {this.state.error.stack && (
                    <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded border">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons - Only show if in browser */}
            {isBrowser && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
            )}

            {/* Error ID for support */}
            {this.state.errorId && (
              <p className="text-xs text-gray-500 mt-4">
                Error ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      )
    }

    // No error, render children normally
    return this.props.children
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 * Provides a simpler API for basic error handling
 */
interface ErrorBoundaryWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

/**
 * Wrapper component for ErrorBoundary with sensible defaults
 */
export function ErrorBoundaryWrapper({ 
  children, 
  fallback, 
  onError 
}: ErrorBoundaryWrapperProps): ReactNode {
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={onError}
      enableReporting={process.env.NODE_ENV === 'production'}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary