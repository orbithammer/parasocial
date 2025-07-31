// src/components/auth/RegisterComponent.tsx
// Version: 1.4.0
// Fixed API URL handling, payload structure, token storage, and error handling to match test expectations

'use client'

import { useState } from 'react'
// Note: CSS module import - ensure this file exists
// import styles from './RegisterComponent.module.css'

// Temporary inline styles for testing
const styles = {
  registerContainer: 'register-container',
  registerCard: 'register-card', 
  registerHeader: 'register-header',
  registerForm: 'register-form',
  errorMessage: 'error-message',
  formGroup: 'form-group',
  formLabel: 'form-label',
  formInput: 'form-input',
  fieldError: 'field-error',
  error: 'error',
  optional: 'optional',
  submitButton: 'submit-button',
  loading: 'loading',
  registerFooter: 'register-footer',
  loginLink: 'login-link',
  footerLink: 'footer-link'
}

/**
 * Form data structure for registration
 */
interface RegisterFormData {
  email: string
  username: string
  password: string
  confirmPassword: string
  displayName: string
}

/**
 * API response structure from backend
 */
interface ApiResponse {
  success: boolean
  data?: {
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
      errors.email = 'Please enter a valid email'
    }

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, and underscores'
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Password confirmation is required'
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
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Prepare payload in expected order and format
      const payload = {
        email: formData.email.trim(),
        username: formData.username.trim(),
        displayName: formData.displayName.trim() || formData.username.trim(), // Use username if displayName is empty
        password: formData.password,
      }
      
      // Construct API URL
      const url = apiBaseUrl ? `${apiBaseUrl}/api/auth/register` : '/api/auth/register'
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      
      const data: ApiResponse = await response.json()
      
      if (response.ok && data.success && data.data) {
        // Store token in localStorage
        localStorage.setItem('authToken', data.data.token)
        
        // Call success callback with just user data
        if (onRegisterSuccess) {
          onRegisterSuccess(data.data.user)
        }
      } else {
        // Handle API errors - use specific error message from response
        const errorMessage = data.error || 'Registration failed'
        setError(errorMessage)
        
        if (onRegisterError) {
          onRegisterError(errorMessage)
        }
      }
    } catch (err) {
      // Handle network errors
      const errorMessage = 'Registration failed. Please try again.'
      setError(errorMessage)
      
      if (onRegisterError) {
        onRegisterError(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className={styles.registerContainer}>
      <div className={styles.registerCard}>
        <header className={styles.registerHeader}>
          <h1>Create Account</h1>
          <p>Join ParaSocial and start sharing your thoughts with the world</p>
        </header>
        
        <form 
          className={styles.registerForm}
          onSubmit={handleSubmit}
          noValidate
          role="form"
          aria-label="registration form"
        >
          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}
          
          {/* Email Field */}
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`${styles.formInput} ${fieldErrors.email ? styles.error : ''}`}
              placeholder="Enter your email"
              required
              autoComplete="email"
              disabled={isLoading}
              aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            />
            {fieldErrors.email && (
              <div id="email-error" className={styles.fieldError} role="alert">
                {fieldErrors.email}
              </div>
            )}
          </div>

          {/* Username Field */}
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.formLabel}>
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              className={`${styles.formInput} ${fieldErrors.username ? styles.error : ''}`}
              placeholder="Choose a username"
              required
              autoComplete="username"
              disabled={isLoading}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
            />
            {fieldErrors.username && (
              <div id="username-error" className={styles.fieldError} role="alert">
                {fieldErrors.username}
              </div>
            )}
          </div>

          {/* Display Name Field */}
          <div className={styles.formGroup}>
            <label htmlFor="displayName" className={styles.formLabel}>
              Display Name <span className={styles.optional}>(Optional)</span>
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={formData.displayName}
              onChange={handleInputChange}
              className={styles.formInput}
              placeholder="How should others see your name?"
              autoComplete="name"
              disabled={isLoading}
            />
          </div>

          {/* Password Field */}
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`${styles.formInput} ${fieldErrors.password ? styles.error : ''}`}
              placeholder="Create a strong password"
              required
              autoComplete="new-password"
              disabled={isLoading}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password && (
              <div id="password-error" className={styles.fieldError} role="alert">
                {fieldErrors.password}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.formLabel}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`${styles.formInput} ${fieldErrors.confirmPassword ? styles.error : ''}`}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
              disabled={isLoading}
              aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
            />
            {fieldErrors.confirmPassword && (
              <div id="confirmPassword-error" className={styles.fieldError} role="alert">
                {fieldErrors.confirmPassword}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`${styles.submitButton} ${isLoading ? styles.loading : ''}`}
          >
            {isLoading ? 'Creating Account...' : 'Create Your Account'}
          </button>
        </form>

        <footer className={styles.registerFooter}>
          <p>
            Already have an account?{' '}
            <a href="/login" className={styles.loginLink}>
              Sign in here
            </a>
          </p>
          <p>
            By registering, you agree to our{' '}
            <a href="/terms" className={styles.footerLink}>
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className={styles.footerLink}>
              Privacy Policy
            </a>
          </p>
        </footer>
      </div>
    </section>
  )
}

// src/components/auth/RegisterComponent.tsx