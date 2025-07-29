// frontend/src/hooks/useAuth.ts
// Version: 1.2.0
// Updated to use new User type with displayName and username properties
// Import: User type from centralized types file

import { useState, useEffect, useCallback } from 'react'
import { User } from '@/types/user'

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
      setUser(userData)
      setIsAuthenticated(true)
      localStorage.setItem('auth_token', token)
    } else {
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem('auth_token')
    }
  }, [])

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json()
        throw new Error(errorData.message || 'Login failed')
      }

      const data: LoginResponse = await response.json()
      setAuthState(data.user, data.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [setAuthState])

  // Register function
  const register = useCallback(async (name: string, email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json()
        throw new Error(errorData.message || 'Registration failed')
      }

      const data: RegisterResponse = await response.json()
      setAuthState(data.user, data.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [setAuthState])

  // Logout function
  const logout = useCallback((): void => {
    setAuthState(null)
  }, [setAuthState])

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async (): Promise<void> => {
      const token = localStorage.getItem('auth_token')
      if (!token) return

      try {
        setIsLoading(true)
        const response = await fetch('/api/auth/verify', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data: VerifyTokenResponse = await response.json()
          setAuthState(data.user, token)
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('auth_token')
        }
      } catch (err) {
        // Token verification failed, remove it
        localStorage.removeItem('auth_token')
      } finally {
        setIsLoading(false)
      }
    }

    verifyToken()
  }, [setAuthState])

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    clearError,
  }
}

// frontend/src/hooks/useAuth.ts
// Version: 1.2.0
// Updated to use new User type with displayName and username properties
// Import: User type from centralized types file