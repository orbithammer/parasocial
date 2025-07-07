// backend/src/models/__tests__/User.class.test.ts
// Version: 1.1.0 - Fixed import path from User.js to User
// Unit tests for User class constructor and profile methods

import { describe, it, expect } from 'vitest'
import { User } from '../User'

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
      expect(publicProfile).not.toHaveProperty('passwordHash')
      expect(publicProfile).not.toHaveProperty('isActive')
    })

    it('should include follower and post counts when available', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        bio: 'This is my bio'
      }

      const user = new User(userData)
      // Simulate repository data that includes counts
      ;(user as any).followersCount = 150
      ;(user as any).postsCount = 25

      const publicProfile = user.getPublicProfile()

      expect(publicProfile).toHaveProperty('followersCount', 150)
      expect(publicProfile).toHaveProperty('postsCount', 25)
    })

    it('should not include counts when not available', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser'
      }

      const user = new User(userData)
      const publicProfile = user.getPublicProfile()

      expect(publicProfile).not.toHaveProperty('followersCount')
      expect(publicProfile).not.toHaveProperty('postsCount')
    })
  })

  describe('getPrivateProfile Method', () => {
    it('should return private profile data including sensitive information', () => {
      const userData = {
        id: 'user123',
        email: 'secret@example.com',
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

      // Should ALSO include sensitive fields
      expect(privateProfile).toHaveProperty('email', 'secret@example.com')
      expect(privateProfile).toHaveProperty('createdAt', new Date('2024-01-01'))
      expect(privateProfile).toHaveProperty('updatedAt', new Date('2024-01-02'))
    })

    it('should provide default dates when not available', () => {
      const userData = {
        id: 'user123',
        email: 'test@example.com',
        username: 'testuser'
      }

      const user = new User(userData)
      const privateProfile = user.getPrivateProfile()

      expect(privateProfile).toHaveProperty('email', 'test@example.com')
      expect(privateProfile).toHaveProperty('createdAt')
      expect(privateProfile).toHaveProperty('updatedAt')
      expect(privateProfile.createdAt).toBeInstanceOf(Date)
      expect(privateProfile.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('Static Validation Methods', () => {
    it('should have validateRegistration static method', () => {
      expect(typeof User.validateRegistration).toBe('function')
    })

    it('should have validateLogin static method', () => {
      expect(typeof User.validateLogin).toBe('function')
    })

    it('should have validateProfileUpdate static method', () => {
      expect(typeof User.validateProfileUpdate).toBe('function')
    })
  })
})