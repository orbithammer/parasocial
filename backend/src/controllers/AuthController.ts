// backend/src/controllers/AuthController.ts
// Authentication controller with register, login, and logout endpoints using TypeScript
// Fixed to match expected test response formats

import { Request, Response } from 'express'
import { UserRepository } from '../repositories/UserRepository'

// Extend Express Request to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

// Auth service interface
interface AuthService {
  validateRegistrationData(data: any): { success: boolean; data?: any; error?: any }
  validateLoginData(data: any): { success: boolean; data?: any; error?: any }
  hashPassword(password: string): Promise<string>
  verifyPassword(hashedPassword: string, password: string): Promise<boolean>
  generateToken(user: any): string
  extractTokenFromHeader(header: string | undefined): string
  verifyToken(token: string): any
}

/**
 * Authentication controller class
 * Handles HTTP requests for user authentication operations
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
      // Validate input data
      const validation = this.authService.validateRegistrationData(req.body)
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid registration data',
            details: validation.error?.errors || validation.error
          }
        })
        return
      }

      const { email, username, password, displayName } = validation.data

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmailOrUsername(email, username)
      if (existingUser) {
        // Determine which field conflicts
        const isEmailConflict = existingUser.email === email
        res.status(409).json({
          success: false,
          error: {
            code: isEmailConflict ? 'EMAIL_EXISTS' : 'USERNAME_EXISTS',
            message: isEmailConflict ? 'Email is already registered' : 'Username is already taken',
            details: {
              field: isEmailConflict ? 'email' : 'username',
              value: isEmailConflict ? email : username
            }
          }
        })
        return
      }

      // Hash password and create user
      const hashedPassword = await this.authService.hashPassword(password)
      const userData = {
        email,
        username,
        passwordHash: hashedPassword,
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
        error: {
          code: 'SERVER_ERROR',
          message: 'Internal server error during registration'
        }
      })
    }
  }

  /**
   * Login to existing user account
   * POST /auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate input data
      const validation = this.authService.validateLoginData(req.body)
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid login data',
            details: validation.error?.errors || validation.error
          }
        })
        return
      }

      const { email, password } = validation.data

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
   */
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
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