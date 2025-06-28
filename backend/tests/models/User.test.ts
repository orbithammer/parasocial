// backend/tests/models/User.test.js
// Unit tests for User model registration validation

import { describe, it, expect } from 'vitest'
import { User, UserSchemas } from '../../src/models/User.js'

describe('User Model - Registration Validation', () => {
  describe('Valid Registration Data', () => {
    it('should validate correct registration data with all fields', () => {
      const validData = {
        email: 'test@example.com',
        username: 'testuser123',
        password: 'Password123',
        displayName: 'Test User'
      }

      const result = User.validateRegistration(validData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should validate registration data without optional displayName', () => {
      const validData = {
        email: 'test@example.com',
        username: 'testuser123',
        password: 'Password123'
      }

      const result = User.validateRegistration(validData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should accept username with underscores and numbers', () => {
      const validData = {
        email: 'test@example.com',
        username: 'test_user_123',
        password: 'Password123'
      }

      const result = User.validateRegistration(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept minimum length username (3 characters)', () => {
      const validData = {
        email: 'test@example.com',
        username: 'abc',
        password: 'Password123'
      }

      const result = User.validateRegistration(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept maximum length username (30 characters)', () => {
      const validData = {
        email: 'test@example.com',
        username: 'a'.repeat(30),
        password: 'Password123'
      }

      const result = User.validateRegistration(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept minimum valid password requirements', () => {
      const validData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Aa1bcdef' // 8 chars, has uppercase, lowercase, number
      }

      const result = User.validateRegistration(validData)
      
      expect(result.success).toBe(true)
    })
  })

  describe('Invalid Email Validation', () => {
    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'Password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid email format')
      expect(result.error.errors[0].path).toEqual(['email'])
    })

    it('should reject email without @ symbol', () => {
      const invalidData = {
        email: 'testexample.com',
        username: 'testuser',
        password: 'Password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid email format')
    })

    it('should reject email without domain', () => {
      const invalidData = {
        email: 'test@',
        username: 'testuser',
        password: 'Password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid email format')
    })

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        username: 'testuser',
        password: 'Password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid email format')
    })
  })

  describe('Invalid Username Validation', () => {
    it('should reject username shorter than 3 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'ab',
        password: 'Password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Username must be at least 3 characters')
      expect(result.error.errors[0].path).toEqual(['username'])
    })

    it('should reject username longer than 30 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'a'.repeat(31),
        password: 'Password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Username must be less than 30 characters')
    })

    it('should reject username with special characters', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'test@user',
        password: 'Password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Username can only contain letters, numbers, and underscores')
    })

    it('should reject username with spaces', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'test user',
        password: 'Password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Username can only contain letters, numbers, and underscores')
    })

    it('should reject username with hyphens', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'test-user',
        password: 'Password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Username can only contain letters, numbers, and underscores')
    })

    it('should reject empty username', () => {
      const invalidData = {
        email: 'test@example.com',
        username: '',
        password: 'Password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Username must be at least 3 characters')
    })
  })

  describe('Invalid Password Validation', () => {
    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Pass1'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Password must be at least 8 characters')
      expect(result.error.errors[0].path).toEqual(['password'])
    })

    it('should reject password without uppercase letter', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Password must contain at least one lowercase letter, one uppercase letter, and one number')
    })

    it('should reject password without lowercase letter', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'PASSWORD123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Password must contain at least one lowercase letter, one uppercase letter, and one number')
    })

    it('should reject password without number', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Password must contain at least one lowercase letter, one uppercase letter, and one number')
    })

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: ''
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      // Should fail on both length and character requirements
      expect(result.error.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Invalid DisplayName Validation', () => {
    it('should reject empty displayName when provided', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
        displayName: ''
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Display name cannot be empty')
      expect(result.error.errors[0].path).toEqual(['displayName'])
    })

    it('should reject displayName longer than 50 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
        displayName: 'a'.repeat(51)
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Display name must be less than 50 characters')
    })

    it('should accept displayName at maximum length (50 characters)', () => {
      const validData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
        displayName: 'a'.repeat(50)
      }

      const result = User.validateRegistration(validData)
      
      expect(result.success).toBe(true)
    })
  })

  describe('Missing Required Fields', () => {
    it('should reject registration data missing email', () => {
      const invalidData = {
        username: 'testuser',
        password: 'Password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors.some(err => err.path.includes('email'))).toBe(true)
    })

    it('should reject registration data missing username', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors.some(err => err.path.includes('username'))).toBe(true)
    })

    it('should reject registration data missing password', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser'
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors.some(err => err.path.includes('password'))).toBe(true)
    })
  })

  describe('Multiple Validation Errors', () => {
    it('should return multiple validation errors for multiple invalid fields', () => {
      const invalidData = {
        email: 'invalid-email',
        username: 'ab', // too short
        password: 'weak', // too short, no uppercase, no number
        displayName: 'a'.repeat(51) // too long
      }

      const result = User.validateRegistration(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors.length).toBeGreaterThan(1)
      
      // Check that errors exist for each invalid field
      const errorPaths = result.error.errors.map(err => err.path[0])
      expect(errorPaths).toContain('email')
      expect(errorPaths).toContain('username')
      expect(errorPaths).toContain('password')
      expect(errorPaths).toContain('displayName')
    })
  })
})