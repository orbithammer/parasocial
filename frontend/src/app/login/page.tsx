// frontend/src/components/auth/LoginComponent.tsx
// Fixed login component with proper success handling for localStorage and callbacks
// Version: 1.4.0 - Fixed response destructuring to match test expectations

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
 * Fixed LoginComponent with complete success handling logic
 * Includes error display, password toggle, loading states, and proper success handling
 */
export default function LoginComponent({ 
  onLoginSuccess, 
  onLoginError, 
  apiBaseUrl = '' 
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
      // Properly construct API URL to always include /api/auth/login
      const apiUrl = apiBaseUrl ? 
        `${apiBaseUrl}/api/auth/login` : 
        '/api/auth/login'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // FIXED: Handle successful login response with correct destructuring
        // Extract token and user from the response data directly (not from data.data)
        const { token, user } = data
        
        // Store token in localStorage with correct key name
        if (token) {
          localStorage.setItem('authToken', token)
        }
        
        // Call success callback with user data
        if (onLoginSuccess && user) {
          onLoginSuccess(user)
        }
      } else {
        // Handle API error response
        const errorMessage = data.error || 'Login failed'
        setGeneralError(errorMessage)
        
        if (onLoginError) {
          onLoginError(errorMessage)
        }
      }
    } catch (error) {
      // Handle network errors
      const errorMessage = 'Something went wrong. Please try again.'
      setGeneralError(errorMessage)
      
      if (onLoginError) {
        onLoginError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Check if form is valid
  const isFormValid = formData.email.trim() !== '' && formData.password.trim() !== ''

  return (
    <section className="login-container">
      <header className="login-header">
        <h1>Sign In</h1>
        <p>Welcome back to ParaSocial</p>
      </header>

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        {/* General error message */}
        {generalError && (
          <div className="error-message" role="alert">
            ⚠️ {generalError}
          </div>
        )}

        {/* Email field */}
        <div className="form-group">
          <label htmlFor="email" className="form-label">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={`form-input ${errors.email ? 'form-input-error' : ''}`}
            placeholder="Enter your email address"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            disabled={isLoading}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <div id="email-error" className="field-error" role="alert">
              {errors.email}
            </div>
          )}
        </div>

        {/* Password field */}
        <div className="form-group">
          <label htmlFor="password" className="form-label">
            Password
          </label>
          <div className="password-input-container">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              className={`form-input password-input ${errors.password ? 'form-input-error' : ''}`}
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={isLoading}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={togglePasswordVisibility}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <div id="password-error" className="field-error" role="alert">
              {errors.password}
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className={`form-submit ${isFormValid && !isLoading ? 'form-submit-enabled' : 'form-submit-disabled'}`}
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner">⟳</span>
              Signing in...
            </>
          ) : (
            'Sign in to your account'
          )}
        </button>
      </form>

      {/* Footer */}
      <footer className="login-footer">
        <p>
          Don't have an account?{' '}
          <a href="/register" className="auth-link">
            Create one here
          </a>
        </p>
      </footer>
    </section>
  )
}