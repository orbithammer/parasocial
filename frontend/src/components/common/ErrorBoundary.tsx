// frontend/src/components/common/ErrorBoundary.tsx
// Version: 1.1.0
// Fixed TypeScript error with fallback prop type definition

import React, { Component, ReactNode, ErrorInfo } from 'react'

// Type for fallback prop that can be ReactNode or function
type FallbackType = ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode)

// Props interface for ErrorBoundary component
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: FallbackType
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
      const { fallback } = this.props
      const { error, errorInfo } = this.state

      // If fallback is a function, call it with error details
      if (typeof fallback === 'function' && errorInfo) {
        return fallback(error, errorInfo)
      }

      // If fallback is provided as ReactNode, render it
      if (fallback) {
        return fallback
      }

      // Default fallback UI
      return (
        <div role="alert">
          <h2>Something went wrong</h2>
        </div>
      )
    }

    // If no error, render children normally
    return this.props.children
  }
}

// frontend/src/components/common/ErrorBoundary.tsx
// Version: 1.0.0
// Initial ErrorBoundary component implementation