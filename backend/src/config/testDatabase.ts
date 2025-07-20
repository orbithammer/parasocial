// backend/src/config/testDatabase.ts
// Version: 1.2.0
// Fixed TypeScript error: Changed process.env.NODE_ENV to process.env['NODE_ENV'] for bracket notation

/**
 * Interface for test database configuration
 * Defines all required properties for test database connection
 */
interface TestDatabaseConfig {
  url: string
  maxConnections: number
  connectionTimeout: number
  host: string
  port: number
  database: string
  username: string
  password: string
}

/**
 * Gets the test database URL from environment variables with fallback to docker-compose credentials
 * Addresses authentication failures by using correct credentials
 * @returns The test database URL with proper authentication
 */
function getTestDatabaseUrl(): string {
  // Check for explicit test database URL first
  const testDbUrl = process.env['TEST_DATABASE_URL']
  
  if (testDbUrl) {
    return testDbUrl
  }
  
  // Fall back to docker-compose credentials for test environment
  // This fixes the authentication failure issue
  const host = process.env['TEST_DB_HOST'] || 'localhost'
  const port = process.env['TEST_DB_PORT'] || '5432'
  const username = process.env['TEST_DB_USER'] || 'parasocial_user'
  const password = process.env['TEST_DB_PASSWORD'] || 'parasocial_pass'
  const database = process.env['TEST_DB_NAME'] || 'parasocial_test'
  
  return `postgresql://${username}:${password}@${host}:${port}/${database}`
}

/**
 * Parses a PostgreSQL connection string to extract components
 * @param connectionString - The PostgreSQL connection URL
 * @returns Parsed connection components
 */
function parseConnectionString(connectionString: string): {
  host: string
  port: number
  database: string
  username: string
  password: string
} {
  try {
    const url = new URL(connectionString)
    
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      throw new Error('Invalid database connection string format')
    }
    
    return {
      host: url.hostname || 'localhost',
      port: parseInt(url.port, 10) || 5432,
      database: url.pathname.slice(1) || 'parasocial_test',
      username: url.username || 'parasocial_user',
      password: url.password || 'parasocial_pass'
    }
  } catch (error) {
    throw new Error(`Invalid database connection string format: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Gets the maximum number of database connections for testing
 * @returns Number of max connections, defaults to 5 for test environment
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

// Get the database URL and parse its components
const databaseUrl = getTestDatabaseUrl()
const connectionComponents = parseConnectionString(databaseUrl)

/**
 * Test database configuration object
 * Centralizes all test database settings with proper authentication
 */
export const testDatabaseConfig: TestDatabaseConfig = {
  url: databaseUrl,
  maxConnections: getMaxConnections(),
  connectionTimeout: getConnectionTimeout(),
  host: connectionComponents.host,
  port: connectionComponents.port,
  database: connectionComponents.database,
  username: connectionComponents.username,
  password: connectionComponents.password
}

/**
 * Alternative export for direct URL access
 * Maintains backward compatibility
 */
export const TEST_DATABASE_URL = testDatabaseConfig.url

/**
 * Validates that the test database configuration is properly set
 * @throws Error if configuration is invalid
 */
export function validateTestDatabaseConfig(): void {
  if (!testDatabaseConfig.url) {
    throw new Error('Test database URL is not configured')
  }
  
  if (!testDatabaseConfig.username || !testDatabaseConfig.password) {
    throw new Error('Test database credentials are not configured')
  }
  
  if (!testDatabaseConfig.database) {
    throw new Error('Test database name is not configured')
  }
}

/**
 * Creates a Prisma-compatible database URL for testing
 * @returns Formatted database URL for Prisma client
 */
export function getPrismaTestDatabaseUrl(): string {
  return testDatabaseConfig.url
}

/**
 * Log configuration for debugging (without exposing password)
 */
export function logTestDatabaseConfig(): void {
  if (process.env['NODE_ENV'] === 'test' || process.env['NODE_ENV'] === 'development') {
    console.log('Test Database Configuration:')
    console.log(`  Host: ${testDatabaseConfig.host}`)
    console.log(`  Port: ${testDatabaseConfig.port}`)
    console.log(`  Database: ${testDatabaseConfig.database}`)
    console.log(`  Username: ${testDatabaseConfig.username}`)
    console.log(`  Password: ${'*'.repeat(testDatabaseConfig.password.length)}`)
    console.log(`  Max Connections: ${testDatabaseConfig.maxConnections}`)
    console.log(`  Connection Timeout: ${testDatabaseConfig.connectionTimeout}ms`)
  }
}

// backend/src/config/testDatabase.ts
// Version: 1.2.0
// Fixed TypeScript error: Changed process.env.NODE_ENV to process.env['NODE_ENV'] for bracket notation