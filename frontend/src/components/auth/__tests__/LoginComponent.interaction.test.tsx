// frontend/src/components/auth/LoginComponent.interaction.test.tsx
// Interaction tests for login component user actions and form behavior
// Version: 1.3.0 - Fixed password field selector to avoid ambiguity with toggle button

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginComponent from '@/components/auth/LoginComponent'

/**
 * Test suite for LoginComponent user interactions
 * Tests form input, submission, API calls, and user feedback
 */
describe('LoginComponent - User Interactions', () => {
  
  // Mock fetch for API testing
  const mockFetch = vi.fn()
  
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = mockFetch
    mockFetch.mockClear()
    
    // Clear localStorage
    localStorage.clear()
  })

  /**
   * Test typing in form fields
   */
  describe('Form Input Handling', () => {
    it('should allow typing in email field', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      
      // Type in email field
      await user.type(emailInput, 'test@example.com')
      
      // Check that value is updated
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should allow typing in password field', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      // Use more specific selector to avoid matching toggle button
      const passwordInput = screen.getByLabelText(/^password$/i)
      
      // Type in password field
      await user.type(passwordInput, 'mySecretPassword')
      
      // Check that value is updated
      expect(passwordInput).toHaveValue('mySecretPassword')
    })

    it('should clear error message when user starts typing', async () => {
      const user = userEvent.setup()
      
      // Mock a failed login to show error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Invalid credentials' })
      })
      
      render(<LoginComponent />)
      
      // Fill form and submit to trigger error
      await user.type(screen.getByLabelText(/email address/i), 'wrong@email.com')
      await user.type(screen.getByLabelText(/^password$/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
      
      // Start typing in email field - error should clear
      await user.type(screen.getByLabelText(/email address/i), 'x')
      
      // Error should be cleared
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  /**
   * Test form validation behavior
   */
  describe('Form Validation', () => {
    it('should enable submit button when both fields have content', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      // Initially button should be disabled
      expect(submitButton).toBeDisabled()

      // Fill both fields
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      // Button should now be enabled
      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit button when fields are empty', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      // Fill both fields first
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      expect(submitButton).not.toBeDisabled()

      // Clear both fields
      await user.clear(emailInput)
      await user.clear(passwordInput)

      // Button should be disabled again
      expect(submitButton).toBeDisabled()
    })
  })

  /**
   * Test form submission behavior
   */
  describe('Form Submission', () => {
    it('should call API with correct data on form submission', async () => {
      const user = userEvent.setup()
      
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          token: 'mock-token',
          user: { id: 1, email: 'test@example.com' }
        })
      })
      
      render(<LoginComponent />)

      // Fill form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Check API was called with correct data
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
          })
        })
      })
    })

    it('should use custom apiBaseUrl when provided', async () => {
      const user = userEvent.setup()
      
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          token: 'mock-token',
          user: { id: 1, email: 'test@example.com' }
        })
      })
      
      render(<LoginComponent apiBaseUrl="https://custom-api.com" />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Check custom API URL was used
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('https://custom-api.com/api/auth/login', expect.any(Object))
      })
    })

    it('should prevent multiple submissions while loading', async () => {
      const user = userEvent.setup()
      
      // Mock slow response
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      
      render(<LoginComponent />)

      // Fill form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })
      
      // Click submit multiple times quickly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only make one API call
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  /**
   * Test loading states and UI feedback
   */
  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      const user = userEvent.setup()
      
      // Mock slow response
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      
      render(<LoginComponent />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Should show loading text
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    })

    it('should disable form fields during loading', async () => {
      const user = userEvent.setup()
      
      // Mock slow response
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
      
      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })

      // Fill and submit form
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Form fields should be disabled during loading
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
  })

  /**
   * Test success handling
   */
  describe('Success Handling', () => {
    it('should store token in localStorage on successful login', async () => {
      const user = userEvent.setup()
      
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          token: 'auth-token-123',
          user: { id: 1, email: 'test@example.com' }
        })
      })
      
      render(<LoginComponent />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Check token was stored
      await waitFor(() => {
        expect(localStorage.getItem('authToken')).toBe('auth-token-123')
      })
    })

    it('should call onLoginSuccess callback with user data', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = vi.fn()
      
      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          token: 'auth-token-123',
          user: { id: 1, email: 'test@example.com' }
        })
      })
      
      render(<LoginComponent onLoginSuccess={mockOnSuccess} />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Check callback was called with user data
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          id: 1,
          email: 'test@example.com'
        })
      })
    })
  })

  /**
   * Test error handling
   */
  describe('Error Handling', () => {
    it('should display error message for failed login', async () => {
      const user = userEvent.setup()
      
      // Mock failed response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ 
          success: false, 
          error: 'Invalid email or password' 
        })
      })
      
      render(<LoginComponent />)

      // Fill and submit form with wrong credentials
      await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Should show error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password')
      })
    })

    it('should call onLoginError callback with error message', async () => {
      const user = userEvent.setup()
      const mockOnError = vi.fn()
      
      // Mock failed response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ 
          success: false, 
          error: 'Authentication failed' 
        })
      })
      
      render(<LoginComponent onLoginError={mockOnError} />)

      // Submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Check error callback was called
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Authentication failed')
      })
    })

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      render(<LoginComponent />)

      // Submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^password$/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Should show generic error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i)
      })
    })
  })
})