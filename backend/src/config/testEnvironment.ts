// backend/src/config/testEnvironment.ts
// Version: 1.1.0
// Updated default port to 5433 to match docker-compose.yml configuration

/**
 * Test environment configuration interface
 * Defines all test environment settings including database, logging, and security
 */
export interface TestEnvironmentConfig {
  database: {
    url: string
    host: string
    port: number
    username: string
    password: string
    database: string
    ssl: boolean
  }
  server: {
    port: number
    host: string
  }
  logging: {
    level: string
    enabled: boolean
  }
  security: {
    jwtSecret: string
    bcryptRounds: number
  }
  features: {
    rateLimiting: boolean
    cors: boolean
    validation: boolean
  }
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
 * Detects if code is running in a local development environment
 * Local development is the fallback when not in Docker or CI
 * @returns True if running in local development environment
 */
function detectLocalDevelopment(): boolean {
  return !(
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
      const port = process.env['TEST_DB_PORT'] || '5432'      // Internal container port
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
    // Local development defaults - use external mapped port from docker-compose
    else {
      const host = process.env['TEST_DB_HOST'] || 'localhost'
      const port = process.env['TEST_DB_PORT'] || '5433'      // Updated to match docker-compose.yml external port
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
  
  return {
    url: databaseUrl,
    host: url.hostname,
    port: parseInt(url.port, 10) || 5433,                    // Updated default port
    username: url.username,
    password: url.password,
    database: url.pathname.slice(1), // Remove leading slash
    ssl: url.searchParams.get('sslmode') === 'require' || url.searchParams.get('ssl') === 'true'
  }
}

/**
 * Generates server configuration for test environment
 * @returns Server configuration object
 */
function generateServerConfig(): TestEnvironmentConfig['server'] {
  return {
    port: parseInt(process.env['TEST_SERVER_PORT'] || '3001', 10),
    host: process.env['TEST_SERVER_HOST'] || 'localhost'
  }
}

/**
 * Generates logging configuration for test environment
 * @returns Logging configuration object
 */
function generateLoggingConfig(): TestEnvironmentConfig['logging'] {
  return {
    level: process.env['TEST_LOG_LEVEL'] || 'error',
    enabled: process.env['TEST_LOGGING_ENABLED'] !== 'false'
  }
}

/**
 * Generates security configuration for test environment
 * @returns Security configuration object
 */
function generateSecurityConfig(): TestEnvironmentConfig['security'] {
  return {
    jwtSecret: process.env['TEST_JWT_SECRET'] || 'test-jwt-secret-change-in-production',
    bcryptRounds: parseInt(process.env['TEST_BCRYPT_ROUNDS'] || '4', 10) // Lower rounds for faster tests
  }
}

/**
 * Generates feature flags configuration for test environment
 * @returns Feature flags configuration object
 */
function generateFeaturesConfig(): TestEnvironmentConfig['features'] {
  return {
    rateLimiting: process.env['TEST_RATE_LIMITING'] !== 'false',
    cors: process.env['TEST_CORS'] !== 'false',
    validation: process.env['TEST_VALIDATION'] !== 'false'
  }
}

/**
 * Complete test environment configuration
 * Combines all configuration components into a single object
 */
export const testEnvironmentConfig: TestEnvironmentConfig = {
  database: generateDatabaseConfig(),
  server: generateServerConfig(),
  logging: generateLoggingConfig(),
  security: generateSecurityConfig(),
  features: generateFeaturesConfig()
}

/**
 * Validates the test environment configuration
 * @throws Error if configuration is invalid
 */
export function validateTestEnvironmentConfig(): void {
  const config = testEnvironmentConfig
  
  // Validate database configuration
  if (!config.database.url) {
    throw new Error('Database URL is required')
  }
  
  if (!config.database.host || !config.database.port) {
    throw new Error('Database host and port are required')
  }
  
  if (!config.database.username || !config.database.password || !config.database.database) {
    throw new Error('Database username, password, and database name are required')
  }
  
  // Validate server configuration
  if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
    throw new Error('Valid server port is required (1-65535)')
  }
  
  // Validate security configuration
  if (!config.security.jwtSecret || config.security.jwtSecret.length < 8) {
    throw new Error('JWT secret must be at least 8 characters long')
  }
  
  if (config.security.bcryptRounds < 1 || config.security.bcryptRounds > 20) {
    throw new Error('Bcrypt rounds must be between 1 and 20')
  }
}

/**
 * Sets environment variables based on the configuration
 * Ensures all necessary environment variables are set for tests
 */
export function setTestEnvironmentVariables(): void {
  const config = testEnvironmentConfig
  
  // Set database environment variables
  process.env['DATABASE_URL'] = config.database.url
  process.env['TEST_DATABASE_URL'] = config.database.url
  
  // Set server environment variables
  process.env['PORT'] = config.server.port.toString()
  process.env['NODE_ENV'] = 'test'
  
  // Set security environment variables
  process.env['JWT_SECRET'] = config.security.jwtSecret
  process.env['BCRYPT_ROUNDS'] = config.security.bcryptRounds.toString()
  
  // Set logging environment variables
  process.env['LOG_LEVEL'] = config.logging.level
}

/**
 * Logs the test environment configuration for debugging
 * Masks sensitive information like passwords and secrets
 */
export function logTestEnvironmentConfig(): void {
  const config = testEnvironmentConfig
  
  console.log('🧪 Test Environment Configuration:')
  console.log('  Database:')
  console.log(`    Host: ${config.database.host}`)
  console.log(`    Port: ${config.database.port}`)
  console.log(`    Database: ${config.database.database}`)
  console.log(`    Username: ${config.database.username}`)
  console.log(`    Password: ${'*'.repeat(config.database.password.length)}`)
  console.log(`    SSL: ${config.database.ssl}`)
  console.log('  Server:')
  console.log(`    Host: ${config.server.host}`)
  console.log(`    Port: ${config.server.port}`)
  console.log('  Security:')
  console.log(`    JWT Secret: ${'*'.repeat(config.security.jwtSecret.length)}`)
  console.log(`    Bcrypt Rounds: ${config.security.bcryptRounds}`)
  console.log('  Features:')
  console.log(`    Rate Limiting: ${config.features.rateLimiting}`)
  console.log(`    CORS: ${config.features.cors}`)
  console.log(`    Validation: ${config.features.validation}`)
  console.log('  Logging:')
  console.log(`    Level: ${config.logging.level}`)
  console.log(`    Enabled: ${config.logging.enabled}`)
}

/**
 * Gets environment-specific database URL
 * Provides fallback logic for different environments
 * @returns Database URL string
 */
export function getEnvironmentDatabaseUrl(): string {
  return testEnvironmentConfig.database.url
}

/**
 * Checks if current environment is Docker
 * @returns True if running in Docker
 */
export function isDockerEnvironment(): boolean {
  return detectDockerEnvironment()
}

/**
 * Checks if current environment is CI
 * @returns True if running in CI
 */
export function isCIEnvironment(): boolean {
  return detectCIEnvironment()
}

/**
 * Checks if current environment is local development
 * @returns True if running in local development
 */
export function isLocalDevelopment(): boolean {
  return detectLocalDevelopment()
}

// Validate configuration on import
validateTestEnvironmentConfig()

// backend/src/config/testEnvironment.ts
// Version: 1.1.0
// Updated default port to 5433 to match docker-compose.yml configuration