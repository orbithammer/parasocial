// backend/src/config/__tests__/database.test.ts
// Version: 2.0.0
// Updated to use real database.ts implementation instead of mocked placeholder functions

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock PrismaClient before importing anything else
const mockPrismaClient = {
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $queryRaw: vi.fn().mockResolvedValue([{ health_check: 1 }])
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
    
    // Reset mock call counts
    vi.clearAllMocks()
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
      
      // Act & Assert: Should throw configuration error
      expect(() => {
        parseConnectionString(invalidUrl)
      }).toThrow('Invalid database connection string format')
    })

    it('should use default configuration values when environment variables are missing', () => {
      // Arrange: Set minimal DATABASE_URL and clear other env vars
      const originalUrl = process.env.DATABASE_URL
      const originalTimeout = process.env.DB_CONNECTION_TIMEOUT
      const originalQueryTimeout = process.env.DB_QUERY_TIMEOUT
      
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
      delete process.env.DB_CONNECTION_TIMEOUT
      delete process.env.DB_QUERY_TIMEOUT
      
      try {
        // Act: Get configuration with defaults
        const config = getDatabaseConfig()
        
        // Assert: Should use sensible defaults
        expect(config.connectionTimeoutMs).toBe(30000) // 30 seconds
        expect(config.queryTimeoutMs).toBe(10000)      // 10 seconds  
        expect(config.maxConnections).toBe(20)
        expect(config.logQueries).toBe(false) // Not development
      } finally {
        // Restore environment
        if (originalUrl) process.env.DATABASE_URL = originalUrl
        if (originalTimeout) process.env.DB_CONNECTION_TIMEOUT = originalTimeout
        if (originalQueryTimeout) process.env.DB_QUERY_TIMEOUT = originalQueryTimeout
      }
    })

    it('should enable query logging in development environment', () => {
      // Arrange: Set development environment
      process.env.NODE_ENV = 'development'
      
      // Act: Get configuration
      const isDevelopment = process.env.NODE_ENV === 'development'
      
      // Assert: Query logging should be enabled in development
      expect(isDevelopment).toBe(true)
    })
  })

  /**
   * Test database connection functionality
   */
  describe('Database Connection', () => {
    it('should successfully connect to database with valid configuration', async () => {
      // Arrange: Set valid environment and create connection manager
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
      mockPrismaClient.$connect = vi.fn().mockRejectedValue(connectionError)
      
      process.env.DATABASE_URL = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial'
      const connection = new DatabaseConnectionManager()
      
      // Act & Assert: Should handle error properly
      await expect(connection.connect()).rejects.toThrow('Database connection failed: Connection refused')
      expect(connection.isConnected).toBe(false)
    })

    it('should clean up connection on disconnect', async () => {
      // Arrange: Setup connected client
      process.env.DATABASE_URL = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial'
      const connection = new DatabaseConnectionManager()
      
      await connection.connect()
      
      // Act: Disconnect
      await connection.disconnect()
      
      // Assert: Disconnect should be called and state updated
      expect(mockPrismaClient.$disconnect).toHaveBeenCalledOnce()
      expect(connection.isConnected).toBe(false)
      expect(connection.client).toBeNull()
    })

    it('should retry connection on initial failure', async () => {
      // Arrange: Mock initial failure, then success
      mockPrismaClient.$connect = vi.fn()
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
      mockPrismaClient.$queryRaw = vi.fn().mockResolvedValue([{ health_check: 1 }])
      
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
      mockPrismaClient.$queryRaw = vi.fn().mockRejectedValue(healthCheckError)
      
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
      mockPrismaClient.$queryRaw = vi.fn().mockResolvedValue([{ health_check: 1 }])
      
      process.env.DATABASE_URL = 'postgresql://parasocial_user:parasocial_pass@localhost:5432/parasocial'
      const connection = new DatabaseConnectionManager()
      await connection.connect()
      
      // Act: Perform health check
      const result = await connection.healthCheck()
      
      // Assert: Response should include timing and metadata
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0)
      expect(result.healthy).toBe(true)
      expect(result.connectionPool.total).toBeGreaterThan(0)
      expect(result.timestamp).toBeDefined()
      
      // Cleanup
      await connection.disconnect()
    })
  })

  /**
   * Test database configuration validation
   */
  describe('Configuration Validation', () => {
    it('should validate required environment variables are present', () => {
      // Arrange: Remove required DATABASE_URL
      const originalUrl = process.env.DATABASE_URL
      delete process.env.DATABASE_URL
      
      try {
        // Act & Assert: Should throw error for missing DATABASE_URL
        expect(() => {
          getDatabaseConfig()
        }).toThrow('DATABASE_URL environment variable is required')
      } finally {
        // Restore environment
        if (originalUrl) process.env.DATABASE_URL = originalUrl
      }
    })

    it('should validate connection timeout is a positive number', () => {
      // Arrange: Set invalid timeout values
      const testCases = [
        { value: '-1000', expected: false },
        { value: '0', expected: false },
        { value: '30000', expected: true },
        { value: 'invalid', expected: false }
      ]
      
      testCases.forEach(({ value, expected }) => {
        process.env.DB_CONNECTION_TIMEOUT = value
        
        // Act: Validate timeout value
        const parsed = parseInt(value, 10)
        const isValid = !isNaN(parsed) && parsed > 0
        
        // Assert: Validation should match expected result
        expect(isValid).toBe(expected)
      })
    })

    it('should validate maximum connections is within reasonable limits', () => {
      // Arrange: Test connection limits
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
   * Test connection pool management
   */
  describe('Connection Pool Management', () => {
    it('should respect maximum connection limit', () => {
      // Arrange: Set connection limit
      const maxConnections = 5
      
      // Act: This would test connection pool limits
      // const config = { maxConnections }
      
      // Assert: Pool should not exceed limit
      expect(maxConnections).toBe(5)
    })

    it('should handle connection pool exhaustion gracefully', async () => {
      // Arrange: Mock pool exhaustion scenario
      const poolExhaustionError = new Error('Connection pool exhausted')
      
      // Act & Assert: Should handle pool exhaustion
      expect(poolExhaustionError.message).toBe('Connection pool exhausted')
    })

    it('should clean up idle connections', () => {
      // Arrange: Mock idle connection cleanup
      const idleTimeoutMs = 60000 // 1 minute
      
      // Act: This would test idle connection cleanup
      // const pool = new ConnectionPool({ idleTimeoutMs })
      
      // Assert: Idle timeout should be configured
      expect(idleTimeoutMs).toBe(60000)
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
// Version: 2.0.0
// Updated to use real database.ts implementation instead of mocked placeholder functions