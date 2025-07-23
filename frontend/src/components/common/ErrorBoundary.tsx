// frontend/src/components/common/ErrorBoundary.tsx
// Version: 2.0.0
// Fixed TypeScript error with fallback prop type - separated function and ReactNode fallbacks

import React, { Component, ReactNode, ErrorInfo } from 'react'

// Props interface for ErrorBoundary component with proper type separation
interface ErrorBoundaryProps {
  children: ReactNode
  // Static fallback UI as ReactNode
  fallback?: ReactNode
  // Function-based fallback that receives error details
  fallbackRender?: (error: Error, errorInfo: ErrorInfo) => ReactNode
  // Error callback for logging/reporting
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

// State interface for ErrorBoundary component
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

// ErrorBoundary class component that catches JavaScript errors in child components
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    // Initialize state with no error
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  // Static method called when an error is caught
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state to trigger fallback UI rendering
    return {
      hasError: true,
      error
    }
  }

  // Lifecycle method called when an error is caught
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Store error info in state
    this.setState({
      errorInfo
    })

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  render(): ReactNode {
    // If an error occurred, render fallback UI
    if (this.state.hasError && this.state.error) {
      const { fallback, fallbackRender } = this.props
      const { error, errorInfo } = this.state

      // If fallbackRender function is provided, call it with error details
      if (fallbackRender && errorInfo) {
        return fallbackRender(error, errorInfo)
      }

      // If static fallback ReactNode is provided, render it
      if (fallback) {
        return fallback
      }

      // Default fallback UI with semantic HTML
      return (
        <div role="alert" aria-live="assertive">
          <h2>Something went wrong</h2>
          <p>We apologize for the inconvenience. Please try refreshing the page.</p>
        </div>
      )
    }

    // If no error, render children normally
    return this.props.children
  }
}

// Props interface for ErrorBoundaryWrapper component
interface ErrorBoundaryWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  fallbackRender?: (error: Error, errorInfo: ErrorInfo) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

// Wrapper component for ErrorBoundary with convenient defaults
export function ErrorBoundaryWrapper({ 
  children, 
  fallback, 
  fallbackRender,
  onError 
}: ErrorBoundaryWrapperProps): ReactNode {
  return (
    <ErrorBoundary
      fallback={fallback}
      fallbackRender={fallbackRender}
      onError={onError}
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary

// frontend/src/components/common/ErrorBoundary.tsx
// Version: 2.0.0
// Fixed TypeScript error with fallback prop type - separated function and ReactNode fallbacks