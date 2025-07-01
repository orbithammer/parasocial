// frontend/src/components/auth/__tests__/LoginComponent.interaction.test.tsx
// Interaction tests for login component user actions and form behavior
// Version: 1.2.0 - Fixed invalid delay option in user.type()

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginComponent from '../LoginComponent'

// Mock next/navigation for testing
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

describe('LoginComponent User Interactions', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  /**
   * Test input field changes and real-time validation
   */
  describe('Input Changes', () => {
    it('should update email field when user types', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      
      // Type email address
      await user.type(emailInput, 'user@example.com')
      
      expect(emailInput).toHaveValue('user@example.com')
    })

    it('should update password field when user types', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      
      // Type password
      await user.type(passwordInput, 'mySecretPassword123')
      
      expect(passwordInput).toHaveValue('mySecretPassword123')
    })

    it('should clear field errors when user starts typing valid input', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Submit form with empty email to trigger validation error
      await user.click(submitButton)

      // Wait for validation error to appear
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })

      // Start typing in email field - error should clear
      await user.type(emailInput, 'u')
      
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
    })

    it('should show validation error for invalid email format while typing', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Type invalid email format
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('should handle rapid typing in form fields', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)

      // Rapid typing simulation
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('password123')
    })
  })

  /**
   * Test password visibility toggle functionality
   */
  describe('Password Toggle', () => {
    it('should toggle password visibility when toggle button is clicked', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i })

      // Initially password should be hidden (type="password")
      expect(passwordInput).toHaveAttribute('type', 'password')

      // Click toggle to show password
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      // Click toggle again to hide password
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('should show eye icon when password is hidden', async () => {
      render(<LoginComponent />)

      // Look for eye icon (password is hidden)
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('eye-off-icon')).not.toBeInTheDocument()
    })

    it('should show eye-off icon when password is visible', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i })

      // Click to show password
      await user.click(toggleButton)

      // Should show eye-off icon (password is visible)
      expect(screen.getByTestId('eye-off-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('eye-icon')).not.toBeInTheDocument()
    })

    it('should maintain password value when toggling visibility', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i })

      // Type password
      await user.type(passwordInput, 'secretPassword')
      expect(passwordInput).toHaveValue('secretPassword')

      // Toggle visibility - value should remain
      await user.click(toggleButton)
      expect(passwordInput).toHaveValue('secretPassword')

      // Toggle back - value should still remain
      await user.click(toggleButton)
      expect(passwordInput).toHaveValue('secretPassword')
    })
  })

  /**
   * Test form submission behavior and validation
   */
  describe('Form Submission', () => {
    it('should prevent submission with empty required fields', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Try to submit empty form
      await user.click(submitButton)

      // Should show validation errors for required fields
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should submit form with valid credentials', async () => {
      const user = userEvent.setup()
      
      // Mock successful API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            user: { id: '1', email: 'test@example.com', username: 'testuser' },
            token: 'mock-jwt-token'
          }
        })
      })

      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Fill form with valid data
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validPassword123')

      // Submit form
      await user.click(submitButton)

      // Should show loading state
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()

      // Wait for successful submission
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'validPassword123'
          })
        })
      })
    })

    it('should handle API error during submission', async () => {
      const user = userEvent.setup()
      
      // Mock API error response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      })

      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Fill form with credentials
      await user.type(emailInput, 'wrong@example.com')
      await user.type(passwordInput, 'wrongPassword')
      await user.click(submitButton)

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })

      // Form should return to normal state
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should disable submit button during form submission', async () => {
      const user = userEvent.setup()
      
      // Mock slow API response
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: {} })
        }), 100))
      )

      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Fill and submit form
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      // Button should be disabled during submission
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
    })

    it('should handle form submission with Enter key', async () => {
      const user = userEvent.setup()
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: {} })
      })

      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)

      // Fill form
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      // Press Enter in password field
      await user.keyboard('{Enter}')

      // Should trigger form submission
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled()
      })
    })
  })

  /**
   * Test accessibility and keyboard navigation
   */
  describe('Accessibility and Keyboard Navigation', () => {
    it('should support tab navigation through form fields', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const toggleButton = screen.getByRole('button', { name: /toggle password visibility/i })
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Tab through form elements
      await user.tab()
      expect(emailInput).toHaveFocus()

      await user.tab()
      expect(passwordInput).toHaveFocus()

      await user.tab()
      expect(toggleButton).toHaveFocus()

      await user.tab()
      expect(submitButton).toHaveFocus()
    })

    it('should show focus indicators on form elements', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const emailInput = screen.getByLabelText(/email address/i)

      // Focus email input
      await user.click(emailInput)

      // Should have focus styling (assuming CSS class)
      expect(emailInput).toHaveClass('focus:ring-2')
    })

    it('should have proper ARIA labels and descriptions', () => {
      render(<LoginComponent />)

      // Check for proper ARIA attributes
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/^password$/i)

      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')
    })
  })
})