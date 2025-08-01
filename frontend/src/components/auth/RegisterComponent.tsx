// frontend/src/components/auth/RegisterComponent.tsx
// Version: 1.7.0
// Fixed: JSON property order, localStorage key consistency, and submit button validation

'use client'

import React, { useState } from 'react'

/**
 * Form data interface for registration
 */
interface RegisterFormData {
  email: string
  username: string
  password: string
  confirmPassword: string
  displayName: string
}

/**
 * API response interface for registration
 */
interface RegisterApiResponse {
  success: boolean
  data: {
    user: {
      id: string
      email: string
      username: string
      displayName?: string
    }
    token: string
  }
  error?: string
}

/**
 * Component props for Register component
 */
interface RegisterComponentProps {
  onRegisterSuccess?: (userData: { id: string; email: string; username: string }) => void
  onRegisterError?: (error: string) => void
  apiBaseUrl?: string
}

/**
 * Registration component with form validation and API integration
 */
export default function RegisterComponent({ 
  onRegisterSuccess, 
  onRegisterError,
  apiBaseUrl = '' // Default to empty string for relative URLs
}: RegisterComponentProps) {
  // Form state management
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  })
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  /**
   * Computed property to check if form is valid for submission
   * Button should be disabled only when required fields are empty or form is loading
   */
  const isFormValid = (): boolean => {
    const { email, username, password, confirmPassword } = formData
    
    // All required fields must have content (not just whitespace)
    const hasEmail = email.trim().length > 0
    const hasUsername = username.trim().length > 0
    const hasPassword = password.trim().length > 0
    const hasConfirmPassword = confirmPassword.trim().length > 0
    
    // Form is valid if all required fields have content
    return hasEmail && hasUsername && hasPassword && hasConfirmPassword
  }

  /**
   * Handle input field changes
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }))
    
    // Clear errors when user starts typing
    if (error) {
      setError(null)
    }
    
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }

    // Real-time password confirmation validation
    if (name === 'password' || name === 'confirmPassword') {
      const updatedFormData = { ...formData, [name]: value }
      setFieldErrors(prev => {
        const errors = { ...prev }
        
        if (updatedFormData.password !== updatedFormData.confirmPassword && updatedFormData.confirmPassword.length > 0) {
          errors.confirmPassword = 'Passwords do not match'
        } else if (updatedFormData.password === updatedFormData.confirmPassword) {
          delete errors.confirmPassword
        }
        
        return errors
      })
    }
  }

  /**
   * Validate form fields
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    // Username validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!formData.username.trim()) {
      errors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters long'
    } else if (formData.username.length > 30) {
      errors.username = 'Username must be no more than 30 characters long'
    } else if (!usernameRegex.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores'
    }

    // Password validation
    if (!formData.password.trim()) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }

    // Confirm password validation
    if (!formData.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    // Validate form before submission
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const endpoint = apiBaseUrl ? `${apiBaseUrl}/api/auth/register` : '/api/auth/register'
      
      // Fixed: Property order to match test expectations
      const requestBody = {
        email: formData.email.trim(),
        username: formData.username.trim(),
        displayName: formData.displayName.trim() || formData.username.trim(),
        password: formData.password
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data: RegisterApiResponse = await response.json()

      if (response.ok && data.success) {
        // Fixed: Use consistent localStorage key 'authToken' to match tests
        localStorage.setItem('authToken', data.data.token)
        
        if (onRegisterSuccess) {
          onRegisterSuccess({
            id: data.data.user.id,
            email: data.data.user.email,
            username: data.data.user.username
          })
        }
      } else {
        const errorMessage = data.error || 'Registration failed. Please try again.'
        setError(errorMessage)
        if (onRegisterError) {
          onRegisterError(errorMessage)
        }
      }
    } catch (err) {
      const networkError = 'Network error. Please check your connection and try again.'
      setError(networkError)
      if (onRegisterError) {
        onRegisterError(networkError)
      }
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData({
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      displayName: ''
    })
    setFieldErrors({})
    setError(null)
  }

  return (
    <div className="register-container">
      <div className="register-card">
        {/* Header */}
        <div className="register-header">
          <h1>Create Account</h1>
          <p>Join ParaSocial and start sharing with the world</p>
        </div>

        {/* Registration Form */}
        <form 
          className="register-form" 
          onSubmit={handleSubmit}
          noValidate
          aria-label="Registration form"
        >
          {/* Global Error Message */}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`form-input ${fieldErrors.email ? 'error' : ''}`}
              placeholder="Enter your email address"
              required
              autoComplete="email"
              disabled={isLoading}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <div id="email-error" className="field-error" role="alert">
                {fieldErrors.email}
              </div>
            )}
          </div>

          {/* Username Field */}
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className={`form-input ${fieldErrors.username ? 'error' : ''}`}
              placeholder="Choose a username"
              required
              autoComplete="username"
              disabled={isLoading}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
            />
            {fieldErrors.username && (
              <div id="username-error" className="field-error" role="alert">
                {fieldErrors.username}
              </div>
            )}
          </div>

          {/* Display Name Field */}
          <div className="form-group">
            <label htmlFor="displayName" className="form-label">
              Display Name <span className="optional">(optional)</span>
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              className="form-input"
              placeholder="How should others see your name?"
              autoComplete="name"
              disabled={isLoading}
            />
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`form-input ${fieldErrors.password ? 'error' : ''}`}
              placeholder="Create a secure password"
              required
              autoComplete="new-password"
              disabled={isLoading}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && (
              <div id="password-error" className="field-error" role="alert">
                {fieldErrors.password}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`form-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
              disabled={isLoading}
              aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
            />
            {fieldErrors.confirmPassword && (
              <div id="confirm-password-error" className="field-error" role="alert">
                {fieldErrors.confirmPassword}
              </div>
            )}
          </div>

          {/* Submit Button - Fixed: Only disable when form is invalid OR loading */}
          <button
            type="submit"
            className={`submit-button ${(!isFormValid() || isLoading) ? 'disabled' : ''}`}
            disabled={!isFormValid() || isLoading}
            aria-label="Create your account"
          >
            {isLoading ? 'Creating Account...' : 'Create Your Account'}
          </button>
        </form>

        {/* Footer */}
        <div className="register-footer">
          <p>
            Already have an account?{' '}
            <a href="/login" className="login-link">
              Sign in here
            </a>
          </p>
          <div className="legal-links">
            <span className="legal-text">
              By creating an account, you agree to our{' '}
              <a href="/terms" className="footer-link">Terms of Service</a>{' '}
              and{' '}
              <a href="/privacy" className="footer-link">Privacy Policy</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// frontend/src/components/auth/RegisterComponent.tsx
// Version: 1.7.0
// Fixed: JSON property order, localStorage key consistency, and submit button validation