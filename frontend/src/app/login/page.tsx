// frontend/src/app/login/page.tsx
// Version: 3.0.0
// Changed: Simplified login flow with proper navigation timing

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface LoginResponse {
  success: boolean
  data?: {
    user: {
      id: string
      email: string
      username: string
      displayName: string
    }
    token: string
  }
  error?: string
}

/**
 * Login page component
 * Handles user authentication and navigation to dashboard
 */
export default function LoginPage(): React.JSX.Element {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  /**
   * Handles form input changes
   * Clears error state when user starts typing
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  /**
   * Handles form submission and login process
   * Sets authentication cookies and navigates to dashboard
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      // Make login request to backend
      const response = await fetch('http://localhost:3001/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      })
      
      const result: LoginResponse = await response.json()
      
      if (response.ok && result.success && result.data) {
        // Set authentication cookie for middleware
        document.cookie = `auth-token=${result.data.token}; path=/; max-age=86400; secure=false; samesite=lax`
        
        // Store user data in localStorage
        localStorage.setItem('authToken', result.data.token)
        localStorage.setItem('user', JSON.stringify(result.data.user))
        
        // Wait for cookie to be set, then navigate
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 100)
        
      } else {
        setError(result.error || 'Login failed. Please check your credentials.')
      }
      
    } catch (networkError) {
      setError('Unable to connect to server. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <header>
          <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome back! Please enter your credentials.
          </p>
        </header>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Error message display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded" role="alert">
              <span className="font-medium">Error:</span> {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Email input field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                placeholder="Enter your email"
              />
            </div>

            {/* Password input field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          {/* Registration link */}
          <div className="text-center">
            <Link 
              href="/register" 
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Need an account? Sign up here
            </Link>
          </div>
        </form>
      </div>
    </main>
  )
}

// frontend/src/app/login/page.tsx
// Version: 3.0.0