'use client'

import { useState, useRef } from 'react'

/**
 * Login form data structure
 */
interface LoginFormData {
  email: string
  password: string
}

/**
 * API response structure from backend AuthController
 */
interface LoginResponse {
  success: boolean
  data?: {
    user: {
      id: string
      email: string
      username: string
      displayName: string
      avatar: string | null
      isVerified: boolean
    }
    token: string
  }
  error?: string
  details?: Array<{ message: string }>
}

/**
 * Successful login data structure (non-optional since we only call this on success)
 */
interface LoginSuccessData {
  user: {
    id: string
    email: string
    username: string
    displayName: string
    avatar: string | null
    isVerified: boolean
  }
  token: string
}

/**
 * Component props for Login component
 */
interface LoginComponentProps {
  onLoginSuccess?: (userData: LoginSuccessData) => void
  onLoginError?: (error: string) => void
  apiBaseUrl?: string
}

/**
 * Login component that integrates with ParaSocial backend AuthController
 * Handles user authentication with email and password
 * 
 * @param onLoginSuccess - Callback fired when login succeeds
 * @param onLoginError - Callback fired when login fails  
 * @param apiBaseUrl - Base URL for API calls (defaults to /api/v1)
 */
export default function LoginComponent({ 
  onLoginSuccess, 
  onLoginError,
  apiBaseUrl = '/api/v1'
}: LoginComponentProps) {
  // Form state management
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  })
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Use ref to prevent race conditions in multiple submissions
  const isSubmittingRef = useRef(false)

  /**
   * Handle input field changes
   * Updates form state when user types in email or password fields
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }))
    
    // Clear previous errors when user starts typing
    if (error) {
      setError(null)
    }
  }

  /**
   * Submit login form to backend AuthController
   * Calls POST /auth/login endpoint with email and password
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    // Prevent multiple submissions using ref for immediate checking
    if (isLoading || isSubmittingRef.current) return
    
    // Set submitting flag immediately to prevent race conditions
    isSubmittingRef.current = true
    setIsLoading(true)
    setError(null)

    try {
      // Call backend AuthController login endpoint
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        })
      })

      const result: LoginResponse = await response.json()

      if (result.success && result.data) {
        // Login successful - store token and call success callback
        if (typeof window !== 'undefined') {
          localStorage.setItem('authToken', result.data.token)
        }
        
        onLoginSuccess?.(result.data)
      } else {
        // Login failed - show error message
        const errorMessage = result.error || 'Login failed'
        setError(errorMessage)
        onLoginError?.(errorMessage)
      }
    } catch (networkError) {
      // Network or parsing error
      const errorMessage = 'Unable to connect to server. Please try again.'
      setError(errorMessage)
      onLoginError?.(errorMessage)
    } finally {
      setIsLoading(false)
      isSubmittingRef.current = false
    }
  }

  /**
   * Check if form is valid for submission
   */
  const isFormValid = formData.email.trim() !== '' && formData.password.trim() !== ''

  return (
    <section className="login-container">
      <header className="login-header">
        <h1>Sign In</h1>
        <p>Welcome back to ParaSocial</p>
      </header>

      <form onSubmit={handleSubmit} className="login-form" noValidate>
        {/* Email input field */}
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter your email"
            required
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        {/* Password input field */}
        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            className="form-input"
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>

        {/* Error message display */}
        {error && (
          <div className="error-message" role="alert" aria-live="polite">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          className="submit-button"
          disabled={!isFormValid || isLoading}
          aria-label={isLoading ? 'Signing in...' : 'Sign in to your account'}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner" aria-hidden="true">⟳</span>
              <span>Signing In...</span>
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Additional help links */}
      <footer className="login-footer">
        <a href="/forgot-password" className="help-link">
          Forgot your password?
        </a>
        <div className="signup-prompt">
          Don't have an account?{' '}
          <a href="/register" className="signup-link">
            Sign up here
          </a>
        </div>
      </footer>
    </section>
  )
}