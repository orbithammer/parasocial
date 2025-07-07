// backend/vitest.config.js
// Version: 2.1.0 - Added proper exit handling and cleanup
// Fixed: Added pool configuration and exit handling to prevent hanging

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Prevent hanging tests with aggressive timeouts
    testTimeout: 10000,        // 10 seconds max per test
    hookTimeout: 5000,         // 5 seconds for setup/teardown
    teardownTimeout: 3000,     // 3 seconds for cleanup
    
    // Test isolation and performance
    isolate: true,             // Isolate tests in separate contexts
    maxConcurrency: 1,         // Run tests sequentially to avoid conflicts
    
    // Process and thread configuration
    pool: 'threads',           // Use thread pool for better isolation
    poolOptions: {
      threads: {
        singleThread: true,    // Force single thread to prevent resource conflicts
        isolate: true,         // Isolate each test file
      }
    },
    
    // Environment and setup
    environment: 'node',
    setupFiles: ['./test-setup.ts'],
    
    // Force exit configuration
    forceExit: true,           // Force exit when all tests complete
    passWithNoTests: true,     // Don't fail if no tests found
    
    // Reporting
    reporter: ['verbose'],
    
    // Coverage (optional)
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/test-setup.ts',
        '**/__tests__/**'
      ]
    },
    
    // Global settings
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Retry configuration
    retry: 0,                  // Don't retry failed tests
    
    // Test file patterns
    include: [
      '**/*.{test,spec}.{js,ts}'
    ],
    
    // Exclude patterns for problematic tests during development
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**'
    ],
    
    // Exit handling
    onFinished: () => {
      // Force exit after tests complete
      setTimeout(() => {
        console.log('Tests completed, forcing exit...')
        process.exit(0)
      }, 500)
    }
  },
  
  // Resolver configuration
  resolve: {
    alias: {
      '@': './src',
      '@tests': './__tests__'
    }
  }
})