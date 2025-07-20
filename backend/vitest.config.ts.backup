// backend/vitest.config.ts
// Version: 5.0.0 - Enhanced config to fix import resolution issues
// Fixed: Added better module resolution and path handling for tests

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Environment and setup
    environment: 'node',
    setupFiles: ['./test-setup.ts'],
    
    // Timeouts - increased for integration tests
    testTimeout: 15000,
    hookTimeout: 10000,
    
    // Performance
    isolate: true,
    
    // Globals and cleanup
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    
    // Reporting
    reporters: ['verbose'],
    
    // File patterns - fixed to be more specific
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      '__tests__/**/*.{test,spec}.{js,ts}'
    ],
    
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '**/*.d.ts'
    ],

    // Pool options for better test isolation
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
  
  // Enhanced module resolution to fix import issues
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/controllers': path.resolve(__dirname, './src/controllers'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/repositories': path.resolve(__dirname, './src/repositories'),
      '@/models': path.resolve(__dirname, './src/models'),
      '@/middleware': path.resolve(__dirname, './src/middleware'),
      '@/routes': path.resolve(__dirname, './src/routes'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types')
    },
    extensions: ['.ts', '.js', '.json']
  },

  // Better dependency handling
  optimizeDeps: {
    include: ['@prisma/client']
  },

  // Ensure proper module resolution for external packages
  ssr: {
    noExternal: ['@prisma/client']
  }
})