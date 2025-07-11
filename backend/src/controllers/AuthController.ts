// src/controllers/AuthController.ts
// Version: 1.4.0
// Removed unused User import

import { Request, Response } from 'express'
import { AuthService } from '../services/AuthService'
import { UserRepository } from '../repositories/UserRepository'

// Extend Express Request to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

/**
 * Authentication controller class
 * Handles user registration, login, logout, and profile operations
 */
export class AuthController {
  constructor(
    private authService: AuthService,
    private userRepository: UserRepository
  ) {}

  /**
   * Register new user account
   * POST /auth/register
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, displayName } = req.body

      // Validate registration data
      const validation = this.authService.validateRegistrationData({
        username,
        email,
        password,
        displayName
      })

      if (!validation.success) {
        // Safely extract validation details without assuming property names
        let validationDetails = null
        if (validation.error) {
          if ('issues' in validation.error) {
            validationDetails = validation.error.issues
          } else if ('errors' in validation.error) {
            validationDetails = validation.error.errors
          } else {
            validationDetails = validation.error
          }
        }

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
            details: validationDetails
          }
        })
        return
      }

      // Check if user already exists
      const existingUserByEmail = await this.userRepository.findByEmail(email)
      if (existingUserByEmail) {
        res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists'
          }
        })
        return
      }

      const existingUserByUsername = await this.userRepository.findByUsername(username)
      if (existingUserByUsername) {
        res.status(409).json({
          success: false,
          error: {
            code: 'USERNAME_EXISTS',
            message: 'This username is already taken'
          }
        })
        return
      }

      // Hash password and create user
      const passwordHash = await this.authService.hashPassword(password)
      const userData = {
        username,
        email,
        passwordHash,
        displayName: displayName || username,
        bio: null,
        avatar: null,
        website: null,
        isVerified: false,
        verificationTier: 'none' as const
      }

      const user = await this.userRepository.create(userData)
      const token = this.authService.generateToken(user)

      res.status(201).json({
        success: true,
        data: {
          user: user.getPublicProfile(),
          token
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during registration'
        }
      })
    }
  }

  /**
   * Login user with email and password
   * POST /auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body

      // Validate login data
      const validation = this.authService.validateLoginData({ email, password })
      if (!validation.success) {
        // Safely extract validation details without assuming property names
        let validationDetails = null
        if (validation.error) {
          if ('issues' in validation.error) {
            validationDetails = validation.error.issues
          } else if ('errors' in validation.error) {
            validationDetails = validation.error.errors
          } else {
            validationDetails = validation.error
          }
        }

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login data',
            details: validationDetails
          }
        })
        return
      }

      // Find user by email
      const user = await this.userRepository.findByEmail(email)
      if (!user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
        return
      }

      // Check if user has a password hash
      if (!user.passwordHash) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
        return
      }

      // Verify password
      const isValidPassword = await this.authService.verifyPassword(user.passwordHash, password)
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
        return
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
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during login'
        }
      })
    }
  }

  /**
   * Logout current user session
   * POST /auth/logout
   * Note: For JWT-based auth, logout is typically handled client-side
   */
  async logout(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // For JWT-based auth, logout is typically handled client-side
      // Server can maintain a blacklist of tokens if needed
      res.json({
        success: true,
        data: {
          message: 'Logged out successfully'
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during logout'
        }
      })
    }
  }

  /**
   * Get current authenticated user's profile
   * GET /auth/me
   */
  async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required'
          }
        })
        return
      }

      // Find user by ID from token
      const user = await this.userRepository.findById(req.user.id)
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        })
        return
      }

      res.json({
        success: true,
        data: user.getPrivateProfile()
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error while fetching user'
        }
      })
    }
  }
}