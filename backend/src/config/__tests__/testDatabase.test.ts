// backend/src/config/__tests__/testDatabase.test.ts
// Version: 1.6.0
// Updated to use getTEST_DATABASE_URL() function export

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

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
   * Restore original environment after each test
   */
  afterEach(() => {
    process.env = originalEnv
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
    const testDatabaseModule = await import('../testDatabase')

    // Assert: Verify all values are correctly loaded
    expect(testDatabaseModule.testDatabaseConfig.url).toBe('postgresql://test:test@localhost:5432/testdb')
    expect(testDatabaseModule.testDatabaseConfig.maxConnections).toBe(10)
    expect(testDatabaseModule.testDatabaseConfig.connectionTimeout).toBe(60000)
    expect(testDatabaseModule.getTEST_DATABASE_URL()).toBe('postgresql://test:test@localhost:5432/testdb')
  })

  /**
   * Test configuration loading with default values when optional env vars are missing
   */
  it('should use default values when optional environment variables are not set', async () => {
    // Arrange: Set only required environment variable
    process.env['TEST_DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb'

    // Act: Import the configuration
    const testDatabaseModule = await import('../testDatabase')

    // Assert: Verify defaults are applied
    expect(testDatabaseModule.testDatabaseConfig.url).toBe('postgresql://test:test@localhost:5432/testdb')
    expect(testDatabaseModule.testDatabaseConfig.maxConnections).toBe(5) // Default value
    expect(testDatabaseModule.testDatabaseConfig.connectionTimeout).toBe(30000) // Default value
  })

  /**
   * Test error handling when required TEST_DATABASE_URL is missing
   * This test verifies that the module throws an error when required env var is missing
   */
  it('should throw error when TEST_DATABASE_URL is not defined', async () => {
    // Arrange: Ensure TEST_DATABASE_URL is not set
    delete process.env['TEST_DATABASE_URL']

    // Act & Assert: Expect import to throw error
    await expect(
      import('../testDatabase')
    ).rejects.toThrow('TEST_DATABASE_URL environment variable is not defined')
  })

  /**
   * Test the createTestDatabaseUrl fallback function
   */
  it('should provide fallback database URL when using createTestDatabaseUrl', async () => {
    // Arrange: Clear TEST_DATABASE_URL and set fallback env vars
    delete process.env['TEST_DATABASE_URL']
    process.env['TEST_DB_HOST'] = 'testhost'
    process.env['TEST_DB_PORT'] = '5433' 
    process.env['TEST_DB_USER'] = 'testuser'
    process.env['TEST_DB_PASSWORD'] = 'testpass'
    process.env['TEST_DB_NAME'] = 'testdatabase'

    // Act: Import just the createTestDatabaseUrl function and call it
    const testDatabaseModule = await import('../testDatabase')
    const fallbackUrl = testDatabaseModule.createTestDatabaseUrl()

    // Assert: Verify fallback URL is constructed correctly
    expect(fallbackUrl).toBe('postgresql://testuser:testpass@testhost:5433/testdatabase')
  })

  /**
   * Test the createTestDatabaseUrl function with defaults
   */
  it('should use default values in createTestDatabaseUrl when no env vars are set', async () => {
    // Arrange: Clear all database env vars
    delete process.env['TEST_DATABASE_URL']
    delete process.env['TEST_DB_HOST']
    delete process.env['TEST_DB_PORT']
    delete process.env['TEST_DB_USER']
    delete process.env['TEST_DB_PASSWORD']
    delete process.env['TEST_DB_NAME']

    // Act: Import and use the fallback function
    const testDatabaseModule = await import('../testDatabase')
    const fallbackUrl = testDatabaseModule.createTestDatabaseUrl()

    // Assert: Verify default URL is constructed correctly
    expect(fallbackUrl).toBe('postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial_test')
  })

  /**
   * Test that configuration object has all required properties
   */
  it('should export configuration object with correct structure', async () => {
    // Arrange: Set minimal required environment
    process.env['TEST_DATABASE_URL'] = 'postgresql://test:test@localhost:5432/testdb'

    // Act: Import the configuration
    const testDatabaseModule = await import('../testDatabase')

    // Assert: Verify object structure and types
    const config = testDatabaseModule.testDatabaseConfig
    
    expect(config).toHaveProperty('url')
    expect(config).toHaveProperty('maxConnections')
    expect(config).toHaveProperty('connectionTimeout')
    expect(config).toHaveProperty('host')
    expect(config).toHaveProperty('port')
    expect(config).toHaveProperty('database')
    expect(config).toHaveProperty('username')
    expect(config).toHaveProperty('password')
    
    expect(typeof config.url).toBe('string')
    expect(typeof config.maxConnections).toBe('number')
    expect(typeof config.connectionTimeout).toBe('number')
    expect(typeof config.host).toBe('string')
    expect(typeof config.port).toBe('number')
    expect(typeof config.database).toBe('string')
    expect(typeof config.username).toBe('string')
    expect(typeof config.password).toBe('string')
  })
})

// backend/src/config/__tests__/testDatabase.test.ts
// Version: 1.6.0
// Updated to use getTEST_DATABASE_URL() function export