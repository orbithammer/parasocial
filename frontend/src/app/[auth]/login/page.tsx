// frontend/src/components/auth/LoginComponent.tsx
// Fixed login component with complete success handling for localStorage and callbacks
// Version: 1.5.0 - Added missing success handling logic to fix localStorage test failure

'use client'

import { useState, FormEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { validateLoginForm, type LoginFormData, type LoginFormErrors } from '@/lib/auth-validation'

// Props interface for the LoginComponent
interface LoginComponentProps {
  onLoginSuccess?: (userData: any) => void
  onLoginError?: (errorMessage: string) => void
  apiBaseUrl?: string
}

/**
 * LoginComponent with complete success handling logic
 * Includes error display, password toggle, loading states, and proper localStorage/callback handling
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
      // Construct API URL
      const apiUrl = apiBaseUrl 
        ? `${apiBaseUrl}/api/auth/login`
        : '/api/auth/login'
      
      // Make API call
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      // Handle successful response
      if (response.ok && data.success) {
        // Store token in localStorage
        if (data.token) {
          localStorage.setItem('authToken', data.token)
        }
        
        // Call success callback with user data
        if (onLoginSuccess && data.user) {
          onLoginSuccess(data.user)
        }
        
        // Reset form
        setFormData({ email: '', password: '' })
        
      } else {
        // Handle API error response
        const errorMessage = data.error || 'Login failed'
        setGeneralError(errorMessage)
        
        // Call error callback
        if (onLoginError) {
          onLoginError(errorMessage)
        }
      }
      
    } catch (error) {
      // Handle network errors
      const errorMessage = 'Something went wrong. Please try again.'
      setGeneralError(errorMessage)
      
      // Call error callback
      if (onLoginError) {
        onLoginError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Check if form is valid for submit button state
  const isFormValid = formData.email.trim() && formData.password.trim()

  return (
    <section className="login-container">
      <header className="login-header">
        <h1>Welcome Back</h1>
        <p>Sign in to your account to continue</p>
      </header>

      <form onSubmit={handleSubmit} className="login-form" noValidate>
        
        {/* Email Field */}
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
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className={`form-input ${errors.email ? 'error' : ''}`}
            placeholder="Enter your email address"
            disabled={isLoading}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <span id="email-error" className="error-message" role="alert">
              {errors.email}
            </span>
          )}
        </div>

        {/* Password Field */}
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
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Enter your password"
              disabled={isLoading}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="password-toggle-button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <span id="password-error" className="error-message" role="alert">
              {errors.password}
            </span>
          )}
        </div>

        {/* General Error Display */}
        {generalError && (
          <div className="general-error" role="alert">
            {generalError}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="submit-button"
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
    </section>
  )
}