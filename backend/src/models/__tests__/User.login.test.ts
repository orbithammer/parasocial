// backend/src/models/__tests__/User.login.test.ts
// Version: 1.1
// Changes: Fixed TypeScript errors with SafeParseReturnType - added proper type guards before accessing result.error

import { describe, it, expect } from 'vitest'
import { User, UserSchemas } from '../User.ts'

describe('User Model - Login Validation', () => {
  describe('Valid Login Data', () => {
    it('should validate correct login credentials', () => {
      const validData = {
        email: 'user@example.com',
        password: 'anypassword123'
      }

      const result = User.validateLogin(validData)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validData)
      }
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
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email format')
        expect(result.error.errors[0].path).toEqual(['email'])
      }
    })

    it('should reject email without @ symbol', () => {
      const invalidData = {
        email: 'userexample.com',
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email format')
      }
    })

    it('should reject email without domain', () => {
      const invalidData = {
        email: 'user@',
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email format')
      }
    })

    it('should reject email without username part', () => {
      const invalidData = {
        email: '@example.com',
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email format')
      }
    })
  })

  describe('Invalid Password Validation', () => {
    it('should reject empty password string', () => {
      const invalidData = {
        email: 'test@example.com',
        password: ''
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password is required')
      }
    })

    it('should handle password field with null value', () => {
      const invalidData = {
        email: 'test@example.com',
        password: null
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['password'])
      }
    })

    it('should handle password field with undefined value', () => {
      const invalidData = {
        email: 'test@example.com',
        password: undefined
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].path).toEqual(['password'])
      }
    })
  })

  describe('Missing Required Fields', () => {
    it('should reject login data missing email', () => {
      const invalidData = {
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors.some(err => err.path.includes('email'))).toBe(true)
      }
    })

    it('should reject login data missing password', () => {
      const invalidData = {
        email: 'test@example.com'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors.some(err => err.path.includes('password'))).toBe(true)
      }
    })

    it('should reject login data missing both email and password', () => {
      const invalidData = {}

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThanOrEqual(2)
        
        const errorPaths = result.error.errors.map(err => err.path[0])
        expect(errorPaths).toContain('email')
        expect(errorPaths).toContain('password')
      }
    })
  })

  describe('Data Type Validation', () => {
    it('should reject non-string email', () => {
      const invalidData = {
        email: 12345,
        password: 'anypassword'
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors.some(err => 
          err.path.includes('email') && err.code === 'invalid_type'
        )).toBe(true)
      }
    })

    it('should reject non-string password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 12345
      }

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors.some(err => 
          err.path.includes('password') && err.code === 'invalid_type'
        )).toBe(true)
      }
    })

    it('should reject array as input', () => {
      const invalidData = ['not', 'an', 'object']

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].code).toBe('invalid_type')
      }
    })

    it('should reject primitive values as input', () => {
      const invalidData = 'not an object'

      const result = User.validateLogin(invalidData)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].code).toBe('invalid_type')
      }
    })
  })

  describe('Extra Fields Handling', () => {
    it('should ignore extra fields in login data', () => {
      const dataWithExtra = {
        email: 'test@example.com',
        password: 'validpassword',
        extraField: 'should be ignored',
        anotherExtra: 123
      }

      const result = User.validateLogin(dataWithExtra)
      
      expect(result.success).toBe(true)
      if (result.success) {
        // Should only contain email and password
        expect(Object.keys(result.data)).toEqual(['email', 'password'])
        expect(result.data.email).toBe('test@example.com')
        expect(result.data.password).toBe('validpassword')
      }
    })
  })
})