// backend/vitest.config.js
// Vitest configuration for backend testing

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test file patterns
    include: ['tests/**/*.test.{js,ts}', 'src/**/*.test.{js,ts}'],
    exclude: ['node_modules', 'dist', 'build'],
    
    // Global test setup
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'build/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/index.{js,ts}'
      ]
    },
    
    // Test timeout
    testTimeout: 10000,
    
    // Setup files
    setupFiles: ['./tests/setup.js']
  },
  
  // Resolve configuration for ES modules
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  }
})