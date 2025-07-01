// frontend/src/test/setup.ts
// Test setup file for React Testing Library and Jest DOM matchers  
// Version: 1.1.0 - Fixed toHaveTextContent to support both strings and regular expressions

import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'

/**
 * Test setup file for React Testing Library and Jest DOM matchers
 * Configures global test environment and cleanup
 */

// Extend Vitest expect with jest-dom matchers
expect.extend({
  toBeInTheDocument: (received) => {
    const pass = received !== null && received !== undefined && document.body.contains(received)
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
      pass,
    }
  },
  toHaveAttribute: (received, attr, value) => {
    const hasAttr = received.hasAttribute(attr)
    const attrValue = received.getAttribute(attr)
    const pass = value !== undefined ? hasAttr && attrValue === value : hasAttr
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to have attribute ${attr}${value ? ` with value "${value}"` : ''}`,
      pass,
    }
  },
  toHaveClass: (received, className) => {
    const pass = received.classList.contains(className)
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to have class "${className}"`,
      pass,
    }
  },
  toBeDisabled: (received) => {
    const pass = received.disabled === true
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be disabled`,
      pass,
    }
  },
  toBeRequired: (received) => {
    const pass = received.required === true
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be required`,
      pass,
    }
  },
  /**
   * FIXED: toHaveTextContent matcher that supports both strings and regular expressions
   * Handles the case where text parameter can be either a string or RegExp object
   */
  toHaveTextContent: (received, text) => {
    const textContent = received.textContent || ''
    
    // Check if text is a regular expression
    const pass = text instanceof RegExp 
      ? text.test(textContent)  // Use regex.test() for RegExp objects
      : textContent.includes(text)  // Use includes() for strings
    
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to have text content ${text instanceof RegExp ? `matching ${text}` : `"${text}"`}`,
      pass,
    }
  }
})

// Mock Next.js router for testing
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockPrefetch = vi.fn()
const mockBack = vi.fn()
const mockReload = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
    back: mockBack,
    reload: mockReload,
    pathname: '/test',
    query: {},
    asPath: '/test',
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock localStorage for browser storage tests
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(() => null),
    removeItem: vi.fn(() => null),
    clear: vi.fn(() => null),
  },
  writable: true,
})

// Mock fetch for API testing
global.fetch = vi.fn()

/**
 * Setup function to run before all tests
 */
beforeAll(() => {
  // Setup any global test configuration here
})

/**
 * Cleanup function to run after each test
 * Ensures tests don't interfere with each other
 */
afterEach(() => {
  // Clean up DOM after each test
  cleanup()
  
  // Clear all mocks
  vi.clearAllMocks()
  
  // Clear localStorage
  localStorage.clear()
})

/**
 * Cleanup function to run after all tests
 */
afterAll(() => {
  // Final cleanup
  vi.restoreAllMocks()
})