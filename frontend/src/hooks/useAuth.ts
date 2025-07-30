// frontend/src/hooks/useAuth.ts - v1.3 - Fixed token key and error handling for test compatibility
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

// Fixed token key to match test expectations
const AUTH_TOKEN_KEY = 'auth-token'

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
      localStorage.setItem(AUTH_TOKEN_KEY, token)
    } else {
      setUser(null)
      setIsAuthenticated(false)
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }
  }, [])

  // Login function - fixed to handle errors without throwing
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
        // Set specific error message for invalid credentials
        const errorMessage = errorData.message || 'Login failed'
        setError(errorMessage)
        return // Don't throw, just set error
      }

      const data: LoginResponse = await response.json()
      setAuthState(data.user, data.token)
    } catch (err) {
      // Handle network errors specifically
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [setAuthState])

  // Register function - fixed to handle errors without throwing
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
        // Set specific error message for registration failures
        const errorMessage = errorData.message || 'Registration failed'
        setError(errorMessage)
        return // Don't throw, just set error
      }

      const data: RegisterResponse = await response.json()
      setAuthState(data.user, data.token)
    } catch (err) {
      // Handle network errors specifically
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      setError(errorMessage)
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
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
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
          localStorage.removeItem(AUTH_TOKEN_KEY)
        }
      } catch (err) {
        // Token verification failed, remove it
        localStorage.removeItem(AUTH_TOKEN_KEY)
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

// frontend/src/hooks/useAuth.ts - v1.3 - Fixed token key and error handling for test compatibility