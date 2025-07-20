// backend/src/__tests__/setup/testEnvironmentSetup.ts
// Version: 1.0.0
// Initial implementation - Sets up proper test environment variables for integration tests

/**
 * Test environment configuration setup
 * Ensures proper DATABASE_URL and TEST_DATABASE_URL are configured
 * before running integration tests to prevent Prisma connection errors
 */

/**
 * Interface for test database configuration validation
 */
interface TestDatabaseValidation {
  isValid: boolean
  url: string
  issues: string[]
}

/**
 * Validates that a database URL has the correct PostgreSQL protocol
 * @param url - Database URL to validate
 * @returns Validation result with any identified issues
 */
function validateDatabaseUrl(url: string): TestDatabaseValidation {
  const issues: string[] = []
  
  if (!url) {
    issues.push('Database URL is empty or undefined')
    return { isValid: false, url, issues }
  }
  
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    issues.push('Database URL must start with postgresql:// or postgres://')
  }
  
  try {
    const parsedUrl = new URL(url)
    
    if (!parsedUrl.hostname) {
      issues.push('Database URL is missing hostname')
    }
    
    if (!parsedUrl.username) {
      issues.push('Database URL is missing username')
    }
    
    if (!parsedUrl.password) {
      issues.push('Database URL is missing password')
    }
    
    if (!parsedUrl.pathname || parsedUrl.pathname === '/') {
      issues.push('Database URL is missing database name')
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
  const port = process.env['TEST_DB_PORT'] || '5432'
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
  
  // Step 5: Set test-specific environment variables
  process.env['NODE_ENV'] = 'test'
  
  // Step 6: Log successful configuration
  console.log('✅ Test environment configured successfully:')
  console.log(`   DATABASE_URL: ${process.env['DATABASE_URL']}`)
  console.log(`   TEST_DATABASE_URL: ${process.env['TEST_DATABASE_URL']}`)
  console.log(`   NODE_ENV: ${process.env['NODE_ENV']}`)
}

/**
 * Provides troubleshooting guidance when database connection fails
 * Offers specific steps based on the type of connection error
 */
function provideTroubleshootingGuidance(): void {
  console.log('')
  console.log('🔧 Database Connection Troubleshooting:')
  console.log('')
  console.log('1. 🐳 Start Docker containers (if using Docker):')
  console.log('   docker-compose up -d')
  console.log('')
  console.log('2. 📊 Check container status:')
  console.log('   docker-compose ps')
  console.log('')
  console.log('3. 📋 Check PostgreSQL logs:')
  console.log('   docker-compose logs postgres')
  console.log('')
  console.log('4. 🗄️ Create test database manually (if using local PostgreSQL):')
  console.log('   createdb parasocial_test')
  console.log('   psql -d parasocial_test -c "CREATE USER parasocial_user WITH PASSWORD \'parasocial_pass\';"')
  console.log('   psql -d parasocial_test -c "GRANT ALL PRIVILEGES ON DATABASE parasocial_test TO parasocial_user;"')
  console.log('')
  console.log('5. 🔍 Verify connection manually:')
  console.log('   psql "postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial_test"')
}

/**
 * Main setup function that should be called before running integration tests
 * Handles all test environment configuration and validation
 */
function initializeTestEnvironment(): void {
  try {
    setupTestEnvironment()
  } catch (error) {
    console.error('❌ Failed to setup test environment:')
    console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.log('')
    provideTroubleshootingGuidance()
    throw error
  }
}

// Export setup functions for use in test files and global setup
export {
  initializeTestEnvironment,
  setupTestEnvironment,
  validateDatabaseUrl,
  generateDefaultTestDatabaseUrl,
  provideTroubleshootingGuidance
}

// backend/src/__tests__/setup/testEnvironmentSetup.ts