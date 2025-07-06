// backend/vitest.config.ts
// Version: 1.2.0 - Added timeout management and test isolation
// Changed: Added proper timeouts, setup files, and test categorization

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Prevent hanging tests
    testTimeout: 15000,        // 15 seconds max per test
    hookTimeout: 10000,        // 10 seconds for setup/teardown
    teardownTimeout: 5000,     // 5 seconds for cleanup
    
    // Test isolation and performance
    isolate: true,             // Isolate tests in separate contexts
    maxConcurrency: 1,         // Run rate limiting tests sequentially
    
    // Environment and setup
    environment: 'node',
    setupFiles: ['./test-setup.ts'],
    
    // Reporting
    reporter: ['verbose', 'json'],
    outputFile: './test-results.json',
    
    // Coverage (optional)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
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
    
    // Test categorization with different timeouts
    testMatch: [
      '**/*.test.ts',
      '**/*.spec.ts'
    ],
    
    // Exclude patterns for problematic tests during development
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      // Uncomment to temporarily exclude hanging tests:
      // '**/*.rateLimit.test.ts',
      // '__tests__/routes/auth*.test.ts'
    ]
  },
  
  // Resolver configuration
  resolve: {
    alias: {
      '@': './src',
      '@tests': './__tests__'
    }
  }
})