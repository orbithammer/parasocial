// backend\src\models\__tests__\User.profileUpdate.test.ts
// Version: 1.6.0
// Updated to use static validateProfileUpdate method instead of instance updateProfile method

import { describe, it, expect, beforeEach } from 'vitest'
import { User } from '../User'
import { ZodError } from 'zod'

describe('User Profile Update Validation', () => {
  it('should successfully validate valid profile data', () => {
    // Test successful profile validation with valid data
    const validProfileData = {
      displayName: 'Updated Name',
      bio: 'This is my updated bio',
      website: 'https://example.com'
    }

    const result = User.validateProfileUpdate(validProfileData)

    // Check that the validation was successful
    expect(result.success).toBe(true)
    expect(result.data).toEqual(validProfileData)
    expect(result.error).toBeUndefined()
  })

  it('should return validation error for invalid profile data', () => {
    // Test profile validation with invalid data
    const invalidProfileData = {
      displayName: '', // Empty string should fail validation
      bio: 'A'.repeat(501), // Bio too long
      website: 'not-a-valid-url'
    }

    const result = User.validateProfileUpdate(invalidProfileData)

    // Check that validation failed
    expect(result.success).toBe(false)
    expect(result.data).toBeUndefined()
    
    // Use type guard to safely access error property
    if (result.error) {
      expect(result.error).toBeInstanceOf(ZodError)
      expect(result.error.issues).toHaveLength(3)
    } else {
      // If error is undefined when we expect it, fail the test
      expect.fail('Expected validation error but result.error was undefined')
    }
  })

  it('should handle optional fields correctly', () => {
    // Test validation with only some fields provided
    const partialProfileData = {
      displayName: 'New Display Name'
      // bio and website are optional and not provided
    }

    const result = User.validateProfileUpdate(partialProfileData)

    // Check that partial validation was successful
    expect(result.success).toBe(true)
    expect(result.data?.displayName).toBe('New Display Name')
    expect(result.error).toBeUndefined()
  })

  it('should validate website URL format', () => {
    // Test website URL validation
    const profileDataWithInvalidUrl = {
      displayName: 'Test User',
      website: 'invalid-url-format'
    }

    const result = User.validateProfileUpdate(profileDataWithInvalidUrl)

    // Check that URL validation failed
    expect(result.success).toBe(false)
    
    // Safe access to error using optional chaining and type assertion
    expect(result.error?.issues.some(issue => 
      issue.path.includes('website') && issue.code === 'invalid_string'
    )).toBe(true)
  })
})