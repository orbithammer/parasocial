// /contexts/AuthContext.tsx
// Version: 1.1.0
// Fixed file extension and export structure for proper TypeScript recognition

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/router'

// User type definition
export interface User {
  id: string
  email: string
  name: string
}

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
    const checkExistingToken = async (): Promise<void> => {
      const token = localStorage.getItem('auth-token')
      if (token) {
        try {
          setIsLoading(true)
          const response = await fetch('/api/auth/verify', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })

          if (response.ok) {
            const data = await response.json()
            setUser(data.user)
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('auth-token')
          }
        } catch (err) {
          // Network error or other issues
          localStorage.removeItem('auth-token')
        } finally {
          setIsLoading(false)
        }
      }
    }

    checkExistingToken()
  }, [])

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
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
        // Successful login
        setUser(data.user)
        localStorage.setItem('auth-token', data.token)
        router.push('/dashboard')
      } else {
        // Login failed
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      // Network error
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Register function
  const register = async (email: string, password: string, name: string): Promise<void> => {
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
        // Successful registration
        setUser(data.user)
        localStorage.setItem('auth-token', data.token)
        router.push('/dashboard')
      } else {
        // Registration failed
        setError(data.message || 'Registration failed')
      }
    } catch (err) {
      // Network error
      setError('Network error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Logout function
  const logout = (): void => {
    setUser(null)
    setError(null)
    localStorage.removeItem('auth-token')
    router.push('/login')
  }

  // Context value
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

// Export the context itself for advanced usage if needed
export { AuthContext }

// /contexts/AuthContext.tsx
// Version: 1.1.0
// Fixed file extension and export structure for proper TypeScript recognition