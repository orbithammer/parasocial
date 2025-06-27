// backend/src/controllers/AuthController.ts
// Authentication controller with register, login, and logout endpoints using TypeScript

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
  extractTokenFromHeader(header: string): string | null
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
          error: 'Validation failed',
          details: validation.error.errors
        })
        return
      }

      const { email, username, password, displayName } = validation.data

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmailOrUsername(email, username)
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: existingUser.email === email ? 'Email already registered' : 'Username already taken'
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
        error: 'Registration failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Login existing user
   * POST /auth/login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate input data
      const validation = this.authService.validateLoginData(req.body)
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.errors
        })
        return
      }

      const { email, password } = validation.data

      // Find user by email
      const user = await this.userRepository.findByEmail(email)
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        })
        return
      }

      // Verify password
      // Check if passwordHash exists and verify it
      const isValidPassword = user.passwordHash 
        ? await this.authService.verifyPassword(user.passwordHash, password)
        : false

      // FIXED: Early return if password is invalid - don't generate token
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password'
        })
        return
      }

      // Generate token and return user data only if password is valid
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
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Logout user (token invalidation would be handled by client or token blacklist)
   * POST /auth/logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // In a stateless JWT system, logout is primarily handled client-side
      // The client should remove the token from storage
      // For enhanced security, you could implement a token blacklist here
      
      // FIXED: Message matches test expectation
      res.json({
        success: true,
        message: 'Successfully logged out'
      })
    } catch (error) {
      // FIXED: Actually throw errors so they can be caught in tests
      throw error
    }
  }

  /**
   * Get current user profile
   * GET /users/me
   */
  async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // FIXED: Check for missing user ID and return 400 instead of 404
      if (!req.user || !req.user.id) {
        res.status(400).json({
          success: false,
          error: 'User ID not found in request'
        })
        return
      }

      const user = await this.userRepository.findById(req.user.id)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        })
        return
      }

      // FIXED: Return user data nested under 'user' key to match test expectations
      res.json({
        success: true,
        data: {
          user: user.getPrivateProfile()
        }
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        // FIXED: Error message matches test expectation
        error: 'Failed to get current user',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}