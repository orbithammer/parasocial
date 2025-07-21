// Path: frontend/src/app/register/page.tsx
// Version: 1.0.3
// Register page component with form validation and submission
// Fixed: Added noValidate to disable browser validation, allowing custom validation to work

'use client'

import React, { useState, FormEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Type definitions for form data and validation errors
interface FormData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
}

interface ValidationErrors {
  email?: string
  password?: string
  confirmPassword?: string
  firstName?: string
  lastName?: string
  general?: string
}

// Type for API response
interface RegisterResponse {
  success?: boolean
  error?: string
  userId?: string
}

export default function RegisterPage(): React.JSX.Element {
  const router = useRouter()
  
  // Form state management
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  })
  
  // Loading and error state
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [errors, setErrors] = useState<ValidationErrors>({})

  // Email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  // Form validation function
  const validateForm = (): ValidationErrors => {
    const newErrors: ValidationErrors = {}

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    // First name validation
    if (!formData.firstName) {
      newErrors.firstName = 'First name is required'
    }

    // Last name validation
    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required'
    }

    return newErrors
  }

  // Handle input changes and clear related errors
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear related error when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name as keyof ValidationErrors]
        delete newErrors.general // Clear general errors too
        return newErrors
      })
    }
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    
    // Validate form
    const validationErrors = validateForm()
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    // Clear any existing errors
    setErrors({})
    setIsLoading(true)

    try {
      // Make API call to register endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName
        })
      })

      const data: RegisterResponse = await response.json()

      if (response.ok && data.success) {
        // Redirect to login page with success parameter
        router.push('/login?registered=true')
      } else {
        // Handle registration error
        setErrors({
          general: data.error || 'Registration failed'
        })
      }
    } catch (error) {
      // Handle network or other errors
      setErrors({
        general: 'Something went wrong. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Generate unique IDs for error messages
  const getErrorId = (fieldName: string): string => `${fieldName}-error`

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Page header */}
        <div>
          <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Register
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account to get started
          </p>
        </div>

        {/* Registration form */}
        <form 
          className="mt-8 space-y-6" 
          onSubmit={handleSubmit}
          aria-label="Register"
          role="form"
          noValidate
        >
          {/* General error message */}
          {errors.general && (
            <div 
              className="rounded-md bg-red-50 p-4"
              role="alert"
            >
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-required="true"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? getErrorId('email') : undefined}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
              />
              {errors.email && (
                <p 
                  id={getErrorId('email')} 
                  className="mt-1 text-sm text-red-600"
                  role="alert"
                >
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={errors.password ? 'true' : 'false'}
                aria-describedby={errors.password ? getErrorId('password') : undefined}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
              />
              {errors.password && (
                <p 
                  id={getErrorId('password')} 
                  className="mt-1 text-sm text-red-600"
                  role="alert"
                >
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm password field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                aria-required="true"
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                aria-describedby={errors.confirmPassword ? getErrorId('confirmPassword') : undefined}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
              />
              {errors.confirmPassword && (
                <p 
                  id={getErrorId('confirmPassword')} 
                  className="mt-1 text-sm text-red-600"
                  role="alert"
                >
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* First name field */}
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                autoComplete="given-name"
                required
                aria-required="true"
                aria-invalid={errors.firstName ? 'true' : 'false'}
                aria-describedby={errors.firstName ? getErrorId('firstName') : undefined}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.firstName ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={handleInputChange}
              />
              {errors.firstName && (
                <p 
                  id={getErrorId('firstName')} 
                  className="mt-1 text-sm text-red-600"
                  role="alert"
                >
                  {errors.firstName}
                </p>
              )}
            </div>

            {/* Last name field */}
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                autoComplete="family-name"
                required
                aria-required="true"
                aria-invalid={errors.lastName ? 'true' : 'false'}
                aria-describedby={errors.lastName ? getErrorId('lastName') : undefined}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.lastName ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={handleInputChange}
              />
              {errors.lastName && (
                <p 
                  id={getErrorId('lastName')} 
                  className="mt-1 text-sm text-red-600"
                  role="alert"
                >
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Registering...' : 'Register'}
            </button>
          </div>

          {/* Link to login page */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}

// Path: frontend/src/app/register/page.tsx
// Version: 1.0.3