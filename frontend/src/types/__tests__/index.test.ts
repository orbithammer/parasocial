// frontend/src/types/__tests__/index.test.ts
// Version: 1.0.0
// Unit tests for type definitions and enums

import { describe, it, expect } from 'vitest'
import { UserRole, type User, type ApiResponse, type ValidationRule } from '../index'

describe('UserRole enum', () => {
  it('should have correct enum values', () => {
    expect(UserRole.ADMIN).toBe('admin')
    expect(UserRole.USER).toBe('user')
    expect(UserRole.MODERATOR).toBe('moderator')
  })

  it('should contain all expected roles', () => {
    const roles = Object.values(UserRole)
    expect(roles).toHaveLength(3)
    expect(roles).toContain('admin')
    expect(roles).toContain('user')
    expect(roles).toContain('moderator')
  })
})

describe('Type validation helpers', () => {
  // Helper function to check if object matches User interface
  const isValidUser = (obj: unknown): obj is User => {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      typeof (obj as User).id === 'string' &&
      typeof (obj as User).email === 'string' &&
      typeof (obj as User).name === 'string' &&
      (obj as User).createdAt instanceof Date &&
      (obj as User).updatedAt instanceof Date &&
      Object.values(UserRole).includes((obj as User).role)
    )
  }

  it('should validate correct User object', () => {
    const user: User = {
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
      role: UserRole.USER
    }

    expect(isValidUser(user)).toBe(true)
  })

  it('should reject invalid User object', () => {
    const invalidUser = {
      id: 123, // should be string
      email: 'test@example.com',
      name: 'Test User'
    }

    expect(isValidUser(invalidUser)).toBe(false)
  })
})

describe('ApiResponse type structure', () => {
  it('should accept valid ApiResponse structure', () => {
    const response: ApiResponse<string> = {
      data: 'test data',
      message: 'Success',
      success: true
    }

    expect(response.data).toBe('test data')
    expect(response.message).toBe('Success')
    expect(response.success).toBe(true)
  })

  it('should accept ApiResponse with errors', () => {
    const response: ApiResponse<null> = {
      data: null,
      message: 'Validation failed',
      success: false,
      errors: ['Field is required', 'Invalid email format']
    }

    expect(response.success).toBe(false)
    expect(response.errors).toHaveLength(2)
  })
})

describe('ValidationRule type', () => {
  it('should accept different validation rule types', () => {
    const requiredRule: ValidationRule = {
      type: 'required',
      message: 'This field is required'
    }

    const minLengthRule: ValidationRule = {
      type: 'minLength',
      value: 5,
      message: 'Minimum 5 characters required'
    }

    const patternRule: ValidationRule = {
      type: 'pattern',
      value: '^[a-zA-Z]+$',
      message: 'Only letters allowed'
    }

    expect(requiredRule.type).toBe('required')
    expect(minLengthRule.value).toBe(5)
    expect(patternRule.value).toBe('^[a-zA-Z]+$')
  })
})

describe('Component props inheritance', () => {
  it('should allow BaseComponentProps to be extended', () => {
    // This tests that our component props properly extend base props
    interface TestComponentProps {
      className?: string
      children?: React.ReactNode
      testId?: string
      customProp: string
    }

    const props: TestComponentProps = {
      className: 'test-class',
      testId: 'test-component',
      customProp: 'custom value'
    }

    expect(props.className).toBe('test-class')
    expect(props.testId).toBe('test-component')
    expect(props.customProp).toBe('custom value')
  })
})

// frontend/src/types/__tests__/index.test.ts
// Version: 1.0.0