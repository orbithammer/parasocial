// frontend/src/components/auth/RegisterComponent.tsx
// Version: 1.10.0
// Fixed: isFormValid function definition to ensure proper TypeScript function type

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

  // Form validation - Fixed: Explicit function type annotation
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
  const handleInputChange = (field: keyof RegisterFormData, value: string): void => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear field-specific errors when user starts typing
    if (fieldErrors[field as keyof FormErrors]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }))
    }
    
    // Clear general error when user makes any changes
    if (generalError) {
      setGeneralError('')
    }

    // Real-time validation for password confirmation
    if (field === 'confirmPassword' || field === 'password') {
      const newFormData = { ...formData, [field]: value }
      if (newFormData.password && newFormData.confirmPassword) {
        if (newFormData.password !== newFormData.confirmPassword) {
          setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }))
        } else {
          setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }))
        }
      }
    }

    // Real-time validation for other fields
    if (field === 'email' && value) {
      if (!validateEmail(value)) {
        setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }))
      } else {
        setFieldErrors(prev => ({ ...prev, email: undefined }))
      }
    }

    if (field === 'username' && value) {
      if (!validateUsername(value)) {
        setFieldErrors(prev => ({ ...prev, username: 'Username must be at least 3 characters and contain only letters, numbers, and underscores' }))
      } else {
        setFieldErrors(prev => ({ ...prev, username: undefined }))
      }
    }

    if (field === 'password' && value) {
      if (!validatePassword(value)) {
        setFieldErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters with uppercase, lowercase, and number' }))
      } else {
        setFieldErrors(prev => ({ ...prev, password: undefined }))
      }
    }
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    
    if (!isFormValid() || isLoading) {
      return
    }

    setIsLoading(true)
    setGeneralError('')
    setFieldErrors({})

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          username: formData.username.trim(),
          displayName: formData.displayName.trim() || formData.username.trim(),
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.error) {
          setGeneralError(data.error)
          onRegisterError?.(data.error)
        } else {
          const errorMsg = 'Registration failed. Please try again.'
          setGeneralError(errorMsg)
          onRegisterError?.(errorMsg)
        }
        return
      }

      // Success
      onRegisterSuccess?.(data.data || data)
    } catch (error) {
      const errorMsg = 'Registration failed. Please try again.'
      setGeneralError(errorMsg)
      onRegisterError?.(errorMsg)
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
        
        {generalError && (
          <div className="general-error" role="alert">
            {generalError}
          </div>
        )}
        
        <form 
          onSubmit={handleSubmit} 
          className="register-form"
          aria-label="Registration form"
          noValidate
        >
          {/* Email field */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email address"
              className={`form-input ${fieldErrors.email ? 'error' : ''}`}
              required
              autoComplete="email"
            />
            {fieldErrors.email && (
              <span className="field-error" role="alert">{fieldErrors.email}</span>
            )}
          </div>
          
          {/* Username field */}
          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Choose a unique username"
              className={`form-input ${fieldErrors.username ? 'error' : ''}`}
              required
              autoComplete="username"
            />
            {fieldErrors.username && (
              <span className="field-error" role="alert">{fieldErrors.username}</span>
            )}
          </div>
          
          {/* Display Name field */}
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
              placeholder="How should others see your name?"
              className="form-input"
              autoComplete="name"
            />
          </div>
          
          {/* Password field */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Create a secure password"
              className={`form-input ${fieldErrors.password ? 'error' : ''}`}
              required
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <span className="field-error" role="alert">{fieldErrors.password}</span>
            )}
          </div>
          
          {/* Confirm Password field */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm your password"
              className={`form-input ${fieldErrors.confirmPassword ? 'error' : ''}`}
              required
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <span className="field-error" role="alert">{fieldErrors.confirmPassword}</span>
            )}
          </div>
          
          {/* Submit button */}
          <button
            type="submit"
            className={`submit-button ${!isFormValid() ? 'disabled' : ''} ${isLoading ? 'loading' : ''}`}
            disabled={!isFormValid() || isLoading}
            aria-label="Create your account"
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
// Fixed: isFormValid function definition to ensure proper TypeScript function type