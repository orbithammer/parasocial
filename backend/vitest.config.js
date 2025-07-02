// vitest.config.ts
// Version: 1.0.0
// Fix setup.ts test discovery issue

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Test environment setup
    environment: 'node',
    
    // Global setup files (run once before all tests)
    globalSetup: ['__tests__/setup.ts'],
    
    // Per-test setup files (run before each test file)
    setupFiles: [],
    
    // Test file patterns - explicitly exclude setup files
    include: [
      '__tests__/**/*.{test,spec}.{js,ts}',
      '**/*.{test,spec}.{js,ts}'
    ],
    
    // Exclude setup files from being run as tests
    exclude: [
      'node_modules/**',
      'dist/**',
      '__tests__/setup.ts',
      '__tests__/setup/**',
      '**/*.setup.{js,ts}',
      '**/*setup*.{js,ts}'
    ],
    
    // Test timeout
    testTimeout: 10000,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        '__tests__/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/setup.ts'
      ]
    }
  },
  
  // TypeScript path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})