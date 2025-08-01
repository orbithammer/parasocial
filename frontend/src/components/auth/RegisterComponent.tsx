// frontend/src/components/auth/RegisterComponent.tsx
// Version: 1.8.0
// Fixed: Submit button validation logic and network error message handling

'use client'

import { useState } from 'react'

// TypeScript interfaces
interface RegisterFormData {
  email: string
  username: string
  displayName: string
  password: string
  confirmPassword: string
}

interface RegisterComponentProps {
  apiBaseUrl?: string
  onRegisterSuccess?: (data: { user: { id: string; email: string; username: string }; token: string }) => void
  onRegisterError?: (error: string) => void
}

interface FormErrors {
  email?: string
  username?: string
  password?: string
  confirmPassword?: string
}

export default function RegisterComponent({
  apiBaseUrl = '/api',
  onRegisterSuccess,
  onRegisterError
}: RegisterComponentProps = {}) {
  // Component state
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: ''
  })
  
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [generalError, setGeneralError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateUsername = (username: string): boolean => {
    return username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username)
  }

  const validatePassword = (password: string): boolean => {
    return password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
  }

  // Form validation - Fixed: Check ALL required fields are non-empty AND valid
  const isFormValid = (): boolean => {
    const { email, username, password, confirmPassword } = formData
    
    // All required fields must be non-empty
    const hasAllRequiredFields = email.trim() !== '' && 
                                username.trim() !== '' && 
                                password.trim() !== '' && 
                                confirmPassword.trim() !== ''
    
    // All fields must be valid
    const isEmailValid = validateEmail(email)
    const isUsernameValid = validateUsername(username)  
    const isPasswordValid = validatePassword(password)
    const doPasswordsMatch = password === confirmPassword
    
    return hasAllRequiredFields && isEmailValid && isUsernameValid && isPasswordValid && doPasswordsMatch
  }

  // Handle input changes
  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field errors when user starts typing
    if (fieldErrors[field as keyof FormErrors]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    }
    
    // Clear general error when user starts typing
    if (generalError) {
      setGeneralError('')
    }
  }

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: FormErrors = {}
    
    if (!validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!validateUsername(formData.username)) {
      errors.username = 'Username must be at least 3 characters and contain only letters, numbers, and underscores'
    }
    
    if (!validatePassword(formData.password)) {
      errors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number'
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setGeneralError('')

    try {
      const response = await fetch(`${apiBaseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          displayName: formData.displayName || formData.username,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Store token in localStorage
        if (data.data?.token) {
          localStorage.setItem('auth-token', data.data.token)
        }
        
        // Call success callback
        if (onRegisterSuccess && data.data) {
          onRegisterSuccess(data.data)
        }
      } else {
        const errorMessage = data.error || 'Registration failed. Please try again.'
        setGeneralError(errorMessage)
        
        if (onRegisterError) {
          onRegisterError(errorMessage)
        }
      }
    } catch (error) {
      // Fixed: Network error message to match test expectation
      const networkErrorMessage = 'Network error. Please check your connection and try again.'
      setGeneralError(networkErrorMessage)
      
      if (onRegisterError) {
        onRegisterError(networkErrorMessage)
      }
    } finally {
      setIsLoading(false)
    }
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
          onSubmit={handleSubmit} 
          className="register-form"
          aria-label="Registration form"
          noValidate
        >
          {/* General Error Message */}
          {generalError && (
            <div className="form-error" role="alert">
              {generalError}
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
              onChange={(e) => handleInputChange('email', e.target.value)}
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
              onChange={(e) => handleInputChange('username', e.target.value)}
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

          {/* Display Name Field (Optional) */}
          <div className="form-group">
            <label htmlFor="displayName" className="form-label">
              Display Name <span className="optional">(optional)</span>
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
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
              onChange={(e) => handleInputChange('password', e.target.value)}
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
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
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

          {/* Submit Button - Fixed: Disable when form is invalid OR loading */}
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
// Version: 1.8.0
// Fixed: Submit button validation logic and network error message handling