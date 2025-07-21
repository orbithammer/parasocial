// frontend/src/contexts/__tests__/AuthContext.test.ts
// Comprehensive test suite for AuthContext provider covering authentication state management,
// login/register flows, localStorage persistence, API integration, and custom hooks
// Version: 1.6.0 - Fixed TypeScript module resolution using namespace import approach

import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest'
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import '@testing-library/jest-dom'
// Import React types
import type { ReactNode } from 'react'

// Import components and hooks as values
import { 
  AuthProvider as AuthProviderComponent, 
  useAuth
} from '../AuthContext'

// Import types separately
import type { 
  User,
  LoginCredentials,
  RegisterData,
  AuthContextType
} from '../AuthContext'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Mock fetch function
const mockFetch = vi.fn() as MockedFunction<typeof fetch>

// Mock user data for testing
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  displayName: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  isVerified: true,
  verificationTier: 'premium'
}

// Mock API responses
const mockSuccessResponse = {
  success: true,
  data: {
    user: mockUser,
    token: 'jwt-token-123'
  }
}

const mockErrorResponse = {
  success: false,
  error: {
    code: 'INVALID_CREDENTIALS',
    message: 'Invalid email or password'
  }
}

// Test wrapper component for context provider
interface TestWrapperProps {
  children: ReactNode
  apiBaseUrl?: string
}

const TestWrapper = ({ children, apiBaseUrl = 'http://localhost:3001/api/v1' }: TestWrapperProps) => (
  <AuthProvider apiBaseUrl={apiBaseUrl}>
    {children}
  </AuthProvider>
)

// Test component to access auth context
const TestComponent = () => {
  const auth = useAuth()
  return (
    <div>
      <div data-testid="user-email">{auth.user?.email || 'No user'}</div>
      <div data-testid="is-authenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="is-loading">{auth.isLoading.toString()}</div>
      <div data-testid="error">{auth.error || 'No error'}</div>
      <button 
        data-testid="login-btn" 
        onClick={() => auth.login({ email: 'test@example.com', password: 'password123' })}
      >
        Login
      </button>
      <button 
        data-testid="register-btn"
        onClick={() => auth.register({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
          confirmPassword: 'password123',
          displayName: 'Test User'
        })}
      >
        Register
      </button>
      <button data-testid="logout-btn" onClick={() => auth.logout()}>
        Logout
      </button>
      <button data-testid="refresh-btn" onClick={() => auth.refreshUser()}>
        Refresh
      </button>
      <button data-testid="clear-error-btn" onClick={() => auth.clearError()}>
        Clear Error
      </button>
    </div>
  )
}

// Test component for protected content scenarios
const TestProtectedComponent = () => (
  <div data-testid="protected-content">Protected Content</div>
)

describe('AuthContext', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })
    
    // Setup fetch mock
    global.fetch = mockFetch
    
    // Setup console.error mock to suppress error logs in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  /**
   * Test AuthProvider component initialization and state management
   */
  describe('AuthProvider', () => {
    it('should initialize with default state when no stored data exists', () => {
      // Mock localStorage to return null (no stored data)
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
      expect(screen.getByTestId('error')).toHaveTextContent('No error')
    })

    it('should restore authentication state from localStorage on initialization', async () => {
      // Mock localStorage to return stored user data
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(mockUser)) // user data
        .mockReturnValueOnce('stored-token-123') // token

      await act(async () => {
        render(
          <TestWrapper>
            <TestComponent />
          </TestWrapper>
        )
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })
    })

    it('should handle corrupted localStorage data gracefully', async () => {
      // Mock localStorage to return invalid JSON
      mockLocalStorage.getItem
        .mockReturnValueOnce('invalid-json') // corrupted user data
        .mockReturnValueOnce('valid-token')

      await act(async () => {
        render(
          <TestWrapper>
            <TestComponent />
          </TestWrapper>
        )
      })

      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user')
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
      })
    })

    it('should accept custom API base URL', () => {
      const customApiUrl = 'https://api.example.com/v2'
      
      render(
        <TestWrapper apiBaseUrl={customApiUrl}>
          <TestComponent />
        </TestWrapper>
      )

      // Component should render without errors
      expect(screen.getByTestId('user-email')).toBeInTheDocument()
    })
  })

  /**
   * Test useAuth hook functionality and error handling
   */
  describe('useAuth hook', () => {
    it('should return auth context when used within AuthProvider', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper
      })

      expect(result.current).toHaveProperty('user')
      expect(result.current).toHaveProperty('token')
      expect(result.current).toHaveProperty('isAuthenticated')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('error')
      expect(result.current).toHaveProperty('login')
      expect(result.current).toHaveProperty('register')
      expect(result.current).toHaveProperty('logout')
      expect(result.current).toHaveProperty('refreshUser')
      expect(result.current).toHaveProperty('clearError')
    })

    it('should throw error when used outside AuthProvider', () => {
      // Suppress expected error output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow('useAuth must be used within an AuthProvider')

      consoleSpy.mockRestore()
    })
  })

  /**
   * Test login functionality with various scenarios
   */
  describe('Login functionality', () => {
    it('should successfully login with valid credentials', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse
      } as Response)

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Trigger login
      fireEvent.click(screen.getByTestId('login-btn'))

      // Wait for login to complete
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })

      // Verify API call was made correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
        })
      )

      // Verify data was stored in localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser))
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', 'jwt-token-123')
    })

    it('should handle login failure with error message', async () => {
      // Mock failed API response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse
      } as Response)

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Trigger login
      fireEvent.click(screen.getByTestId('login-btn'))

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid email or password')
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
        expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
      })

      // Verify no data was stored in localStorage
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled()
    })

    it('should handle network errors during login', async () => {
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Trigger login
      fireEvent.click(screen.getByTestId('login-btn'))

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network error occurred. Please try again.')
        expect(screen.getByTestId('is-loading')).toHaveTextContent('false')
      })
    })

    it('should clear previous errors before new login attempt', async () => {
      // Mock initial error response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse
      } as Response)

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // First login attempt (will fail)
      fireEvent.click(screen.getByTestId('login-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid email or password')
      })

      // Mock successful response for second attempt
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse
      } as Response)

      // Second login attempt (will succeed)
      fireEvent.click(screen.getByTestId('login-btn'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('No error')
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      })
    })
  })

  /**
   * Test registration functionality
   */
  describe('Registration functionality', () => {
    it('should successfully register with valid data', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse
      } as Response)

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Trigger registration
      fireEvent.click(screen.getByTestId('register-btn'))

      // Wait for registration to complete
      await waitFor(() => {
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      })

      // Verify API call was made correctly
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/v1/auth/register',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123',
            confirmPassword: 'password123',
            displayName: 'Test User'
          })
        })
      )
    })

    it('should handle registration failure', async () => {
      // Mock failed API response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'Email already exists'
          }
        })
      } as Response)

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Trigger registration
      fireEvent.click(screen.getByTestId('register-btn'))

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Email already exists')
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
      })
    })
  })

  /**
   * Test logout functionality
   */
  describe('Logout functionality', () => {
    it('should successfully logout and clear user data', async () => {
      // Setup initial authenticated state
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(mockUser))
        .mockReturnValueOnce('stored-token-123')

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Wait for initial state to load
      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      })

      // Trigger logout
      fireEvent.click(screen.getByTestId('logout-btn'))

      // Verify logout state
      expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
      expect(screen.getByTestId('error')).toHaveTextContent('No error')

      // Verify localStorage was cleared
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
    })
  })

  /**
   * Test refresh user functionality
   */
  describe('Refresh user functionality', () => {
    it('should successfully refresh user data when authenticated', async () => {
      // Setup initial authenticated state
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(mockUser))
        .mockReturnValueOnce('stored-token-123')

      // Mock successful refresh response
      const updatedUser = { ...mockUser, displayName: 'Updated User' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { user: updatedUser }
        })
      } as Response)

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Wait for initial state to load
      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      })

      // Trigger refresh
      fireEvent.click(screen.getByTestId('refresh-btn'))

      // Wait for refresh to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3001/api/v1/auth/me',
          expect.objectContaining({
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer stored-token-123'
            }
          })
        )
      })
    })

    it('should handle refresh failure and logout user', async () => {
      // Setup initial authenticated state
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(mockUser))
        .mockReturnValueOnce('stored-token-123')

      // Mock failed refresh response (token expired)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Token expired' }
        })
      } as Response)

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Wait for initial state to load
      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true')
      })

      // Trigger refresh
      fireEvent.click(screen.getByTestId('refresh-btn'))

      // Wait for automatic logout due to expired token
      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false')
        expect(screen.getByTestId('user-email')).toHaveTextContent('No user')
      })

      // Verify localStorage was cleared
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user')
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token')
    })
  })

  /**
   * Test error clearing functionality
   */
  describe('Error clearing functionality', () => {
    it('should clear error when clearError is called', async () => {
      // Mock failed API response to set an error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockErrorResponse
      } as Response)

      render(
        <TestWrapper>
          <TestComponent />
        </TestWrapper>
      )

      // Trigger login to create an error
      fireEvent.click(screen.getByTestId('login-btn'))

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid email or password')
      })

      // Clear the error
      fireEvent.click(screen.getByTestId('clear-error-btn'))

      // Verify error is cleared
      expect(screen.getByTestId('error')).toHaveTextContent('No error')
    })
  })

  /**
   * Test higher-order component functionality
   */
  describe('withAuth HOC', () => {
    it('should render protected component when user is authenticated', async () => {
      // Setup authenticated state
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(mockUser))
        .mockReturnValueOnce('stored-token-123')

      const ProtectedComponent = withAuth(TestProtectedComponent)

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      )

      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    it('should show loading spinner when checking authentication', () => {
      // Mock loading state by not calling the initialization effect immediately
      const ProtectedComponent = withAuth(TestProtectedComponent)

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      )

      // Should show loading spinner initially
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should redirect to login when user is not authenticated', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      // Mock window.location
      const mockLocation = { href: '' }
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true
      })

      const ProtectedComponent = withAuth(TestProtectedComponent)

      render(
        <TestWrapper>
          <ProtectedComponent />
        </TestWrapper>
      )

      // Component should not render and should redirect
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    })
  })

  /**
   * Test additional hooks
   */
  describe('Additional hooks', () => {
    it('should provide useIsAuthenticated hook', () => {
      const { result } = renderHook(() => useIsAuthenticated(), {
        wrapper: TestWrapper
      })

      expect(typeof result.current).toBe('boolean')
      expect(result.current).toBe(false) // Initially not authenticated
    })

    it('should provide useCurrentUser hook', () => {
      const { result } = renderHook(() => useCurrentUser(), {
        wrapper: TestWrapper
      })

      expect(result.current).toBeNull() // Initially no user
    })
  })

  /**
   * Test type safety and interfaces
   */
  describe('Type safety', () => {
    it('should provide correct TypeScript types for auth context', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: TestWrapper
      })

      const authContext: AuthContextType = result.current

      // Verify all required properties exist with correct types
      expect(typeof authContext.user).toBe('object')
      expect(typeof authContext.token).toBe('object')
      expect(typeof authContext.isAuthenticated).toBe('boolean')
      expect(typeof authContext.isLoading).toBe('boolean')
      expect(typeof authContext.error).toBe('object')
      expect(typeof authContext.login).toBe('function')
      expect(typeof authContext.register).toBe('function')
      expect(typeof authContext.logout).toBe('function')
      expect(typeof authContext.refreshUser).toBe('function')
      expect(typeof authContext.clearError).toBe('function')
    })
  })
})

// frontend/src/contexts/__tests__/AuthContext.test.ts
// Comprehensive test suite for AuthContext provider covering authentication state management,
// login/register flows, localStorage persistence, API integration, and custom hooks
// Version: 1.6.0 - Fixed TypeScript module resolution using namespace import approach