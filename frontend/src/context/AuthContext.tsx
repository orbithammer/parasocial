// frontend/src/context/AuthContext.tsx
// Authentication context provider for global user state management
// Version: 1.0.0 - Initial authentication context with JWT token management

'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

// User interface matching backend AuthController response
export interface User {
  id: string
  email: string
  username: string
  displayName: string
  avatar: string | null
  isVerified: boolean
  verificationTier?: string | null
}

// Authentication state interface
export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Login credentials interface
export interface LoginCredentials {
  email: string
  password: string
}

// Registration data interface
export interface RegisterData {
  email: string
  username: string
  password: string
  confirmPassword: string
  displayName: string
}

// API response interfaces matching backend format
interface AuthApiResponse {
  success: boolean
  data?: {
    user: User
    token: string
  }
  error?: {
    code: string
    message: string
  }
  details?: Array<{ message: string }>
}

// Context methods interface
export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  clearError: () => void
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | null>(null)

// Custom hook to use the auth context with type safety
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// AuthProvider component props
interface AuthProviderProps {
  children: ReactNode
  apiBaseUrl?: string
}

/**
 * Authentication provider component that manages global auth state
 * Handles login, registration, logout, and token persistence
 * Automatically restores user session from localStorage on app start
 */
export function AuthProvider({ 
  children, 
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1' 
}: AuthProviderProps) {
  // Authentication state
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start as loading to check existing session
  const [error, setError] = useState<string | null>(null)

  // Computed authentication status
  const isAuthenticated = !!(user && token)

  /**
   * Store authentication data in localStorage and state
   */
  const storeAuthData = (userData: User, authToken: string) => {
    // Update state
    setUser(userData)
    setToken(authToken)
    
    // Persist to localStorage
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('token', authToken)
    
    // Clear any existing errors
    setError(null)
  }

  /**
   * Clear authentication data from state and localStorage
   */
  const clearAuthData = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    setError(null)
  }

  /**
   * Make authenticated API request with error handling
   */
  const makeAuthenticatedRequest = async (
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    const currentToken = token || localStorage.getItem('token')
    
    const response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken && { 'Authorization': `Bearer ${currentToken}` }),
        ...options.headers,
      },
    })

    // Handle token expiration
    if (response.status === 401) {
      clearAuthData()
      throw new Error('Your session has expired. Please log in again.')
    }

    return response
  }

  /**
   * Login user with email and password
   */
  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      const result: AuthApiResponse = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Login failed')
      }

      if (!result.data) {
        throw new Error('Invalid response format')
      }

      // Store authentication data
      storeAuthData(result.data.user, result.data.token)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Register new user account
   */
  const register = async (data: RegisterData): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result: AuthApiResponse = await response.json()

      if (!response.ok || !result.success) {
        // Handle validation errors
        if (result.details && result.details.length > 0) {
          throw new Error(result.details[0].message)
        }
        throw new Error(result.error?.message || 'Registration failed')
      }

      if (!result.data) {
        throw new Error('Invalid response format')
      }

      // Store authentication data
      storeAuthData(result.data.user, result.data.token)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Logout user and clear all authentication data
   */
  const logout = () => {
    clearAuthData()
    // Optional: Make API call to backend logout endpoint if implemented
  }

  /**
   * Refresh current user data from API
   */
  const refreshUser = async (): Promise<void> => {
    if (!token) return

    try {
      const response = await makeAuthenticatedRequest('/auth/me')
      const result = await response.json()

      if (result.success && result.data) {
        setUser(result.data)
        localStorage.setItem('user', JSON.stringify(result.data))
      }
    } catch (err) {
      console.error('Failed to refresh user data:', err)
      // Don't throw here - this is a background operation
    }
  }

  /**
   * Clear any authentication errors
   */
  const clearError = () => {
    setError(null)
  }

  /**
   * Initialize authentication state from localStorage on app start
   */
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUser = localStorage.getItem('user')
        const storedToken = localStorage.getItem('token')

        if (storedUser && storedToken) {
          const userData = JSON.parse(storedUser)
          setUser(userData)
          setToken(storedToken)
        }
      } catch (err) {
        console.error('Failed to restore authentication state:', err)
        // Clear corrupted data
        clearAuthData()
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Context value object
  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshUser,
    clearError,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Custom hook for checking if user is authenticated
 * Useful for conditional rendering
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth()
  return isAuthenticated
}

/**
 * Custom hook to get current user data
 * Returns null if not authenticated
 */
export function useCurrentUser(): User | null {
  const { user } = useAuth()
  return user
}

/**
 * Higher-order component for protecting routes that require authentication
 * Redirects to login if user is not authenticated
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth()

    // Show loading spinner while checking authentication
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return null
    }

    return <Component {...props} />
  }
}