// backend/tests/models/User.login.test.js
// Unit tests for User model login validation

import { describe, it, expect } from 'vitest'
import { User, UserSchemas } from '../../src/models/User.js'

describe('User Model - Login Validation', () => {
  describe('Valid Login Data', () => {
    it('should validate correct login credentials', () => {
      const validData = {
        email: 'user@example.com',
        password: 'anypassword123'
      }

      const result = User.validateLogin(validData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should accept any password length for login (no strength requirements)', () => {
      const validData = {
        email: 'test@example.com',
        password: '123' // Short password should be ok for login validation
      }

      const result = User.validateLogin(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept password with special characters', () => {
      const validData = {
        email: 'test@example.com',
        password: 'P@ssw0rd!@#$%^&*()'
      }

      const result = User.validateLogin(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept password with spaces', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password with spaces'
      }

      const result = User.validateLogin(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept very long passwords', () => {
      const validData = {
        email: 'test@example.com',
        password: 'a'.repeat(100)
      }

      const result = User.validateLogin(validData)
      
      expect(result.success).toBe(true)
    })
  })

  describe('Invalid Email Validation', () => {
    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid email format')
      expect(result.error.errors[0].path).toEqual(['email'])
    })

    it('should reject email without @ symbol', () => {
      const invalidData = {
        email: 'userexample.com',
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid email format')
    })

    it('should reject email without domain', () => {
      const invalidData = {
        email: 'user@',
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid email format')
    })

    it('should reject email without username part', () => {
      const invalidData = {
        email: '@example.com',
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid email format')
    })

    it('should reject email with multiple @ symbols', () => {
      const invalidData = {
        email: 'user@@example.com',
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid email format')
    })

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid email format')
    })

    it('should reject email with only spaces', () => {
      const invalidData = {
        email: '   ',
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid email format')
    })
  })

  describe('Invalid Password Validation', () => {
    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: ''
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Password is required')
      expect(result.error.errors[0].path).toEqual(['password'])
    })

    it('should reject password with only spaces', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '   '
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Password is required')
    })

    it('should handle password field with null value', () => {
      const invalidData = {
        email: 'test@example.com',
        password: null
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].path).toEqual(['password'])
    })

    it('should handle password field with undefined value', () => {
      const invalidData = {
        email: 'test@example.com',
        password: undefined
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].path).toEqual(['password'])
    })
  })

  describe('Missing Required Fields', () => {
    it('should reject login data missing email', () => {
      const invalidData = {
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors.some(err => err.path.includes('email'))).toBe(true)
    })

    it('should reject login data missing password', () => {
      const invalidData = {
        email: 'test@example.com'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors.some(err => err.path.includes('password'))).toBe(true)
    })

    it('should reject login data missing both email and password', () => {
      const invalidData = {}

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors.length).toBeGreaterThanOrEqual(2)
      
      const errorPaths = result.error.errors.map(err => err.path[0])
      expect(errorPaths).toContain('email')
      expect(errorPaths).toContain('password')
    })
  })

  describe('Extra Fields Handling', () => {
    it('should ignore extra fields not in login schema', () => {
      const dataWithExtras = {
        email: 'test@example.com',
        password: 'anypassword',
        username: 'testuser', // This should be ignored for login
        displayName: 'Test User', // This should be ignored for login
        extraField: 'should be ignored'
      }

      const result = User.validateLogin(dataWithExtras)
      
      expect(result.success).toBe(true)
      // Zod strips extra fields by default
      expect(result.data).toEqual({
        email: 'test@example.com',
        password: 'anypassword'
      })
      expect(result.data).not.toHaveProperty('username')
      expect(result.data).not.toHaveProperty('displayName')
      expect(result.data).not.toHaveProperty('extraField')
    })
  })

  describe('Multiple Validation Errors', () => {
    it('should return multiple validation errors for multiple invalid fields', () => {
      const invalidData = {
        email: 'invalid-email-format',
        password: '' // empty password
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors.length).toBe(2)
      
      const errorPaths = result.error.errors.map(err => err.path[0])
      expect(errorPaths).toContain('email')
      expect(errorPaths).toContain('password')
    })

    it('should handle completely invalid login data', () => {
      const invalidData = {
        email: '', // empty email
        password: null // null password
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle login data with numeric values converted to strings', () => {
      const invalidData = {
        email: 12345, // number instead of string
        password: 'validpassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].path).toEqual(['email'])
    })

    it('should handle login data with boolean values', () => {
      const invalidData = {
        email: 'test@example.com',
        password: true // boolean instead of string
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].path).toEqual(['password'])
    })

    it('should handle login data with array values', () => {
      const invalidData = {
        email: ['test@example.com'], // array instead of string
        password: 'validpassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].path).toEqual(['email'])
    })

    it('should handle login data with object values', () => {
      const invalidData = {
        email: 'test@example.com',
        password: { value: 'password' } // object instead of string
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].path).toEqual(['password'])
    })
  })

  describe('Case Sensitivity', () => {
    it('should accept email with mixed case (validation should not enforce case)', () => {
      const validData = {
        email: 'Test.User@EXAMPLE.COM',
        password: 'anypassword'
      }

      const result = User.validateLogin(validData)
      
      expect(result.success).toBe(true)
      expect(result.data.email).toBe('Test.User@EXAMPLE.COM')
    })
  })
})