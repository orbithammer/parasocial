// /__tests__/AuthContext.test.tsx
// Version: 1.1.0
// Fixed file extension to .tsx for JSX support and corrected import paths

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { AuthProvider, useAuth } from '../AuthContext'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock fetch for API calls
global.fetch = vi.fn()

// Mock next/router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/'
  })
}))

// Test wrapper component
const createWrapper = () => {
  return ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  describe('Initial State', () => {
    it('should initialize with null user and not loading', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      expect(result.current.user).toBe(null)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
    })

    it('should check for existing token on mount', () => {
      const mockToken = 'mock-jwt-token'
      mockLocalStorage.getItem.mockReturnValue(mockToken)

      renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth-token')
    })
  })

  describe('Login Functionality', () => {
    it('should handle successful login', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      }
      const mockToken = 'mock-jwt-token'

      ;(fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: mockToken })
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(null)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth-token', mockToken)
    })

    it('should handle login failure with error message', async () => {
      const errorMessage = 'Invalid credentials'

      ;(fetch as Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage })
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        await result.current.login('test@example.com', 'wrongpassword')
      })

      expect(result.current.user).toBe(null)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe(errorMessage)
    })

    it('should set loading state during login', async () => {
      let resolvePromise: (value: unknown) => void
      const loginPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      ;(fetch as Mock).mockReturnValueOnce(loginPromise)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      act(() => {
        result.current.login('test@example.com', 'password123')
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        resolvePromise({
          ok: true,
          json: async () => ({ user: { id: '1' }, token: 'token' })
        })
        await loginPromise
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Logout Functionality', () => {
    it('should clear user data and token on logout', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      // Set initial user state
      act(() => {
        result.current.setUser({
          id: '1',
          email: 'test@example.com',
          name: 'Test User'
        })
      })

      act(() => {
        result.current.logout()
      })

      expect(result.current.user).toBe(null)
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth-token')
    })

    it('should clear error state on logout', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      // Set error state
      act(() => {
        result.current.setError('Some error')
      })

      act(() => {
        result.current.logout()
      })

      expect(result.current.error).toBe(null)
    })
  })

  describe('Registration Functionality', () => {
    it('should handle successful registration', async () => {
      const mockUser = {
        id: '1',
        email: 'newuser@example.com',
        name: 'New User'
      }
      const mockToken = 'new-jwt-token'

      ;(fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser, token: mockToken })
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        await result.current.register('newuser@example.com', 'password123', 'New User')
      })

      expect(result.current.user).toEqual(mockUser)
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth-token', mockToken)
    })

    it('should handle registration failure', async () => {
      const errorMessage = 'Email already exists'

      ;(fetch as Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: errorMessage })
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        await result.current.register('existing@example.com', 'password123', 'User')
      })

      expect(result.current.user).toBe(null)
      expect(result.current.error).toBe(errorMessage)
    })
  })

  describe('Token Management', () => {
    it('should restore user from valid token', async () => {
      const mockToken = 'valid-token'
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      }

      mockLocalStorage.getItem.mockReturnValue(mockToken)
      ;(fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: mockUser })
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })
    })

    it('should handle invalid token by clearing storage', async () => {
      const mockToken = 'invalid-token'

      mockLocalStorage.getItem.mockReturnValue(mockToken)
      ;(fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 401
      })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await waitFor(() => {
        expect(result.current.user).toBe(null)
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth-token')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors during login', async () => {
      ;(fetch as Mock).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      await act(async () => {
        await result.current.login('test@example.com', 'password123')
      })

      expect(result.current.error).toBe('Network error occurred')
      expect(result.current.isLoading).toBe(false)
    })

    it('should clear errors when setting new ones', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      act(() => {
        result.current.setError('First error')
      })

      expect(result.current.error).toBe('First error')

      act(() => {
        result.current.setError('Second error')
      })

      expect(result.current.error).toBe('Second error')
    })
  })

  describe('Authentication State Persistence', () => {
    it('should maintain user state across re-renders', () => {
      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: createWrapper()
      })

      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      }

      act(() => {
        result.current.setUser(mockUser)
      })

      rerender()

      expect(result.current.user).toEqual(mockUser)
    })
  })
})

// /__tests__/AuthContext.test.tsx
// Version: 1.1.0
// Fixed file extension to .tsx for JSX support and corrected import paths