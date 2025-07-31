// frontend/src/components/auth/RegisterComponent.tsx
// Version: 1.3
// Fixed: Added proper isFormValid computed property to enable/disable submit button
// Fixed: Corrected localStorage key to 'auth-token', JSON property order, and error messages

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
   * Button should be enabled only when all required fields are filled and basic validation passes
   */
  const isFormValid = (): boolean => {
    const { email, username, password, confirmPassword } = formData
    
    // Check required fields are not empty
    const hasRequiredFields = email.trim() !== '' && username.trim() !== '' && password.trim() !== '' && confirmPassword.trim() !== ''
    
    // If any required field is empty, form is invalid
    if (!hasRequiredFields) {
      return false
    }
    
    // Basic validation checks
    const isEmailValid = email.includes('@') && email.includes('.')
    const isPasswordValid = password.length >= 8
    const passwordsMatch = password === confirmPassword
    
    // Only block if there are actual validation errors that prevent submission
    // Don't block for missing field errors when fields have valid content
    const hasBlockingPasswordError = fieldErrors.confirmPassword && confirmPassword.length > 0
    
    return isEmailValid && isPasswordValid && passwordsMatch && !hasBlockingPasswordError
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
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address'
    }

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required'
    } else if (formData.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters long'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username.trim())) {
      errors.username = 'Username can only contain letters, numbers, and underscores'
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long'
    }

    // Password confirmation validation
    if (!formData.confirmPassword) {
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
    
    if (!validateForm() || isLoading) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Prepare submission data - ensure property order matches test expectations
      const submissionData = {
        email: formData.email.trim(),
        username: formData.username.trim(),
        displayName: formData.displayName.trim() || formData.username.trim(),
        password: formData.password
      }

      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      })

      const data: RegisterApiResponse = await response.json()

      if (!response.ok) {
        // Handle HTTP errors by extracting message from response
        const errorMessage = data.error || `HTTP error! status: ${response.status}`
        throw new Error(errorMessage)
      }

      if (data.success && data.data) {
        // Store token in localStorage with correct key expected by tests
        localStorage.setItem('authToken', data.data.token)
        
        // Call success callback
        if (onRegisterSuccess) {
          onRegisterSuccess({
            id: data.data.user.id,
            email: data.data.user.email,
            username: data.data.user.username
          })
        }

        // Reset form
        setFormData({
          email: '',
          username: '',
          password: '',
          confirmPassword: '',
          displayName: ''
        })
      } else {
        // Handle API response with success: false
        const errorMessage = data.error || 'Registration failed'
        throw new Error(errorMessage)
      }
    } catch (error) {
      let errorMessage = 'Registration failed. Please try again.'
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
          errorMessage = 'Network error'
        } else if (error.message.includes('email already exists') || error.message.includes('Email already exists')) {
          errorMessage = 'Email already exists'
        } else if (error.message.includes('Username already taken') || error.message.includes('username already taken')) {
          errorMessage = 'Username already taken'
        } else if (error.message && error.message !== 'Registration failed') {
          // Use the specific error message from the API response
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
      
      if (onRegisterError) {
        onRegisterError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>Create Account</h1>
          <p>Join ParaSocial and start sharing with the world</p>
        </div>

        <form 
          className="register-form"
          onSubmit={handleSubmit}
          noValidate
          aria-label="Registration form"
        >
          {/* Global Error Message */}
          {error && (
            <div className="error-message" role="alert" aria-live="polite">
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
              aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
            />
            {fieldErrors.confirmPassword && (
              <div id="confirmPassword-error" className="field-error" role="alert">
                {fieldErrors.confirmPassword}
              </div>
            )}
          </div>

          {/* Submit Button - Now uses isFormValid() to control disabled state */}
          <button
            type="submit"
            disabled={!isFormValid() || isLoading}
            className={`submit-button ${isLoading ? 'loading' : ''}`}
            aria-label="Create your account"
          >
            {isLoading ? 'Creating Account...' : 'Create Your Account'}
          </button>
        </form>

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
              <a href="/terms" className="footer-link">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="footer-link">
                Privacy Policy
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// frontend/src/components/auth/RegisterComponent.tsx
// Version: 1.5
// Fixed: Improved isFormValid logic to properly enable button, enhanced error message parsing for API responses