// backend/src/controllers/AuthController.js
// Authentication controller with register, login, and logout endpoints

/**
 * Authentication controller class
 * Handles HTTP requests for user authentication operations
 */
export class AuthController {
  constructor(authService, userRepository) {
    this.authService = authService
    this.userRepository = userRepository
  }

  /**
   * Register new user account
   * POST /auth/register
   */
  async register(req, res) {
    try {
      // Validate input data
      const validation = this.authService.validateRegistrationData(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors
        })
      }

      const { email, username, password, displayName } = validation.data

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmailOrUsername(email, username)
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: existingUser.email === email ? 'Email already registered' : 'Username already taken'
        })
      }

      // Hash password and create user
      const hashedPassword = await this.authService.hashPassword(password)
      const userData = {
        email,
        username,
        password: hashedPassword,
        displayName: displayName || username
      }

      const newUser = await this.userRepository.create(userData)
      const token = this.authService.generateToken(newUser)

      // Return user data and token (excluding password)
      res.status(201).json({
        success: true,
        data: {
          user: newUser.getPrivateProfile(),
          token
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        message: error.message
      })
    }
  }

  /**
   * Login existing user
   * POST /auth/login
   */
  async login(req, res) {
    try {
      // Validate input data
      const validation = this.authService.validateLoginData(req.body)
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors
        })
      }

      const { email, password } = validation.data

      // Find user by email
      const user = await this.userRepository.findByEmail(email)
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        })
      }

      // Verify password
      const isValidPassword = await this.authService.verifyPassword(user.password, password)
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        })
      }

      // Generate token and return user data
      const token = this.authService.generateToken(user)

      res.json({
        success: true,
        data: {
          user: user.getPrivateProfile(),
          token
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Login failed',
        message: error.message
      })
    }
  }

  /**
   * Logout user (token invalidation would be handled by client or token blacklist)
   * POST /auth/logout
   */
  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is primarily handled client-side
      // The client should remove the token from storage
      // For enhanced security, you could implement a token blacklist here
      
      res.json({
        success: true,
        message: 'Logged out successfully'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: error.message
      })
    }
  }

  /**
   * Get current user profile
   * GET /users/me
   */
  async getCurrentUser(req, res) {
    try {
      // User information is available from auth middleware
      const user = await this.userRepository.findById(req.user.id)
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        })
      }

      res.json({
        success: true,
        data: user.getPrivateProfile()
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile',
        message: error.message
      })
    }
  }
}