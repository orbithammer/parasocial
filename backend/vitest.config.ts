// backend/vitest.config.ts - v1.2.0
// Fixed test file patterns to exclude setup files that were causing false failures

import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import dotenv from 'dotenv'

// Load test environment variables before configuration
dotenv.config({ path: '.env.test' })

export default defineConfig({
  // Test configuration
  test: {
    // Environment settings
    environment: 'node',
    
    // Test file patterns - FIXED: Exclude setup and helper files
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      'src/**/__tests__/**/*.{test,spec}.{js,ts}', // Only include files with .test or .spec
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      // ADDED: Explicitly exclude setup and helper files
      'src/**/__tests__/setup/**',
      'src/**/__tests__/helpers/**',
      'src/__tests__/setup/**',
      'src/__tests__/helpers/**'
    ],

    // Global test configuration
    globals: true,
    
    // Test execution settings
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 30000,
    
    // Test isolation
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        useAtomics: true
      }
    },

    // Setup files
    setupFiles: [
      './src/__tests__/setup/globalSetup.ts'
    ],
    
    // Global setup and teardown
    globalSetup: './src/__tests__/setup/globalSetup.ts',
    
    // Reporter configuration
    reporters: process.env.CI 
      ? ['verbose', 'github-actions'] 
      : ['verbose'],
    
    // Output configuration
    outputFile: {
      json: './test-results/results.json',
      junit: './test-results/junit.xml'
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Coverage thresholds
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      
      // Include/exclude patterns
      include: [
        'src/**/*.{js,ts}',
        '!src/**/*.d.ts'
      ],
      exclude: [
        'src/**/*.{test,spec}.{js,ts}',
        'src/**/__tests__/**',
        'src/__tests__/**',
        'src/types/**',
        'src/migrations/**',
        'node_modules/**'
      ]
    },

    // Watch mode configuration
    watch: false,
    
    // Retry configuration
    retry: process.env.CI ? 2 : 0,
    
    // Bail configuration (stop on first failure in CI)
    bail: process.env.CI ? 1 : 0
  },

  // Resolve configuration for path aliases
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/controllers': resolve(__dirname, './src/controllers'),
      '@/services': resolve(__dirname, './src/services'),
      '@/repositories': resolve(__dirname, './src/repositories'),
      '@/models': resolve(__dirname, './src/models'),
      '@/middleware': resolve(__dirname, './src/middleware'),
      '@/utils': resolve(__dirname, './src/utils'),
      '@/config': resolve(__dirname, './src/config'),
      '@/types': resolve(__dirname, './src/types'),
    }
  }
})

// backend/vitest.config.ts - v1.2.0
// Fixed test file patterns to exclude setup files that were causing false failures