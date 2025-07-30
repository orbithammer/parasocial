// frontend/src/components/auth/RegisterComponent.tsx
// Version: 1.4.0 - Fixed validation logic for all fields
// Changes: Fixed validateForm function to properly validate email, username, and password

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
 * @param apiBaseUrl - Base URL for API calls (defaults to backend with /api prefix)
 */
export default function RegisterComponent({ 
  onRegisterSuccess, 
  onRegisterError,
  apiBaseUrl = 'http://localhost:3001'
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
   * Removes field errors when user starts typing
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
    
    // Remove field error entirely instead of setting empty string
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
   */
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    // Email validation - must check if empty first
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Please enter a valid email'  // Exact test expectation
      }
    }

    // Username validation - check required first, then length, then format
    if (!formData.username.trim()) {
      errors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters'  // Exact test expectation
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores'  // Exact test expectation
    }

    // Password validation - check required first, then length
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'  // Exact test expectation
    }

    // Password confirmation validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    // Set the errors and return validation result
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  /**
   * Submit registration form to backend AuthController
   * Calls POST /auth/register endpoint with user data
   */
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    
    console.log('Form submitted with data:', formData)
    
    // Prevent multiple submissions
    if (isLoading) return
    
    // Add this debug line:
    console.log('Calling validateForm...')
    const isValid = validateForm()
    console.log('Validation result:', isValid, 'Field errors:', fieldErrors)
    
    if (!isValid) {
      console.log('Validation failed, stopping submission')
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

      // Call backend AuthController register endpoint at /api/auth/register
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

  return (
    <section className="register-container">
      <div className="register-card">
        <header className="register-header">
          <h1>Create Account</h1>
          <p>Join ParaSocial and start sharing your thoughts with the world</p>
        </header>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form" noValidate>
          {/* Email Field */}
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
              placeholder="Enter your email"
              className={`form-input ${fieldErrors.email ? 'error' : ''}`}
              required
              autoComplete="email"
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
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Choose a username"
              className={`form-input ${fieldErrors.username ? 'error' : ''}`}
              required
              autoComplete="username"
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
              Display Name <span className="optional">(Optional)</span>
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={formData.displayName}
              onChange={handleInputChange}
              placeholder="How should others see your name?"
              className="form-input"
              autoComplete="name"
            />
          </div>

          {/* Password Field */}
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
              placeholder="Create a strong password"
              className={`form-input ${fieldErrors.password ? 'error' : ''}`}
              required
              autoComplete="new-password"
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
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm your password"
              className={`form-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
              required
              autoComplete="new-password"
              aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
            />
            {fieldErrors.confirmPassword && (
              <div id="confirm-password-error" className="field-error" role="alert">
                {fieldErrors.confirmPassword}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`submit-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? 'Creating Your Account...' : 'Create Your Account'}
          </button>
        </form>

        <footer className="register-footer">
          <p>
            Already have an account?{' '}
            <a href="/login" className="login-link">
              Sign in here
            </a>
          </p>
          <p>
            By registering, you agree to our{' '}
            <a href="/terms" className="footer-link">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="footer-link">
              Privacy Policy
            </a>
          </p>
        </footer>
      </div>
    </section>
  )
}

// frontend/src/components/auth/RegisterComponent.tsx
// Version: 1.4.0 - Fixed validation logic for all fields