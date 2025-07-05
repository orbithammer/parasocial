// backend/vitest.config.ts
// Version: 1.2.0 - Updated to ES modules to fix CJS deprecation warning
// Changed: Converted from .js to .ts and used ES module syntax

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Test environment setup
    environment: 'node',
    
    // Per-test setup files (run before each test file)
    setupFiles: [],
    
    // Simplified test file patterns that actually work
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      '__tests__/**/*.{test,spec}.{js,ts}',
    ],
    
    // Simple exclusion patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.d.ts',
      '**/*.config.{js,ts}',
    ],
    
    // Increase timeout for file system operations
    testTimeout: 15000,
    
    // Enable globals for easier testing
    globals: true,
    
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
      ]
    }
  },
  
  // TypeScript path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  
  // Esbuild configuration for better TypeScript support
  esbuild: {
    target: 'node18'
  }
})