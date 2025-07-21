// Path: frontend/src/app/register/tests/registerPage.test.ts
// Version: 1.0.4
// Initial test suite for register page component  
// Fixed: Added waitFor to accessibility test for proper timing of attribute updates

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterPage from '../page'

// Mock Next.js router
const mockPush = vi.fn()
const mockReplace = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('RegisterPage', () => {
  // Setup user event for each test
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
    user = userEvent.setup()
    
    // Reset fetch mock
    ;(fetch as any).mockClear()
  })

  describe('Component Rendering', () => {
    it('should render register form with all required fields', () => {
      render(<RegisterPage />)
      
      // Check for form elements
      expect(screen.getByRole('form', { name: /register/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument()
    })

    it('should render page heading', () => {
      render(<RegisterPage />)
      
      expect(screen.getByRole('heading', { level: 1, name: /register/i })).toBeInTheDocument()
    })

    it('should render link to login page', () => {
      render(<RegisterPage />)
      
      expect(screen.getByRole('link', { name: /sign in here/i })).toBeInTheDocument()
    })

    it('should have proper semantic structure', () => {
      render(<RegisterPage />)
      
      // Check for main landmark
      expect(screen.getByRole('main')).toBeInTheDocument()
      
      // Check for proper form labeling
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      render(<RegisterPage />)
      
      const submitButton = screen.getByRole('button', { name: /register/i })
      await user.click(submitButton)
      
      // Check for validation error messages
      expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
      expect(await screen.findByText(/password is required/i)).toBeInTheDocument()
      expect(await screen.findByText(/first name is required/i)).toBeInTheDocument()
      expect(await screen.findByText(/last name is required/i)).toBeInTheDocument()
    })

    it('should validate email format', async () => {
      render(<RegisterPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')
      
      const submitButton = screen.getByRole('button', { name: /register/i })
      await user.click(submitButton)
      
      expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument()
    })

    it('should validate password strength', async () => {
      render(<RegisterPage />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      await user.type(passwordInput, '123')
      
      const submitButton = screen.getByRole('button', { name: /register/i })
      await user.click(submitButton)
      
      expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })

    it('should validate password confirmation match', async () => {
      render(<RegisterPage />)
      
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      
      await user.type(passwordInput, 'password123')
      await user.type(confirmPasswordInput, 'differentpassword')
      
      const submitButton = screen.getByRole('button', { name: /register/i })
      await user.click(submitButton)
      
      expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    })

    it('should clear validation errors when user corrects input', async () => {
      render(<RegisterPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const submitButton = screen.getByRole('button', { name: /register/i })
      
      // Trigger validation error
      await user.click(submitButton)
      expect(await screen.findByText(/email is required/i)).toBeInTheDocument()
      
      // Correct the input
      await user.type(emailInput, 'test@example.com')
      
      // Error should be cleared
      expect(screen.queryByText(/email is required/i)).not.toBeInTheDocument()
    })
  })

  describe('Form Submission', () => {
    const validFormData = {
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
      firstName: 'John',
      lastName: 'Doe'
    }

    it('should submit form with valid data', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, userId: '123' })
      })

      render(<RegisterPage />)
      
      // Fill out the form
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)
      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      
      const submitButton = screen.getByRole('button', { name: /register/i })
      await user.click(submitButton)
      
      // Verify API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: validFormData.email,
            password: validFormData.password,
            firstName: validFormData.firstName,
            lastName: validFormData.lastName
          })
        })
      })
    })

    it('should show loading state during submission', async () => {
      // Mock a delayed response
      ;(fetch as any).mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 100))
      )

      render(<RegisterPage />)
      
      // Fill out the form
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)
      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      
      const submitButton = screen.getByRole('button', { name: /register/i })
      await user.click(submitButton)
      
      // Check for loading state
      expect(screen.getByRole('button', { name: /registering/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /registering/i })).toBeInTheDocument()
    })

    it('should redirect to login page on successful registration', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      render(<RegisterPage />)
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)
      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      
      const submitButton = screen.getByRole('button', { name: /register/i })
      await user.click(submitButton)
      
      // Verify redirect
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login?registered=true')
      })
    })

    it('should handle registration failure', async () => {
      ;(fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Email already exists' })
      })

      render(<RegisterPage />)
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)
      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      
      const submitButton = screen.getByRole('button', { name: /register/i })
      await user.click(submitButton)
      
      // Check for error message
      expect(await screen.findByText(/email already exists/i)).toBeInTheDocument()
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      ;(fetch as any).mockRejectedValueOnce(new Error('Network error'))

      render(<RegisterPage />)
      
      // Fill and submit form
      await user.type(screen.getByLabelText(/email/i), validFormData.email)
      await user.type(screen.getByLabelText(/^password$/i), validFormData.password)
      await user.type(screen.getByLabelText(/confirm password/i), validFormData.confirmPassword)
      await user.type(screen.getByLabelText(/first name/i), validFormData.firstName)
      await user.type(screen.getByLabelText(/last name/i), validFormData.lastName)
      
      const submitButton = screen.getByRole('button', { name: /register/i })
      await user.click(submitButton)
      
      // Check for generic error message
      expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<RegisterPage />)
      
      const form = screen.getByRole('form')
      expect(form).toHaveAttribute('aria-label', 'Register')
      
      // Check for proper input labeling
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      
      expect(emailInput).toHaveAttribute('aria-required', 'true')
      expect(passwordInput).toHaveAttribute('aria-required', 'true')
    })

    it('should associate error messages with form fields', async () => {
      render(<RegisterPage />)
      
      const submitButton = screen.getByRole('button', { name: /register/i })
      await user.click(submitButton)
      
      // Wait for error message to appear first
      const errorMessage = await screen.findByText(/email is required/i)
      
      // Then wait for the input to be updated with error attributes
      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i)
        expect(emailInput).toHaveAttribute('aria-describedby', expect.stringContaining(errorMessage.id))
        expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('should be keyboard navigable', async () => {
      render(<RegisterPage />)
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const submitButton = screen.getByRole('button', { name: /register/i })
      
      // Test tab navigation
      emailInput.focus()
      expect(emailInput).toHaveFocus()
      
      await user.tab()
      expect(passwordInput).toHaveFocus()
      
      await user.tab()
      expect(confirmPasswordInput).toHaveFocus()
      
      await user.tab()
      expect(firstNameInput).toHaveFocus()
      
      await user.tab()
      expect(lastNameInput).toHaveFocus()
      
      await user.tab()
      expect(submitButton).toHaveFocus()
    })
  })
})

// Path: frontend/src/app/register/tests/registerPage.test.ts
// Version: 1.0.4