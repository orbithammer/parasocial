// backend/src/config/testDatabase.ts
// Version: 2.1.0
// Updated default port to 5433 to match docker-compose.yml configuration

import { PrismaClient } from '@prisma/client'

/**
 * Test database configuration interface
 * Defines all test database connection parameters and settings
 */
export interface TestDatabaseConfig {
  url: string
  maxConnections: number
  connectionTimeout: number
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
}

/**
 * Interface for database connection validation results
 * Provides detailed feedback on connection attempts
 */
export interface ConnectionValidationResult {
  success: boolean
  connectionTime: number
  error?: string
  databaseExists: boolean
  credentialsValid: boolean
}

/**
 * Detects if code is running inside a Docker container
 * Checks for Docker-specific environment indicators
 * @returns True if running in Docker environment
 */
function detectDockerEnvironment(): boolean {
  return !!(
    process.env['DOCKER_CONTAINER'] || 
    process.env['DOCKER_ENV'] ||
    process.env['RUNNING_IN_DOCKER']
  )
}

/**
 * Detects if code is running in a CI environment
 * Checks common CI environment variables
 * @returns True if running in CI environment
 */
function detectCIEnvironment(): boolean {
  return !!(
    process.env['CI'] ||
    process.env['GITHUB_ACTIONS'] ||
    process.env['GITLAB_CI'] ||
    process.env['JENKINS_URL'] ||
    process.env['BUILDKITE']
  )
}

/**
 * Gets the test database URL from environment variables or constructs it
 * Priority: TEST_DATABASE_URL > DATABASE_URL > constructed from components
 * @returns Complete PostgreSQL connection string
 */
function getTestDatabaseUrl(): string {
  // Check for explicit test database URL first
  const testDbUrl = process.env['TEST_DATABASE_URL']
  if (testDbUrl && (testDbUrl.startsWith('postgresql://') || testDbUrl.startsWith('postgres://'))) {
    if (!testDbUrl) {
      throw new Error(`Invalid database URL format: ${testDbUrl}. Must start with postgresql:// or postgres://`)
    }
    return testDbUrl
  }
  
  // Check for main DATABASE_URL (for test environment)
  const mainDbUrl = process.env['DATABASE_URL']
  if (mainDbUrl && (mainDbUrl.startsWith('postgresql://') || mainDbUrl.startsWith('postgres://'))) {
    return mainDbUrl
  }
  
  // Build URL from individual components with environment-specific defaults
  const isDocker = detectDockerEnvironment()
  const isCI = detectCIEnvironment()
  
  let host: string
  let port: string
  let username: string
  let password: string
  let database: string
  
  if (isDocker) {
    // Docker environment defaults - use container internal port
    host = process.env['TEST_DB_HOST'] || 'postgres'  // docker-compose service name
    port = process.env['TEST_DB_PORT'] || '5432'      // internal container port
    username = process.env['TEST_DB_USER'] || 'parasocial_user'
    password = process.env['TEST_DB_PASSWORD'] || 'parasocial_pass'
    database = process.env['TEST_DB_NAME'] || 'parasocial_test'
  } else if (isCI) {
    // CI environment defaults - typically uses standard port
    host = process.env['TEST_DB_HOST'] || 'localhost'
    port = process.env['TEST_DB_PORT'] || '5432'
    username = process.env['TEST_DB_USER'] || 'postgres'
    password = process.env['TEST_DB_PASSWORD'] || 'postgres'
    database = process.env['TEST_DB_NAME'] || 'parasocial_test'
  } else {
    // Local development defaults - use external mapped port from docker-compose
    host = process.env['TEST_DB_HOST'] || 'localhost'
    port = process.env['TEST_DB_PORT'] || '5433'      // Updated to match docker-compose.yml external port
    username = process.env['TEST_DB_USER'] || 'parasocial_user'
    password = process.env['TEST_DB_PASSWORD'] || 'parasocial_pass'
    database = process.env['TEST_DB_NAME'] || 'parasocial_test'
  }
  
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
  ssl: boolean
} {
  try {
    const url = new URL(connectionString)
    
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      throw new Error(`Invalid database connection string format: ${connectionString}. Must start with postgresql:// or postgres://`)
    }
    
    return {
      host: url.hostname || 'localhost',
      port: parseInt(url.port, 10) || 5433,           // Updated default port to match docker-compose
      database: url.pathname.slice(1) || 'parasocial_test', // Remove leading slash
      username: url.username || 'parasocial_user',
      password: url.password || 'parasocial_pass',
      ssl: url.searchParams.get('sslmode') === 'require' || url.searchParams.get('ssl') === 'true'
    }
  } catch (error) {
    throw new Error(`Invalid database connection string format: ${connectionString}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

/**
 * Validates database connection with detailed error reporting
 * @param config Database configuration to validate
 * @returns Promise resolving to validation result
 */
async function validateDatabaseConnection(config: {
  host: string
  port: number
  username: string
  password: string
  database: string
}): Promise<ConnectionValidationResult> {
  const startTime = Date.now()
  let prisma: PrismaClient | null = null
  
  try {
    // Create a temporary Prisma client for testing
    const testUrl = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`
    
    prisma = new PrismaClient({
      datasources: {
        db: { url: testUrl }
      },
      log: ['error']
    })
    
    // Attempt connection
    await prisma.$connect()
    
    // Test with a simple query
    await prisma.$queryRaw`SELECT 1 as connection_test`
    
    const connectionTime = Date.now() - startTime
    
    return {
      success: true,
      connectionTime,
      databaseExists: true,
      credentialsValid: true
    }
    
  } catch (error) {
    const connectionTime = Date.now() - startTime
    
    let errorMessage: string
    let databaseExists = false
    let credentialsValid = false
    
    if (error instanceof Error) {
      const errorStr = error.message.toLowerCase()
      
      if (errorStr.includes('authentication failed') || errorStr.includes('password authentication failed')) {
        errorMessage = `Authentication failed for user '${config.username}' on database '${config.database}'. Check credentials and user permissions.`
        credentialsValid = false
        databaseExists = true // Database exists but credentials are wrong
      } else if (errorStr.includes('database') && errorStr.includes('does not exist')) {
        errorMessage = `Database '${config.database}' does not exist on host '${config.host}:${config.port}'. Create the database or check the name.`
        databaseExists = false
        credentialsValid = true // Can't verify credentials if database doesn't exist
      } else if (errorStr.includes('connection refused') || errorStr.includes('timeout')) {
        errorMessage = `Cannot connect to PostgreSQL server at '${config.host}:${config.port}'. Check if the database server is running.`
        databaseExists = false
        credentialsValid = false
      } else {
        errorMessage = `Database connection failed: ${error.message}`
      }
    } else {
      errorMessage = 'Unknown database connection error'
    }
    
    return {
      success: false,
      error: errorMessage,
      connectionTime,
      databaseExists,
      credentialsValid
    }
  } finally {
    // Always disconnect if connection was established
    if (prisma) {
      try {
        await prisma.$disconnect()
      } catch {
        // Ignore disconnect errors
      }
    }
  }
}

// Generate database configuration
const databaseUrl = getTestDatabaseUrl()
const connectionComponents = parseConnectionString(databaseUrl)

/**
 * Test database configuration object
 * Centralizes all test database settings with proper PostgreSQL authentication
 */
export const testDatabaseConfig: TestDatabaseConfig = {
  url: databaseUrl,
  maxConnections: getMaxConnections(),
  connectionTimeout: getConnectionTimeout(),
  host: connectionComponents.host,
  port: connectionComponents.port,
  database: connectionComponents.database,
  username: connectionComponents.username,
  password: connectionComponents.password,
  ssl: connectionComponents.ssl
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
  
  if (!testDatabaseConfig.url.startsWith('postgresql://') && !testDatabaseConfig.url.startsWith('postgres://')) {
    throw new Error(`Invalid database URL format: ${testDatabaseConfig.url}. Must start with postgresql:// or postgres://`)
  }
}

/**
 * Sets up test environment variables if not already configured
 * Ensures consistent configuration across different environments
 */
export function setupTestEnvironmentVariables(): void {
  // Always override DATABASE_URL for test environment to ensure correct configuration
  process.env['DATABASE_URL'] = testDatabaseConfig.url
  
  // Set TEST_DATABASE_URL for test-specific operations
  if (!process.env['TEST_DATABASE_URL']) {
    process.env['TEST_DATABASE_URL'] = testDatabaseConfig.url
  }
  
  // Set Node environment to test if not set
  if (!process.env['NODE_ENV']) {
    process.env['NODE_ENV'] = 'test'
  }
  
  console.log('🔧 Test environment variables configured:')
  console.log(`   DATABASE_URL: ${testDatabaseConfig.url}`)
  console.log(`   Node Environment: ${process.env['NODE_ENV']}`)
}

/**
 * Tests database connectivity and provides troubleshooting info
 * @returns Promise resolving to validation result
 */
export async function testDatabaseConnection(): Promise<ConnectionValidationResult> {
  console.log(`🔍 Testing database connection to ${testDatabaseConfig.host}:${testDatabaseConfig.port}...`)
  
  const validation = await validateDatabaseConnection({
    host: testDatabaseConfig.host,
    port: testDatabaseConfig.port,
    username: testDatabaseConfig.username,
    password: testDatabaseConfig.password,
    database: testDatabaseConfig.database
  })
  
  if (validation.success) {
    console.log(`✅ Database connection successful (${validation.connectionTime}ms)`)
  } else {
    console.error(`❌ Database connection failed: ${validation.error}`)
    
    // Provide environment-specific troubleshooting
    const isDocker = detectDockerEnvironment()
    const isCI = detectCIEnvironment()
    
    if (isDocker) {
      console.error('   Docker Environment Troubleshooting:')
      console.error('   1. Ensure docker-compose is running: docker-compose up -d postgres')
      console.error('   2. Check container status: docker-compose ps')
      console.error('   3. Check logs: docker-compose logs postgres')
    } else if (isCI) {
      console.error('   CI Environment Troubleshooting:')
      console.error('   1. Ensure PostgreSQL service is configured in CI')
      console.error('   2. Check CI environment variables are set correctly')
      console.error('   3. Verify database initialization scripts ran')
    } else {
      console.error('   Local Development Troubleshooting:')
      console.error('   1. Start docker database: docker-compose up -d postgres')
      console.error('   2. Or start local PostgreSQL server on port 5433')
      console.error('   3. Create test database: createdb parasocial_test')
      console.error('   4. Create user: CREATE USER parasocial_user WITH PASSWORD \'parasocial_pass\';')
      console.error('   5. Grant permissions: GRANT ALL PRIVILEGES ON DATABASE parasocial_test TO parasocial_user;')
    }
    
    console.error('')
    console.error('🌐 Current configuration:')
    console.error(`   DATABASE_URL: ${testDatabaseConfig.url}`)
    console.error(`   Host: ${testDatabaseConfig.host}:${testDatabaseConfig.port}`)
    console.error(`   Database: ${testDatabaseConfig.database}`)
    console.error(`   Username: ${testDatabaseConfig.username}`)
    console.error('')
  }
  
  return validation
}

/**
 * Log configuration for debugging (without exposing password)
 */
export function logTestDatabaseConfig(): void {
  if (process.env['NODE_ENV'] === 'test' || process.env['NODE_ENV'] === 'development') {
    console.log('🗄️  Test Database Configuration:')
    console.log(`  Host: ${testDatabaseConfig.host}`)
    console.log(`  Port: ${testDatabaseConfig.port}`)
    console.log(`  Database: ${testDatabaseConfig.database}`)
    console.log(`  Username: ${testDatabaseConfig.username}`)
    console.log(`  Password: ${'*'.repeat(testDatabaseConfig.password.length)}`)
    console.log(`  Max Connections: ${testDatabaseConfig.maxConnections}`)
    console.log(`  Connection Timeout: ${testDatabaseConfig.connectionTimeout}ms`)
    console.log(`  SSL: ${testDatabaseConfig.ssl}`)
  }
}

// Validate configuration on import
validateTestDatabaseConfig()

// backend/src/config/testDatabase.ts
// Version: 2.1.0
// Updated default port to 5433 to match docker-compose.yml configuration