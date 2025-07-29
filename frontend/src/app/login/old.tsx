// frontend/src/app/login/page.tsx
// Version: 2.1.0
// Fixed: Completed handleSubmit function with proper error handling and navigation
// Changed: Added finally block and proper catch block completion

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

export default function LoginPage(): React.JSX.Element {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('') // Clear error when user types
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
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
        // Set cookie that middleware expects
        document.cookie = `auth-token=${result.data.token}; path=/; max-age=86400; secure=false; samesite=lax`
        
        // Store in localStorage too
        localStorage.setItem('authToken', result.data.token)
        localStorage.setItem('user', JSON.stringify(result.data.user))
        
        // Navigate to dashboard with replace to prevent back navigation to login
        router.replace('/dashboard')
      } else {
        setError(result.error || 'Login failed. Please check your credentials.')
      }
      
    } catch (networkError) {
      console.error('Login network error:', networkError)
      setError('Unable to connect to server. Please try again.')
    } finally {
      // Always reset loading state regardless of success or failure
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

        <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
          {error && (
            <div 
              className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Email field */}
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-grey-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                placeholder="Enter your email"
              />
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
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-grey-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={isLoading || !formData.email || !formData.password}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          {/* Link to register */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link 
                href="/register" 
                className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded"
              >
                Register here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}

// frontend/src/app/login/page.tsx
// Version: 2.1.0
// Fixed: Completed handleSubmit function with proper error handling and navigation