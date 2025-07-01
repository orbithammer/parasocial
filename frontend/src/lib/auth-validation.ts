// frontend/src/lib/auth-validation.ts
// Authentication validation utilities for login and registration forms
// Version: 1.1.0 - Fixed null/undefined handling and improved email validation

// Login form data interface
export interface LoginFormData {
  email: string
  password: string
}

// Login form validation errors interface
export interface LoginFormErrors {
  email?: string
  password?: string
  general?: string
}

/**
 * Validates email format using comprehensive regex pattern
 * Tests for proper email structure with domain and TLD requirements
 * Rejects emails that start/end with dots or have consecutive dots
 * @param email - Email string to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: string): boolean {
  // Handle null/undefined/non-string values
  if (!email || typeof email !== 'string') {
    return false
  }

  const trimmedEmail = email.trim()
  
  // Check for empty string after trimming
  if (!trimmedEmail) {
    return false
  }

  // More comprehensive email regex that rejects common invalid patterns
  // Allows single character TLDs for minimal test cases
  const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._+-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]+$/
  
  // Additional checks for patterns not caught by regex
  if (trimmedEmail.includes('..')) return false // Consecutive dots
  if (trimmedEmail.startsWith('.')) return false // Starts with dot
  if (trimmedEmail.includes('.@')) return false // Ends with dot before @
  
  return emailRegex.test(trimmedEmail)
}

/**
 * Validates login form data and returns any validation errors
 * Performs comprehensive validation of email and password fields
 * Handles null/undefined values gracefully without crashing
 * @param formData - Form data object containing email and password
 * @returns Object containing validation errors or empty object if valid
 */
export function validateLoginForm(formData: LoginFormData): LoginFormErrors {
  const errors: LoginFormErrors = {}
  
  // Email validation with null/undefined safety
  if (!formData.email || typeof formData.email !== 'string') {
    errors.email = 'Email is required'
  } else {
    const trimmedEmail = formData.email.trim()
    if (!trimmedEmail) {
      errors.email = 'Email is required'
    } else if (!isValidEmail(trimmedEmail)) {
      errors.email = 'Please enter a valid email address'
    }
  }
  
  // Password validation with null/undefined safety
  if (!formData.password || typeof formData.password !== 'string') {
    errors.password = 'Password is required'
  } else if (formData.password.length === 0) {
    errors.password = 'Password is required'
  }
  
  return errors
}

/**
 * Checks if login form data is valid by testing for absence of validation errors
 * @param formData - Form data object to validate
 * @returns True if form data passes all validation checks
 */
export function isValidLoginForm(formData: LoginFormData): boolean {
  const errors = validateLoginForm(formData)
  return Object.keys(errors).length === 0
}