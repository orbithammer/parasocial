// src/components/auth/__tests__/RegisterComponent.test.tsx
// Version: 1.2
// Fixed test selectors to match actual button text "Create Your Account"

import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RegisterComponent from '../RegisterComponent'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('RegisterComponent - Rendering', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('Initial Render', () => {
    it('should render the registration form with all required fields', () => {
      render(<RegisterComponent />)
      
      // Check form structure
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
      expect(screen.getByText(/join parasocial and start sharing/i)).toBeInTheDocument()
      
      // Check form fields
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
      
      // Check submit button - Fixed to match actual button text
      expect(screen.getByRole('button', { name: /create your account/i })).toBeInTheDocument()
    })

    it('should render form fields with correct input types and attributes', () => {
      render(<RegisterComponent />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/^username$/i)
      const displayNameInput = screen.getByLabelText(/display name/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(usernameInput).toHaveAttribute('type', 'text')
      expect(displayNameInput).toHaveAttribute('type', 'text')
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      
      expect(emailInput).toHaveAttribute('required')
      expect(usernameInput).toHaveAttribute('required')
      expect(passwordInput).toHaveAttribute('required')
      expect(confirmPasswordInput).toHaveAttribute('required')
      expect(displayNameInput).not.toHaveAttribute('required')
    })

    it('should render submit button in initial disabled state', () => {
      render(<RegisterComponent />)
      
      // Fixed to match actual button text
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      expect(submitButton).toBeDisabled()
    })

    it('should render footer links correctly', () => {
      render(<RegisterComponent />)
      
      expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /sign in here/i })).toHaveAttribute('href', '/login')
      expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute('href', '/terms')
      expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure and semantics', () => {
      render(<RegisterComponent />)
      
      // Check for form element
      const formElement = screen.getByRole('form', { name: /registration form/i })
      expect(formElement).toBeInTheDocument()
    })

    it('should associate labels with form inputs correctly', () => {
      render(<RegisterComponent />)
      
      const emailInput = screen.getByLabelText(/email address/i)
      const usernameInput = screen.getByLabelText(/^username$/i)
      const displayNameInput = screen.getByLabelText(/display name/i)
      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      
      expect(emailInput).toHaveAttribute('id', 'email')
      expect(usernameInput).toHaveAttribute('id', 'username')
      expect(displayNameInput).toHaveAttribute('id', 'displayName')
      expect(passwordInput).toHaveAttribute('id', 'password')
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirmPassword')
    })

    it('should not show error messages initially', () => {
      render(<RegisterComponent />)
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should not show loading state initially', () => {
      render(<RegisterComponent />)
      
      // Fixed to match actual button text
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      expect(submitButton).not.toHaveTextContent(/creating account/i)
      expect(submitButton).not.toHaveClass('loading')
    })
  })

  describe('Props Handling', () => {
    it('should accept and use custom apiBaseUrl prop', () => {
      const customUrl = 'https://api.custom.com'
      render(<RegisterComponent apiBaseUrl={customUrl} />)
      
      // Fixed to match actual button text
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('should accept onRegisterSuccess callback prop', () => {
      const mockCallback = vi.fn()
      render(<RegisterComponent onRegisterSuccess={mockCallback} />)
      
      // Fixed to match actual button text
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('should accept onRegisterError callback prop', () => {
      const mockCallback = vi.fn()
      render(<RegisterComponent onRegisterError={mockCallback} />)
      
      // Fixed to match actual button text
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('should work without any optional props', () => {
      render(<RegisterComponent />)
      
      // Fixed to match actual button text
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Styling Structure', () => {
    it('should have correct CSS classes for layout', () => {
      render(<RegisterComponent />)
      
      const container = screen.getByRole('form', { name: /registration form/i }).closest('.register-container')
      expect(container).toHaveClass('register-container')
    })

    it('should have proper form group structure', () => {
      render(<RegisterComponent />)
      
      const formGroups = document.querySelectorAll('.form-group')
      expect(formGroups).toHaveLength(5) // email, username, displayName, password, confirmPassword
    })

    it('should have submit button with correct styling classes', () => {
      render(<RegisterComponent />)
      
      // Fixed to match actual button text
      const submitButton = screen.getByRole('button', { name: /create your account/i })
      expect(submitButton).toHaveClass('submit-button')
    })
  })

  describe('Field Validation Structure', () => {
    it('should have proper structure for error display', () => {
      render(<RegisterComponent />)
      
      // Form should be ready to display validation errors
      const form = screen.getByRole('form', { name: /registration form/i })
      expect(form).toBeInTheDocument()
    })

    it('should have proper ARIA structure for form validation', () => {
      render(<RegisterComponent />)
      
      const form = screen.getByRole('form', { name: /registration form/i })
      expect(form).toHaveAttribute('novalidate') // Client-side validation
    })
  })
})