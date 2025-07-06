// backend/vitest.config.ts
// Vitest configuration for colocated test structure
// Version: 1.0.0 - Initial configuration with colocated support

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    
    // Include patterns for colocated tests
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      'src/**/__tests__/**/*.{test,spec}.{js,ts}',
      '**/__tests__/**/*.{test,spec}.{js,ts}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '**/*.d.ts',
      '**/*.config.{js,ts}',
      '**/node_modules/**'
    ],
    
    // Test timeout (useful for rate limiting tests that include delays)
    testTimeout: 30000,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/__tests__/**',
        '**/test/**',
        'src/types/**'
      ],
      include: [
        'src/**/*.{js,ts}'
      ]
    },
    
    // Setup files (if you need global test setup)
    // setupFiles: ['./src/test/setup.ts'],
    
    // Mock reset behavior
    clearMocks: true,
    restoreMocks: true,
    
    // Reporter configuration
    reporter: process.env.CI ? ['junit', 'github-actions'] : ['verbose'],
    
    // Output configuration
    outputFile: {
      junit: './test-results.xml',
      json: './test-results.json'
    }
  },
  
  // Resolve configuration for imports
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './src/__tests__')
    }
  }
})