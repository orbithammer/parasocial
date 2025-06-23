// backend/src/services/AuthService.js
// Authentication service with password hashing and JWT token management

import argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'

/**
 * Authentication service class
 * Handles password hashing, verification, and JWT token operations
 */
export class AuthService {
  constructor(jwtSecret, jwtExpiresIn = '7d') {
    this.jwtSecret = jwtSecret
    this.jwtExpiresIn = jwtExpiresIn
  }

  /**
   * Hash password using argon2
   * @param {string} password - Plain text password
   * @returns {Promise<string>} - Hashed password
   */
  async hashPassword(password) {
    try {
      return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64 MB
        timeCost: 3,
        parallelism: 1
      })
    } catch (error) {
      throw new Error('Failed to hash password')
    }
  }

  /**
   * Verify password against hash
   * @param {string} hashedPassword - Stored password hash
   * @param {string} password - Plain text password to verify
   * @returns {Promise<boolean>} - True if password matches
   */
  async verifyPassword(hashedPassword, password) {
    try {
      return await argon2.verify(hashedPassword, password)
    } catch (error) {
      throw new Error('Failed to verify password')
    }
  }

  /**
   * Generate JWT token for user
   * @param {Object} user - User object
   * @returns {string} - JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username
    }

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn,
      issuer: 'parasocial-api',
      subject: user.id.toString()
    })
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'parasocial-api'
      })
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired')
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token')
      } else {
        throw new Error('Token verification failed')
      }
    }
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} - Extracted token or null
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    return authHeader.substring(7) // Remove 'Bearer ' prefix
  }

  /**
   * Validate registration data
   * @param {Object} userData - User registration data
   * @returns {Object} - Validation result
   */
  validateRegistrationData(userData) {
    return User.validateRegistration(userData)
  }

  /**
   * Validate login data
   * @param {Object} loginData - User login data
   * @returns {Object} - Validation result
   */
  validateLoginData(loginData) {
    return User.validateLogin(loginData)
  }
}