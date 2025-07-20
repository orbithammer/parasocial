// backend/src/config/testDatabase.ts
// Version: 1.0.0
// Initial creation of test database configuration with proper environment variable handling

/**
 * Interface for test database configuration
 */
interface TestDatabaseConfig {
  url: string
  maxConnections: number
  connectionTimeout: number
}

/**
 * Gets the test database URL from environment variables
 * Uses bracket notation to satisfy TypeScript strict mode
 * @returns The test database URL
 * @throws Error if TEST_DATABASE_URL is not defined
 */
function getTestDatabaseUrl(): string {
  const testDbUrl = process.env['TEST_DATABASE_URL']
  
  if (!testDbUrl) {
    throw new Error('TEST_DATABASE_URL environment variable is not defined')
  }
  
  return testDbUrl
}

/**
 * Gets the maximum number of database connections for testing
 * @returns Number of max connections, defaults to 5
 */
function getMaxConnections(): number {
  const maxConnections = process.env['TEST_MAX_CONNECTIONS']
  if (!maxConnections) return 5
  
  const parsed = parseInt(maxConnections, 10)
  return isNaN(parsed) ? 5 : parsed
}

/**
 * Gets the database connection timeout for testing
 * @returns Connection timeout in milliseconds, defaults to 30000
 */
function getConnectionTimeout(): number {
  const timeout = process.env['TEST_CONNECTION_TIMEOUT']
  if (!timeout) return 30000
  
  const parsed = parseInt(timeout, 10)
  return isNaN(parsed) ? 30000 : parsed
}

/**
 * Test database configuration object
 * Centralizes all test database settings
 */
export const testDatabaseConfig: TestDatabaseConfig = {
  url: getTestDatabaseUrl(),
  maxConnections: getMaxConnections(),
  connectionTimeout: getConnectionTimeout()
}

/**
 * Alternative export for direct URL access
 * Maintains backward compatibility
 */
export const TEST_DATABASE_URL = testDatabaseConfig.url

// backend/src/config/testDatabase.ts
// Version: 1.0.0
// Initial creation of test database configuration with proper environment variable handling