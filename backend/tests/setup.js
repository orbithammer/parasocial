// backend/tests/setup.js
// Global test setup and configuration

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'
  
  console.log('🧪 Test environment initialized')
})

// Cleanup after all tests
afterAll(async () => {
  console.log('🧹 Test cleanup completed')
})

// Reset state before each test
beforeEach(async () => {
  // Reset any global state if needed
})

// Cleanup after each test
afterEach(async () => {
  // Clear any test artifacts
})