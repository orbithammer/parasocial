// frontend/src/app/(auth)/login/__tests__/loginPage.test.ts
// User interaction tests for login page component
// Version: 1.0.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock Next.js dependencies
vi.mock('next/link', () => ({
  default: vi.fn((props: any) => 
    React.createElement('a', { href: props.href, ...props }, props.children)
  )
}))

// Mock fetch for API calls
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
  value: mockLocalStorage
})

// Mock window.location
const mockLocation = {
  href: '',
  assign: vi.fn(),
  reload: vi.fn(),
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

// Import test component from separate file to avoid JSX in .ts file
import { TestLoginPage } from './TestLoginPage'

// Import React after mocks
import React from 'react'

describe('Login Page User Interactions', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
    mockLocation.href = ''
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('Form Input Interactions', () => {
    it('should update email field when user types', async () => {
      render(React.createElement(TestLoginPage))
      
      const emailInput = screen.getByTestId('email-input')
      
      await user.type(emailInput, 'test@example.com')
      
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should update password field when user types', async () => {
      render(React.createElement(TestLoginPage))
      
      const passwordInput = screen.getByTestId('password-input')
      
      await user.type(passwordInput, 'secretpassword')
      
      expect(passwordInput).toHaveValue('secretpassword')
    })

    it('should clear email error when user starts typing in email field', async () => {
      render(React.createElement(TestLoginPage))
      
      const emailInput = screen.getByTestId('email-input')
      const submitButton = screen.getByTestId('submit-button')
      
      // Submit form to trigger validation errors
      await user.click(submitButton)
      
      // Verify error appears
      expect(screen.getByTestId('email-error')).toBeInTheDocument()
      
      // Type in email field
      await user.type(emailInput, 'test')
      
      // Error should be cleared
      expect(screen.queryByTestId('email-error')).not.toBeInTheDocument()
    })

    it('should clear password error when user starts typing in password field', async () => {
      render(React.createElement(TestLoginPage))
      
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('submit-button')
      
      // Submit form to trigger validation errors
      await user.click(submitButton)
      
      // Verify error appears
      expect(screen.getByTestId('password-error')).toBeInTheDocument()
      
      // Type in password field
      await user.type(passwordInput, 'test')
      
      // Error should be cleared
      expect(screen.queryByTestId('password-error')).not.toBeInTheDocument()
    })
  })

  describe('Password Toggle Interactions', () => {
    it('should toggle password visibility when toggle button is clicked', async () => {
      render(React.createElement(TestLoginPage))
      
      const passwordInput = screen.getByTestId('password-input')
      const toggleButton = screen.getByTestId('password-toggle')
      
      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(toggleButton).toHaveTextContent('Show')
      
      // Click toggle to show password
      await user.click(toggleButton)
      
      expect(passwordInput).toHaveAttribute('type', 'text')
      expect(toggleButton).toHaveTextContent('Hide')
      
      // Click toggle again to hide password
      await user.click(toggleButton)
      
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(toggleButton).toHaveTextContent('Show')
    })

    it('should not toggle password when button is disabled during loading', async () => {
      render(React.createElement(TestLoginPage))
      
      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const toggleButton = screen.getByTestId('password-toggle')
      const submitButton = screen.getByTestId('submit-button')
      
      // Set up valid form data
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Mock a pending API call
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves
      
      // Submit form to start loading state
      await user.click(submitButton)
      
      // Toggle button should be disabled
      expect(toggleButton).toBeDisabled()
      
      // Click should not change the password visibility
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Form Submission Interactions', () => {
    it('should show validation errors when submitting empty form', async () => {
      render(React.createElement(TestLoginPage))
      
      const submitButton = screen.getByTestId('submit-button')
      
      await user.click(submitButton)
      
      expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required')
      expect(screen.getByTestId('password-error')).toHaveTextContent('Password is required')
    })

    it('should show email validation error for invalid email format', async () => {
      render(React.createElement(TestLoginPage))
      
      const emailInput = screen.getByTestId('email-input')
      const submitButton = screen.getByTestId('submit-button')
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      expect(screen.getByTestId('email-error')).toHaveTextContent('Please enter a valid email address')
    })

    it('should disable form during submission', async () => {
      render(React.createElement(TestLoginPage))
      
      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('submit-button')
      const toggleButton = screen.getByTestId('password-toggle')
      
      // Fill in valid form data
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Mock a pending API call
      mockFetch.mockImplementation(() => new Promise(() => {}))
      
      // Submit form
      await user.click(submitButton)
      
      // All form elements should be disabled
      expect(emailInput).toBeDisabled()
      expect(passwordInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
      expect(toggleButton).toBeDisabled()
      
      // Submit button text should change
      expect(submitButton).toHaveTextContent('Signing in...')
    })

    it('should handle successful login', async () => {
      render(React.createElement(TestLoginPage))
      
      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('submit-button')
      
      // Fill in form data
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Mock successful API response
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            user: { id: '1', username: 'test', email: 'test@example.com' },
            token: 'fake-jwt-token'
          }
        })
      })
      
      // Submit form
      await user.click(submitButton)
      
      // Wait for API call to complete
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'fake-jwt-token')
        expect(mockLocation.href).toBe('/dashboard')
      })
    })

    it('should handle API error response', async () => {
      render(React.createElement(TestLoginPage))
      
      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('submit-button')
      
      // Fill in form data
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      
      // Mock error API response
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: false,
          error: {
            message: 'Invalid email or password'
          }
        })
      })
      
      // Submit form
      await user.click(submitButton)
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('general-error')).toHaveTextContent('Invalid email or password')
      })
      
      // Form should be re-enabled
      expect(emailInput).not.toBeDisabled()
      expect(passwordInput).not.toBeDisabled()
      expect(submitButton).not.toBeDisabled()
      expect(submitButton).toHaveTextContent('Sign in')
    })

    it('should handle network error', async () => {
      render(React.createElement(TestLoginPage))
      
      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('submit-button')
      
      // Fill in form data
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Mock network error
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      // Submit form
      await user.click(submitButton)
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('general-error')).toHaveTextContent('Unable to connect. Please check your internet connection and try again.')
      })
    })

    it('should clear general error when user starts typing', async () => {
      render(React.createElement(TestLoginPage))
      
      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('submit-button')
      
      // Fill in form data and trigger an error
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: false,
          error: { message: 'Login failed' }
        })
      })
      
      await user.click(submitButton)
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByTestId('general-error')).toBeInTheDocument()
      })
      
      // Start typing in email field
      await user.type(emailInput, 'a')
      
      // General error should be cleared
      expect(screen.queryByTestId('general-error')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Interactions', () => {
    it('should navigate to register page when register link is clicked', async () => {
      render(React.createElement(TestLoginPage))
      
      const registerLink = screen.getByTestId('register-link')
      
      expect(registerLink).toHaveAttribute('href', '/register')
    })

    it('should navigate to forgot password page when forgot password link is clicked', async () => {
      render(React.createElement(TestLoginPage))
      
      const forgotPasswordLink = screen.getByTestId('forgot-password-link')
      
      expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password')
    })

    it('should navigate to home page when brand link is clicked', async () => {
      render(React.createElement(TestLoginPage))
      
      const brandLink = screen.getByTestId('brand-link')
      
      expect(brandLink).toHaveAttribute('href', '/')
    })

    it('should apply hover styles to navigation links', async () => {
      render(React.createElement(TestLoginPage))
      
      const registerLink = screen.getByTestId('register-link')
      const forgotPasswordLink = screen.getByTestId('forgot-password-link')
      
      // Check that hover classes are applied
      expect(registerLink).toHaveClass('hover:text-blue-800')
      expect(forgotPasswordLink).toHaveClass('hover:text-blue-800')
    })

    it('should show focus states on navigation links when focused', async () => {
      render(React.createElement(TestLoginPage))
      
      const brandLink = screen.getByTestId('brand-link')
      const registerLink = screen.getByTestId('register-link')
      
      // Focus the brand link
      await user.click(brandLink)
      expect(brandLink).toHaveFocus()
      
      // Tab to register link
      await user.tab()
      await user.tab()
      await user.tab()
      await user.tab()
      await user.tab() // Skip through form elements
      await user.tab() // Skip forgot password
      expect(registerLink).toHaveFocus()
    })

    it('should handle keyboard navigation on navigation links', async () => {
      render(React.createElement(TestLoginPage))
      
      const brandLink = screen.getByTestId('brand-link')
      
      // Focus the brand link and activate with Enter
      brandLink.focus()
      expect(brandLink).toHaveFocus()
      
      // Test that Enter key would trigger navigation (href is correct)
      await user.keyboard('{Enter}')
      expect(brandLink).toHaveAttribute('href', '/')
    })

    it('should handle multiple navigation link states correctly', async () => {
      render(React.createElement(TestLoginPage))
      
      const registerLink = screen.getByTestId('register-link')
      const forgotPasswordLink = screen.getByTestId('forgot-password-link')
      
      // Test initial states
      expect(registerLink).toHaveClass('text-blue-600')
      expect(forgotPasswordLink).toHaveClass('text-blue-600')
      
      // Test that both links have proper focus handling
      await user.hover(registerLink)
      await user.hover(forgotPasswordLink)
      
      // Links should maintain their base styling
      expect(registerLink).toHaveClass('font-medium')
      expect(forgotPasswordLink).toHaveClass('text-sm')
    })
  })

  describe('Keyboard Interactions', () => {
    it('should submit form when Enter is pressed in password field', async () => {
      render(React.createElement(TestLoginPage))
      
      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      
      // Fill in valid form data
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      
      // Mock successful API response
      mockFetch.mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            user: { id: '1', username: 'test', email: 'test@example.com' },
            token: 'fake-jwt-token'
          }
        })
      })
      
      // Press Enter in password field
      await user.type(passwordInput, '{enter}')
      
      // Should trigger form submission
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
          })
        })
      })
    })

    it('should allow tabbing between form elements', async () => {
      render(React.createElement(TestLoginPage))
      
      const brandLink = screen.getByTestId('brand-link')
      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const toggleButton = screen.getByTestId('password-toggle')
      const submitButton = screen.getByTestId('submit-button')
      
      // Tab through all focusable elements in natural order
      await user.tab()
      expect(brandLink).toHaveFocus()
      
      await user.tab()
      expect(emailInput).toHaveFocus()
      
      await user.tab()
      expect(passwordInput).toHaveFocus()
      
      await user.tab()
      expect(toggleButton).toHaveFocus()
      
      await user.tab()
      expect(submitButton).toHaveFocus()
    })
  })
})