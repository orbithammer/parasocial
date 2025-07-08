// backend/vitest.config.ts
// Version: 4.0.0 - Minimal config with only supported properties
// Fixed: Removed all unsupported properties, focus on module resolution

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Environment and setup
    environment: 'node',
    setupFiles: ['./test-setup.ts'],
    
    // Timeouts
    testTimeout: 10000,
    
    // Performance
    isolate: true,
    
    // Globals and cleanup
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Reporting
    reporters: ['verbose'],
    
    // File patterns
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      '__tests__/**/*.{test,spec}.{js,ts}'
    ],
    
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**'
    ]
  },
  
  // Module resolution - this is the key fix for "Cannot find package" errors
  resolve: {
    alias: {
      '@': './src'
    }
  }
})