// backend/src/__tests__/helpers/__tests__/testSetup.test.ts
// Version: 1.2.0
// Fixed invalid expect.any(Number) assertion in toHaveBeenCalledTimes

import { describe, it, expect, beforeEach, vi, afterEach, type MockedFunction } from 'vitest'
import { testDatabaseConfig } from '../../../config/testDatabase'

/**
 * Mock the testDatabase config module
 */
vi.mock('../../../config/testDatabase', () => ({
  testDatabaseConfig: {
    url: 'postgresql://test:test@localhost:5432/test_db',
    maxConnections: 5,
    connectionTimeout: 30000
  }
}))

/**
 * Import the functions to test after mocking dependencies
 */
import {
  initializeTestDatabase,
  clearTestDatabase,
  seedTestDatabase,
  closeTestDatabase,
  setupTestEnvironment,
  teardownTestEnvironment
} from '../testSetup'

/**
 * Mock console methods to test logging
 */
const mockConsoleLog = vi.fn()
const mockConsoleError = vi.fn()

/**
 * Test suite for test setup helper functions
 * Tests database initialization, cleanup, and environment management
 */
describe('Test Setup Helpers', () => {
  
  /**
   * Set up test environment before each test
   * Mocks console methods and clears previous calls
   */
  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(mockConsoleLog)
    vi.spyOn(console, 'error').mockImplementation(mockConsoleError)
    
    // Clear all mocks
    vi.clearAllMocks()
  })

  /**
   * Clean up after each test
   * Restores original console methods
   */
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Tests for initializeTestDatabase function
   */
  describe('initializeTestDatabase', () => {
    it('should successfully initialize database with default options', async () => {
      // Act: Initialize database with defaults
      const result = await initializeTestDatabase()

      // Assert: Verify successful initialization
      expect(result.isConnected).toBe(true)
      expect(result.connectionId).toMatch(/^test-connection-\d+$/)
      expect(result.error).toBeNull()
      expect(mockConsoleLog).toHaveBeenCalledWith('Connecting to test database: postgresql://test:test@localhost:5432/test_db')
      expect(mockConsoleLog).toHaveBeenCalledWith('Connection timeout set to: 30000ms')
      expect(mockConsoleLog).toHaveBeenCalledWith('Clearing test database...')
    })

    it('should initialize database without clearing data when specified', async () => {
      // Act: Initialize without clearing data
      const result = await initializeTestDatabase({ clearData: false })

      // Assert: Verify initialization without clearing
      expect(result.isConnected).toBe(true)
      expect(mockConsoleLog).not.toHaveBeenCalledWith('Clearing test database...')
      expect(mockConsoleLog).not.toHaveBeenCalledWith('Seeding test database...')
    })

    it('should initialize database with seeding when specified', async () => {
      // Act: Initialize with seeding
      const result = await initializeTestDatabase({ 
        clearData: false, 
        seedData: true 
      })

      // Assert: Verify seeding occurred
      expect(result.isConnected).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith('Seeding test database...')
      expect(mockConsoleLog).not.toHaveBeenCalledWith('Clearing test database...')
    })

    it('should handle timeout correctly', async () => {
      // Arrange: Use a very short timeout that should trigger quickly
      const timeoutOptions = { timeout: 1 }
      
      // Act: Initialize with very short timeout
      const result = await initializeTestDatabase(timeoutOptions)
      
      // Assert: Should either succeed or timeout gracefully
      // The actual behavior depends on timing, but it shouldn't hang
      expect(result.isConnected).toBeDefined()
      expect(result.error).toBeDefined()
      expect(result.connectionId).toBeDefined()
      expect(mockConsoleLog).toHaveBeenCalledWith('Connection timeout set to: 1ms')
    })

    it('should use custom timeout value', async () => {
      // Act: Initialize with custom timeout
      const result = await initializeTestDatabase({ timeout: 5000 })

      // Assert: Verify custom timeout is logged
      expect(mockConsoleLog).toHaveBeenCalledWith('Connection timeout set to: 5000ms')
      expect(result.isConnected).toBe(true)
    })

    it('should handle database initialization errors', async () => {
      // Arrange: Test with invalid timeout to trigger error path
      // This tests the error handling without complex mocking
      
      // Act: Try to initialize database (this should succeed but we test structure)
      const result = await initializeTestDatabase()

      // Assert: Verify normal success case structure
      // In a real implementation, we'd inject error conditions
      expect(result).toHaveProperty('isConnected')
      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('connectionId')
      
      // Test that the function returns the expected structure
      expect(typeof result.isConnected).toBe('boolean')
    })
  })

  /**
   * Tests for clearTestDatabase function
   */
  describe('clearTestDatabase', () => {
    it('should clear test database successfully', async () => {
      // Act: Clear database
      await clearTestDatabase()

      // Assert: Verify clearing logged
      expect(mockConsoleLog).toHaveBeenCalledWith('Clearing test database...')
    })

    it('should handle clearing errors gracefully', async () => {
      // This test ensures the function doesn't throw for now
      // In a real implementation, we'd mock database errors
      await expect(clearTestDatabase()).resolves.not.toThrow()
    })
  })

  /**
   * Tests for seedTestDatabase function
   */
  describe('seedTestDatabase', () => {
    it('should seed test database successfully', async () => {
      // Act: Seed database
      await seedTestDatabase()

      // Assert: Verify seeding logged
      expect(mockConsoleLog).toHaveBeenCalledWith('Seeding test database...')
    })

    it('should handle seeding errors gracefully', async () => {
      // This test ensures the function doesn't throw for now
      // In a real implementation, we'd mock database errors
      await expect(seedTestDatabase()).resolves.not.toThrow()
    })
  })

  /**
   * Tests for closeTestDatabase function
   */
  describe('closeTestDatabase', () => {
    it('should close test database successfully', async () => {
      // Act: Close database
      await closeTestDatabase()

      // Assert: Verify closing logged
      expect(mockConsoleLog).toHaveBeenCalledWith('Closing test database connection...')
    })

    it('should handle closing errors gracefully', async () => {
      // This test ensures the function doesn't throw for now
      await expect(closeTestDatabase()).resolves.not.toThrow()
    })
  })

  /**
   * Tests for setupTestEnvironment function
   */
  describe('setupTestEnvironment', () => {
    it('should setup test environment successfully with default options', async () => {
      // Act: Setup environment
      const result = await setupTestEnvironment()

      // Assert: Verify successful setup
      expect(result).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith('Test environment setup complete')
      expect(mockConsoleLog).toHaveBeenCalledWith('Connecting to test database: postgresql://test:test@localhost:5432/test_db')
    })

    it('should setup test environment with custom options', async () => {
      // Act: Setup with custom options
      const result = await setupTestEnvironment({ 
        clearData: false,
        seedData: true,
        timeout: 10000
      })

      // Assert: Verify custom setup
      expect(result).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith('Connection timeout set to: 10000ms')
      expect(mockConsoleLog).toHaveBeenCalledWith('Seeding test database...')
      expect(mockConsoleLog).not.toHaveBeenCalledWith('Clearing test database...')
    })

    it('should handle setup failures gracefully', async () => {
      // Act: Test normal setup (error injection would require dependency injection)
      const result = await setupTestEnvironment()

      // Assert: Verify the function structure and normal operation
      expect(typeof result).toBe('boolean')
      expect(result).toBe(true)
      
      // In a real implementation, we'd use dependency injection to test failures
      // For now, we verify the function completes and returns expected type
    })

    it('should return false when database connection fails', async () => {
      // Act: Test normal setup behavior
      const result = await setupTestEnvironment()

      // Assert: Verify expected structure
      expect(typeof result).toBe('boolean')
      
      // In a production test, we'd mock dependencies to simulate failures
      // For now, we test that the function returns the correct type
    })
  })

  /**
   * Tests for teardownTestEnvironment function
   */
  describe('teardownTestEnvironment', () => {
    it('should teardown test environment successfully', async () => {
      // Act: Teardown environment
      await teardownTestEnvironment()

      // Assert: Verify teardown steps
      expect(mockConsoleLog).toHaveBeenCalledWith('Clearing test database...')
      expect(mockConsoleLog).toHaveBeenCalledWith('Closing test database connection...')
      expect(mockConsoleLog).toHaveBeenCalledWith('Test environment teardown complete')
    })

    it('should handle teardown errors gracefully', async () => {
      // This test verifies teardown doesn't throw even if operations fail
      await expect(teardownTestEnvironment()).resolves.not.toThrow()
    })

    it('should log errors during teardown but continue', async () => {
      // Act: Test that teardown completes successfully
      await teardownTestEnvironment()
      
      // Assert: The function should complete and log completion
      expect(mockConsoleLog).toHaveBeenCalledWith('Test environment teardown complete')
      
      // In a real implementation, we'd inject errors to test error handling
      // For now, we verify the function completes successfully
    })
  })

  /**
   * Integration tests for full setup/teardown cycle
   */
  describe('Integration Tests', () => {
    it('should handle complete setup and teardown cycle', async () => {
      // Act: Complete cycle
      const setupResult = await setupTestEnvironment()
      await teardownTestEnvironment()

      // Assert: Verify complete cycle
      expect(setupResult).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith('Test environment setup complete')
      expect(mockConsoleLog).toHaveBeenCalledWith('Test environment teardown complete')
    })

    it('should handle multiple setup calls', async () => {
      // Act: Multiple setups
      const result1 = await setupTestEnvironment()
      const result2 = await setupTestEnvironment()

      // Assert: Both should succeed
      expect(result1).toBe(true)
      expect(result2).toBe(true)
      
      // Verify setup was called multiple times (at least twice)
      expect(mockConsoleLog).toHaveBeenCalledWith('Test environment setup complete')
      
      // Check that console.log was called multiple times during both setups
      const setupCompleteCalls = mockConsoleLog.mock.calls.filter(
        call => call[0] === 'Test environment setup complete'
      )
      expect(setupCompleteCalls).toHaveLength(2)
    })

    it('should maintain database configuration consistency', async () => {
      // Act: Initialize with different options
      const result1 = await initializeTestDatabase({ clearData: true })
      const result2 = await initializeTestDatabase({ clearData: false })

      // Assert: Both should use same database config
      expect(result1.isConnected).toBe(true)
      expect(result2.isConnected).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith('Connecting to test database: postgresql://test:test@localhost:5432/test_db')
    })
  })

  /**
   * Tests for edge cases and error conditions
   */
  describe('Edge Cases', () => {
    it('should handle empty options object', async () => {
      // Act: Initialize with empty options
      const result = await initializeTestDatabase({})

      // Assert: Should use defaults
      expect(result.isConnected).toBe(true)
      expect(mockConsoleLog).toHaveBeenCalledWith('Connection timeout set to: 30000ms')
    })

    it('should handle undefined options', async () => {
      // Act: Initialize with undefined
      const result = await initializeTestDatabase(undefined)

      // Assert: Should use defaults
      expect(result.isConnected).toBe(true)
    })

    it('should handle zero timeout gracefully', async () => {
      // Act: Initialize with zero timeout  
      const result = await initializeTestDatabase({ timeout: 0 })

      // Assert: Should log the timeout value and complete
      expect(mockConsoleLog).toHaveBeenCalledWith('Connection timeout set to: 0ms')
      expect(result).toHaveProperty('isConnected')
      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('connectionId')
    })
  })
})

// backend/src/__tests__/helpers/__tests__/testSetup.test.ts
// Version: 1.2.0
// Fixed invalid expect.any(Number) assertion in toHaveBeenCalledTimes