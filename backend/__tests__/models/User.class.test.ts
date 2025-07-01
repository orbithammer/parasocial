// backend/tests/models/User.class.test.js
// Unit tests for User class constructor and profile methods

import { describe, it, expect } from 'vitest'
import { User } from '../../src/models/User.js'

describe('User Model - Class Constructor and Methods', () => {
  describe('User Constructor', () => {
    it('should create user with all provided data', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        bio: 'This is my bio',
        avatar: 'https://example.com/avatar.jpg',
        website: 'https://example.com',
        isVerified: true,
        verificationTier: 'email',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      }

      const user = new User(userData)

      expect(user.id).toBe('user123')
      expect(user.email).toBe('test@example.com')
      expect(user.username).toBe('testuser')
      expect(user.displayName).toBe('Test User')
      expect(user.bio).toBe('This is my bio')
      expect(user.avatar).toBe('https://example.com/avatar.jpg')
      expect(user.website).toBe('https://example.com')
      expect(user.isVerified).toBe(true)
      expect(user.verificationTier).toBe('email')
      expect(user.createdAt).toEqual(new Date('2024-01-01'))
      expect(user.updatedAt).toEqual(new Date('2024-01-02'))
    })

    it('should create user with minimal required data', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser'
      }

      const user = new User(userData)

      expect(user.id).toBe('user123')
      expect(user.email).toBe('test@example.com')
      expect(user.username).toBe('testuser')
      // Check default values
      expect(user.displayName).toBe('testuser') // Should default to username
      expect(user.bio).toBe('') // Should default to empty string
      expect(user.avatar).toBe(null) // Should default to null
      expect(user.website).toBe(null) // Should default to null
      expect(user.isVerified).toBe(false) // Should default to false
      expect(user.verificationTier).toBe('none') // Should default to 'none'
    })

    it('should handle displayName defaulting to username when not provided', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'johndoe'
      }

      const user = new User(userData)

      expect(user.displayName).toBe('johndoe')
    })

    it('should use provided displayName over username when both exist', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'johndoe',
        displayName: 'John Doe'
      }

      const user = new User(userData)

      expect(user.displayName).toBe('John Doe')
      expect(user.username).toBe('johndoe')
    })

    it('should handle empty string values properly', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: '', // Empty string
        bio: '', // Empty string
        avatar: '', // Empty string
        website: '' // Empty string
      }

      const user = new User(userData)

      expect(user.displayName).toBe('testuser') // Should fallback to username
      expect(user.bio).toBe('') // Should remain empty string
      expect(user.avatar).toBe(null) // Should convert to null
      expect(user.website).toBe(null) // Should convert to null
    })

    it('should handle null values properly', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: null,
        bio: null,
        avatar: null,
        website: null,
        isVerified: null,
        verificationTier: null
      }

      const user = new User(userData)

      expect(user.displayName).toBe('testuser') // Should fallback to username
      expect(user.bio).toBe('') // Should default to empty string
      expect(user.avatar).toBe(null)
      expect(user.website).toBe(null)
      expect(user.isVerified).toBe(false) // Should default to false
      expect(user.verificationTier).toBe('none') // Should default to 'none'
    })

    it('should handle undefined values properly', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: undefined,
        bio: undefined,
        avatar: undefined,
        website: undefined,
        isVerified: undefined,
        verificationTier: undefined
      }

      const user = new User(userData)

      expect(user.displayName).toBe('testuser') // Should fallback to username
      expect(user.bio).toBe('') // Should default to empty string
      expect(user.avatar).toBe(null)
      expect(user.website).toBe(null)
      expect(user.isVerified).toBe(false) // Should default to false
      expect(user.verificationTier).toBe('none') // Should default to 'none'
    })
  })

  describe('getPublicProfile Method', () => {
    it('should return public profile data excluding sensitive information', () => {
      const userData = {
        id: 'user123',
        email: 'secret@example.com', // This should be excluded
        username: 'testuser',
        displayName: 'Test User',
        bio: 'This is my bio',
        avatar: 'https://example.com/avatar.jpg',
        website: 'https://example.com',
        isVerified: true,
        verificationTier: 'email',
        createdAt: new Date('2024-01-01'), // This should be excluded
        updatedAt: new Date('2024-01-02') // This should be excluded
      }

      const user = new User(userData)
      const publicProfile = user.getPublicProfile()

      // Should include these fields
      expect(publicProfile).toHaveProperty('id', 'user123')
      expect(publicProfile).toHaveProperty('username', 'testuser')
      expect(publicProfile).toHaveProperty('displayName', 'Test User')
      expect(publicProfile).toHaveProperty('bio', 'This is my bio')
      expect(publicProfile).toHaveProperty('avatar', 'https://example.com/avatar.jpg')
      expect(publicProfile).toHaveProperty('website', 'https://example.com')
      expect(publicProfile).toHaveProperty('isVerified', true)
      expect(publicProfile).toHaveProperty('verificationTier', 'email')

      // Should NOT include these sensitive fields
      expect(publicProfile).not.toHaveProperty('email')
      expect(publicProfile).not.toHaveProperty('createdAt')
      expect(publicProfile).not.toHaveProperty('updatedAt')

      // Should have exactly 8 properties
      expect(Object.keys(publicProfile)).toHaveLength(8)
    })

    it('should return public profile with default values', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser'
      }

      const user = new User(userData)
      const publicProfile = user.getPublicProfile()

      expect(publicProfile).toEqual({
        id: 'user123',
        username: 'testuser',
        displayName: 'testuser',
        bio: '',
        avatar: null,
        website: null,
        isVerified: false,
        verificationTier: 'none'
      })
    })

    it('should handle null values in public profile', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        avatar: null,
        website: null
      }

      const user = new User(userData)
      const publicProfile = user.getPublicProfile()

      expect(publicProfile.avatar).toBe(null)
      expect(publicProfile.website).toBe(null)
    })
  })

  describe('getPrivateProfile Method', () => {
    it('should return private profile data including all information', () => {
      const userData = {
        id: 'user123',
        email: 'private@example.com',
        username: 'testuser',
        displayName: 'Test User',
        bio: 'This is my bio',
        avatar: 'https://example.com/avatar.jpg',
        website: 'https://example.com',
        isVerified: true,
        verificationTier: 'email',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      }

      const user = new User(userData)
      const privateProfile = user.getPrivateProfile()

      // Should include all public profile fields
      expect(privateProfile).toHaveProperty('id', 'user123')
      expect(privateProfile).toHaveProperty('username', 'testuser')
      expect(privateProfile).toHaveProperty('displayName', 'Test User')
      expect(privateProfile).toHaveProperty('bio', 'This is my bio')
      expect(privateProfile).toHaveProperty('avatar', 'https://example.com/avatar.jpg')
      expect(privateProfile).toHaveProperty('website', 'https://example.com')
      expect(privateProfile).toHaveProperty('isVerified', true)
      expect(privateProfile).toHaveProperty('verificationTier', 'email')

      // Should also include private fields
      expect(privateProfile).toHaveProperty('email', 'private@example.com')
      expect(privateProfile).toHaveProperty('createdAt', new Date('2024-01-01'))
      expect(privateProfile).toHaveProperty('updatedAt', new Date('2024-01-02'))

      // Should have exactly 11 properties (8 public + 3 private)
      expect(Object.keys(privateProfile)).toHaveLength(11)
    })

    it('should return private profile with default values', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      }

      const user = new User(userData)
      const privateProfile = user.getPrivateProfile()

      expect(privateProfile).toEqual({
        id: 'user123',
        username: 'testuser',
        displayName: 'testuser',
        bio: '',
        avatar: null,
        website: null,
        isVerified: false,
        verificationTier: 'none',
        email: 'test@example.com',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02')
      })
    })

    it('should include all fields from public profile', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser'
      }

      const user = new User(userData)
      const publicProfile = user.getPublicProfile()
      const privateProfile = user.getPrivateProfile()

      // Private profile should contain all public profile fields
      Object.keys(publicProfile).forEach(key => {
        expect(privateProfile).toHaveProperty(key, publicProfile[key])
      })
    })
  })

  describe('Static Validation Methods', () => {
    it('should have validateRegistration static method', () => {
      expect(typeof User.validateRegistration).toBe('function')
      
      const validData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123'
      }
      
      const result = User.validateRegistration(validData)
      expect(result.success).toBe(true)
    })

    it('should have validateLogin static method', () => {
      expect(typeof User.validateLogin).toBe('function')
      
      const validData = {
        email: 'test@example.com',
        password: 'anypassword'
      }
      
      const result = User.validateLogin(validData)
      expect(result.success).toBe(true)
    })

    it('should have validateProfileUpdate static method', () => {
      expect(typeof User.validateProfileUpdate).toBe('function')
      
      const validData = {
        displayName: 'New Name'
      }
      
      const result = User.validateProfileUpdate(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle data object with extra properties', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        extraProperty: 'should be ignored',
        anotherExtra: 12345
      }

      const user = new User(userData)
      
      // Should not have extra properties
      expect(user).not.toHaveProperty('extraProperty')
      expect(user).not.toHaveProperty('anotherExtra')
      
      // Should have required properties
      expect(user.id).toBe('user123')
      expect(user.email).toBe('test@example.com')
      expect(user.username).toBe('testuser')
    })

    it('should handle boolean values correctly', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        isVerified: true, // boolean true
        verificationTier: 'email'
      }

      const user = new User(userData)
      
      expect(user.isVerified).toBe(true)
      expect(typeof user.isVerified).toBe('boolean')
    })

    it('should handle different verification tiers', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        verificationTier: 'identity'
      }

      const user = new User(userData)
      
      expect(user.verificationTier).toBe('identity')
    })
  })
})