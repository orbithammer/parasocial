// frontend/src/components/auth/RegisterComponent.tsx
// Version: 1.10.0
// Fixed: URL construction to prevent double /api in API calls

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

  // Form validation - Disable when all required fields are empty OR during loading
  const isFormValid = () => {
    const { email, username, password, confirmPassword } = formData
    
    // If all required fields are empty, disable the button  
    const allFieldsEmpty = email.trim() === '' && 
                          username.trim() === '' && 
                          password.trim() === '' && 
                          confirmPassword.trim() === ''
    
    return !allFieldsEmpty && !isLoading
  }

  // Handle field blur - trigger validation when user leaves a field
  const handleFieldBlur = (field: keyof RegisterFormData) => {
    const value = formData[field]
    const error = validateField(field, value)
    
    if (error) {
      setFieldErrors(prev => ({ ...prev, [field]: error }))
    }
  }
  const validateField = (field: keyof RegisterFormData, value: string) => {
    let error = ''
    
    switch (field) {
      case 'email':
        if (value && !validateEmail(value)) {
          error = 'Please enter a valid email address'
        }
        break
      case 'username':
        if (value && !validateUsername(value)) {
          error = 'Username must be at least 3 characters and contain only letters, numbers, and underscores'
        }
        break
      case 'password':
        if (value && !validatePassword(value)) {
          error = 'Password must be at least 8 characters with uppercase, lowercase, and numbers'
        }
        break
      case 'confirmPassword':
        if (value && value !== formData.password) {
          error = 'Passwords do not match'
        }
        break
    }
    
    return error
  }

  // Handle input changes
  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field-specific errors when user starts typing
    if (fieldErrors[field as keyof FormErrors]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    }
    
    // Clear general error when user makes any changes
    if (generalError) {
      setGeneralError('')
    }

    // Validate confirmPassword if password field changes
    if (field === 'password' && formData.confirmPassword) {
      const confirmError = formData.confirmPassword !== value ? 'Passwords do not match' : ''
      setFieldErrors(prev => ({ ...prev, confirmPassword: confirmError || undefined }))
    }
    
    // Validate confirmPassword field in real-time
    if (field === 'confirmPassword') {
      const confirmError = validateField('confirmPassword', value)
      setFieldErrors(prev => ({ ...prev, confirmPassword: confirmError || undefined }))
    }
  }

  // Helper function to construct API URL correctly
  const constructApiUrl = (endpoint: string): string => {
    // Remove leading slash from endpoint to prevent double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
    
    // If apiBaseUrl already ends with /api, don't add it again
    if (apiBaseUrl.endsWith('/api')) {
      return `${apiBaseUrl}/${cleanEndpoint}`
    }
    
    // If apiBaseUrl is just /api, append the endpoint directly  
    if (apiBaseUrl === '/api') {
      return `/api/${cleanEndpoint}`
    }
    
    // For custom base URLs (like https://custom-api.com), add /api prefix
    return `${apiBaseUrl}/api/${cleanEndpoint}`
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (isLoading) {
      return
    }

    // Validate all fields before submission
    const { email, username, password, confirmPassword } = formData
    
    // Check if all required fields are filled
    if (!email.trim() || !username.trim() || !password.trim() || !confirmPassword.trim()) {
      return // Let HTML5 validation handle this
    }
    
    // Check if all fields are valid
    if (!validateEmail(email) || !validateUsername(username) || !validatePassword(password) || password !== confirmPassword) {
      return // Don't submit if validation fails
    }

    setIsLoading(true)
    setGeneralError('')
    setFieldErrors({})

    try {
      // Use displayName if provided, otherwise fall back to username
      const displayNameToSubmit = formData.displayName.trim() || formData.username
      
      // Construct the correct API URL
      const url = constructApiUrl('auth/register')
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          username: formData.username,
          displayName: displayNameToSubmit,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Store token in localStorage for successful registration
        if (data.data?.token) {
          localStorage.setItem('authToken', data.data.token)
        }
        
        // Call success callback with just user data (as tests expect)
        onRegisterSuccess?.(data.data.user)
      } else {
        // Handle API error response - use specific error message from API
        const errorMessage = data.message || data.error || 'Registration failed. Please try again.'
        setGeneralError(errorMessage)
        onRegisterError?.(errorMessage)
      }
    } catch (error) {
      // Handle network or other errors
      const errorMessage = 'Registration failed. Please try again.'
      setGeneralError(errorMessage)
      onRegisterError?.(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="register-page-container">
      <div className="register-container">
        <div className="register-header">
          <h1>Create Account</h1>
          <p>Join Parasocial and start sharing your thoughts!</p>
        </div>
        
        <form 
          onSubmit={handleSubmit}
          className="register-form"
          aria-label="Registration form"
          noValidate
        >
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isLoading}
              className={`form-input ${fieldErrors.email ? 'error' : ''}`}
            />
            {fieldErrors.email && (
              <span className="error-message" role="alert">
                {fieldErrors.email}
              </span>
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
              required
              autoComplete="username"
              placeholder="Choose a unique username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              disabled={isLoading}
              className={`form-input ${fieldErrors.username ? 'error' : ''}`}
            />
            {fieldErrors.username && (
              <span className="error-message" role="alert">
                {fieldErrors.username}
              </span>
            )}
          </div>

          {/* Display Name Field */}
          <div className="form-group">
            <label htmlFor="displayName" className="form-label">
              Display Name <span className="optional">(optional)</span>
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              placeholder="How should others see your name?"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
              disabled={isLoading}
              className="form-input"
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
              required
              autoComplete="new-password"
              placeholder="Create a secure password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onBlur={() => handleFieldBlur('password')}
              disabled={isLoading}
              className={`form-input ${fieldErrors.password ? 'error' : ''}`}
            />
            {fieldErrors.password && (
              <span className="error-message" role="alert">
                {fieldErrors.password}
              </span>
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
              required
              autoComplete="new-password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              onBlur={() => handleFieldBlur('confirmPassword')}
              disabled={isLoading}
              className={`form-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
            />
            {fieldErrors.confirmPassword && (
              <span className="error-message" role="alert">
                {fieldErrors.confirmPassword}
              </span>
            )}
          </div>

          {/* General Error Message */}
          {generalError && (
            <div className="error-message general-error" role="alert">
              {generalError}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid()}
            aria-label="Create your account"
            className={`submit-button ${!isFormValid() ? 'disabled' : ''} ${isLoading ? 'loading' : ''}`}
          >
            {isLoading ? 'Creating Account...' : 'Create Your Account'}
          </button>
        </form>
        
        <div className="register-footer">
          <p>
            Already have an account? <a href="/login" className="login-link">Sign in here</a>
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
// Version: 1.10.0
// Fixed: URL construction to prevent double /api in API calls