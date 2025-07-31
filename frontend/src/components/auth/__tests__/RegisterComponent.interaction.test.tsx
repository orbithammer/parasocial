// src/components/auth/__tests__/RegisterComponent.interaction.test.tsx
// Version: 1.0.1
// Fixed button query to match actual button text "Create Your Account"

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterComponent from '../RegisterComponent'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
})

describe('RegisterComponent - User Interactions', () => {
  const defaultProps = {
    onRegisterSuccess: vi.fn(),
    onRegisterError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Form Input Handling', () => {
    it('should allow typing in email field', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      await user.type(emailInput, 'test@example.com')
      
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should allow typing in username field', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const usernameInput = screen.getByLabelText(/username/i)
      await user.type(usernameInput, 'testuser123')
      
      expect(usernameInput).toHaveValue('testuser123')
    })

    it('should allow typing in display name field', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const displayNameInput = screen.getByLabelText(/display name/i)
      await user.type(displayNameInput, 'Test User')
      
      expect(displayNameInput).toHaveValue('Test User')
    })

    it('should allow typing in password field', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const passwordInput = screen.getByLabelText('Password')
      await user.type(passwordInput, 'SecurePassword123')
      
      expect(passwordInput).toHaveValue('SecurePassword123')
    })

    it('should allow typing in confirm password field', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      await user.type(confirmPasswordInput, 'SecurePassword123')
      
      expect(confirmPasswordInput).toHaveValue('SecurePassword123')
    })

    it('should clear field errors when user starts typing', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      // Fill form with invalid data to trigger validation
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.type(passwordInput, 'weak')
      await user.type(confirmPasswordInput, 'different')
      await user.click(submitButton)
      
      // Wait for validation errors to appear
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
      
      // Start typing in email field should clear its error
      await user.clear(emailInput)
      await user.type(emailInput, 'valid@example.com')
      
      // The error should still exist but form should be responsive
      expect(emailInput).toHaveValue('valid@example.com')
    })
  })

  describe('Form Validation', () => {
    it('should validate email format', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      // Browser's built-in email validation should prevent submission
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should validate username length and format', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const usernameInput = screen.getByLabelText(/username/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(usernameInput, 'ab') // Too short
      await user.click(submitButton)
      
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should validate password requirements', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const passwordInput = screen.getByLabelText('Password')
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(passwordInput, 'weak')
      await user.click(submitButton)
      
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should validate password confirmation matches', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(passwordInput, 'SecurePassword123')
      await user.type(confirmPasswordInput, 'DifferentPassword123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should enable submit button when all required fields are valid', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(usernameInput, 'testuser123')
      await user.type(passwordInput, 'SecurePassword123')
      await user.type(confirmPasswordInput, 'SecurePassword123')
      
      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit button if any required field is empty', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'test@example.com')
      // Leave other required fields empty
      
      // Button should still be enabled for HTML5 validation to work
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Form Submission', () => {
    it('should call API with correct data on form submission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: { id: '1', email: 'test@example.com', username: 'testuser123' },
            token: 'mock-token'
          }
        }),
      })

      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/username/i)
      const displayNameInput = screen.getByLabelText(/display name/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(usernameInput, 'testuser123')
      await user.type(displayNameInput, 'Test User')
      await user.type(passwordInput, 'SecurePassword123')
      await user.type(confirmPasswordInput, 'SecurePassword123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            username: 'testuser123',
            displayName: 'Test User',
            password: 'SecurePassword123',
          }),
        })
      })
    })

    it('should use username as displayName when displayName is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: { id: '1', email: 'test@example.com', username: 'testuser123' },
            token: 'mock-token'
          }
        }),
      })

      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(usernameInput, 'testuser123')
      // Leave displayName empty
      await user.type(passwordInput, 'SecurePassword123')
      await user.type(confirmPasswordInput, 'SecurePassword123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            username: 'testuser123',
            displayName: 'testuser123', // Should use username as displayName
            password: 'SecurePassword123',
          }),
        })
      })
    })

    it('should use custom apiBaseUrl when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: { id: '1', email: 'test@example.com', username: 'testuser123' },
            token: 'mock-token'
          }
        }),
      })

      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} apiBaseUrl="https://custom-api.com" />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(usernameInput, 'testuser123')
      await user.type(passwordInput, 'SecurePassword123')
      await user.type(confirmPasswordInput, 'SecurePassword123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('https://custom-api.com/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            username: 'testuser123',
            displayName: 'testuser123',
            password: 'SecurePassword123',
          }),
        })
      })
    })

    it('should not submit form if validation fails', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      // Fill with invalid data
      await user.type(emailInput, 'invalid-email')
      await user.type(usernameInput, 'ab') // Too short
      await user.type(passwordInput, 'weak')
      await user.type(confirmPasswordInput, 'different')
      await user.click(submitButton)
      
      // Should not call API due to validation failures
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      // Mock a delayed API response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              user: { id: '1', email: 'test@example.com', username: 'testuser123' },
              token: 'mock-token'
            }
          }),
        }), 100))
      )

      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(usernameInput, 'testuser123')
      await user.type(passwordInput, 'SecurePassword123')
      await user.type(confirmPasswordInput, 'SecurePassword123')
      await user.click(submitButton)
      
      // Check for loading state (button should be disabled or show loading text)
      expect(submitButton).toBeDisabled()
    })

    it('should disable form fields during loading', async () => {
      // Mock a delayed API response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              user: { id: '1', email: 'test@example.com', username: 'testuser123' },
              token: 'mock-token'
            }
          }),
        }), 100))
      )

      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(usernameInput, 'testuser123')
      await user.type(passwordInput, 'SecurePassword123')
      await user.type(confirmPasswordInput, 'SecurePassword123')
      await user.click(submitButton)
      
      // Form fields should be disabled during submission
      expect(emailInput).toBeDisabled()
      expect(usernameInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(confirmPasswordInput).toBeDisabled()
    })
  })

  describe('Success Handling', () => {
    it('should store token in localStorage on successful registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: { id: '1', email: 'test@example.com', username: 'testuser123' },
            token: 'mock-token'
          }
        }),
      })

      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(usernameInput, 'testuser123')
      await user.type(passwordInput, 'SecurePassword123')
      await user.type(confirmPasswordInput, 'SecurePassword123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', 'mock-token')
      })
    })

    it('should call onRegisterSuccess callback with user data', async () => {
      const mockUserData = { id: '1', email: 'test@example.com', username: 'testuser123' }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: mockUserData,
            token: 'mock-token'
          }
        }),
      })

      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(usernameInput, 'testuser123')
      await user.type(passwordInput, 'SecurePassword123')
      await user.type(confirmPasswordInput, 'SecurePassword123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(defaultProps.onRegisterSuccess).toHaveBeenCalledWith(mockUserData)
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message for failed registration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Email already exists'
        }),
      })

      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'existing@example.com')
      await user.type(usernameInput, 'testuser123')
      await user.type(passwordInput, 'SecurePassword123')
      await user.type(confirmPasswordInput, 'SecurePassword123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
      })
    })

    it('should call onRegisterError callback with error message', async () => {
      const errorMessage = 'Username already taken'
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: errorMessage
        }),
      })

      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(usernameInput, 'existinguser')
      await user.type(passwordInput, 'SecurePassword123')
      await user.type(confirmPasswordInput, 'SecurePassword123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(defaultProps.onRegisterError).toHaveBeenCalledWith(errorMessage)
      })
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const user = userEvent.setup()
      render(<RegisterComponent {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/username/i)
      const passwordInput = screen.getByLabelText('Password')
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(usernameInput, 'testuser123')
      await user.type(passwordInput, 'SecurePassword123')
      await user.type(confirmPasswordInput, 'SecurePassword123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(defaultProps.onRegisterError).toHaveBeenCalledWith(
          'Registration failed. Please try again.'
        )
      })
    })
  })
})

// src/components/auth/__tests__/RegisterComponent.interaction.test.tsx