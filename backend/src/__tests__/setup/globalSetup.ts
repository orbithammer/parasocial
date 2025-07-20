// backend/src/__tests__/setup/globalSetup.ts
// Version: 1.0.0
// Initial creation of global test setup for Vitest

/**
 * Global setup function that runs once before all tests
 * Configures the test environment and initializes shared resources
 */
export async function setup(): Promise<void> {
  console.log('🧪 Setting up global test environment...')
  
  // Set test environment variables if not already set
  if (!process.env['NODE_ENV']) {
    process.env['NODE_ENV'] = 'test'
  }
  
  // Set default test database URL if not provided
  if (!process.env['TEST_DATABASE_URL']) {
    process.env['TEST_DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test_parasocial'
  }
  
  // Set default test configuration values
  if (!process.env['TEST_MAX_CONNECTIONS']) {
    process.env['TEST_MAX_CONNECTIONS'] = '5'
  }
  
  if (!process.env['TEST_CONNECTION_TIMEOUT']) {
    process.env['TEST_CONNECTION_TIMEOUT'] = '30000'
  }
  
  console.log('✅ Global test environment setup complete')
}

/**
 * Global teardown function that runs once after all tests
 * Cleans up shared resources and connections
 */
export async function teardown(): Promise<void> {
  console.log('🧹 Tearing down global test environment...')
  
  // Clean up any global resources here
  // Example: close database connections, clear caches, etc.
  
  console.log('✅ Global test environment teardown complete')
}

// Export as default for Vitest compatibility
export default setup

// backend/src/__tests__/setup/globalSetup.ts
// Version: 1.0.0
// Initial creation of global test setup for Vitest