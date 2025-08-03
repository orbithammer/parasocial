// frontend/src/app/login/page.tsx
// Version: 2.4.0
// Enhanced debugging to identify navigation blocking issue
// Changed: Added navigation interception, GET request testing, and redirect detection

'use client'

import { useState, useEffect } from 'react'
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
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugInfo = (message: string) => {
    console.log('DEBUG:', message)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  // Listen for navigation events
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      addDebugInfo('🔄 Page about to unload - navigation starting')
    }

    const handleUnload = (e: Event) => {
      console.log('🚪 Page unloaded - navigation completed')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('unload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('unload', handleUnload)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const testFullDashboardAccess = async (): Promise<boolean> => {
    try {
      addDebugInfo('🧪 Testing full GET request to /dashboard...')
      
      const response = await fetch('/dashboard', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      })
      
      addDebugInfo(`GET /dashboard response: ${response.status} ${response.statusText}`)
      addDebugInfo(`Response URL: ${response.url}`)
      addDebugInfo(`Redirected: ${response.redirected}`)
      
      if (response.redirected) {
        addDebugInfo(`❌ Server redirected to: ${response.url}`)
        return false
      }
      
      if (response.status === 200) {
        addDebugInfo('✅ Full GET request successful')
        return true
      }
      
      return false
    } catch (error) {
      addDebugInfo(`❌ GET test failed: ${error}`)
      return false
    }
  }

  const attemptMultipleNavigation = async () => {
    addDebugInfo('🎯 Starting navigation attempts...')
    
    // Method 1: Direct window.location
    addDebugInfo('📍 Method 1: window.location.href')
    window.location.href = '/dashboard'
    
    // Wait to see if navigation happened
    await new Promise(resolve => setTimeout(resolve, 500))
    addDebugInfo('🤔 Still here after window.location.href - trying alternatives')
    
    // Method 2: window.location.assign
    addDebugInfo('📍 Method 2: window.location.assign')
    window.location.assign('/dashboard')
    
    await new Promise(resolve => setTimeout(resolve, 500))
    addDebugInfo('🤔 Still here after assign - trying replace')
    
    // Method 3: window.location.replace
    addDebugInfo('📍 Method 3: window.location.replace')
    window.location.replace('/dashboard')
    
    await new Promise(resolve => setTimeout(resolve, 500))
    addDebugInfo('🤔 Still here after replace - trying router')
    
    // Method 4: Next.js router with refresh
    addDebugInfo('📍 Method 4: router.refresh + router.push')
    router.refresh()
    router.push('/dashboard')
    
    await new Promise(resolve => setTimeout(resolve, 500))
    addDebugInfo('❌ All navigation methods failed')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setDebugInfo([])
    
    try {
      addDebugInfo('🚀 Starting login process...')
      
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
        const token = result.data.token
        addDebugInfo(`🎫 Token received: ${token.substring(0, 20)}...`)
        
        // Set cookie
        document.cookie = `auth-token=${token}; path=/; max-age=86400; secure=false; samesite=lax`
        addDebugInfo('🍪 Cookie set')
        
        // Store in localStorage
        localStorage.setItem('authToken', token)
        localStorage.setItem('user', JSON.stringify(result.data.user))
        addDebugInfo('💾 LocalStorage updated')
        
        // Wait for cookie to propagate
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Test full access
        const hasAccess = await testFullDashboardAccess()
        
        if (hasAccess) {
          // Try multiple navigation methods
          await attemptMultipleNavigation()
        } else {
          addDebugInfo('❌ Full access test failed')
          setError('Authentication succeeded but dashboard access blocked')
        }
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
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              Need an account? Sign up here
            </Link>
          </div>
        </form>

        {/* Debug Panel */}
        {debugInfo.length > 0 && (
          <div className="mt-8 bg-gray-100 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Debug Information:</h3>
            <div className="text-xs space-y-1 max-h-60 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index} className="font-mono text-gray-700">{info}</div>
              ))}
            </div>
          </div>
        )}

        {/* Manual Navigation Test */}
        <div className="mt-4">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full py-2 px-4 bg-gray-600 text-white rounded-md text-sm"
          >
            Manual Test: Go to Dashboard
          </button>
        </div>
      </div>
    </main>
  )
}

// frontend/src/app/login/page.tsx
// Version: 2.4.0