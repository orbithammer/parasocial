// frontend/src/components/auth/LoginComponent.tsx
// Fixed login component with proper error handling, validation, loading states, and accessibility
// Version: 2.0.0

'use client'

import { useState, FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'

// Form data interface
interface LoginFormData {
  email: string
  password: string
}

// Form errors interface
interface LoginFormErrors {
  email?: string
  password?: string
}

// Props interface for the LoginComponent
interface LoginComponentProps {
  onLoginSuccess?: (userData: any) => void
  onLoginError?: (errorMessage: string) => void
  apiBaseUrl?: string
}

/**
 * Validate email format
 */
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate login form data
 */
const validateLoginForm = (formData: LoginFormData): LoginFormErrors => {
  const errors: LoginFormErrors = {}
  
  // Email validation
  if (!formData.email.trim()) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(formData.email.trim())) {
    errors.email = 'Please enter a valid email address'
  }
  
  // Password validation
  if (!formData.password) {
    errors.password = 'Password is required'
  }
  
  return errors
}

/**
 * Fixed LoginComponent with all missing features added
 * Includes proper error display, password toggle, loading states, validation, and accessibility
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
  
  // Error state management
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
   * Check if form is valid (both fields have content)
   */
  const isFormValid = (): boolean => {
    return formData.email.trim().length > 0 && formData.password.length > 0
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
        // Handle API error
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
            className={`form-input focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-500' : ''}`}
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
              className={`form-input focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.password ? 'border-red-500' : ''}`}
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={isLoading}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="password-toggle-button focus:ring-2 focus:ring-blue-500"
              onClick={togglePasswordVisibility}
              aria-label="Toggle password visibility"
              disabled={isLoading}
              tabIndex={0}
            >
              {showPassword ? (
                <EyeOff data-testid="eye-off-icon" aria-hidden="true" size={20} />
              ) : (
                <Eye data-testid="eye-icon" aria-hidden="true" size={20} />
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
          className="submit-button focus:ring-2 focus:ring-blue-500"
          disabled={!isFormValid() || isLoading}
          aria-label="Sign in to your account"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <footer className="login-footer">
        <a 
          className="help-link focus:ring-2 focus:ring-blue-500" 
          href="/forgot-password"
        >
          Forgot your password?
        </a>
        <div className="signup-prompt">
          Don't have an account?{' '}
          <a 
            className="signup-link focus:ring-2 focus:ring-blue-500" 
            href="/register"
          >
            Sign up here
          </a>
        </div>
      </footer>
    </section>
  )
}