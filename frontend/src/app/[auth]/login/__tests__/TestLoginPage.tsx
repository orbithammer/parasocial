// frontend/src/app/(auth)/login/__tests__/TestLoginPage.tsx
// Test component for login page interactions (JSX version for testing)
// Version: 1.0.0

'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'

// Login form data interface
interface LoginFormData {
  email: string
  password: string
}

// Login form validation errors interface
interface LoginFormErrors {
  email?: string
  password?: string
  general?: string
}

// API response interface for authentication
interface AuthResponse {
  success: boolean
  data?: {
    user: {
      id: string
      username: string
      email: string
      displayName: string | null
      isVerified: boolean
    }
    token: string
  }
  error?: {
    code: string
    message: string
  }
}

/**
 * Validates email format using basic regex pattern
 * @param email - Email string to validate
 * @returns True if email format is valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validates login form data and returns any validation errors
 * @param formData - Form data to validate
 * @returns Object containing validation errors or empty object if valid
 */
function validateLoginForm(formData: LoginFormData): LoginFormErrors {
  const errors: LoginFormErrors = {}
  
  // Email validation
  if (!formData.email.trim()) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(formData.email)) {
    errors.email = 'Please enter a valid email address'
  }
  
  // Password validation
  if (!formData.password) {
    errors.password = 'Password is required'
  }
  
  return errors
}

/**
 * Test login page component with form handling and validation
 * Used specifically for testing user interactions
 * @returns JSX element for the complete login page
 */
export function TestLoginPage() {
  // Form state management
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  })
  
  // Error state management
  const [errors, setErrors] = useState<LoginFormErrors>({})
  
  // Loading state for form submission
  const [isLoading, setIsLoading] = useState(false)
  
  // Show/hide password toggle
  const [showPassword, setShowPassword] = useState(false)

  /**
   * Handles form input changes and clears related errors
   * @param field - The form field being updated
   * @param value - The new value for the field
   */
  function handleInputChange(field: keyof LoginFormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear errors for the field being edited
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    
    // Clear general errors when user starts typing
    if (errors.general) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.general
        return newErrors
      })
    }
  }

  /**
   * Handles form submission with validation and API call
   * @param event - Form submission event
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    
    // Validate form data
    const validationErrors = validateLoginForm(formData)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    
    setIsLoading(true)
    setErrors({})
    
    try {
      // Make API call to login endpoint
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      const result: AuthResponse = await response.json()
      
      if (result.success && result.data) {
        // Store auth token (in production, use secure HTTP-only cookies)
        localStorage.setItem('auth_token', result.data.token)
        
        // Redirect to dashboard or home page
        window.location.href = '/dashboard'
      } else {
        // Handle authentication errors
        setErrors({
          general: result.error?.message || 'Login failed. Please try again.'
        })
      }
    } catch (error) {
      // Handle network or unexpected errors
      setErrors({
        general: 'Unable to connect. Please check your internet connection and try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Page header */}
        <header className="text-center">
          {/* Brand logo */}
          <Link href="/" className="inline-flex items-center gap-3 mb-6" data-testid="brand-link">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">ParaSocial</span>
          </Link>
          
          {/* Page title and description */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Welcome back
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to your ParaSocial account to start creating content for the fediverse.
          </p>
        </header>

        {/* Login form */}
        <main>
          <form onSubmit={handleSubmit} className="card-base space-y-6" noValidate data-testid="login-form">
            {/* General error message */}
            {errors.general && (
              <div 
                className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                role="alert"
                aria-live="polite"
                data-testid="general-error"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{errors.general}</span>
                </div>
              </div>
            )}

            {/* Email field */}
            <div className="space-y-2">
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`input-base ${errors.email ? 'border-red-500 dark:border-red-400' : ''}`}
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isLoading}
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={!!errors.email}
                data-testid="email-input"
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-red-600 dark:text-red-400" role="alert" data-testid="email-error">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={`input-base pr-12 ${errors.password ? 'border-red-500 dark:border-red-400' : ''}`}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isLoading}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  aria-invalid={!!errors.password}
                  data-testid="password-input"
                />
                {/* Show/hide password toggle button */}
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  data-testid="password-toggle"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-red-600 dark:text-red-400" role="alert" data-testid="password-error">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-base w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
              data-testid="submit-button"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Additional options */}
            <div className="space-y-4 text-center">
              {/* Forgot password link */}
              <Link 
                href="/forgot-password" 
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                data-testid="forgot-password-link"
              >
                Forgot your password?
              </Link>
              
              {/* Sign up link */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link 
                  href="/register" 
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                  data-testid="register-link"
                >
                  Sign up for ParaSocial
                </Link>
              </div>
            </div>
          </form>
        </main>

        {/* Footer information */}
        <footer className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            By signing in, you agree to broadcast your content to the fediverse through ActivityPub federation.
          </p>
        </footer>
      </div>
    </div>
  )
}