// frontend/src/components/auth/LoginComponent.tsx
// Fixed login component with error handling, password toggle, and loading states
// Version: 1.0.0

'use client'

import { useState, FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { validateLoginForm, type LoginFormData, type LoginFormErrors } from '../../lib/auth-validation'

// Props interface for the LoginComponent
interface LoginComponentProps {
  onLoginSuccess?: (userData: any) => void
  onLoginError?: (errorMessage: string) => void
  apiBaseUrl?: string
}

/**
 * Fixed LoginComponent with all missing features added
 * Includes error display, password toggle, loading states, and proper error handling
 */
export default function LoginComponent({ 
  onLoginSuccess, 
  onLoginError, 
  apiBaseUrl = '/api' 
}: LoginComponentProps = {}) {
  // Form state management
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  })
  
  // Error state management - FIXED: properly handle error objects
  const [errors, setErrors] = useState<LoginFormErrors>({})
  const [generalError, setGeneralError] = useState<string>('')
  
  // UI state management
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  /**
   * Handle input field changes and clear field-specific errors
   */
  const handleInputChange = (field: keyof LoginFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    
    // Clear general error when user starts typing
    if (generalError) {
      setGeneralError('')
    }
  }

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev)
  }

  /**
   * Handle form submission with validation and API call
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Prevent multiple submissions
    if (isLoading) return
    
    // Client-side validation
    const validationErrors = validateLoginForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    
    setIsLoading(true)
    setErrors({})
    setGeneralError('')
    
    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password
        })
      })
      
      const data = await response.json()
      
      if (response.ok && data.success) {
        // Store token in localStorage
        if (data.data?.token) {
          localStorage.setItem('auth_token', data.data.token)
        }
        
        // Call success callback
        onLoginSuccess?.(data.data?.user)
      } else {
        // Handle API error - FIXED: properly extract error message
        const errorMessage = data.error?.message || data.message || 'Login failed. Please try again.'
        setGeneralError(errorMessage)
        onLoginError?.(errorMessage)
      }
    } catch (error) {
      // Handle network error
      const errorMessage = 'Network error. Please check your connection and try again.'
      setGeneralError(errorMessage)
      onLoginError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="login-container">
      <header className="login-header">
        <h1>Sign In</h1>
        <p>Welcome back to ParaSocial</p>
      </header>

      <form 
        className="login-form" 
        onSubmit={handleSubmit}
        noValidate
      >
        {/* General error message */}
        {generalError && (
          <div className="error-message" role="alert">
            {generalError}
          </div>
        )}

        {/* Email field */}
        <div className="form-group">
          <label className="form-label" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="form-input"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={isLoading}
            required
            autoComplete="email"
          />
          {errors.email && (
            <div className="field-error" role="alert">
              {errors.email}
            </div>
          )}
        </div>

        {/* Password field with toggle */}
        <div className="form-group">
          <label className="form-label" htmlFor="password">
            Password
          </label>
          <div className="password-input-container">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={isLoading}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle-button"
              onClick={togglePasswordVisibility}
              aria-label="Toggle password visibility"
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff size={20} data-testid="eye-off-icon" />
              ) : (
                <Eye size={20} data-testid="eye-icon" />
              )}
            </button>
          </div>
          {errors.password && (
            <div className="field-error" role="alert">
              {errors.password}
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className="submit-button"
          disabled={isLoading || !formData.email || !formData.password}
          aria-label="Sign in to your account"
        >
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <footer className="login-footer">
        <a href="/forgot-password" className="help-link">
          Forgot your password?
        </a>
        <div className="signup-prompt">
          Don't have an account? <a href="/register" className="signup-link">Sign up here</a>
        </div>
      </footer>
    </section>
  )
}