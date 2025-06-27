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

      const passwordInput = screen.getByLabelText(/password/i)
      
      // Type in password field
      await user.type(passwordInput, 'mySecretPassword')
      
      // Check that value is updated
      expect(passwordInput).toHaveValue('mySecretPassword')
    })

    it('should clear error message when user starts typing', async () => {
      const user = userEvent.setup()
      
      // Mock a failed login to show error
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error: 'Invalid credentials' })
      })
      
      render(<LoginComponent />)
      
      // Fill form and submit to trigger error
      await user.type(screen.getByLabelText(/email address/i), 'wrong@email.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))
      
      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
      
      // Start typing in email field
      await user.type(screen.getByLabelText(/email address/i), 'x')
      
      // Error should be cleared
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  /**
   * Test form validation and button states
   */
  describe('Form Validation', () => {
    it('should enable submit button when both fields have content', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      // Initially button should be disabled
      expect(submitButton).toBeDisabled()

      // Type in email only
      await user.type(emailInput, 'test@example.com')
      expect(submitButton).toBeDisabled()

      // Type in password - now button should be enabled
      await user.type(passwordInput, 'password123')
      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit button when fields are empty', async () => {
      const user = userEvent.setup()
      render(<LoginComponent />)

      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })
      const emailInput = screen.getByLabelText(/email address/i)
      const passwordInput = screen.getByLabelText(/password/i)

      // Fill both fields
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      expect(submitButton).not.toBeDisabled()

      // Clear email field
      await user.clear(emailInput)
      expect(submitButton).toBeDisabled()

      // Re-fill email, clear password
      await user.type(emailInput, 'test@example.com')
      await user.clear(passwordInput)
      expect(submitButton).toBeDisabled()
    })
  })

  /**
   * Test form submission and API calls
   */
  describe('Form Submission', () => {
    it('should call API with correct data on form submission', async () => {
      const user = userEvent.setup()
      
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            user: { id: '123', email: 'test@example.com', username: 'testuser', displayName: 'Test User', avatar: null, isVerified: false },
            token: 'fake-jwt-token'
          }
        })
      })
      
      render(<LoginComponent />)

      // Fill form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Check API was called with correct data
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      })
    })

    it('should use custom apiBaseUrl when provided', async () => {
      const user = userEvent.setup()
      const customApiUrl = 'https://custom-api.example.com/v2'
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: { user: {}, token: 'token' } })
      })
      
      render(<LoginComponent apiBaseUrl={customApiUrl} />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Check custom API URL was used
      expect(mockFetch).toHaveBeenCalledWith(`${customApiUrl}/auth/login`, expect.any(Object))
    })

    it('should prevent multiple submissions while loading', async () => {
      const user = userEvent.setup()
      
      // Mock slow API response
      mockFetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))
      
      render(<LoginComponent />)

      // Fill form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      // Submit form multiple times rapidly
      const submitButton = screen.getByRole('button', { name: /sign in to your account/i })
      await user.click(submitButton)
      await user.click(submitButton) // Second click should be ignored
      await user.click(submitButton) // Third click should be ignored

      // API should only be called once
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  /**
   * Test loading states during submission
   */
  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      const user = userEvent.setup()
      
      // Mock delayed API response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            json: async () => ({ success: true, data: { user: {}, token: 'token' } })
          }), 50)
        )
      )
      
      render(<LoginComponent />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Check loading state appears
      expect(screen.getByText(/signing in/i)).toBeInTheDocument()
      expect(screen.getByText(/⟳/)).toBeInTheDocument()
      
      // Button should be disabled
      expect(screen.getByRole('button')).toBeDisabled()
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/signing in/i)).not.toBeInTheDocument()
      })
    })

    it('should disable form fields during loading', async () => {
      const user = userEvent.setup()
      
      // Mock delayed API response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            json: async () => ({ success: true, data: { user: {}, token: 'token' } })
          }), 50)
        )
      )
      
      render(<LoginComponent />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Form fields should be disabled during loading
      expect(screen.getByLabelText(/email address/i)).toBeDisabled()
      expect(screen.getByLabelText(/password/i)).toBeDisabled()
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).not.toBeDisabled()
      })
    })
  })

  /**
   * Test successful login handling
   */
  describe('Success Handling', () => {
    it('should store token in localStorage on successful login', async () => {
      const user = userEvent.setup()
      const mockToken = 'fake-jwt-token-12345'
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: {
            user: { id: '123', email: 'test@example.com', username: 'testuser', displayName: 'Test User', avatar: null, isVerified: false },
            token: mockToken
          }
        })
      })
      
      render(<LoginComponent />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Wait for API call to complete
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('authToken', mockToken)
      })
    })

    it('should call onLoginSuccess callback with user data', async () => {
      const user = userEvent.setup()
      const mockOnSuccess = vi.fn()
      const mockUserData = {
        user: { id: '123', email: 'test@example.com', username: 'testuser', displayName: 'Test User', avatar: null, isVerified: false },
        token: 'fake-jwt-token'
      }
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockUserData })
      })
      
      render(<LoginComponent onLoginSuccess={mockOnSuccess} />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Wait for success callback
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockUserData)
      })
    })
  })

  /**
   * Test error handling
   */
  describe('Error Handling', () => {
    it('should display error message for failed login', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          success: false,
          error: 'Invalid email or password'
        })
      })
      
      render(<LoginComponent />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
      })
    })

    it('should call onLoginError callback with error message', async () => {
      const user = userEvent.setup()
      const mockOnError = vi.fn()
      const errorMessage = 'Server error occurred'
      
      mockFetch.mockResolvedValueOnce({
        json: async () => ({ success: false, error: errorMessage })
      })
      
      render(<LoginComponent onLoginError={mockOnError} />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Wait for error callback
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(errorMessage)
      })
    })

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      
      render(<LoginComponent />)

      // Fill and submit form
      await user.type(screen.getByLabelText(/email address/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in to your account/i }))

      // Wait for network error message
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/unable to connect to server/i)).toBeInTheDocument()
      })
    })
  })
})