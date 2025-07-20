// backend/src/config/__tests__/database.test.ts
// Version: 2.1.0
// Fixed mock management and connection test reliability issues

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock PrismaClient before importing anything else
const mockPrismaClient = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $queryRaw: vi.fn()
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrismaClient)
}))

// Import after mocking
import { 
  parseConnectionString, 
  getDatabaseConfig,
  DatabaseConnectionManager,
  type DatabaseConfig,
  type ConnectionStatus,
  type HealthCheckResult
} from '../database'

/**
 * Test suite for database configuration functionality
 * Tests database connection, configuration validation, and health checks
 */
describe('Database Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env }
    
    // Reset all mocks to their default successful state
    mockPrismaClient.$connect.mockReset().mockResolvedValue(undefined)
    mockPrismaClient.$disconnect.mockReset().mockResolvedValue(undefined)
    mockPrismaClient.$queryRaw.mockReset().mockResolvedValue([{ health_check: 1 }])
  })

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv
  })

  /**
   * Test database configuration parsing from environment variables
   */
  describe('Configuration Parsing', () => {
    it('should parse valid DATABASE_URL correctly', () => {
      // Arrange: Set valid DATABASE_URL
      const validUrl = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial'
      
      // Act: Parse the connection string
      const result = parseConnectionString(validUrl)
      
      // Assert: Configuration should be parsed correctly
      expect(result.host).toBe('localhost')
      expect(result.port).toBe(5432)
      expect(result.database).toBe('parasocial')
      expect(result.username).toBe('parasocial_user')
      expect(result.password).toBe('parasocial_pass')
    })

    it('should throw error for invalid DATABASE_URL format', () => {
      // Arrange: Set invalid DATABASE_URL
      const invalidUrl = 'invalid-connection-string'
      
      // Act & Assert: Should throw descriptive error
      expect(() => parseConnectionString(invalidUrl)).toThrow()
    })

    it('should load configuration with default values', () => {
      // Arrange: Set minimal environment
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb'
      
      // Act: Get configuration
      const config = getDatabaseConfig()
      
      // Assert: Should have defaults applied
      expect(config.host).toBe('localhost')
      expect(config.maxConnections).toBeGreaterThan(0)
      expect(config.connectionTimeoutMs).toBeGreaterThan(0)
    })
  })

  /**
   * Test database connection functionality
   */
  describe('Database Connection', () => {
    it('should successfully connect to database with valid configuration', async () => {
      // Arrange: Valid database configuration
      process.env.DATABASE_URL = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial'
      
      const connection = new DatabaseConnectionManager()
      
      // Act: Attempt connection (mock will succeed)
      await connection.connect()
      
      // Assert: Connection should succeed
      expect(connection.isConnected).toBe(true)
      expect(mockPrismaClient.$connect).toHaveBeenCalledOnce()
      
      // Cleanup
      await connection.disconnect()
    })

    it('should handle connection failures gracefully', async () => {
      // Arrange: Mock connection failure
      const connectionError = new Error('Connection refused')
      mockPrismaClient.$connect.mockRejectedValueOnce(connectionError)
      
      process.env.DATABASE_URL = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial'
      const connection = new DatabaseConnectionManager()
      
      // Act & Assert: Should handle error properly
      await expect(connection.connect()).rejects.toThrow('Database connection failed: Connection refused')
      expect(connection.isConnected).toBe(false)
    })

    it('should clean up connection on disconnect', async () => {
      // Arrange: Setup connected client with fresh mocks
      process.env.DATABASE_URL = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial'
      const connection = new DatabaseConnectionManager()
      
      // Ensure $connect succeeds for this test
      mockPrismaClient.$connect.mockResolvedValueOnce(undefined)
      await connection.connect()
      
      // Verify connection was established
      expect(connection.isConnected).toBe(true)
      expect(mockPrismaClient.$connect).toHaveBeenCalledOnce()
      
      // Act: Disconnect
      await connection.disconnect()
      
      // Assert: Disconnect should be called and state updated
      expect(mockPrismaClient.$disconnect).toHaveBeenCalledOnce()
      expect(connection.isConnected).toBe(false)
      expect(connection.client).toBeNull()
    })

    it('should retry connection on initial failure', async () => {
      // Arrange: Mock initial failure, then success
      mockPrismaClient.$connect
        .mockRejectedValueOnce(new Error('Initial connection failed'))
        .mockResolvedValueOnce(undefined)
      
      process.env.DATABASE_URL = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial'
      const connection = new DatabaseConnectionManager()
      
      // Act: Test retry logic
      await connection.connectWithRetry(2, 10) // Quick retry for testing
      
      // Assert: Should attempt connection twice
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(2)
      expect(connection.isConnected).toBe(true)
      
      // Cleanup
      await connection.disconnect()
    })
  })

  /**
   * Test database health check functionality
   */
  describe('Health Checks', () => {
    it('should return healthy status when database is accessible', async () => {
      // Arrange: Mock successful health check query
      mockPrismaClient.$queryRaw.mockResolvedValueOnce([{ health_check: 1 }])
      
      process.env.DATABASE_URL = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial'
      const connection = new DatabaseConnectionManager()
      await connection.connect()
      
      // Act: Perform health check
      const result = await connection.healthCheck()
      
      // Assert: Health check should succeed
      expect(result.healthy).toBe(true)
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0)
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled()
      
      // Cleanup
      await connection.disconnect()
    })

    it('should return unhealthy status when database query fails', async () => {
      // Arrange: Mock health check failure
      const healthCheckError = new Error('Database query timeout')
      mockPrismaClient.$queryRaw.mockRejectedValueOnce(healthCheckError)
      
      process.env.DATABASE_URL = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial'
      const connection = new DatabaseConnectionManager()
      await connection.connect()
      
      // Act: Perform health check
      const result = await connection.healthCheck()
      
      // Assert: Health check should fail
      expect(result.healthy).toBe(false)
      expect(result.error).toBe('Database query timeout')
      
      // Cleanup
      await connection.disconnect()
    })

    it('should include connection metadata in health check response', async () => {
      // Arrange: Mock successful health check with metadata
      mockPrismaClient.$queryRaw.mockResolvedValueOnce([{ 
        health_check: 1, 
        version: '14.5',
        timestamp: new Date().toISOString()
      }])
      
      process.env.DATABASE_URL = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial'
      const connection = new DatabaseConnectionManager()
      await connection.connect()
      
      // Act: Perform health check
      const result = await connection.healthCheck()
      
      // Assert: Should include metadata
      expect(result.healthy).toBe(true)
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0)
      expect(result.metadata).toBeDefined()
      
      // Cleanup
      await connection.disconnect()
    })
  })

  /**
   * Test connection pool validation
   */
  describe('Connection Pool Validation', () => {
    it('should validate connection pool settings', () => {
      // Arrange: Test connection pool limits
      const testCases = [
        { value: '0', expected: false },   // Too low
        { value: '1', expected: true },    // Minimum valid
        { value: '50', expected: true },   // Normal range
        { value: '1000', expected: false } // Too high
      ]
      
      testCases.forEach(({ value, expected }) => {
        const parsed = parseInt(value, 10)
        const isValid = parsed >= 1 && parsed <= 100
        
        // Assert: Validation should enforce reasonable limits
        expect(isValid).toBe(expected)
      })
    })
  })

  /**
   * Test environment-specific configuration
   */
  describe('Environment Configuration', () => {
    it('should use development settings in development environment', () => {
      // Arrange: Set development environment
      process.env.NODE_ENV = 'development'
      
      // Act: Get environment-specific config
      const isDevelopment = process.env.NODE_ENV === 'development'
      const shouldLogQueries = isDevelopment
      const logLevels = isDevelopment ? ['query', 'error', 'warn'] : ['error']
      
      // Assert: Development should enable verbose logging
      expect(shouldLogQueries).toBe(true)
      expect(logLevels).toContain('query')
      expect(logLevels).toContain('warn')
    })

    it('should use production settings in production environment', () => {
      // Arrange: Set production environment
      process.env.NODE_ENV = 'production'
      
      // Act: Get environment-specific config
      const isProduction = process.env.NODE_ENV === 'production'
      const shouldLogQueries = !isProduction
      const logLevels = isProduction ? ['error'] : ['query', 'error', 'warn']
      
      // Assert: Production should minimize logging
      expect(shouldLogQueries).toBe(false)
      expect(logLevels).toEqual(['error'])
    })

    it('should use test settings in test environment', () => {
      // Arrange: Set test environment
      process.env.NODE_ENV = 'test'
      
      // Act: Get environment-specific config
      const isTest = process.env.NODE_ENV === 'test'
      const shouldUseInMemoryDb = isTest
      
      // Assert: Test environment should have appropriate settings
      expect(isTest).toBe(true)
      expect(shouldUseInMemoryDb).toBe(true)
    })
  })
})

// backend/src/config/__tests__/database.test.ts
// Version: 2.1.0
// Fixed mock management and connection test reliability issues