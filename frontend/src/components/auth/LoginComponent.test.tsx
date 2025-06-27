import { render, screen } from '@testing-library/react'
import LoginComponent from '@/components/auth/LoginComponent'

/**
 * Test suite for LoginComponent rendering behavior
 * Tests initial state, form structure, and UI elements
 */
describe('LoginComponent - Rendering', () => {
  
  /**
   * Test that the component renders with all required form elements
   */
  describe('Initial Render', () => {
    it('should render the login form with all required fields', () => {
      render(<LoginComponent />)

      // Check main heading and description
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.getByText(/welcome back to parasocial/i)).toBeInTheDocument()

      // Check form fields exist with proper labels
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()

      // Check submit button exists
      expect(screen.getByRole('button', { name: /sign in to your account/i })).toBeInTheDocument()
    })

    it('should render form fields with correct input types and attributes', () => {
      render(<LoginComponent />)

      // Email field should be type email with autocomplete
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('name', 'email')
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email')
      expect(emailInput).toBeRequired()

      // Password field should be type password with autocomplete
      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('type', 'password')
      expect(passwordInput).toHaveAttribute('name', 'password')
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
      expect(passwordInput).toHaveAttribute('placeholder', 'Enter your password')
      expect(passwordInput).toBeRequired()
    })

    it('should render submit button in initial disabled state', () => {
      render(<LoginComponent />)

      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })
      
      // Button should be disabled when form is empty
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveTextContent('Sign In')
    })

    it('should render footer links correctly', () => {
      render(<LoginComponent />)

      // Check help links exist
      expect(screen.getByRole('link', { name: /forgot your password/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /sign up here/i })).toBeInTheDocument()

      // Check link destinations
      expect(screen.getByRole('link', { name: /forgot your password/i })).toHaveAttribute('href', '/forgot-password')
      expect(screen.getByRole('link', { name: /sign up here/i })).toHaveAttribute('href', '/register')
    })
  })

  /**
   * Test form accessibility features
   */
  describe('Accessibility', () => {
    it('should have proper form structure and semantics', () => {
      const { container } = render(<LoginComponent />)

      // Check semantic HTML structure using CSS selectors since roles aren't always assigned
      const section = container.querySelector('section')
      const form = container.querySelector('form')
      const header = container.querySelector('header')

      expect(section).toBeInTheDocument()
      expect(form).toBeInTheDocument()
      expect(header).toBeInTheDocument()

      // Check form has noValidate attribute for custom validation
      expect(form).toHaveAttribute('noValidate')
    })

    it('should associate labels with form inputs correctly', () => {
      render(<LoginComponent />)

      // Email field
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveAttribute('id', 'email')

      // Password field  
      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveAttribute('id', 'password')
    })

    it('should not show error message initially', () => {
      render(<LoginComponent />)

      // Error message should not be visible on initial render
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByText(/⚠️/)).not.toBeInTheDocument()
    })
  })

  /**
   * Test loading state rendering
   */
  describe('Loading State', () => {
    it('should not show loading state initially', () => {
      render(<LoginComponent />)
      
      // Initially should not show loading
      expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/⟳/)).not.toBeInTheDocument()
    })
  })

  /**
   * Test component props handling
   */
  describe('Props Handling', () => {
    it('should accept and use custom apiBaseUrl prop', () => {
      const customApiUrl = 'https://api.example.com/v2'
      const { container } = render(<LoginComponent apiBaseUrl={customApiUrl} />)
      
      // Component should render normally with custom API URL
      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
    })

    it('should accept onLoginSuccess callback prop', () => {
      const mockOnSuccess = vi.fn()
      const { container } = render(<LoginComponent onLoginSuccess={mockOnSuccess} />)
      
      // Component should render normally with callback
      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
    })

    it('should accept onLoginError callback prop', () => {
      const mockOnError = vi.fn()
      const { container } = render(<LoginComponent onLoginError={mockOnError} />)
      
      // Component should render normally with error callback
      const form = container.querySelector('form')
      expect(form).toBeInTheDocument()
    })

    it('should work without any optional props', () => {
      // Should render fine with no props at all
      render(<LoginComponent />)
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })
  })

  /**
   * Test CSS classes and styling structure
   */
  describe('Styling Structure', () => {
    it('should have correct CSS classes for layout', () => {
      const { container } = render(<LoginComponent />)

      // Check main container has login-container class
      const section = container.querySelector('section')
      expect(section).toHaveClass('login-container')

      // Check form has login-form class
      const form = container.querySelector('form')
      expect(form).toHaveClass('login-form')
    })

    it('should have proper form group structure', () => {
      const { container } = render(<LoginComponent />)

      // Check form groups exist
      const formGroups = container.querySelectorAll('.form-group')
      expect(formGroups).toHaveLength(2) // Email and password groups

      // Check input classes
      const emailInput = screen.getByLabelText(/email address/i)
      expect(emailInput).toHaveClass('form-input')

      const passwordInput = screen.getByLabelText(/password/i)
      expect(passwordInput).toHaveClass('form-input')
    })
  })
})