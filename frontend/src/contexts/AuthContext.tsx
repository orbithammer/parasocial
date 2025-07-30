// frontend/src/contexts/AuthContext.tsx - v2.1 - Fixed token storage key to match test expectations
'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// User interface for authentication context
interface User {
  id: string
  username?: string
  email: string
  name?: string
  displayName?: string
  avatar?: string
  role?: string
}

// Authentication context interface
interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (email: string, username: string, password: string, displayName?: string) => Promise<void>
  clearError: () => void
  // Testing functions - exposed for test access
  setUser: (user: User | null) => void
  setError: (error: string | null) => void
  setLoading: (loading: boolean) => void
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Authentication provider props
interface AuthProviderProps {
  children: ReactNode
}

// Token storage key - updated to match test expectations
const TOKEN_KEY = 'auth-token'

// Authentication provider component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Clear any existing error when setting a new one
  const setErrorWithClear = (newError: string | null) => {
    setError(newError)
  }

  // Check for existing token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        try {
          // Verify token with backend
          const response = await fetch('/api/auth/verify', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const userData = await response.json()
            setUser(userData.user)
          } else {
            // Token is invalid, remove it
            localStorage.removeItem(TOKEN_KEY)
          }
        } catch (error) {
          console.error('Token verification failed:', error)
          localStorage.removeItem(TOKEN_KEY)
        }
      }
      setLoading(false)
    }

    initializeAuth()
  }, [])

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true)
    setErrorWithClear(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem(TOKEN_KEY, data.token)
        setUser(data.user)
      } else {
        setErrorWithClear(data.message || 'Login failed')
      }
    } catch (error) {
      setErrorWithClear('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Logout function
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setErrorWithClear(null)
  }

  // Register function
  const register = async (email: string, username: string, password: string, displayName?: string) => {
    setLoading(true)
    setErrorWithClear(null)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          username, 
          password, 
          displayName: displayName || username 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem(TOKEN_KEY, data.token)
        setUser(data.user)
      } else {
        setErrorWithClear(data.message || 'Registration failed')
      }
    } catch (error) {
      setErrorWithClear('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Clear error function
  const clearError = () => {
    setError(null)
  }

  const value: AuthContextType = {
    user,
    isLoading: loading,
    error,
    login,
    logout,
    register,
    clearError,
    // Expose setter functions for testing
    setUser,
    setError,
    setLoading,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use the authentication context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// frontend/src/contexts/AuthContext.tsx - v2.1 - Fixed token storage key to match test expectations