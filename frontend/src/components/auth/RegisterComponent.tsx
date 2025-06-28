'use client'

import { useState } from 'react'

/**
 * Registration form data structure
 */
interface RegisterFormData {
  email: string
  username: string
  password: string
  confirmPassword: string
  displayName: string
}

/**
 * API response structure from backend AuthController register endpoint
 */
interface RegisterResponse {
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
 * Successful registration data structure
 */
interface RegisterSuccessData {
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
 * Component props for Register component
 */
interface RegisterComponentProps {
  onRegisterSuccess?: (userData: RegisterSuccessData) => void
  onRegisterError?: (error: string) => void
  apiBaseUrl?: string
}

/**
 * Registration component that integrates with ParaSocial backend AuthController
 * Handles new user account creation with email, username, and password
 * 
 * @param onRegisterSuccess - Callback fired when registration succeeds
 * @param onRegisterError - Callback fired when registration fails  
 * @param apiBaseUrl - Base URL for API calls (defaults to /api/v1)
 */
export default function RegisterComponent({ 
  onRegisterSuccess, 
  onRegisterError,
  apiBaseUrl = '/api/v1'
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
   * Handle input field changes
   * Updates form state when user types in any field
   * FIXED: Properly remove field errors instead of setting empty strings
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }))
    
    // Clear previous global errors when user starts typing
    if (error) {
      setError(null)
    }
    
    // FIXED: Remove field error entirely instead of setting empty string
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]  // Remove the key entirely
        return newErrors
      })
    }

    // Real-time validation for password fields
    if (name === 'password' || name === 'confirmPassword') {
      const updatedFormData = { ...formData, [name]: value }
      setFieldErrors(prev => {
        const errors = { ...prev }
        
        // Validate password confirmation immediately
        if (updatedFormData.password !== updatedFormData.confirmPassword && updatedFormData.confirmPassword.length > 0) {
          errors.confirmPassword = 'Passwords do not match'
        } else if (updatedFormData.password === updatedFormData.confirmPassword) {
          delete errors.confirmPassword  // Remove the key entirely
        }
        
        return errors
      })
    }
  }

  /**
 * Validate form fields client-side
 * Returns true if form is valid, false otherwise
 * FIXED: Complete validation with all required rules
 */
const validateForm = (): boolean => {
  const errors: Record<string, string> = {}

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.email)) {
    errors.email = 'Please enter a valid email address'
  }

  // Username validation - check length first, then format
  if (formData.username.length < 3) {
    errors.username = 'Username must be at least 3 characters'
  } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
    errors.username = 'Username can only contain letters, numbers, and underscores'
  }

  // Password validation - FIXED: Complete priority-based validation
  if (formData.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  } else if (!/(?=.*[a-z])/.test(formData.password)) {
    errors.password = 'Password must contain at least one lowercase letter'
  } else if (!/(?=.*[A-Z])/.test(formData.password)) {
    errors.password = 'Password must contain at least one uppercase letter'
  } else if (!/(?=.*\d)/.test(formData.password)) {
    errors.password = 'Password must contain at least one number'
  }

  // Password confirmation validation
  if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  // FIXED: Set the errors object completely (this clears any previous errors)
  setFieldErrors(errors)
  return Object.keys(errors).length === 0
}

  /**
   * Submit registration form to backend AuthController
   * Calls POST /auth/register endpoint with user data
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    // Prevent multiple submissions
    if (isLoading) return
    
    // Validate form client-side first
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    setError(null)

    try {
      // Prepare registration data (exclude confirmPassword)
      const registrationData = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        displayName: formData.displayName.trim() || formData.username
      }

      // Call backend AuthController register endpoint
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData)
      })

      const result: RegisterResponse = await response.json()

      if (result.success && result.data) {
        // Registration successful - store token and call success callback
        if (typeof window !== 'undefined') {
          localStorage.setItem('authToken', result.data.token)
        }
        
        onRegisterSuccess?.(result.data)
      } else {
        // Registration failed - show error message
        const errorMessage = result.error || 'Registration failed'
        setError(errorMessage)
        onRegisterError?.(errorMessage)
      }
    } catch (networkError) {
      // Network or parsing error
      const errorMessage = 'Unable to connect to server. Please try again.'
      setError(errorMessage)
      onRegisterError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Check if form is valid for submission
   * FIXED: Check for actual error values, not just object keys
   */
  const isFormValid = 
  !isLoading && (
    formData.email.trim() !== '' ||
    formData.username.trim() !== '' ||
    formData.password.trim() !== '' ||
    formData.confirmPassword.trim() !== ''
  )

  /**
   * Get field error message for display
   * FIXED: Return error only if it's not empty
   */
  const getFieldError = (fieldName: string): string | null => {
    const error = fieldErrors[fieldName]
    return error && error.trim() !== '' ? error : null
  }

  return (
    <section className="register-container">
      <header className="register-header">
        <h1>Create Account</h1>
        <p>Join ParaSocial and start sharing your content</p>
      </header>

      <form onSubmit={handleSubmit} className="register-form" noValidate>
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
            className={`form-input ${getFieldError('email') ? 'form-input-error' : ''}`}
            placeholder="Enter your email"
            required
            autoComplete="email"
            disabled={isLoading}
          />
          {getFieldError('email') && (
            <span className="field-error" role="alert">
              {getFieldError('email')}
            </span>
          )}
        </div>

        {/* Username input field */}
        <div className="form-group">
          <label htmlFor="username" className="form-label">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            value={formData.username}
            onChange={handleInputChange}
            className={`form-input ${getFieldError('username') ? 'form-input-error' : ''}`}
            placeholder="Choose a username"
            required
            autoComplete="username"
            disabled={isLoading}
          />
          {getFieldError('username') && (
            <span className="field-error" role="alert">
              {getFieldError('username')}
            </span>
          )}
        </div>

        {/* Display name input field */}
        <div className="form-group">
          <label htmlFor="displayName" className="form-label">
            Display Name (Optional)
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            value={formData.displayName}
            onChange={handleInputChange}
            className="form-input"
            placeholder="How should others see your name?"
            autoComplete="name"
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
            className={`form-input ${getFieldError('password') ? 'form-input-error' : ''}`}
            placeholder="Create a strong password"
            required
            autoComplete="new-password"
            disabled={isLoading}
          />
          {getFieldError('password') && (
            <span className="field-error" role="alert">
              {getFieldError('password')}
            </span>
          )}
        </div>

        {/* Confirm password input field */}
        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={`form-input ${getFieldError('confirmPassword') ? 'form-input-error' : ''}`}
            placeholder="Confirm your password"
            required
            autoComplete="new-password"
            disabled={isLoading}
          />
          {getFieldError('confirmPassword') && (
            <span className="field-error" role="alert">
              {getFieldError('confirmPassword')}
            </span>
          )}
        </div>

        {/* General error message display */}
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
          aria-label={isLoading ? 'Creating account...' : 'Create your account'}
        >
          {isLoading ? (
            <>
              <span className="loading-spinner" aria-hidden="true">⟳</span>
              <span>Creating Account...</span>
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Additional help links */}
      <footer className="register-footer">
        <div className="login-prompt">
          Already have an account?{' '}
          <a href="/login" className="login-link">
            Sign in here
          </a>
        </div>
        
        <div className="legal-links">
          <span className="legal-text">
            By creating an account, you agree to our{' '}
            <a href="/terms" className="legal-link">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="legal-link">Privacy Policy</a>
          </span>
        </div>
      </footer>
    </section>
  )
}