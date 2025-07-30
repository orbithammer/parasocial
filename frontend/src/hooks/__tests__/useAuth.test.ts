// frontend/src/hooks/__tests__/useAuth.test.ts - v1.1 - Fixed token key references to match hook implementation

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '../useAuth'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

// Define types for our auth hook
interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (name: string, email: string, password: string) => Promise<void>
  clearError: () => void
}

type UseAuthReturn = AuthState & AuthActions

// Mock fetch for API calls
global.fetch = vi.fn()

describe('useAuth Hook', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should return initial unauthenticated state when no token exists', () => {
      // Arrange: No token in localStorage
      localStorageMock.getItem.mockReturnValue(null)
      
      // Act: Render the hook
      const { result } = renderHook(() => useAuth())
      
      // Assert: Should be in initial unauthenticated state
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.login).toBe('function')
      expect(typeof result.current.logout).toBe('function')
      expect(typeof result.current.register).toBe('function')
      expect(typeof result.current.clearError).toBe('function')
    })

    it('should set loading state true initially when token exists', () => {
      // Arrange: Token exists in localStorage
      localStorageMock.getItem.mockReturnValue('valid-token')
      
      // Act: Render the hook
      const { result } = renderHook(() => useAuth())
      
      // Assert: Should be loading initially
      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('Login Functionality', () => {
    it('should successfully login with valid credentials', async () => {
      // Arrange: Mock successful login response
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      }
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          user: mockUser,
          token: 'auth-token'
        })
      }
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse)
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useAuth())
      
      // Act: Call login
      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })
      
      // Assert: Should be authenticated
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth-token', 'auth-token')
    })

    it('should handle login failure with invalid credentials', async () => {
      // Arrange: Mock failed login response
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          message: 'Invalid credentials'
        })
      }
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse)
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useAuth())
      
      // Act: Call login with invalid credentials
      await act(async () => {
        await result.current.login('invalid@example.com', 'wrongpassword')
      })
      
      // Assert: Should show error and remain unauthenticated
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Invalid credentials')
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    it('should handle network errors during login', async () => {
      // Arrange: Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useAuth())
      
      // Act: Call login
      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })
      
      // Assert: Should show network error
      expect(result.current.error).toBe('Network error')
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('Logout Functionality', () => {
    it('should successfully logout user', async () => {
      // Arrange: Start with authenticated user
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      }
      
      localStorageMock.getItem.mockReturnValue('auth-token')
      
      // Mock successful user verification
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ user: mockUser })
      })
      
      const { result } = renderHook(() => useAuth())
      
      // Wait for initial auth check
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      // Act: Logout
      act(() => {
        result.current.logout()
      })
      
      // Assert: Should be logged out
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth-token')
    })
  })

  describe('Registration Functionality', () => {
    it('should successfully register new user', async () => {
      // Arrange: Mock successful registration response
      const mockUser: User = {
        id: '2',
        email: 'newuser@example.com',
        name: 'New User'
      }
      
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          user: mockUser,
          token: 'new-auth-token'
        })
      }
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse)
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useAuth())
      
      // Act: Call register
      await act(async () => {
        await result.current.register('New User', 'newuser@example.com', 'password123')
      })
      
      // Assert: Should be authenticated
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(localStorageMock.setItem).toHaveBeenCalledWith('auth-token', 'new-auth-token')
    })

    it('should handle registration failure with existing email', async () => {
      // Arrange: Mock failed registration response
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          message: 'Email already exists'
        })
      }
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse)
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useAuth())
      
      // Act: Call register with existing email
      await act(async () => {
        await result.current.register('Test User', 'existing@example.com', 'password123')
      })
      
      // Assert: Should show error and remain unauthenticated
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Email already exists')
      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })

  describe('Error Management', () => {
    it('should clear error when clearError is called', async () => {
      // Arrange: Mock failed login to create error state
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({
          message: 'Test error'
        })
      }
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse)
      localStorageMock.getItem.mockReturnValue(null)
      
      const { result } = renderHook(() => useAuth())
      
      // Create error state by failing login
      await act(async () => {
        await result.current.login('test@example.com', 'wrongpassword')
      })
      
      // Assert: Error should be set
      expect(result.current.error).toBe('Test error')
      
      // Act: Clear error
      act(() => {
        result.current.clearError()
      })
      
      // Assert: Error should be cleared
      expect(result.current.error).toBeNull()
    })
  })

  describe('Token Persistence', () => {
    it('should verify existing token on mount', async () => {
      // Arrange: Token exists in localStorage
      localStorageMock.getItem.mockReturnValue('existing-token')
      
      const mockUser: User = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      }
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ user: mockUser })
      })
      
      // Act: Render hook
      const { result } = renderHook(() => useAuth())
      
      // Assert: Should be loading initially
      expect(result.current.isLoading).toBe(true)
      
      // Wait for verification
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      // Assert: Should be authenticated
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('should logout if token verification fails', async () => {
      // Arrange: Invalid token in localStorage
      localStorageMock.getItem.mockReturnValue('invalid-token')
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ message: 'Invalid token' })
      })
      
      // Act: Render hook
      const { result } = renderHook(() => useAuth())
      
      // Wait for verification
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      // Assert: Should be logged out
      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth-token')
    })
  })
})

// frontend/src/hooks/__tests__/useAuth.test.ts - v1.1 - Fixed token key references to match hook implementation