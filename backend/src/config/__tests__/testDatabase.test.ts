// backend/src/config/__tests__/testDatabase.test.ts
// Version: 1.1.0
// Updated file path to colocate tests with source files

import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Test suite for test database configuration
 * Tests environment variable handling, defaults, and error cases
 */
describe('testDatabase configuration', () => {
  
  // Store original environment variables to restore after tests
  const originalEnv = process.env

  /**
   * Reset environment variables before each test
   * Ensures clean state for each test case
   */
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    delete process.env['TEST_DATABASE_URL']
    delete process.env['TEST_MAX_CONNECTIONS']
    delete process.env['TEST_CONNECTION_TIMEOUT']
  })

  /**
   * Test successful configuration loading with all environment variables set
   */
  it('should load configuration successfully when all environment variables are set', async () => {
    // Arrange: Set all environment variables
    process.env['TEST_DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb'
    process.env['TEST_MAX_CONNECTIONS'] = '10'
    process.env['TEST_CONNECTION_TIMEOUT'] = '60000'

    // Act: Import the configuration (dynamic import to get fresh module)
    const { testDatabaseConfig, TEST_DATABASE_URL } = await import('../testDatabase')

    // Assert: Verify all values are correctly loaded
    expect(testDatabaseConfig.url).toBe('postgresql://test:test@localhost:5432/testdb')
    expect(testDatabaseConfig.maxConnections).toBe(10)
    expect(testDatabaseConfig.connectionTimeout).toBe(60000)
    expect(TEST_DATABASE_URL).toBe('postgresql://test:test@localhost:5432/testdb')
  })

  /**
   * Test configuration loading with default values when optional env vars are missing
   */
  it('should use default values when optional environment variables are not set', async () => {
    // Arrange: Set only required environment variable
    process.env['TEST_DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb'

    // Act: Import the configuration
    const { testDatabaseConfig } = await import('../testDatabase')

    // Assert: Verify defaults are applied
    expect(testDatabaseConfig.url).toBe('postgresql://test:test@localhost:5432/testdb')
    expect(testDatabaseConfig.maxConnections).toBe(5) // Default value
    expect(testDatabaseConfig.connectionTimeout).toBe(30000) // Default value
  })

  /**
   * Test error handling when required TEST_DATABASE_URL is missing
   */
  it('should throw error when TEST_DATABASE_URL is not defined', async () => {
    // Arrange: Ensure TEST_DATABASE_URL is not set
    delete process.env['TEST_DATABASE_URL']

    // Act & Assert: Expect import to throw error
    await expect(async () => {
      await import('../testDatabase')
    }).rejects.toThrow('TEST_DATABASE_URL environment variable is not defined')
  })

  /**
   * Test parsing of numeric environment variables
   */
  it('should correctly parse numeric environment variables', async () => {
    // Arrange: Set environment variables with string numbers
    process.env['TEST_DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb'
    process.env['TEST_MAX_CONNECTIONS'] = '25'
    process.env['TEST_CONNECTION_TIMEOUT'] = '45000'

    // Act: Import the configuration
    const { testDatabaseConfig } = await import('../testDatabase')

    // Assert: Verify numbers are parsed correctly
    expect(typeof testDatabaseConfig.maxConnections).toBe('number')
    expect(typeof testDatabaseConfig.connectionTimeout).toBe('number')
    expect(testDatabaseConfig.maxConnections).toBe(25)
    expect(testDatabaseConfig.connectionTimeout).toBe(45000)
  })

  /**
   * Test handling of invalid numeric environment variables
   */
  it('should handle invalid numeric environment variables gracefully', async () => {
    // Arrange: Set invalid numeric values
    process.env['TEST_DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb'
    process.env['TEST_MAX_CONNECTIONS'] = 'invalid_number'
    process.env['TEST_CONNECTION_TIMEOUT'] = 'also_invalid'

    // Act: Import the configuration
    const { testDatabaseConfig } = await import('../testDatabase')

    // Assert: Verify NaN values result in defaults (parseInt returns NaN for invalid strings)
    expect(testDatabaseConfig.maxConnections).toBe(5) // Should fall back to default
    expect(testDatabaseConfig.connectionTimeout).toBe(30000) // Should fall back to default
  })

  /**
   * Test that configuration object has correct structure
   */
  it('should export configuration object with correct structure', async () => {
    // Arrange: Set minimal required environment
    process.env['TEST_DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb'

    // Act: Import the configuration
    const { testDatabaseConfig } = await import('../testDatabase')

    // Assert: Verify object structure
    expect(testDatabaseConfig).toHaveProperty('url')
    expect(testDatabaseConfig).toHaveProperty('maxConnections')
    expect(testDatabaseConfig).toHaveProperty('connectionTimeout')
    expect(typeof testDatabaseConfig.url).toBe('string')
    expect(typeof testDatabaseConfig.maxConnections).toBe('number')
    expect(typeof testDatabaseConfig.connectionTimeout).toBe('number')
  })

  /**
   * Test edge case with empty string environment variables
   */
  it('should handle empty string environment variables', async () => {
    // Arrange: Set empty string values
    process.env['TEST_DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb'
    process.env['TEST_MAX_CONNECTIONS'] = ''
    process.env['TEST_CONNECTION_TIMEOUT'] = ''

    // Act: Import the configuration
    const { testDatabaseConfig } = await import('../testDatabase')

    // Assert: Empty strings should result in defaults
    expect(testDatabaseConfig.maxConnections).toBe(5)
    expect(testDatabaseConfig.connectionTimeout).toBe(30000)
  })
})

// backend/src/config/__tests__/testDatabase.test.ts
// Version: 1.1.0
// Updated file path to colocate tests with source files