// backend/src/config/testEnvironment.ts
// Version: 1.1.0
// Fixed database URL generation - ensures proper PostgreSQL format with valid credentials

import { PrismaClient } from '@prisma/client'

/**
 * Interface defining test environment configuration structure
 * Ensures type safety for all test environment settings
 */
interface TestEnvironmentConfig {
  database: {
    url: string
    host: string
    port: number
    username: string
    password: string
    database: string
    maxConnections: number
    connectionTimeout: number
  }
  isDocker: boolean
  isDevelopment: boolean
  isCI: boolean
}

/**
 * Interface for database connection validation result
 * Provides detailed feedback on connection attempts
 */
interface ConnectionValidationResult {
  success: boolean
  error?: string
  connectionTime?: number
  databaseExists: boolean
  credentialsValid: boolean
}

/**
 * Detects if the application is running in a Docker environment
 * Checks multiple indicators for Docker presence
 * @returns True if running in Docker container
 */
function detectDockerEnvironment(): boolean {
  // Check for Docker-specific environment variables
  if (process.env['DOCKER_CONTAINER'] === 'true') return true
  if (process.env['HOSTNAME']?.startsWith('docker-')) return true
  
  // Check for presence of .dockerenv file (not available in test env, but good practice)
  try {
    const fs = require('fs')
    return fs.existsSync('/.dockerenv')
  } catch {
    return false
  }
}

/**
 * Detects if running in CI environment
 * Checks common CI environment variables
 * @returns True if running in CI pipeline
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
 * Generates appropriate database configuration based on environment
 * Handles Docker, local, and CI scenarios with proper credential fallbacks
 * @returns Complete database configuration object
 */
function generateDatabaseConfig(): TestEnvironmentConfig['database'] {
  const isDocker = detectDockerEnvironment()
  const isCI = detectCIEnvironment()
  
  // Priority order: Explicit test URL > Environment variables > Defaults
  let databaseUrl = process.env['TEST_DATABASE_URL']
  
  if (!databaseUrl) {
    // Docker environment defaults
    if (isDocker) {
      const host = process.env['TEST_DB_HOST'] || 'postgres'
      const port = process.env['TEST_DB_PORT'] || '5432'
      const username = process.env['TEST_DB_USER'] || 'parasocial_user'
      const password = process.env['TEST_DB_PASSWORD'] || 'parasocial_pass'
      const database = process.env['TEST_DB_NAME'] || 'parasocial_test'
      
      databaseUrl = `postgresql://${username}:${password}@${host}:${port}/${database}`
    }
    // CI environment defaults
    else if (isCI) {
      const host = process.env['TEST_DB_HOST'] || 'localhost'
      const port = process.env['TEST_DB_PORT'] || '5432'
      const username = process.env['TEST_DB_USER'] || 'postgres'
      const password = process.env['TEST_DB_PASSWORD'] || 'postgres'
      const database = process.env['TEST_DB_NAME'] || 'parasocial_test'
      
      databaseUrl = `postgresql://${username}:${password}@${host}:${port}/${database}`
    }
    // Local development defaults
    else {
      const host = process.env['TEST_DB_HOST'] || 'localhost'
      const port = process.env['TEST_DB_PORT'] || '5432'
      const username = process.env['TEST_DB_USER'] || 'parasocial_user'
      const password = process.env['TEST_DB_PASSWORD'] || 'parasocial_pass'
      const database = process.env['TEST_DB_NAME'] || 'parasocial_test'
      
      databaseUrl = `postgresql://${username}:${password}@${host}:${port}/${database}`
    }
  }
  
  // Validate URL format before parsing
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error(`Invalid database URL format: ${databaseUrl}. Must start with postgresql:// or postgres://`)
  }
  
  // Parse the database URL to extract components
  let url: URL
  try {
    url = new URL(databaseUrl)
  } catch (error) {
    throw new Error(`Failed to parse database URL: ${databaseUrl}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  // Extract components with validation
  const host = url.hostname || 'localhost'
  const port = parseInt(url.port) || 5432
  const username = url.username || 'parasocial_user'
  const password = url.password || 'parasocial_pass'
  const database = url.pathname.slice(1) || 'parasocial_test' // Remove leading slash
  
  // Validate essential components
  if (!username || !password || !database) {
    throw new Error(`Database URL missing required components. Username: ${username}, Password: ${password ? '[set]' : '[missing]'}, Database: ${database}`)
  }
  
  return {
    url: databaseUrl,
    host,
    port,
    username,
    password,
    database,
    maxConnections: parseInt(process.env['TEST_MAX_CONNECTIONS'] || '5'),
    connectionTimeout: parseInt(process.env['TEST_CONNECTION_TIMEOUT'] || '30000')
  }
}

/**
 * Validates database connection with detailed error reporting
 * Attempts connection and provides specific failure reasons
 * @param config Database configuration to validate
 * @returns Detailed validation result with actionable error information
 */
async function validateDatabaseConnection(
  config: TestEnvironmentConfig['database']
): Promise<ConnectionValidationResult> {
  const startTime = Date.now()
  let prisma: PrismaClient | undefined
  
  try {
    // Create Prisma client with test configuration
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.url
        }
      },
      log: ['error'] // Only log errors during connection validation
    })
    
    // Attempt to connect to database
    await prisma.$connect()
    
    // Test if we can execute a simple query
    await prisma.$queryRaw`SELECT 1 as test`
    
    const connectionTime = Date.now() - startTime
    
    return {
      success: true,
      connectionTime,
      databaseExists: true,
      credentialsValid: true
    }
    
  } catch (error) {
    const connectionTime = Date.now() - startTime
    let errorMessage = 'Unknown database connection error'
    let databaseExists = false
    let credentialsValid = false
    
    if (error instanceof Error) {
      const errorStr = error.message.toLowerCase()
      
      // Parse specific error types for better debugging
      if (errorStr.includes('authentication failed')) {
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

/**
 * Generates comprehensive test environment configuration
 * Combines database config with environment detection
 * @returns Complete test environment configuration
 */
function getTestEnvironmentConfig(): TestEnvironmentConfig {
  const isDocker = detectDockerEnvironment()
  const isCI = detectCIEnvironment()
  const isDevelopment = process.env['NODE_ENV'] === 'development'
  
  return {
    database: generateDatabaseConfig(),
    isDocker,
    isDevelopment,
    isCI
  }
}

/**
 * Validates the test environment and provides actionable setup guidance
 * This should be called before running integration tests
 * @returns Promise that resolves when environment is ready or rejects with setup instructions
 */
async function validateTestEnvironment(): Promise<void> {
  const config = getTestEnvironmentConfig()
  
  console.log('🔍 Validating test environment...')
  console.log(`📍 Environment: ${config.isCI ? 'CI' : config.isDocker ? 'Docker' : 'Local'}`)
  console.log(`🗄️  Database: ${config.database.host}:${config.database.port}/${config.database.database}`)
  console.log(`👤 User: ${config.database.username}`)
  
  const validation = await validateDatabaseConnection(config.database)
  
  if (validation.success) {
    console.log(`✅ Database connection successful (${validation.connectionTime}ms)`)
    return
  }
  
  // Connection failed - provide detailed troubleshooting guidance
  console.error('❌ Test environment validation failed!')
  console.error(`📋 Error: ${validation.error}`)
  console.error('')
  console.error('🔧 Troubleshooting steps:')
  
  if (config.isDocker) {
    console.error('   1. Start Docker containers: docker-compose up -d')
    console.error('   2. Wait for PostgreSQL to initialize (30-60 seconds)')
    console.error('   3. Check container status: docker-compose ps')
    console.error('   4. Check logs: docker-compose logs postgres')
  } else if (config.isCI) {
    console.error('   1. Ensure PostgreSQL service is configured in CI')
    console.error('   2. Check CI environment variables are set correctly')
    console.error('   3. Verify database initialization scripts ran')
  } else {
    console.error('   1. Start local PostgreSQL server')
    console.error('   2. Create test database: createdb parasocial_test')
    console.error('   3. Create user: CREATE USER parasocial_user WITH PASSWORD \'parasocial_pass\';')
    console.error('   4. Grant permissions: GRANT ALL PRIVILEGES ON DATABASE parasocial_test TO parasocial_user;')
  }
  
  console.error('')
  console.error('🌐 Current configuration:')
  console.error(`   DATABASE_URL: ${config.database.url}`)
  console.error(`   Host: ${config.database.host}:${config.database.port}`)
  console.error(`   Database: ${config.database.database}`)
  console.error(`   Username: ${config.database.username}`)
  console.error('')
  
  throw new Error(`Test environment validation failed: ${validation.error}`)
}

/**
 * Sets up test environment variables if not already configured
 * Ensures consistent configuration across different environments
 */
function setupTestEnvironmentVariables(): void {
  const config = getTestEnvironmentConfig()
  
  // Always override DATABASE_URL for test environment to ensure correct configuration
  process.env['DATABASE_URL'] = config.database.url
  
  // Set TEST_DATABASE_URL for test-specific operations
  if (!process.env['TEST_DATABASE_URL']) {
    process.env['TEST_DATABASE_URL'] = config.database.url
  }
  
  // Set Node environment to test if not set
  if (!process.env['NODE_ENV']) {
    process.env['NODE_ENV'] = 'test'
  }
  
  console.log('🔧 Test environment variables configured:')
  console.log(`   DATABASE_URL: ${config.database.url}`)
  console.log(`   Node Environment: ${process.env['NODE_ENV']}`)
}

// Export all configuration and validation functions
export {
  type TestEnvironmentConfig,
  type ConnectionValidationResult,
  getTestEnvironmentConfig,
  validateTestEnvironment,
  setupTestEnvironmentVariables,
  validateDatabaseConnection,
  detectDockerEnvironment,
  detectCIEnvironment
}

// backend/src/config/testEnvironment.ts
// Version: 1.0.0
// Initial implementation - Fixes database authentication failures in integration tests