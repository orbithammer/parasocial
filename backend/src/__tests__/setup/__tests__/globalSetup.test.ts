// backend/src/__tests__/setup/__tests__/globalSetup.test.ts
// Version: 1.0.0
// Initial creation of unit tests for global test setup functions

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Mock console methods for testing
 */
const mockConsoleLog = vi.fn()

/**
 * Import the functions to test
 */
import { setup, teardown } from '../globalSetup'

/**
 * Test suite for global setup functions
 * Tests environment setup, teardown, and configuration
 */
describe('Global Setup Functions', () => {
  
  // Store original environment variables to restore after tests
  const originalEnv = { ...process.env }

  /**
   * Set up test environment before each test
   * Mocks console and resets environment
   */
  beforeEach(() => {
    // Mock console.log
    vi.spyOn(console, 'log').mockImplementation(mockConsoleLog)
    
    // Clear all mocks
    vi.clearAllMocks()
    
    // Reset environment variables
    process.env = { ...originalEnv }
    delete process.env['NODE_ENV']
    delete process.env['TEST_DATABASE_URL']
    delete process.env['TEST_MAX_CONNECTIONS']
    delete process.env['TEST_CONNECTION_TIMEOUT']
  })

  /**
   * Clean up after each test
   * Restores console and environment
   */
  afterEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
  })

  /**
   * Tests for the setup function
   */
  describe('setup function', () => {
    it('should set NODE_ENV to test when not already set', async () => {
      // Arrange: Ensure NODE_ENV is not set
      delete process.env['NODE_ENV']

      // Act: Run setup
      await setup()

      // Assert: NODE_ENV should be set to 'test'
      expect(process.env['NODE_ENV']).toBe('test')
      expect(mockConsoleLog).toHaveBeenCalledWith('🧪 Setting up global test environment...')
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Global test environment setup complete')
    })

    it('should not override NODE_ENV if already set', async () => {
      // Arrange: Set NODE_ENV to something else
      process.env['NODE_ENV'] = 'development'

      // Act: Run setup
      await setup()

      // Assert: NODE_ENV should remain unchanged
      expect(process.env['NODE_ENV']).toBe('development')
      expect(mockConsoleLog).toHaveBeenCalledWith('🧪 Setting up global test environment...')
    })

    it('should set default TEST_DATABASE_URL when not provided', async () => {
      // Arrange: Ensure TEST_DATABASE_URL is not set
      delete process.env['TEST_DATABASE_URL']

      // Act: Run setup
      await setup()

      // Assert: TEST_DATABASE_URL should be set to default
      expect(process.env['TEST_DATABASE_URL']).toBe('postgresql://test:test@localhost:5432/test_parasocial')
    })

    it('should not override TEST_DATABASE_URL if already set', async () => {
      // Arrange: Set custom TEST_DATABASE_URL
      process.env['TEST_DATABASE_URL'] = 'postgresql://custom:custom@localhost:5432/custom_db'

      // Act: Run setup
      await setup()

      // Assert: TEST_DATABASE_URL should remain unchanged
      expect(process.env['TEST_DATABASE_URL']).toBe('postgresql://custom:custom@localhost:5432/custom_db')
    })

    it('should set default TEST_MAX_CONNECTIONS when not provided', async () => {
      // Arrange: Ensure TEST_MAX_CONNECTIONS is not set
      delete process.env['TEST_MAX_CONNECTIONS']

      // Act: Run setup
      await setup()

      // Assert: TEST_MAX_CONNECTIONS should be set to default
      expect(process.env['TEST_MAX_CONNECTIONS']).toBe('5')
    })

    it('should not override TEST_MAX_CONNECTIONS if already set', async () => {
      // Arrange: Set custom TEST_MAX_CONNECTIONS
      process.env['TEST_MAX_CONNECTIONS'] = '10'

      // Act: Run setup
      await setup()

      // Assert: TEST_MAX_CONNECTIONS should remain unchanged
      expect(process.env['TEST_MAX_CONNECTIONS']).toBe('10')
    })

    it('should set default TEST_CONNECTION_TIMEOUT when not provided', async () => {
      // Arrange: Ensure TEST_CONNECTION_TIMEOUT is not set
      delete process.env['TEST_CONNECTION_TIMEOUT']

      // Act: Run setup
      await setup()

      // Assert: TEST_CONNECTION_TIMEOUT should be set to default
      expect(process.env['TEST_CONNECTION_TIMEOUT']).toBe('30000')
    })

    it('should not override TEST_CONNECTION_TIMEOUT if already set', async () => {
      // Arrange: Set custom TEST_CONNECTION_TIMEOUT
      process.env['TEST_CONNECTION_TIMEOUT'] = '60000'

      // Act: Run setup
      await setup()

      // Assert: TEST_CONNECTION_TIMEOUT should remain unchanged
      expect(process.env['TEST_CONNECTION_TIMEOUT']).toBe('60000')
    })

    it('should log setup progress messages', async () => {
      // Act: Run setup
      await setup()

      // Assert: Verify logging
      expect(mockConsoleLog).toHaveBeenCalledWith('🧪 Setting up global test environment...')
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Global test environment setup complete')
      expect(mockConsoleLog).toHaveBeenCalledTimes(2)
    })

    it('should set all environment variables in a single setup call', async () => {
      // Arrange: Clear all test environment variables
      delete process.env['NODE_ENV']
      delete process.env['TEST_DATABASE_URL']
      delete process.env['TEST_MAX_CONNECTIONS']
      delete process.env['TEST_CONNECTION_TIMEOUT']

      // Act: Run setup
      await setup()

      // Assert: All variables should be set
      expect(process.env['NODE_ENV']).toBe('test')
      expect(process.env['TEST_DATABASE_URL']).toBe('postgresql://test:test@localhost:5432/test_parasocial')
      expect(process.env['TEST_MAX_CONNECTIONS']).toBe('5')
      expect(process.env['TEST_CONNECTION_TIMEOUT']).toBe('30000')
    })

    it('should handle async execution properly', async () => {
      // Act: Run setup and verify it's a promise
      const setupPromise = setup()
      expect(setupPromise).toBeInstanceOf(Promise)

      // Wait for completion
      await setupPromise

      // Assert: Setup should complete successfully
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Global test environment setup complete')
    })
  })

  /**
   * Tests for the teardown function
   */
  describe('teardown function', () => {
    it('should log teardown progress messages', async () => {
      // Act: Run teardown
      await teardown()

      // Assert: Verify logging
      expect(mockConsoleLog).toHaveBeenCalledWith('🧹 Tearing down global test environment...')
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Global test environment teardown complete')
      expect(mockConsoleLog).toHaveBeenCalledTimes(2)
    })

    it('should complete without errors', async () => {
      // Act & Assert: Teardown should not throw
      await expect(teardown()).resolves.not.toThrow()
    })

    it('should handle async execution properly', async () => {
      // Act: Run teardown and verify it's a promise
      const teardownPromise = teardown()
      expect(teardownPromise).toBeInstanceOf(Promise)

      // Wait for completion
      await teardownPromise

      // Assert: Teardown should complete successfully
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Global test environment teardown complete')
    })

    it('should complete teardown even when called multiple times', async () => {
      // Act: Run teardown multiple times
      await teardown()
      await teardown()

      // Assert: Should complete both times without error
      expect(mockConsoleLog).toHaveBeenCalledWith('🧹 Tearing down global test environment...')
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Global test environment teardown complete')
      
      // Should be called twice for each teardown call
      const teardownStartCalls = mockConsoleLog.mock.calls.filter(
        call => call[0] === '🧹 Tearing down global test environment...'
      )
      const teardownCompleteCalls = mockConsoleLog.mock.calls.filter(
        call => call[0] === '✅ Global test environment teardown complete'
      )
      
      expect(teardownStartCalls).toHaveLength(2)
      expect(teardownCompleteCalls).toHaveLength(2)
    })
  })

  /**
   * Integration tests for setup and teardown together
   */
  describe('Integration Tests', () => {
    it('should handle complete setup and teardown cycle', async () => {
      // Act: Complete cycle
      await setup()
      await teardown()

      // Assert: Both should complete successfully
      expect(mockConsoleLog).toHaveBeenCalledWith('🧪 Setting up global test environment...')
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Global test environment setup complete')
      expect(mockConsoleLog).toHaveBeenCalledWith('🧹 Tearing down global test environment...')
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Global test environment teardown complete')
    })

    it('should handle multiple setup and teardown cycles', async () => {
      // Act: Multiple cycles
      await setup()
      await teardown()
      await setup()
      await teardown()

      // Assert: All cycles should complete
      const setupCalls = mockConsoleLog.mock.calls.filter(
        call => call[0] === '✅ Global test environment setup complete'
      )
      const teardownCalls = mockConsoleLog.mock.calls.filter(
        call => call[0] === '✅ Global test environment teardown complete'
      )
      
      expect(setupCalls).toHaveLength(2)
      expect(teardownCalls).toHaveLength(2)
    })

    it('should maintain environment variables after setup', async () => {
      // Arrange: Clear environment
      delete process.env['NODE_ENV']
      delete process.env['TEST_DATABASE_URL']

      // Act: Setup
      await setup()

      // Assert: Variables should persist after setup
      expect(process.env['NODE_ENV']).toBe('test')
      expect(process.env['TEST_DATABASE_URL']).toBe('postgresql://test:test@localhost:5432/test_parasocial')

      // Act: Teardown
      await teardown()

      // Assert: Variables should still be set (teardown doesn't clear them)
      expect(process.env['NODE_ENV']).toBe('test')
      expect(process.env['TEST_DATABASE_URL']).toBe('postgresql://test:test@localhost:5432/test_parasocial')
    })
  })

  /**
   * Tests for edge cases and error conditions
   */
  describe('Edge Cases', () => {
    it('should handle empty environment gracefully', async () => {
      // Arrange: Clear entire environment
      process.env = {}

      // Act: Setup should work with empty environment
      await setup()

      // Assert: Required variables should be set
      expect(process.env['NODE_ENV']).toBe('test')
      expect(process.env['TEST_DATABASE_URL']).toBeDefined()
    })

    it('should handle pre-existing complete environment', async () => {
      // Arrange: Set all environment variables
      process.env['NODE_ENV'] = 'production'
      process.env['TEST_DATABASE_URL'] = 'postgresql://existing:existing@host:5432/db'
      process.env['TEST_MAX_CONNECTIONS'] = '20'
      process.env['TEST_CONNECTION_TIMEOUT'] = '45000'

      // Act: Setup
      await setup()

      // Assert: Existing values should be preserved
      expect(process.env['NODE_ENV']).toBe('production')
      expect(process.env['TEST_DATABASE_URL']).toBe('postgresql://existing:existing@host:5432/db')
      expect(process.env['TEST_MAX_CONNECTIONS']).toBe('20')
      expect(process.env['TEST_CONNECTION_TIMEOUT']).toBe('45000')
    })

    it('should handle concurrent setup calls', async () => {
      // Act: Run setup concurrently
      const [result1, result2] = await Promise.all([
        setup(),
        setup()
      ])

      // Assert: Both should complete successfully
      expect(result1).toBeUndefined() // setup returns void
      expect(result2).toBeUndefined()
      
      // Should have logged setup messages
      expect(mockConsoleLog).toHaveBeenCalledWith('🧪 Setting up global test environment...')
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Global test environment setup complete')
    })

    it('should handle concurrent teardown calls', async () => {
      // Act: Run teardown concurrently
      const [result1, result2] = await Promise.all([
        teardown(),
        teardown()
      ])

      // Assert: Both should complete successfully
      expect(result1).toBeUndefined() // teardown returns void
      expect(result2).toBeUndefined()
    })
  })

  /**
   * Tests for default export compatibility
   */
  describe('Default Export', () => {
    it('should export setup as default', async () => {
      // Import default export
      const defaultSetup = (await import('../globalSetup')).default

      // Assert: Default export should be the setup function
      expect(defaultSetup).toBe(setup)
    })

    it('should run default export successfully', async () => {
      // Import and run default export
      const defaultSetup = (await import('../globalSetup')).default
      
      // Act: Run default setup
      await defaultSetup()

      // Assert: Should work same as named export
      expect(mockConsoleLog).toHaveBeenCalledWith('🧪 Setting up global test environment...')
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Global test environment setup complete')
    })
  })
})

// backend/src/__tests__/setup/__tests__/globalSetup.test.ts
// Version: 1.0.0
// Initial creation of unit tests for global test setup functions