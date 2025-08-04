// frontend/src/types/auth.ts - Version 1.0.0
// Centralized authentication type definitions
// Changed: Initial creation to resolve missing auth types import

/**
 * User interface for authentication context
 * Used across dashboard, auth components, and API responses
 */
export interface User {
  id: string
  username?: string
  email: string
  name?: string
  displayName?: string
  avatar?: string
  role?: string
}

/**
 * Authentication state interface
 */
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

/**
 * Login request interface
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * Registration request interface
 */
export interface RegisterRequest {
  email: string
  username: string
  password: string
  displayName?: string
}

/**
 * Authentication API response interfaces
 */
export interface AuthResponse {
  user: User
  token: string
}

export interface LoginResponse extends AuthResponse {}

export interface RegisterResponse extends AuthResponse {}

/**
 * Error response interface
 */
export interface AuthError {
  message: string
  code?: string
  field?: string
}

/**
 * Token verification response
 */
export interface VerifyTokenResponse {
  user: User
}

/**
 * Authentication context type
 */
export interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  register: (email: string, username: string, password: string, displayName?: string) => Promise<void>
  clearError: () => void
  isAuthenticated: boolean
}

/**
 * Form data interfaces
 */
export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  username: string
  displayName: string
  password: string
  confirmPassword: string
}

/**
 * Validation error interface
 */
export interface FormErrors {
  email?: string
  username?: string
  password?: string
  confirmPassword?: string
  displayName?: string
}

// frontend/src/types/auth.ts - Version 1.0.0
// Centralized authentication type definitions
// Changed: Initial creation to resolve missing auth types import