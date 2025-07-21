// backend/src/__tests__/setup/testEnvironmentSetup.ts
// Version: 1.1.0
// Updated default port to 5433 to match docker-compose.yml configuration

/**
 * Test Environment Setup
 * Configures environment variables and validates test database connectivity
 * Ensures consistent test environment across different deployment scenarios
 */

/**
 * Interface for database URL validation results
 */
interface DatabaseUrlValidation {
  isValid: boolean
  url: string
  issues: string[]
}

/**
 * Validates a PostgreSQL database URL format and connectivity requirements
 * @param url - Database URL to validate
 * @returns Validation result with issues if any
 */
function validateDatabaseUrl(url: string): DatabaseUrlValidation {
  const issues: string[] = []
  
  if (!url) {
    issues.push('Database URL is empty or undefined')
    return { isValid: false, url: '', issues }
  }
  
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    issues.push('Database URL must start with postgresql:// or postgres://')
  }
  
  try {
    const parsedUrl = new URL(url)
    
    if (!parsedUrl.hostname) {
      issues.push('Database URL missing hostname')
    }
    
    if (!parsedUrl.port && !parsedUrl.hostname.includes('localhost')) {
      issues.push('Database URL missing port (required for non-localhost connections)')
    }
    
    if (!parsedUrl.username) {
      issues.push('Database URL missing username')
    }
    
    if (!parsedUrl.password) {
      issues.push('Database URL missing password')
    }
    
    if (!parsedUrl.pathname || parsedUrl.pathname === '/') {
      issues.push('Database URL missing database name')
    }
    
  } catch (error) {
    issues.push(`Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return {
    isValid: issues.length === 0,
    url,
    issues
  }
}

/**
 * Generates default test database URL using docker-compose credentials
 * Matches the credentials defined in docker-compose.yml
 * @returns Properly formatted PostgreSQL connection string
 */
function generateDefaultTestDatabaseUrl(): string {
  const host = process.env['TEST_DB_HOST'] || 'localhost'
  const port = process.env['TEST_DB_PORT'] || '5433'        // Updated to match docker-compose.yml external port
  const username = process.env['TEST_DB_USER'] || 'parasocial_user'
  const password = process.env['TEST_DB_PASSWORD'] || 'parasocial_pass'
  const database = process.env['TEST_DB_NAME'] || 'parasocial_test'
  
  return `postgresql://${username}:${password}@${host}:${port}/${database}`
}

/**
 * Sets up test environment variables with proper validation
 * Ensures TEST_DATABASE_URL and DATABASE_URL are correctly configured
 * @throws Error if unable to configure valid database URLs
 */
function setupTestEnvironment(): void {
  console.log('🔧 Setting up test environment...')
  
  // Step 1: Determine the test database URL
  let testDatabaseUrl = process.env['TEST_DATABASE_URL']
  
  if (!testDatabaseUrl) {
    console.log('📝 TEST_DATABASE_URL not found, generating default...')
    testDatabaseUrl = generateDefaultTestDatabaseUrl()
    process.env['TEST_DATABASE_URL'] = testDatabaseUrl
  }
  
  // Step 2: Validate the test database URL
  const testUrlValidation = validateDatabaseUrl(testDatabaseUrl)
  if (!testUrlValidation.isValid) {
    console.error('❌ Invalid TEST_DATABASE_URL configuration:')
    testUrlValidation.issues.forEach(issue => console.error(`   - ${issue}`))
    throw new Error(`Invalid TEST_DATABASE_URL: ${testUrlValidation.issues.join(', ')}`)
  }
  
  // Step 3: Set DATABASE_URL for tests (Prisma uses this by default)
  if (!process.env['DATABASE_URL']) {
    console.log('📝 DATABASE_URL not found, using TEST_DATABASE_URL...')
    process.env['DATABASE_URL'] = testDatabaseUrl
  }
  
  // Step 4: Validate DATABASE_URL
  const dbUrlValidation = validateDatabaseUrl(process.env['DATABASE_URL']!)
  if (!dbUrlValidation.isValid) {
    console.error('❌ Invalid DATABASE_URL configuration:')
    dbUrlValidation.issues.forEach(issue => console.error(`   - ${issue}`))
    throw new Error(`Invalid DATABASE_URL: ${dbUrlValidation.issues.join(', ')}`)
  }
  
  // Step 5: Set Node environment to test
  process.env['NODE_ENV'] = 'test'
  
  // Step 6: Set other test-specific environment variables
  if (!process.env['JWT_SECRET']) {
    process.env['JWT_SECRET'] = 'test-jwt-secret-for-testing-only'
  }
  
  if (!process.env['LOG_LEVEL']) {
    process.env['LOG_LEVEL'] = 'error' // Reduce noise during tests
  }
  
  console.log('✅ Test environment setup complete')
  console.log(`   📊 Database URL: ${testDatabaseUrl}`)
  console.log(`   🌍 Node Environment: ${process.env['NODE_ENV']}`)
  console.log(`   📝 Log Level: ${process.env['LOG_LEVEL']}`)
}

/**
 * Displays helpful troubleshooting information for database connection issues
 * Provides environment-specific guidance
 */
function displayDatabaseTroubleshooting(): void {
  console.log('')
  console.log('🔧 Database Connection Troubleshooting:')
  console.log('')
  console.log('1. Docker Environment (Recommended):')
  console.log('   • Start services: docker-compose up -d postgres')
  console.log('   • Check status: docker-compose ps')
  console.log('   • View logs: docker-compose logs postgres')
  console.log('   • Test connection: docker-compose exec postgres psql -U parasocial_user -d parasocial_test')
  console.log('')
  console.log('2. Local PostgreSQL (Alternative):')
  console.log('   • Install PostgreSQL and start on port 5433')
  console.log('   • Create database: createdb parasocial_test')
  console.log('   • Create user: psql -c "CREATE USER parasocial_user WITH PASSWORD \'parasocial_pass\';"')
  console.log('   • Grant permissions: psql -c "GRANT ALL PRIVILEGES ON DATABASE parasocial_test TO parasocial_user;"')
  console.log('')
  console.log('3. Environment Variables:')
  console.log('   • TEST_DB_HOST=localhost')
  console.log('   • TEST_DB_PORT=5433  (external docker port)')
  console.log('   • TEST_DB_USER=parasocial_user')
  console.log('   • TEST_DB_PASSWORD=parasocial_pass')
  console.log('   • TEST_DB_NAME=parasocial_test')
  console.log('')
  console.log('4. Common Issues:')
  console.log('   • Port 5433 not available: Change TEST_DB_PORT or stop conflicting services')
  console.log('   • Permission denied: Check user credentials and database permissions')
  console.log('   • Connection refused: Ensure PostgreSQL is running and accepting connections')
  console.log('')
}

/**
 * Validates that the database is accessible and ready for tests
 * @returns Promise that resolves when database is ready
 */
async function validateDatabaseConnection(): Promise<void> {
  const { testDatabaseConnection } = await import('../../config/testDatabase')
  
  try {
    console.log('🔍 Validating database connection...')
    const result = await testDatabaseConnection()
    
    if (result.success) {
      console.log(`✅ Database connection successful (${result.connectionTime}ms)`)
    } else {
      console.error('❌ Database connection failed')
      displayDatabaseTroubleshooting()
      throw new Error(`Database validation failed: ${result.error}`)
    }
  } catch (error) {
    console.error('❌ Database validation error:', error instanceof Error ? error.message : 'Unknown error')
    displayDatabaseTroubleshooting()
    throw error
  }
}

/**
 * Logs current environment configuration for debugging
 */
function logCurrentConfiguration(): void {
  console.log('')
  console.log('📋 Current Test Environment Configuration:')
  console.log(`   NODE_ENV: ${process.env['NODE_ENV']}`)
  console.log(`   DATABASE_URL: ${process.env['DATABASE_URL']}`)
  console.log(`   TEST_DATABASE_URL: ${process.env['TEST_DATABASE_URL']}`)
  console.log(`   LOG_LEVEL: ${process.env['LOG_LEVEL']}`)
  console.log(`   JWT_SECRET: ${process.env['JWT_SECRET'] ? '***' : 'Not set'}`)
  console.log('')
}

/**
 * Main setup function that configures the entire test environment
 * Called during test suite initialization
 */
export async function setupTestEnvironmentComplete(): Promise<void> {
  try {
    console.log('🚀 Initializing test environment...')
    
    // Step 1: Setup environment variables
    setupTestEnvironment()
    
    // Step 2: Log current configuration for debugging
    if (process.env['NODE_ENV'] === 'test' || process.env['DEBUG']) {
      logCurrentConfiguration()
    }
    
    // Step 3: Validate database connectivity
    await validateDatabaseConnection()
    
    console.log('🎉 Test environment initialization complete!')
    console.log('')
    
  } catch (error) {
    console.error('💥 Test environment setup failed!')
    console.error('')
    
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    } else {
      console.error('Unknown error occurred during setup')
    }
    
    console.error('')
    console.error('Please fix the configuration issues above before running tests.')
    console.error('')
    
    throw error
  }
}

/**
 * Quick setup function for tests that don't need database validation
 * Sets up environment variables only
 */
export function setupTestEnvironmentQuick(): void {
  try {
    setupTestEnvironment()
    console.log('⚡ Quick test environment setup complete')
  } catch (error) {
    console.error('💥 Quick test environment setup failed!')
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    }
    throw error
  }
}

/**
 * Cleanup function for test environment
 * Called during test suite teardown
 */
export function cleanupTestEnvironment(): void {
  console.log('🧹 Cleaning up test environment...')
  
  // Reset critical environment variables
  delete process.env['TEST_DATABASE_URL']
  
  // Note: We don't delete DATABASE_URL as it might be needed for cleanup operations
  
  console.log('✅ Test environment cleanup complete')
}

// Export validation functions for direct use
export { validateDatabaseUrl, generateDefaultTestDatabaseUrl }

// backend/src/__tests__/setup/testEnvironmentSetup.ts
// Version: 1.1.0
// Updated default port to 5433 to match docker-compose.yml configuration