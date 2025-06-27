import { render, screen } from '@testing-library/react'
import RegisterComponent from '@/components/auth/RegisterComponent'

/**
 * Test suite for RegisterComponent rendering behavior
 * Tests initial state, form structure, and UI elements
 */
describe('RegisterComponent - Rendering', () => {
  
  /**
   * Test that the component renders with all required form elements
   */
  describe('Initial Render', () => {
    it('should render the registration form with all required fields', () => {
      render(<RegisterComponent />)

      // Check main heading and description
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
      expect(screen.getByText(/join parasocial and start sharing/i)).toBeInTheDocument()

      // Check all form fields exist with proper labels
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()

      // Check submit button exists
      expect(screen.getByRole('button', { name: /create your account/i })).toBeInTheDocument()
    })

    it('should render form fields with correct input types and attributes', () => {
      render(<RegisterComponent />)

      // Email field
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('name', 'email')
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email')
      expect(emailInput).toBeRequired()

      // Username field
      const usernameInput = screen.getByLabelText(/^username$/i)
      expect(usernameInput).toHaveAttribute('type', 'text')
      expect(usernameInput).toHaveAttribute('name', 'username')
      expect(usernameInput).toHaveAttribute('autocomplete', 'username')
      expect(usernameInput).toHaveAttribute('placeholder', 'Choose a username')
      expect(usernameInput).toBeRequired()

      // Display name field (optional)
      const displayNameInput = screen.getByLabelText(/display name/i)
      expect(displayNameInput).toHaveAttribute('type', 'text')
      expect(displayNameInput).toHaveAttribute('name', 'displayName')
      expect(displayNameInput).toHaveAttribute('autocomplete', 'name')
      expect(displayNameInput).toHaveAttribute('placeholder', 'How should others see your name?')
      expect(displayNameInput).not.toBeRequired()

      // Password field
      const passwordInput = screen.getByLabelText(/^password$/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('name', 'password')
      expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
      expect(passwordInput).toHaveAttribute('placeholder', 'Create a strong password')
      expect(passwordInput).toBeRequired()

      // Confirm password field
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      expect(confirmPasswordInput).toHaveAttribute('name', 'confirmPassword')
      expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password')
      expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your password')
      expect(confirmPasswordInput).toBeRequired()
    })

    it('should render submit button in initial disabled state', () => {
      render(<RegisterComponent />)

      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      // Button should be disabled when form is empty
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent('Create Account')
    })

    it('should render footer links correctly', () => {
      render(<RegisterComponent />)

      // Check login link
      expect(screen.getByRole('link', { name: /sign in here/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /sign in here/i })).toHaveAttribute('href', '/login')

      // Check legal links
      expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute('href', '/terms')
      expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy')
    })
  })

  /**
   * Test form accessibility features
   */
  describe('Accessibility', () => {
    it('should have proper form structure and semantics', () => {
      const { container } = render(<RegisterComponent />)

      // Check semantic HTML structure
      const section = container.querySelector('section')
      const form = container.querySelector('form')
      const header = container.querySelector('header')
      const footer = container.querySelector('footer')

      expect(section).toBeInTheDocument()
      expect(form).toBeInTheDocument()
      expect(header).toBeInTheDocument()
      expect(footer).toBeInTheDocument()

      // Check form has noValidate attribute for custom validation
      expect(form).toHaveAttribute('noValidate')
    })

    it('should associate labels with form inputs correctly', () => {
      render(<RegisterComponent />)

      // All fields should have proper label associations
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveAttribute('id', 'email')

      const usernameInput = screen.getByLabelText(/^username$/i)
      expect(usernameInput).toHaveAttribute('id', 'username')

      const displayNameInput = screen.getByLabelText(/display name/i)
      expect(displayNameInput).toHaveAttribute('id', 'displayName')

      const passwordInput = screen.getByLabelText(/^password$/i)
      expect(passwordInput).toHaveAttribute('id', 'password')

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirmPassword')
    })

    it('should not show error messages initially', () => {
      render(<RegisterComponent />)

      // No general error message should be visible
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument()

      // No field error messages should be visible
      expect(screen.queryByText(/please enter a valid email/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/username must be at least/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/password must be at least/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument()
    })
  })

  /**
   * Test loading state rendering
   */
  describe('Loading State', () => {
    it('should not show loading state initially', () => {
      render(<RegisterComponent />)
      
      // Initially should not show loading
      expect(screen.queryByText(/creating account/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/⟳/)).not.toBeInTheDocument()
    })
  })

  /**
   * Test component props handling
   */
  describe('Props Handling', () => {
    it('should accept and use custom apiBaseUrl prop', () => {
      const customApiUrl = 'https://api.example.com/v2'
      const { container } = render(<RegisterComponent apiBaseUrl={customApiUrl} />)
      
      // Component should render normally with custom API URL
      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
    })

    it('should accept onRegisterSuccess callback prop', () => {
      const mockOnSuccess = vi.fn()
      const { container } = render(<RegisterComponent onRegisterSuccess={mockOnSuccess} />)
      
      // Component should render normally with callback
      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
    })

    it('should accept onRegisterError callback prop', () => {
      const mockOnError = vi.fn()
      const { container } = render(<RegisterComponent onRegisterError={mockOnError} />)
      
      // Component should render normally with error callback
      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
    })

    it('should work without any optional props', () => {
      // Should render fine with no props at all
      render(<RegisterComponent />)
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    })
  })

  /**
   * Test CSS classes and styling structure
   */
  describe('Styling Structure', () => {
    it('should have correct CSS classes for layout', () => {
      const { container } = render(<RegisterComponent />)

      // Check main container has register-container class
      const section = container.querySelector('section')
      expect(section).toHaveClass('register-container')

      // Check form has register-form class
      const form = container.querySelector('form')
      expect(form).toHaveClass('register-form')

      // Check header and footer classes
      const header = container.querySelector('header')
      expect(header).toHaveClass('register-header')

      const footer = container.querySelector('footer')
      expect(footer).toHaveClass('register-footer')
    })

    it('should have proper form group structure', () => {
      const { container } = render(<RegisterComponent />)

      // Check form groups exist (5 fields: email, username, displayName, password, confirmPassword)
      const formGroups = container.querySelectorAll('.form-group')
      expect(formGroups).toHaveLength(5)

      // Check input classes
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveClass('form-input')

      const usernameInput = screen.getByLabelText(/^username$/i)
      expect(usernameInput).toHaveClass('form-input')

      const passwordInput = screen.getByLabelText(/^password$/i)
      expect(passwordInput).toHaveClass('form-input')

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      expect(confirmPasswordInput).toHaveClass('form-input')
    })

    it('should have submit button with correct styling classes', () => {
      render(<RegisterComponent />)

      const submitButton = screen.getByRole('button', { name: /create your account/i })
      expect(submitButton).toHaveClass('submit-button')
    })
  })

  /**
   * Test form field validation structure
   */
  describe('Field Validation Structure', () => {
    it('should have proper structure for error display', () => {
      const { container } = render(<RegisterComponent />)

      // Form should be set up to show field errors
      // Initially no field-error elements should be present
      const fieldErrors = container.querySelectorAll('.field-error')
      expect(fieldErrors).toHaveLength(0)

      // Error message container should not be present initially
      const errorMessage = container.querySelector('.error-message')
      expect(errorMessage).not.toBeInTheDocument()
    })

    it('should have proper ARIA structure for form validation', () => {
      render(<RegisterComponent />)

      // All required fields should have required attribute
      expect(screen.getByLabelText(/email address/i)).toBeRequired()
      expect(screen.getByLabelText(/^username$/i)).toBeRequired()
      expect(screen.getByLabelText(/^password$/i)).toBeRequired()
      expect(screen.getByLabelText(/confirm password/i)).toBeRequired()

      // Display name should not be required
      expect(screen.getByLabelText(/display name/i)).not.toBeRequired()
    })
  })
})