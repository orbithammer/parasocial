// backend/vitest.config.js
// Version: 1.2
// Fixed patterns to match your actual test file structure

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test file patterns - Updated to match your actual structure
    include: [
      'src/**/*.test.{js,ts}',                    // Files like mediaUpload.test.ts
      'src/**/__tests__/**/*.{js,ts,jsx,tsx}',    // Files in src/*/__tests__/
      '__tests__/**/*.{js,ts,jsx,tsx}',           // Files in root __tests__/ (your structure)
      '**/*.test.{js,ts,jsx,tsx}',                // Any .test. files anywhere
      '**/*.spec.{js,ts,jsx,tsx}'                 // Any .spec. files anywhere
    ],
    exclude: ['node_modules', 'dist', 'build', '.next'],
    
    // Global test setup
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/',
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
    setupFiles: ['./__tests__/setup.ts']
  },
  
  // Resolve configuration for ES modules
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname
    }
  }
})