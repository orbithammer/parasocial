// vitest.config.ts - v1.0.0
// Vitest configuration for backend testing
// Configures test environment, database setup, and test execution settings

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
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      'src/**/__tests__/**/*.{js,ts}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**'
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
    bail: process.env.CI ? 1 : 0,

    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'file:./test.db',
      JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret',
      BCRYPT_SALT_ROUNDS: '4',
      LOG_LEVEL: 'error'
    },

    // Test sequence configuration
    sequence: {
      shuffle: false,
      concurrent: false
    },

    // File parallelization
    fileParallelism: false,
    
    // Test categorization
    typecheck: {
      enabled: true,
      include: ['src/**/*.{test,spec}-d.ts']
    }
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './src/__tests__'),
      '@config': resolve(__dirname, './src/config'),
      '@middleware': resolve(__dirname, './src/middleware'),
      '@models': resolve(__dirname, './src/models'),
      '@controllers': resolve(__dirname, './src/controllers'),
      '@services': resolve(__dirname, './src/services'),
      '@repositories': resolve(__dirname, './src/repositories'),
      '@utils': resolve(__dirname, './src/utils'),
      '@routes': resolve(__dirname, './src/routes')
    }
  },

  // Build configuration for tests
  esbuild: {
    target: 'node18',
    format: 'esm'
  },

  // Define global constants
  define: {
    __TEST__: true,
    __DEV__: false,
    __PROD__: false
  }
})

// Test-specific exports for configuration
export const testConfig = {
  // Database configuration
  database: {
    url: process.env.TEST_DATABASE_URL || 'file:./test.db',
    resetBetweenTests: true,
    seedData: true,
    logQueries: false
  },
  
  // Server configuration
  server: {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || 'localhost'
  },
  
  // Authentication configuration
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'test-jwt-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '4')
  },
  
  // Rate limiting configuration
  rateLimiting: {
    enabled: true,
    relaxed: true,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '10'),
    postMax: parseInt(process.env.POST_RATE_LIMIT_MAX || '20'),
    followMax: parseInt(process.env.FOLLOW_RATE_LIMIT_MAX || '30')
  },
  
  // File upload configuration
  uploads: {
    directory: process.env.UPLOAD_DIR || './test-uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '1048576'),
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png').split(',')
  },
  
  // Feature flags for tests
  features: {
    registration: process.env.ENABLE_USER_REGISTRATION !== 'false',
    passwordReset: process.env.ENABLE_PASSWORD_RESET !== 'false',
    contentModeration: process.env.ENABLE_CONTENT_MODERATION === 'true',
    activityPub: process.env.ACTIVITYPUB_ENABLED !== 'false'
  },
  
  // Mock configuration
  mocks: {
    externalServices: process.env.MOCK_EXTERNAL_SERVICES !== 'false',
    emailService: process.env.MOCK_EMAIL_SERVICE !== 'false',
    fileUpload: process.env.MOCK_FILE_UPLOAD !== 'false'
  },
  
  // Timeout configuration
  timeouts: {
    test: parseInt(process.env.TEST_TIMEOUT || '30000'),
    database: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000'),
    request: parseInt(process.env.REQUEST_TIMEOUT || '10000')
  }
}

// Utility function to check if running in test environment
export const isTestEnvironment = (): boolean => {
  return process.env.NODE_ENV === 'test'
}

// Utility function to get test configuration
export const getTestConfig = () => testConfig

// vitest.config.ts - v1.0.0
// Initial version: Comprehensive Vitest configuration with test database integration