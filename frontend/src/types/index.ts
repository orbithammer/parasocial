// frontend/src/types/index.ts
// Version: 1.0.0
// Initial types file with common application types

// User-related types
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
  role: UserRole
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator'
}

// API response types
export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
  errors?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form-related types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select'
  required: boolean
  placeholder?: string
  validation?: ValidationRule[]
}

export interface ValidationRule {
  type: 'required' | 'email' | 'minLength' | 'maxLength' | 'pattern'
  value?: string | number
  message: string
}

// Component props types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
  testId?: string
}

export interface ButtonProps extends BaseComponentProps {
  variant: 'primary' | 'secondary' | 'danger' | 'outline'
  size: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export interface InputProps extends BaseComponentProps {
  name: string
  type: string
  value: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  error?: string
  onChange: (value: string) => void
}

// Navigation types
export interface MenuItem {
  id: string
  label: string
  href: string
  icon?: string
  children?: MenuItem[]
  permissions?: UserRole[]
}

// Error handling types
export interface AppError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: Date
}

export type ErrorBoundaryState = {
  hasError: boolean
  error?: AppError
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

// frontend/src/types/index.ts
// Version: 1.0.0