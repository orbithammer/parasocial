// backend/src/services/__tests__/ValidationService.test.ts
// Version: 1.0.0 - Initial comprehensive unit test suite for ValidationService
// Tests validation methods for user data, posts, media uploads, and security parameters

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ValidationService } from '../ValidationService'
import { z } from 'zod'

/**
 * Mock user data interface for testing
 */
interface MockUserData {
  email: string
  username: string
  password: string
  displayName?: string
  bio?: string
  website?: string
}

/**
 * Mock post data interface for testing
 */
interface MockPostData {
  content: string
  mediaIds?: string[]
  parentId?: string
}

/**
 * Mock media upload data interface for testing
 */
interface MockMediaData {
  filename: string
  mimetype: string
  size: number
}

/**
 * ValidationService test suite
 * Comprehensive tests covering all validation scenarios
 */
describe('ValidationService', () => {
  let validationService: ValidationService

  /**
   * Setup fresh ValidationService instance before each test
   */
  beforeEach(() => {
    validationService = new ValidationService()
  })

  /**
   * Test user data validation methods
   */
  describe('User Validation', () => {
    describe('validateUserRegistration', () => {
      it('should validate correct user registration data', () => {
        const validUserData: MockUserData = {
          email: 'test@example.com',
          username: 'testuser123',
          password: 'SecurePass123!',
          displayName: 'Test User',
          bio: 'This is a test bio'
        }

        const result = validationService.validateUserRegistration(validUserData)
        
        expect(result.success).toBe(true)
        expect(result.data).toEqual(validUserData)
        expect(result.error).toBeUndefined()
      })

      it('should reject invalid email addresses', () => {
        const invalidEmails = [
          'invalid-email',
          '@domain.com',
          'user@',
          'user..double@domain.com',
          'user@domain',
          ''
        ]

        invalidEmails.forEach(email => {
          const userData: MockUserData = {
            email,
            username: 'validuser',
            password: 'ValidPass123!'
          }

          const result = validationService.validateUserRegistration(userData)
          
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        })
      })

      it('should reject invalid usernames', () => {
        const invalidUsernames = [
          'ab', // too short
          'a'.repeat(31), // too long
          'user@name', // invalid characters
          'user name', // spaces
          'user.name', // dots
          'user-name!', // special characters
          ''
        ]

        invalidUsernames.forEach(username => {
          const userData: MockUserData = {
            email: 'test@example.com',
            username,
            password: 'ValidPass123!'
          }

          const result = validationService.validateUserRegistration(userData)
          
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        })
      })

      it('should reject weak passwords', () => {
        const weakPasswords = [
          'short', // too short
          'nouppercase123!', // no uppercase
          'NOLOWERCASE123!', // no lowercase
          'NoNumbers!', // no numbers
          'NoSpecialChars123', // no special characters
          'a'.repeat(129) // too long
        ]

        weakPasswords.forEach(password => {
          const userData: MockUserData = {
            email: 'test@example.com',
            username: 'validuser',
            password
          }

          const result = validationService.validateUserRegistration(userData)
          
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        })
      })

      it('should handle optional fields correctly', () => {
        const userDataWithOptionals: MockUserData = {
          email: 'test@example.com',
          username: 'testuser',
          password: 'ValidPass123!',
          displayName: 'Test Display Name',
          bio: 'A short bio about the user',
          website: 'https://example.com'
        }

        const result = validationService.validateUserRegistration(userDataWithOptionals)
        
        expect(result.success).toBe(true)
        expect(result.data).toEqual(userDataWithOptionals)
      })
    })

    describe('validateUserUpdate', () => {
      it('should validate partial user updates', () => {
        const updateData = {
          displayName: 'New Display Name',
          bio: 'Updated bio'
        }

        const result = validationService.validateUserUpdate(updateData)
        
        expect(result.success).toBe(true)
        expect(result.data).toEqual(updateData)
      })

      it('should reject invalid update data', () => {
        const invalidUpdateData = {
          displayName: 'a'.repeat(101), // too long
          bio: 'a'.repeat(501), // too long
          website: 'not-a-valid-url'
        }

        const result = validationService.validateUserUpdate(invalidUpdateData)
        
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  /**
   * Test post data validation methods
   */
  describe('Post Validation', () => {
    describe('validatePostCreation', () => {
      it('should validate correct post data', () => {
        const validPostData: MockPostData = {
          content: 'This is a valid post content with enough characters.',
          mediaIds: ['media-id-1', 'media-id-2']
        }

        const result = validationService.validatePostCreation(validPostData)
        
        expect(result.success).toBe(true)
        expect(result.data).toEqual(validPostData)
      })

      it('should reject posts with invalid content', () => {
        const invalidPostData = [
          { content: '' }, // empty content
          { content: 'a'.repeat(501) }, // too long
          { content: '   ' }, // only whitespace
          { content: 'ab' } // too short
        ]

        invalidPostData.forEach(postData => {
          const result = validationService.validatePostCreation(postData)
          
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        })
      })

      it('should validate reply posts with parent ID', () => {
        const replyPostData: MockPostData = {
          content: 'This is a reply to another post.',
          parentId: 'parent-post-id-123'
        }

        const result = validationService.validatePostCreation(replyPostData)
        
        expect(result.success).toBe(true)
        expect(result.data).toEqual(replyPostData)
      })

      it('should reject invalid media IDs', () => {
        const postWithInvalidMedia: MockPostData = {
          content: 'Valid post content',
          mediaIds: ['', 'invalid@id', 'id with spaces']
        }

        const result = validationService.validatePostCreation(postWithInvalidMedia)
        
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  /**
   * Test media validation methods
   */
  describe('Media Validation', () => {
    describe('validateMediaUpload', () => {
      it('should validate correct media data', () => {
        const validMediaData: MockMediaData = {
          filename: 'image.jpg',
          mimetype: 'image/jpeg',
          size: 1024000 // 1MB
        }

        const result = validationService.validateMediaUpload(validMediaData)
        
        expect(result.success).toBe(true)
        expect(result.data).toEqual(validMediaData)
      })

      it('should reject files that are too large', () => {
        const oversizedMedia: MockMediaData = {
          filename: 'large-file.jpg',
          mimetype: 'image/jpeg',
          size: 11 * 1024 * 1024 // 11MB (over 10MB limit)
        }

        const result = validationService.validateMediaUpload(oversizedMedia)
        
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should reject unsupported file types', () => {
        const unsupportedMedia: MockMediaData = {
          filename: 'script.exe',
          mimetype: 'application/x-executable',
          size: 1024
        }

        const result = validationService.validateMediaUpload(unsupportedMedia)
        
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should reject files with invalid names', () => {
        const invalidFilenames = [
          '', // empty filename
          'file with spaces.jpg',
          'file@name.jpg',
          '../../../etc/passwd',
          'con.jpg', // Windows reserved name
          'a'.repeat(256) + '.jpg' // too long
        ]

        invalidFilenames.forEach(filename => {
          const mediaData: MockMediaData = {
            filename,
            mimetype: 'image/jpeg',
            size: 1024
          }

          const result = validationService.validateMediaUpload(mediaData)
          
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        })
      })
    })
  })

  /**
   * Test ID and parameter validation methods
   */
  describe('Parameter Validation', () => {
    describe('validateId', () => {
      it('should validate correct ID formats', () => {
        const validIds = [
          'user-123',
          'post_456',
          'abc123def',
          '123e4567-e89b-12d3-a456-426614174000' // UUID format
        ]

        validIds.forEach(id => {
          const result = validationService.validateId(id)
          
          expect(result.success).toBe(true)
          expect(result.data).toBe(id)
        })
      })

      it('should reject invalid ID formats', () => {
        const invalidIds = [
          '', // empty
          'id with spaces',
          'id@domain.com',
          'id.with.dots',
          'id/with/slashes',
          'a'.repeat(256) // too long
        ]

        invalidIds.forEach(id => {
          const result = validationService.validateId(id)
          
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        })
      })
    })

    describe('validatePaginationParams', () => {
      it('should validate correct pagination parameters', () => {
        const validParams = {
          page: 1,
          limit: 20
        }

        const result = validationService.validatePaginationParams(validParams)
        
        expect(result.success).toBe(true)
        expect(result.data).toEqual(validParams)
      })

      it('should apply default values for missing parameters', () => {
        const result = validationService.validatePaginationParams({})
        
        expect(result.success).toBe(true)
        expect(result.data?.page).toBe(1)
        expect(result.data?.limit).toBe(10)
      })

      it('should reject invalid pagination values', () => {
        const invalidParams = [
          { page: 0, limit: 10 }, // page too low
          { page: 1, limit: 101 }, // limit too high
          { page: -1, limit: 20 }, // negative page
          { page: 1, limit: 0 } // zero limit
        ]

        invalidParams.forEach(params => {
          const result = validationService.validatePaginationParams(params)
          
          expect(result.success).toBe(false)
          expect(result.error).toBeDefined()
        })
      })
    })
  })

  /**
   * Test input sanitization methods
   */
  describe('Input Sanitization', () => {
    describe('sanitizeString', () => {
      it('should remove control characters from strings', () => {
        const dirtyString = 'Hello\x00World\x1F'
        const cleaned = validationService.sanitizeString(dirtyString)
        
        expect(cleaned).toBe('HelloWorld')
      })

      it('should preserve normal characters', () => {
        const normalString = 'Hello World! 123 @#$%'
        const cleaned = validationService.sanitizeString(normalString)
        
        expect(cleaned).toBe(normalString)
      })

      it('should handle empty strings', () => {
        const cleaned = validationService.sanitizeString('')
        
        expect(cleaned).toBe('')
      })
    })

    describe('sanitizeObject', () => {
      it('should sanitize all string properties in an object', () => {
        const dirtyObject = {
          title: 'Hello\x00World',
          description: 'Test\x08content\x7F',
          count: 42
        }

        const cleaned = validationService.sanitizeObject(dirtyObject)
        
        expect(cleaned.title).toBe('HelloWorld')
        expect(cleaned.description).toBe('Testcontent')
        expect(cleaned.count).toBe(42)
      })

      it('should handle nested objects', () => {
        const nestedObject = {
          user: {
            name: 'John\x00Doe',
            bio: 'Developer\x1F'
          },
          post: {
            content: 'Hello\x08World'
          }
        }

        const cleaned = validationService.sanitizeObject(nestedObject)
        
        expect(cleaned.user.name).toBe('JohnDoe')
        expect(cleaned.user.bio).toBe('Developer')
        expect(cleaned.post.content).toBe('HelloWorld')
      })
    })
  })

  /**
   * Test error handling and edge cases
   */
  describe('Error Handling', () => {
    it('should handle null input gracefully', () => {
      const result = validationService.validateUserRegistration(null as any)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle undefined input gracefully', () => {
      const result = validationService.validatePostCreation(undefined as any)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should provide meaningful error messages', () => {
      const invalidUserData = {
        email: 'invalid-email',
        username: 'ab',
        password: 'weak'
      }

      const result = validationService.validateUserRegistration(invalidUserData)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.message || result.error?.errors).toBeDefined()
    })
  })

  /**
   * Test validation schema integration
   */
  describe('Schema Integration', () => {
    it('should work with Zod schemas correctly', () => {
      // Test that ValidationService integrates properly with Zod
      const testSchema = z.object({
        name: z.string().min(1),
        age: z.number().min(0)
      })

      const validData = { name: 'John', age: 25 }
      const result = validationService.validateWithSchema(testSchema, validData)
      
      expect(result.success).toBe(true)
      expect(result.data).toEqual(validData)
    })

    it('should handle schema validation errors', () => {
      const testSchema = z.object({
        name: z.string().min(1),
        age: z.number().min(0)
      })

      const invalidData = { name: '', age: -1 }
      const result = validationService.validateWithSchema(testSchema, invalidData)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})