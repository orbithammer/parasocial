'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import LoginComponent from '@/components/auth/LoginComponent'

/**
 * User data structure from successful login
 */
interface LoginSuccessData {
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
 * Login page component
 * Handles the complete login flow and redirects after successful authentication
 */
export default function LoginPage() {
  const router = useRouter()
  const [loginStatus, setLoginStatus] = useState<{
    type: 'success' | 'error' | null
    message: string
  }>({ type: null, message: '' })

  /**
   * Handle successful login
   * Stores user data and redirects to dashboard or intended page
   */
  const handleLoginSuccess = (userData: LoginSuccessData) => {
    // Store user data in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userData.user))
      // Token is already stored by LoginComponent
    }

    // Show success message briefly
    setLoginStatus({
      type: 'success',
      message: `Welcome back, ${userData.user.displayName}!`
    })

    // Redirect after short delay to show success message
    setTimeout(() => {
      // Check if there's a redirect URL from where they came from
      const searchParams = new URLSearchParams(window.location.search)
      const redirectTo = searchParams.get('redirect') || '/dashboard'
      
      router.push(redirectTo)
    }, 1500)
  }

  /**
   * Handle login error
   * Shows error message to user
   */
  const handleLoginError = (error: string) => {
    setLoginStatus({
      type: 'error',
      message: error
    })

    // Clear error message after 5 seconds
    setTimeout(() => {
      setLoginStatus({ type: null, message: '' })
    }, 5000)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        {/* Page header */}
        <header className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ParaSocial
          </h1>
          <p className="text-gray-600">
            Sign in to your creator account
          </p>
        </header>

        {/* Status message display */}
        {loginStatus.type && (
          <div 
            className={`p-4 rounded-md ${
              loginStatus.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}
            role="alert"
          >
            <div className="flex">
              <div className="flex-shrink-0">
                {loginStatus.type === 'success' ? (
                  <span className="text-green-400" aria-hidden="true">✓</span>
                ) : (
                  <span className="text-red-400" aria-hidden="true">⚠️</span>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${
                  loginStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {loginStatus.message}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Login form component */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-8 py-6">
          <LoginComponent
            onLoginSuccess={handleLoginSuccess}
            onLoginError={handleLoginError}
            apiBaseUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}
          />
        </div>

        {/* Footer links */}
        <footer className="text-center space-y-4">
          <div className="text-sm text-gray-600">
            New to ParaSocial?{' '}
            <a 
              href="/register" 
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Create your creator account
            </a>
          </div>
          
          <div className="text-xs text-gray-500 space-x-4">
            <a href="/privacy" className="hover:text-gray-700 transition-colors">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="/terms" className="hover:text-gray-700 transition-colors">
              Terms of Service
            </a>
            <span>•</span>
            <a href="/help" className="hover:text-gray-700 transition-colors">
              Help Center
            </a>
          </div>
        </footer>
      </div>
    </main>
  )
}