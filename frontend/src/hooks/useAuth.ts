// Path: frontend/src/hooks/useAuth.ts
// Version: 1.1.0
// Custom hook for authentication state management
// Fixed: Token verification now properly passes existing token to setAuthState

import { useState, useEffect, useCallback } from 'react'

// User data structure
export interface User {
  id: string
  email: string
  name: string
}

// Authentication state interface
interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

// Authentication actions interface
interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (name: string, email: string, password: string) => Promise<void>
  clearError: () => void
}

// Combined return type for the hook
export type UseAuthReturn = AuthState & AuthActions

// API response types
interface LoginResponse {
  user: User
  token: string
}

interface RegisterResponse {
  user: User
  token: string
}

interface ErrorResponse {
  message: string
}

interface VerifyTokenResponse {
  user: User
}

// Authentication hook implementation
export const useAuth = (): UseAuthReturn => {
  // Initialize state
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Clear any existing errors
  const clearError = useCallback((): void => {
    setError(null)
  }, [])

  // Set authentication state
  const setAuthState = useCallback((userData: User | null, token?: string): void => {
    if (userData && token) {
      // User is authenticated
      setUser(userData)
      setIsAuthenticated(true)
      localStorage.setItem('auth_token', token)
    } else {
      // User is not authenticated
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem('auth_token')
    }
    setIsLoading(false)
    setError(null)
  }, [])

  // Verify existing token on mount
  const verifyToken = useCallback(async (token: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data: VerifyTokenResponse = await response.json()
        setAuthState(data.user, token)
      } else {
        // Invalid token - remove it and set unauthenticated state
        localStorage.removeItem('auth_token')
        setAuthState(null)
      }
    } catch (err) {
      // Network or other error - remove token and set unauthenticated
      localStorage.removeItem('auth_token')
      setAuthState(null)
    }
  }, [setAuthState])

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (response.ok) {
        const data: LoginResponse = await response.json()
        setAuthState(data.user, data.token)
      } else {
        const errorData: ErrorResponse = await response.json()
        setError(errorData.message)
        setIsLoading(false)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      setIsLoading(false)
    }
  }, [setAuthState])

  // Register function
  const register = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      })

      if (response.ok) {
        const data: RegisterResponse = await response.json()
        setAuthState(data.user, data.token)
      } else {
        const errorData: ErrorResponse = await response.json()
        setError(errorData.message)
        setIsLoading(false)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      setIsLoading(false)
    }
  }, [setAuthState])

  // Logout function
  const logout = useCallback((): void => {
    setAuthState(null)
  }, [setAuthState])

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    
    if (token) {
      setIsLoading(true)
      verifyToken(token)
    }
  }, [verifyToken])

  // Return the complete auth state and actions
  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    clearError
  }
}

// Path: frontend/src/hooks/useAuth.ts
// Version: 1.1.0
// Custom hook for authentication state management
// Fixed: Token verification now properly passes existing token to setAuthState