// backend/tests/models/User.profileUpdate.test.js
// Unit tests for User model profile update validation

import { describe, it, expect } from 'vitest'
import { User, UserSchemas } from '../../src/models/User.js'

describe('User Model - Profile Update Validation', () => {
  describe('Valid Profile Update Data', () => {
    it('should validate update with all optional fields provided', () => {
      const validData = {
        displayName: 'Updated Display Name',
        bio: 'This is my updated bio with some details about myself.',
        website: 'https://example.com'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should validate update with only displayName', () => {
      const validData = {
        displayName: 'New Name'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should validate update with only bio', () => {
      const validData = {
        bio: 'Just updating my bio'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should validate update with only website', () => {
      const validData = {
        website: 'https://mywebsite.com'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should validate empty update (no fields provided)', () => {
      const validData = {}

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual({})
    })

    it('should accept displayName at maximum length (50 characters)', () => {
      const validData = {
        displayName: 'a'.repeat(50)
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept bio at maximum length (500 characters)', () => {
      const validData = {
        bio: 'a'.repeat(500)
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept empty string for website (to clear website)', () => {
      const validData = {
        website: ''
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })
  })

  describe('Valid Website URLs', () => {
    it('should accept https websites', () => {
      const validData = {
        website: 'https://example.com'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept http websites', () => {
      const validData = {
        website: 'http://example.com'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept websites with paths', () => {
      const validData = {
        website: 'https://example.com/path/to/page'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept websites with query parameters', () => {
      const validData = {
        website: 'https://example.com?param=value&other=123'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept websites with ports', () => {
      const validData = {
        website: 'https://example.com:8080'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })

    it('should accept websites with subdomains', () => {
      const validData = {
        website: 'https://blog.example.com'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })
  })

  describe('Invalid DisplayName Validation', () => {
    it('should reject empty displayName when provided', () => {
      const invalidData = {
        displayName: ''
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Display name cannot be empty')
      expect(result.error.errors[0].path).toEqual(['displayName'])
    })

    it('should reject displayName with only spaces', () => {
      const invalidData = {
        displayName: '   '
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Display name cannot be empty')
    })

    it('should reject displayName longer than 50 characters', () => {
      const invalidData = {
        displayName: 'a'.repeat(51)
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Display name must be less than 50 characters')
    })

    it('should reject displayName with null value', () => {
      const invalidData = {
        displayName: null
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].path).toEqual(['displayName'])
    })

    it('should reject displayName with non-string value', () => {
      const invalidData = {
        displayName: 12345
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].path).toEqual(['displayName'])
    })
  })

  describe('Invalid Bio Validation', () => {
    it('should reject bio longer than 500 characters', () => {
      const invalidData = {
        bio: 'a'.repeat(501)
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Bio must be less than 500 characters')
      expect(result.error.errors[0].path).toEqual(['bio'])
    })

    it('should accept empty bio', () => {
      const validData = {
        bio: ''
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })

    it('should reject bio with null value', () => {
      const invalidData = {
        bio: null
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].path).toEqual(['bio'])
    })

    it('should reject bio with non-string value', () => {
      const invalidData = {
        bio: ['array', 'of', 'strings']
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].path).toEqual(['bio'])
    })
  })

  describe('Invalid Website Validation', () => {
    it('should reject invalid website URL format', () => {
      const invalidData = {
        website: 'not-a-valid-url'
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid website URL')
      expect(result.error.errors[0].path).toEqual(['website'])
    })

    it('should reject website without protocol', () => {
      const invalidData = {
        website: 'example.com'
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid website URL')
    })

    it('should reject website with invalid protocol', () => {
      const invalidData = {
        website: 'ftp://example.com'
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid website URL')
    })

    it('should reject website with only protocol', () => {
      const invalidData = {
        website: 'https://'
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid website URL')
    })

    it('should reject website with spaces', () => {
      const invalidData = {
        website: 'https://example .com'
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].message).toBe('Invalid website URL')
    })

    it('should reject website with null value', () => {
      const invalidData = {
        website: null
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].path).toEqual(['website'])
    })

    it('should reject website with non-string value', () => {
      const invalidData = {
        website: { url: 'https://example.com' }
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors[0].path).toEqual(['website'])
    })
  })

  describe('Multiple Validation Errors', () => {
    it('should return multiple validation errors for multiple invalid fields', () => {
      const invalidData = {
        displayName: '', // empty displayName
        bio: 'a'.repeat(501), // bio too long
        website: 'invalid-url' // invalid website
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors.length).toBe(4)
      
      const errorPaths = result.error.errors.map(err => err.path[0])
      expect(errorPaths).toContain('displayName')
      expect(errorPaths).toContain('bio')
      expect(errorPaths).toContain('website')
    })

    it('should handle combination of valid and invalid fields', () => {
      const invalidData = {
        displayName: 'Valid Name', // valid
        bio: 'a'.repeat(501), // invalid - too long
        website: 'https://example.com' // valid
      }

      const result = User.validateProfileUpdate(invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error.errors.length).toBe(1)
      expect(result.error.errors[0].path).toEqual(['bio'])
    })
  })

  describe('Extra Fields Handling', () => {
    it('should ignore fields not in profile update schema', () => {
      const dataWithExtras = {
        displayName: 'Valid Name',
        bio: 'Valid bio',
        website: 'https://example.com',
        email: 'should@be.ignored', // These should be ignored
        password: 'shouldbeignored',
        username: 'shouldbeignored',
        extraField: 'ignored'
      }

      const result = User.validateProfileUpdate(dataWithExtras)
      
      expect(result.success).toBe(true)
      // Zod strips extra fields by default
      expect(result.data).toEqual({
        displayName: 'Valid Name',
        bio: 'Valid bio',
        website: 'https://example.com'
      })
      expect(result.data).not.toHaveProperty('email')
      expect(result.data).not.toHaveProperty('password')
      expect(result.data).not.toHaveProperty('username')
      expect(result.data).not.toHaveProperty('extraField')
    })
  })

  describe('Edge Cases', () => {
    it('should handle bio with special characters and unicode', () => {
      const validData = {
        bio: 'Bio with émojis 🎉 and spëcial çharaçters: ñoéł & more!'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })

    it('should handle displayName with unicode characters', () => {
      const validData = {
        displayName: 'José María Álvarez'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })

    it('should handle newlines in bio', () => {
      const validData = {
        bio: 'Multi-line\nbio with\nline breaks'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })

    it('should handle displayName with numbers and symbols', () => {
      const validData = {
        displayName: 'User123 (Artist) ★'
      }

      const result = User.validateProfileUpdate(validData)
      
      expect(result.success).toBe(true)
    })
  })
})