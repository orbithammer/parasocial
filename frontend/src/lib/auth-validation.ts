// frontend/src/lib/auth-validation.ts
// Authentication validation utilities for login and registration forms
// Version: 1.0.0

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
 * @param email - Email string to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: string): boolean {
  // Comprehensive email regex that handles most valid email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validates login form data and returns any validation errors
 * Performs comprehensive validation of email and password fields
 * @param formData - Form data object containing email and password
 * @returns Object containing validation errors or empty object if valid
 */
export function validateLoginForm(formData: LoginFormData): LoginFormErrors {
  const errors: LoginFormErrors = {}
  
  // Email validation with trimmed whitespace
  const trimmedEmail = formData.email.trim()
  if (!trimmedEmail) {
    errors.email = 'Email is required'
  } else if (!isValidEmail(trimmedEmail)) {
    errors.email = 'Please enter a valid email address'
  }
  
  // Password validation - check for presence only (backend handles security)
  if (!formData.password) {
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