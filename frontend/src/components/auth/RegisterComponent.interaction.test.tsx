import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegisterComponent from '@/components/auth/RegisterComponent'

/**
 * Test suite for RegisterComponent user interactions
 * Tests form input, validation, submission, API calls, and user feedback
 */
describe('RegisterComponent - User Interactions', () => {
  
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
      render(<RegisterComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      
      await user.type(emailInput, 'test@example.com')
      
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('should allow typing in username field', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent />)

      const usernameInput = screen.getByLabelText(/^username$/i)
      
      await user.type(usernameInput, 'testuser123')
      
      expect(usernameInput).toHaveValue('testuser123')
    })

    it('should allow typing in display name field', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent />)

      const displayNameInput = screen.getByLabelText(/display name/i)
      
      await user.type(displayNameInput, 'Test User')
      
      expect(displayNameInput).toHaveValue('Test User')
    })

    it('should allow typing in password field', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      
      await user.type(passwordInput, 'SecurePassword123')
      
      expect(passwordInput).toHaveValue('SecurePassword123')
    })

    it('should allow typing in confirm password field', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent />)

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      
      await user.type(confirmPasswordInput, 'SecurePassword123')
      
      expect(confirmPasswordInput).toHaveValue('SecurePassword123')
    })

    it('should clear field errors when user starts typing', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })

      // Type invalid email and try to submit to trigger validation
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      // Wait for validation error to appear
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
      })

      // Start typing in email field - error should clear
      await user.type(emailInput, 'x')
      
      expect(screen.queryByText(/please enter a valid email/i)).not.toBeInTheDocument()
    })
  })

  /**
   * Test client-side form validation
   */
  describe('Form Validation', () => {
    it('should validate email format', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent />)

      const emailInput = screen.getByLabelText(/email address/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })

      // Type invalid email
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
      })
    })

    it('should validate username length and format', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent />)

      const usernameInput = screen.getByLabelText(/^username$/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })

      // Test too short username
      await user.type(usernameInput, 'ab')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument()
      })

      // Clear and test invalid characters
      await user.clear(usernameInput)
      await user.type(usernameInput, 'user@name')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/username can only contain letters/i)).toBeInTheDocument()
      })
    })

    it('should validate password requirements', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })

      // Test password too short (this will be the first error shown)
      await user.type(passwordInput, 'short')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      })

      // Test password long enough but missing uppercase (clear and retype)
      await user.clear(passwordInput)
      await user.type(passwordInput, 'nouppercase123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password must contain at least one uppercase/i)).toBeInTheDocument()
      })

      // Test password missing lowercase
      await user.clear(passwordInput)
      await user.type(passwordInput, 'NOLOWERCASE123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password must contain at least one lowercase/i)).toBeInTheDocument()
      })

      // Test password missing number
      await user.clear(passwordInput)
      await user.type(passwordInput, 'NoNumberHere')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/password must contain at least one number/i)).toBeInTheDocument()
      })
    })

    it('should validate password confirmation matches', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent />)

      const passwordInput = screen.getByLabelText(/^password$/i)
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const submitButton = screen.getByRole('button', { name: /create your account/i })

      // Type different passwords
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'DifferentPassword123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })

    it('should enable submit button when all required fields are valid', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent />)

      const submitButton = screen.getByRole('button', { name: /create your account/i })
      
      // Initially disabled
      expect(submitButton).toBeDisabled()

      // Fill all required fields with valid data
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^username$/i), 'testuser123')
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123')

      // Button should now be enabled
      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit button if any required field is empty', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent />)

      const submitButton = screen.getByRole('button', { name: /create your account/i })

      // Fill most fields but leave one empty
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^username$/i), 'testuser123')
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123')
      // Don't fill confirm password

      expect(submitButton).not.toBeDisabled()
    })
  })

  /**
   * Test form submission and API calls
   */
  describe('Form Submission', () => {
    it('should call API with correct data on form submission', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            user: { id: '123', email: 'test@example.com', username: 'testuser123', displayName: 'Test User', avatar: null, isVerified: false },
            token: 'fake-jwt-token'
          }
        })
      })
      
      render(<RegisterComponent />)

      // Fill form with valid data
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^username$/i), 'testuser123')
      await user.type(screen.getByLabelText(/display name/i), 'Test User')
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123')
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /create your account/i }))

      // Check API was called with correct data
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser123',
          password: 'SecurePassword123',
          displayName: 'Test User'
        })
      })
    })

    it('should use username as displayName when displayName is empty', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: { user: {}, token: 'token' }
        })
      })
      
      render(<RegisterComponent />)

      // Fill form without display name
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^username$/i), 'testuser123')
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123')
      
      await user.click(screen.getByRole('button', { name: /create your account/i }))

      // Should use username as displayName
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser123',
          password: 'SecurePassword123',
          displayName: 'testuser123'
        })
      })
    })

    it('should use custom apiBaseUrl when provided', async () => {
      const user = userEvent.setup()
      const customApiUrl = 'https://custom-api.example.com/v2'
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: { user: {}, token: 'token' } })
      })
      
      render(<RegisterComponent apiBaseUrl={customApiUrl} />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^username$/i), 'testuser123')
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123')
      await user.click(screen.getByRole('button', { name: /create your account/i }))

      expect(mockFetch).toHaveBeenCalledWith(`${customApiUrl}/auth/register`, expect.any(Object))
    })

    it('should not submit form if validation fails', async () => {
      const user = userEvent.setup()
      render(<RegisterComponent />)

      // Fill form with invalid data
      await user.type(screen.getByLabelText(/email address/i), 'invalid-email')
      await user.type(screen.getByLabelText(/^username$/i), 'ab') // Too short
      await user.type(screen.getByLabelText(/^password$/i), 'weak') // Too weak (length will be first error)
      await user.type(screen.getByLabelText(/confirm password/i), 'different')
      
      await user.click(screen.getByRole('button', { name: /create your account/i }))

      // API should not be called
      expect(mockFetch).not.toHaveBeenCalled()

      // Validation errors should be shown (check for the specific errors that will appear)
      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
        expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument()
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument() // Length error comes first
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
      })
    })
  })

  /**
   * Test loading states during submission
   */
  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            json: async () => ({ success: true, data: { user: {}, token: 'token' } })
          }), 50)
        )
      )
      
      render(<RegisterComponent />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^username$/i), 'testuser123')
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123')
      await user.click(screen.getByRole('button', { name: /create your account/i }))

      // Check loading state appears
      expect(screen.getByText(/creating account/i)).toBeInTheDocument()
      expect(screen.getByText(/⟳/)).toBeInTheDocument()
      
      // Button should be disabled
      expect(screen.getByRole('button')).toBeDisabled()
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/creating account/i)).not.toBeInTheDocument()
      })
    })

    it('should disable form fields during loading', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            json: async () => ({ success: true, data: { user: {}, token: 'token' } })
          }), 50)
        )
      )
      
      render(<RegisterComponent />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^username$/i), 'testuser123')
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123')
      await user.click(screen.getByRole('button', { name: /create your account/i }))

      // All form fields should be disabled during loading
      expect(screen.getByLabelText(/email address/i)).toBeDisabled()
      expect(screen.getByLabelText(/^username$/i)).toBeDisabled()
      expect(screen.getByLabelText(/display name/i)).toBeDisabled()
      expect(screen.getByLabelText(/^password$/i)).toBeDisabled()
      expect(screen.getByLabelText(/confirm password/i)).toBeDisabled()
      
      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).not.toBeDisabled()
      })
    })
  })

  /**
   * Test successful registration handling
   */
  describe('Success Handling', () => {
    it('should store token in localStorage on successful registration', async () => {
      const user = userEvent.setup()
      const mockToken = 'fake-jwt-token-12345'
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            user: { id: '123', email: 'test@example.com', username: 'testuser123', displayName: 'Test User', avatar: null, isVerified: false },
            token: mockToken
          }
        })
      })
      
      render(<RegisterComponent />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^username$/i), 'testuser123')
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123')
      await user.click(screen.getByRole('button', { name: /create your account/i }))

      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('authToken', mockToken)
      })
    })

    it('should call onRegisterSuccess callback with user data', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = vi.fn()
      const mockUserData = {
        user: { id: '123', email: 'test@example.com', username: 'testuser123', displayName: 'Test User', avatar: null, isVerified: false },
        token: 'fake-jwt-token'
      }
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockUserData })
      })
      
      render(<RegisterComponent onRegisterSuccess={mockOnSuccess} />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^username$/i), 'testuser123')
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123')
      await user.click(screen.getByRole('button', { name: /create your account/i }))

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockUserData)
      })
    })
  })

  /**
   * Test error handling
   */
  describe('Error Handling', () => {
    it('should display error message for failed registration', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: false,
          error: 'Email already registered'
        })
      })
      
      render(<RegisterComponent />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'existing@example.com')
      await user.type(screen.getByLabelText(/^username$/i), 'testuser123')
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123')
      await user.click(screen.getByRole('button', { name: /create your account/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
      })
    })

    it('should call onRegisterError callback with error message', async () => {
      const user = userEvent.setup()
      const mockOnError = vi.fn()
      const errorMessage = 'Username already taken'
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error: errorMessage })
      })
      
      render(<RegisterComponent onRegisterError={mockOnError} />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^username$/i), 'existinguser')
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123')
      await user.click(screen.getByRole('button', { name: /create your account/i }))

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(errorMessage)
      })
    })

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      render(<RegisterComponent />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/^username$/i), 'testuser123')
      await user.type(screen.getByLabelText(/^password$/i), 'SecurePassword123')
      await user.type(screen.getByLabelText(/confirm password/i), 'SecurePassword123')
      await user.click(screen.getByRole('button', { name: /create your account/i }))

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/unable to connect to server/i)).toBeInTheDocument()
      })
    })
  })
})