// frontend/src/lib/__tests__/auth-validation.test.ts
// Unit tests for authentication validation utilities  
// Version: 1.1.0 - Fixed missing closing bracket for describe block

import { describe, it, expect } from 'vitest'
import { 
  isValidEmail, 
  validateLoginForm, 
  isValidLoginForm,
  type LoginFormData 
} from '../auth-validation'

describe('isValidEmail', () => {
  describe('valid email addresses', () => {
    it('should accept standard email format', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
    })

    it('should accept email with subdomain', () => {
      expect(isValidEmail('user@mail.example.com')).toBe(true)
    })

    it('should accept email with numbers in local part', () => {
      expect(isValidEmail('user123@example.com')).toBe(true)
    })

    it('should accept email with dots in local part', () => {
      expect(isValidEmail('first.last@example.com')).toBe(true)
    })

    it('should accept email with plus sign in local part', () => {
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })

    it('should accept email with hyphen in domain', () => {
      expect(isValidEmail('user@my-domain.com')).toBe(true)
    })

    it('should accept email with longer TLD', () => {
      expect(isValidEmail('user@example.museum')).toBe(true)
    })

    it('should accept email with numbers in domain', () => {
      expect(isValidEmail('user@domain123.com')).toBe(true)
    })

    it('should handle whitespace by trimming', () => {
      expect(isValidEmail('  user@example.com  ')).toBe(true)
    })
  })

  describe('invalid email addresses', () => {
    it('should reject empty string', () => {
      expect(isValidEmail('')).toBe(false)
    })

    it('should reject whitespace only', () => {
      expect(isValidEmail('   ')).toBe(false)
    })

    it('should reject email without @ symbol', () => {
      expect(isValidEmail('userexample.com')).toBe(false)
    })

    it('should reject email without domain part', () => {
      expect(isValidEmail('user@')).toBe(false)
    })

    it('should reject email without local part', () => {
      expect(isValidEmail('@example.com')).toBe(false)
    })

    it('should reject email without TLD', () => {
      expect(isValidEmail('user@example')).toBe(false)
    })

    it('should reject email with multiple @ symbols', () => {
      expect(isValidEmail('user@@example.com')).toBe(false)
    })

    it('should reject email with spaces in local part', () => {
      expect(isValidEmail('user name@example.com')).toBe(false)
    })

    it('should reject email with spaces in domain', () => {
      expect(isValidEmail('user@exam ple.com')).toBe(false)
    })

    it('should reject email starting with dot', () => {
      expect(isValidEmail('.user@example.com')).toBe(false)
    })

    it('should reject email ending with dot before @', () => {
      expect(isValidEmail('user.@example.com')).toBe(false)
    })

    it('should reject email with consecutive dots', () => {
      expect(isValidEmail('user..name@example.com')).toBe(false)
    })

    it('should reject email with only @ symbol', () => {
      expect(isValidEmail('@')).toBe(false)
    })
  })
})

describe('validateLoginForm', () => {
  describe('valid form data', () => {
    it('should return no errors for valid email and password', () => {
      const formData: LoginFormData = {
        email: 'user@example.com',
        password: 'password123'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors).toEqual({})
      expect(Object.keys(errors)).toHaveLength(0)
    })

    it('should return no errors for complex valid email', () => {
      const formData: LoginFormData = {
        email: 'first.last+tag@sub.domain-name.co.uk',
        password: 'mySecurePassword!'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors).toEqual({})
    })

    it('should handle email with leading/trailing whitespace', () => {
      const formData: LoginFormData = {
        email: '  user@example.com  ',
        password: 'password'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors).toEqual({})
    })
  })

  describe('email validation errors', () => {
    it('should return error for empty email', () => {
      const formData: LoginFormData = {
        email: '',
        password: 'password123'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Email is required')
      expect(errors.password).toBeUndefined()
    })

    it('should return error for whitespace-only email', () => {
      const formData: LoginFormData = {
        email: '   ',
        password: 'password123'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Email is required')
    })

    it('should return error for invalid email format', () => {
      const formData: LoginFormData = {
        email: 'invalid-email',
        password: 'password123'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Please enter a valid email address')
    })

    it('should return error for email without domain', () => {
      const formData: LoginFormData = {
        email: 'user@',
        password: 'password123'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Please enter a valid email address')
    })

    it('should return error for email without TLD', () => {
      const formData: LoginFormData = {
        email: 'user@domain',
        password: 'password123'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Please enter a valid email address')
    })
  })

  describe('password validation errors', () => {
    it('should return error for empty password', () => {
      const formData: LoginFormData = {
        email: 'user@example.com',
        password: ''
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.password).toBe('Password is required')
      expect(errors.email).toBeUndefined()
    })

    it('should accept any non-empty password', () => {
      const formData: LoginFormData = {
        email: 'user@example.com',
        password: 'a'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.password).toBeUndefined()
    })

    it('should accept password with spaces', () => {
      const formData: LoginFormData = {
        email: 'user@example.com',
        password: 'my password with spaces'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.password).toBeUndefined()
    })
  })

  describe('multiple validation errors', () => {
    it('should return both email and password errors when both are invalid', () => {
      const formData: LoginFormData = {
        email: '',
        password: ''
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Email is required')
      expect(errors.password).toBe('Password is required')
      expect(Object.keys(errors)).toHaveLength(2)
    })

    it('should return both errors for invalid email and empty password', () => {
      const formData: LoginFormData = {
        email: 'invalid-email',
        password: ''
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Please enter a valid email address')
      expect(errors.password).toBe('Password is required')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined values gracefully', () => {
      const formData = {
        email: undefined as any,
        password: undefined as any
      }
      
      expect(() => validateLoginForm(formData)).not.toThrow()
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Email is required')
      expect(errors.password).toBe('Password is required')
    })

    it('should handle null values gracefully', () => {
      const formData = {
        email: null as any,
        password: null as any
      }
      
      expect(() => validateLoginForm(formData)).not.toThrow()
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Email is required')
      expect(errors.password).toBe('Password is required')
    })
  })
})

describe('isValidLoginForm', () => {
  it('should return true for valid form data', () => {
    const validFormData: LoginFormData = {
      email: 'user@example.com',
      password: 'password123'
    }
    
    expect(isValidLoginForm(validFormData)).toBe(true)
  })

  it('should return false for form with email error', () => {
    const invalidFormData: LoginFormData = {
      email: 'invalid-email',
      password: 'password123'
    }
    
    expect(isValidLoginForm(invalidFormData)).toBe(false)
  })

  it('should return false for form with password error', () => {
    const invalidFormData: LoginFormData = {
      email: 'user@example.com',
      password: ''
    }
    
    expect(isValidLoginForm(invalidFormData)).toBe(false)
  })

  it('should return false for form with multiple errors', () => {
    const invalidFormData: LoginFormData = {
      email: '',
      password: ''
    }
    
    expect(isValidLoginForm(invalidFormData)).toBe(false)
  })

  it('should return true for minimal valid form', () => {
    const minimalValidFormData: LoginFormData = {
      email: 'a@b.c',
      password: 'x'
    }
    
    expect(isValidLoginForm(minimalValidFormData)).toBe(true)
  })
})
    

    it('should return error for email without TLD', () => {
      const formData: LoginFormData = {
        email: 'user@domain',
        password: 'password123'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Please enter a valid email address')
    })
  

  describe('password validation errors', () => {
    it('should return error for empty password', () => {
      const formData: LoginFormData = {
        email: 'user@example.com',
        password: ''
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.password).toBe('Password is required')
      expect(errors.email).toBeUndefined()
    })

    it('should accept any non-empty password', () => {
      const formData: LoginFormData = {
        email: 'user@example.com',
        password: 'a'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.password).toBeUndefined()
    })

    it('should accept password with spaces', () => {
      const formData: LoginFormData = {
        email: 'user@example.com',
        password: 'my password with spaces'
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.password).toBeUndefined()
    })
  })

  describe('multiple validation errors', () => {
    it('should return both email and password errors when both are invalid', () => {
      const formData: LoginFormData = {
        email: '',
        password: ''
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Email is required')
      expect(errors.password).toBe('Password is required')
      expect(Object.keys(errors)).toHaveLength(2)
    })

    it('should return both errors for invalid email and empty password', () => {
      const formData: LoginFormData = {
        email: 'invalid-email',
        password: ''
      }
      
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Please enter a valid email address')
      expect(errors.password).toBe('Password is required')
    })
  })

  describe('edge cases', () => {
    it('should handle undefined values gracefully', () => {
      const formData = {
        email: undefined as any,
        password: undefined as any
      }
      
      expect(() => validateLoginForm(formData)).not.toThrow()
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Email is required')
      expect(errors.password).toBe('Password is required')
    })

    it('should handle null values gracefully', () => {
      const formData = {
        email: null as any,
        password: null as any
      }
      
      expect(() => validateLoginForm(formData)).not.toThrow()
      const errors = validateLoginForm(formData)
      expect(errors.email).toBe('Email is required')
      expect(errors.password).toBe('Password is required')
    })
  })


describe('isValidLoginForm', () => {
  it('should return true for valid form data', () => {
    const validFormData: LoginFormData = {
      email: 'user@example.com',
      password: 'password123'
    }
    
    expect(isValidLoginForm(validFormData)).toBe(true)
  })

  it('should return false for form with email error', () => {
    const invalidFormData: LoginFormData = {
      email: 'invalid-email',
      password: 'password123'
    }
    
    expect(isValidLoginForm(invalidFormData)).toBe(false)
  })

  it('should return false for form with password error', () => {
    const invalidFormData: LoginFormData = {
      email: 'user@example.com',
      password: ''
    }
    
    expect(isValidLoginForm(invalidFormData)).toBe(false)
  })

  it('should return false for form with multiple errors', () => {
    const invalidFormData: LoginFormData = {
      email: '',
      password: ''
    }
    
    expect(isValidLoginForm(invalidFormData)).toBe(false)
  })

  it('should return true for minimal valid form', () => {
    const minimalValidFormData: LoginFormData = {
      email: 'a@b.c',
      password: 'x'
    }
    
    expect(isValidLoginForm(minimalValidFormData)).toBe(true)
  })
})