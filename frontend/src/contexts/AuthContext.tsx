// frontend/src/contexts/AuthContext.tsx
// Version: 1.2.0
// Updated to use new User type with displayName and username properties
// Changed: Import User from centralized types, updated interface

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@/types/user'

// Authentication context interface
export interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
  setError: (error: string | null) => void
}

// Create the context with explicit type
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Auth provider props interface
interface AuthProviderProps {
  children: ReactNode
}

// AuthProvider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      // Verify token with backend
      verifyToken(token)
    }
  }, [])

  // Verify authentication token
  const verifyToken = async (token: string) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData.user)
      } else {
        localStorage.removeItem('auth_token')
        setUser(null)
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      localStorage.removeItem('auth_token')
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        localStorage.setItem('auth_token', data.token)
        router.push('/dashboard')
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (error) {
      setError('Network error occurred')
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Register function
  const register = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, name })
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        localStorage.setItem('auth_token', data.token)
        router.push('/dashboard')
      } else {
        setError(data.message || 'Registration failed')
      }
    } catch (error) {
      setError('Network error occurred')
      console.error('Registration error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = () => {
    setUser(null)
    localStorage.removeItem('auth_token')
    router.push('/login')
  }

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    setUser,
    setError
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// frontend/src/contexts/AuthContext.tsx
// Version: 1.2.0
// Updated to use new User type with displayName and username properties
// Changed: Import User from centralized types, updated interface