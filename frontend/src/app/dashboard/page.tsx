// frontend/src/app/login/page.tsx - Version 4.0.0
// Rewritten login page with proper useAuth integration
// Changed: Integrated useAuth hook, removed manual localStorage handling, added proper error states

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

/**
 * Login page component with integrated authentication
 * Uses useAuth hook for proper state management
 */
export default function LoginPage(): React.ReactElement {
  const router = useRouter()
  const { login, user, isLoading, error, clearError } = useAuth()
  
  // Calculate isAuthenticated from user presence
  const isAuthenticated = !!user
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, router])

  /**
   * Handle input changes and clear errors
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (error) {
      clearError()
    }
  }

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = (): void => {
    setShowPassword(prev => !prev)
  }

  /**
   * Handle form submission using useAuth hook
   */
  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    
    if (isSubmitting || isLoading) return
    
    // Basic validation
    if (!formData.email.trim() || !formData.password.trim()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      await login(formData.email, formData.password)
      // Navigation handled by useEffect when isAuthenticated changes
    } catch (err) {
      // Error handling is managed by useAuth hook
      console.error('Login error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading spinner during initial auth check
  if (isLoading && !isSubmitting) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </main>
    )
  }

  // Don't render form if already authenticated (prevents flash)
  if (isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <header className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Welcome back to ParaSocial!
          </p>
        </header>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="text-red-600 mr-3">✕</div>
              <div>
                <h3 className="text-red-800 font-semibold">Login Failed</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="ml-auto text-red-600 hover:text-red-800"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isSubmitting}
                aria-describedby="email-description"
              />
              <p id="email-description" className="sr-only">
                Enter the email address associated with your account
              </p>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 
                            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                            disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  aria-describedby="password-description"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600
                            disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={togglePasswordVisibility}
                  disabled={isSubmitting}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p id="password-description" className="sr-only">
                Enter your account password
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent 
                        text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 
                        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600
                        transition-colors duration-200"
              disabled={isSubmitting || !formData.email.trim() || !formData.password.trim()}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </div>

          {/* Form Footer */}
          <div className="text-center space-y-4">
            <div>
              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none 
                          focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              >
                Forgot your password?
              </Link>
            </div>
            
            <div className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="font-medium text-blue-600 hover:text-blue-500 focus:outline-none 
                          focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              >
                Sign up here
              </Link>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}

// frontend/src/app/login/page.tsx - Version 4.0.0
// Rewritten login page with proper useAuth integration
// Changed: Integrated useAuth hook, removed manual localStorage handling, added proper error states