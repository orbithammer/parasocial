// frontend/src/context/__tests__/AuthContext.test.ts
// Unit test suite for AuthContext authentication provider
// Version: 1.0.0 - Initial test suite covering all AuthContext functionality

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import React from 'react'
import {
  AuthProvider,
  useAuth,
  useIsAuthenticated,
  useCurrentUser,
  withAuth,
  User,
  LoginCredentials,
  RegisterData,
  AuthContextType
} from '../AuthContext'

// Mock fetch globally
global.fetch = vi.fn()
const mockFetch = fetch as Mock

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock console.error to avoid noise in tests
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

// Test data fixtures
const mockUser: User = {
  id: '123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  avatar: null,
  isVerified: true,
  verificationTier: 'basic'
}

const mockToken = 'mock-jwt-token'

const mockSuccessResponse = {
  success: true,
  data: {
    user: mockUser,
    token: mockToken
  }
}

const mockErrorResponse = {
  success: false,
  error: {
    code: 'AUTH_ERROR',
    message: 'Authentication failed'
  }
}

const mockValidationErrorResponse = {
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed'
  },
  details: [
    { message: 'Email is required' }
  ]
}

// Helper function to create wrapper with AuthProvider
const createWrapper = (apiBaseUrl?: string) => {
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider apiBaseUrl={apiBaseUrl}>
      {children}
    </AuthProvider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('AuthProvider', () => {
    it('should initialize with default state when no stored data exists', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBe(null)
      expect(result.current.token).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should restore user session from localStorage on initialization', async () => {
      // Setup localStorage with stored data
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'user') return JSON.stringify(mockUser)
        if (key === 'token') return mockToken
        return null
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.token).toBe(mockToken)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should handle corrupted localStorage data gracefully', async () => {
      // Setup localStorage with invalid JSON
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'user') return 'invalid-json'
        if (key === 'token') return mockToken
        return null
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should clear corrupted data and reset to initial state
      expect(result.current.user).toBe(null)
      expect(result.current.token).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
    })
  })

  describe('login method', () => {
    it('should successfully log in a user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      await act(async () => {
        await result.current.login(credentials)
      })

      // Verify API call
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(credentials)
        }
      )

      // Verify state updates
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.token).toBe(mockToken)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.error).toBe(null)

      // Verify localStorage persistence
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser))
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockToken)
    })

    it('should handle login failure with error message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      }

      await expect(act(async () => {
        await result.current.login(credentials)
      })).rejects.toThrow('Authentication failed')

      // Verify error state
      expect(result.current.user).toBe(null)
      expect(result.current.token).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBe('Authentication failed')
    })

    it('should handle network errors during login', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      await expect(act(async () => {
        await result.current.login(credentials)
      })).rejects.toThrow('Network error')

      expect(result.current.error).toBe('Network error')
    })
  })

  describe('register method', () => {
    it('should successfully register a new user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const registerData: RegisterData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123',
        displayName: 'Test User'
      }

      await act(async () => {
        await result.current.register(registerData)
      })

      // Verify API call
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registerData)
        }
      )

      // Verify state updates
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.token).toBe(mockToken)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should handle validation errors during registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockValidationErrorResponse
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const registerData: RegisterData = {
        email: '',
        username: 'testuser',
        password: 'password123',
        confirmPassword: 'password123',
        displayName: 'Test User'
      }

      await expect(act(async () => {
        await result.current.register(registerData)
      })).rejects.toThrow('Email is required')

      expect(result.current.error).toBe('Email is required')
    })
  })

  describe('logout method', () => {
    it('should clear user data and localStorage on logout', async () => {
      // Start with authenticated state
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'user') return JSON.stringify(mockUser)
        if (key === 'token') return mockToken
        return null
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      act(() => {
        result.current.logout()
      })

      // Verify state is cleared
      expect(result.current.user).toBe(null)
      expect(result.current.token).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBe(null)

      // Verify localStorage is cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token')
    })
  })

  describe('refreshUser method', () => {
    it('should refresh user data when authenticated', async () => {
      const updatedUser = { ...mockUser, displayName: 'Updated Name' }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: updatedUser
        })
      })

      // Start with authenticated state
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'user') return JSON.stringify(mockUser)
        if (key === 'token') return mockToken
        return null
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.refreshUser()
      })

      // Verify API call with auth header
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/auth/me',
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockToken}`
          }
        }
      )

      // Verify user data is updated
      expect(result.current.user).toEqual(updatedUser)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(updatedUser))
    })

    it('should handle 401 response and clear auth data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })

      // Start with authenticated state
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'user') return JSON.stringify(mockUser)
        if (key === 'token') return mockToken
        return null
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.refreshUser()
      })

      // Should clear auth data on 401
      expect(result.current.user).toBe(null)
      expect(result.current.token).toBe(null)
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('clearError method', () => {
    it('should clear error state', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      // Set an error first
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      try {
        await act(async () => {
          await result.current.login({ email: 'test@test.com', password: 'wrong' })
        })
      } catch {
        // Expected to fail
      }

      expect(result.current.error).toBe('Authentication failed')

      // Clear the error
      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Mock console.error to capture the error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })
  })

  describe('useIsAuthenticated hook', () => {
    it('should return false when not authenticated', async () => {
      const { result } = renderHook(() => useIsAuthenticated(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current).toBe(false)
      })
    })

    it('should return true when authenticated', async () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'user') return JSON.stringify(mockUser)
        if (key === 'token') return mockToken
        return null
      })

      const { result } = renderHook(() => useIsAuthenticated(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current).toBe(true)
      })
    })
  })

  describe('useCurrentUser hook', () => {
    it('should return null when not authenticated', async () => {
      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current).toBe(null)
      })
    })

    it('should return user data when authenticated', async () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'user') return JSON.stringify(mockUser)
        if (key === 'token') return mockToken
        return null
      })

      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current).toEqual(mockUser)
      })
    })
  })

  describe('withAuth HOC', () => {
    // Mock component for testing
    const TestComponent = () => <div>Protected Content</div>

    it('should render protected component when authenticated', async () => {
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'user') return JSON.stringify(mockUser)
        if (key === 'token') return mockToken
        return null
      })

      const ProtectedComponent = withAuth(TestComponent)

      render(
        <AuthProvider>
          <ProtectedComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })
    })

    it('should show loading spinner while checking authentication', () => {
      const ProtectedComponent = withAuth(TestComponent)

      render(
        <AuthProvider>
          <ProtectedComponent />
        </AuthProvider>
      )

      // Should show loading spinner initially
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should redirect to login when not authenticated', async () => {
      // Mock window.location.href
      delete (window as any).location
      window.location = { href: '' } as any

      const ProtectedComponent = withAuth(TestComponent)

      render(
        <AuthProvider>
          <ProtectedComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(window.location.href).toBe('/login')
      })
    })
  })

  describe('API configuration', () => {
    it('should use custom API base URL when provided', async () => {
      const customApiUrl = 'https://api.example.com/v1'
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(customApiUrl)
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.login({ email: 'test@test.com', password: 'pass' })
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${customApiUrl}/auth/login`,
        expect.any(Object)
      )
    })
  })
})

// frontend/src/context/__tests__/AuthContext.test.ts