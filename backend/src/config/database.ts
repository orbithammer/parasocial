// backend/src/config/database.ts
// Version: 1.5.0
// Removed all duplicate export declarations - interfaces are exported directly

import { PrismaClient, Prisma } from '@prisma/client'
import { DB_CONNECTION_TIMEOUT, DB_QUERY_TIMEOUT, DB_MAX_CONNECTIONS } from '../utils/constants'

/**
 * Database configuration interface
 * Defines all database connection parameters and settings
 */
export interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: boolean
  connectionTimeoutMs: number
  queryTimeoutMs: number
  maxConnections: number
  logQueries: boolean
}

/**
 * Database connection status interface
 * Provides connection state and error information
 */
export interface ConnectionStatus {
  connected: boolean
  error?: string
  timestamp: string
}

/**
 * Health check result interface
 * Comprehensive health status with performance metrics
 */
export interface HealthCheckResult {
  healthy: boolean
  timestamp: string
  connectionPool: {
    active: number
    idle: number
    total: number
  }
  responseTimeMs: number
  error?: string
}

/**
 * Database connection management interface
 * Defines the contract for database connection operations
 */
export interface DatabaseConnection {
  isConnected: boolean
  client: PrismaClient | null
  config: DatabaseConfig
  connect(): Promise<void>
  disconnect(): Promise<void>
  healthCheck(): Promise<HealthCheckResult>
  getConnectionStatus(): ConnectionStatus
}

/**
 * Parse DATABASE_URL connection string into components
 * Extracts host, port, database, username, and password from PostgreSQL URL
 * @param connectionString - PostgreSQL connection URL
 * @returns Parsed database configuration components
 */
export function parseConnectionString(connectionString: string): Partial<DatabaseConfig> {
  if (!connectionString) {
    throw new Error('Database connection string is required')
  }

  try {
    const url = new URL(connectionString)
    
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      throw new Error('Invalid database connection string format: must be PostgreSQL URL')
    }

    return {
      host: url.hostname,
      port: url.port ? parseInt(url.port, 10) : 5432,
      database: url.pathname.slice(1), // Remove leading slash
      username: url.username,
      password: url.password,
      ssl: url.searchParams.get('sslmode') === 'require'
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Invalid database connection string format')
    }
    throw error
  }
}

/**
 * Get database configuration from environment variables
 * Combines parsed connection string with environment-specific settings
 * @returns Complete database configuration object
 */
export function getDatabaseConfig(): DatabaseConfig {
  const connectionString = process.env['DATABASE_URL']
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required')
  }

  const parsedConnection = parseConnectionString(connectionString)
  const isDevelopment = process.env['NODE_ENV'] === 'development'
  
  // Parse timeout values with validation
  const connectionTimeout = process.env['DB_CONNECTION_TIMEOUT']
  const queryTimeout = process.env['DB_QUERY_TIMEOUT']
  const maxConnections = process.env['DB_MAX_CONNECTIONS']

  const connectionTimeoutMs = connectionTimeout ? 
    validatePositiveNumber(parseInt(connectionTimeout, 10), 'DB_CONNECTION_TIMEOUT') : 
    DB_CONNECTION_TIMEOUT

  const queryTimeoutMs = queryTimeout ? 
    validatePositiveNumber(parseInt(queryTimeout, 10), 'DB_QUERY_TIMEOUT') : 
    DB_QUERY_TIMEOUT

  const maxConnectionsValue = maxConnections ? 
    validateConnectionLimit(parseInt(maxConnections, 10)) : 
    DB_MAX_CONNECTIONS

  return {
    host: parsedConnection.host!,
    port: parsedConnection.port!,
    database: parsedConnection.database!,
    username: parsedConnection.username!,
    password: parsedConnection.password!,
    ssl: parsedConnection.ssl || false,
    connectionTimeoutMs,
    queryTimeoutMs,
    maxConnections: maxConnectionsValue,
    logQueries: isDevelopment
  }
}

/**
 * Validate that a number is positive
 * @param value - Number to validate
 * @param fieldName - Name of the field for error messages
 * @returns Validated positive number
 */
function validatePositiveNumber(value: number, fieldName: string): number {
  if (isNaN(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive number, got: ${value}`)
  }
  return value
}

/**
 * Validate connection limit is within reasonable bounds
 * @param value - Connection limit to validate
 * @returns Validated connection limit
 */
function validateConnectionLimit(value: number): number {
  if (isNaN(value) || value < 1 || value > 100) {
    throw new Error(`DB_MAX_CONNECTIONS must be between 1 and 100, got: ${value}`)
  }
  return value
}

/**
 * Get Prisma client configuration based on environment
 * @param config - Database configuration
 * @returns Prisma client options
 */
export function getPrismaConfig(config: DatabaseConfig): Prisma.PrismaClientOptions {
  const logLevels: Prisma.LogLevel[] = config.logQueries ? 
    ['query', 'error', 'warn'] : 
    ['error']

  // Ensure DATABASE_URL is defined
  const databaseUrl = process.env['DATABASE_URL']
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for Prisma configuration')
  }

  return {
    log: logLevels,
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  }
}

/**
 * Database connection manager class
 * Handles Prisma client lifecycle and connection monitoring
 */
export class DatabaseConnectionManager implements DatabaseConnection {
  public isConnected: boolean = false
  public client: PrismaClient | null = null
  public readonly config: DatabaseConfig
  private connectionAttempts: number = 0
  private lastHealthCheck: HealthCheckResult | null = null

  constructor(config?: DatabaseConfig) {
    this.config = config || getDatabaseConfig()
  }

  /**
   * Establish database connection
   * Initializes Prisma client and tests connectivity
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return
    }

    try {
      this.connectionAttempts++
      
      const prismaConfig = getPrismaConfig(this.config)
      this.client = new PrismaClient(prismaConfig)
      
      // Test connection with timeout
      await Promise.race([
        this.client.$connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), this.config.connectionTimeoutMs)
        )
      ])
      
      this.isConnected = true
      console.log(`✅ Database connection established (attempt ${this.connectionAttempts})`)
      
    } catch (error) {
      this.isConnected = false
      this.client = null
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error'
      console.error(`❌ Database connection failed (attempt ${this.connectionAttempts}):`, errorMessage)
      
      throw new Error(`Database connection failed: ${errorMessage}`)
    }
  }

  /**
   * Disconnect from database
   * Cleanly closes Prisma client connection
   */
  async disconnect(): Promise<void> {
    if (!this.client) {
      return
    }

    try {
      await this.client.$disconnect()
      this.isConnected = false
      this.client = null
      console.log('✅ Database connection closed')
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown disconnection error'
      console.error('❌ Error during database disconnection:', errorMessage)
      throw new Error(`Database disconnection failed: ${errorMessage}`)
    }
  }

  /**
   * Perform comprehensive health check
   * Tests database connectivity and measures response time
   * @returns Health check result with performance metrics
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    const result: HealthCheckResult = {
      healthy: false,
      timestamp: new Date().toISOString(),
      connectionPool: {
        active: 0,
        idle: 0,
        total: this.config.maxConnections
      },
      responseTimeMs: 0
    }

    try {
      if (!this.client || !this.isConnected) {
        throw new Error('Database client not connected')
      }

      // Execute simple health check query with timeout
      await Promise.race([
        this.client.$queryRaw`SELECT 1 as health_check`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), this.config.queryTimeoutMs)
        )
      ])

      const responseTime = Date.now() - startTime
      
      result.healthy = true
      result.responseTimeMs = responseTime
      
      // Update connection pool metrics (simplified simulation)
      result.connectionPool.active = Math.min(2, this.config.maxConnections)
      result.connectionPool.idle = this.config.maxConnections - result.connectionPool.active

      this.lastHealthCheck = result
      
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown health check error'
      
      result.healthy = false
      result.responseTimeMs = responseTime
      result.error = errorMessage
      
      console.error('❌ Database health check failed:', errorMessage)
    }

    return result
  }

  /**
   * Get current connection status
   * @returns Connection status with timestamp
   */
  getConnectionStatus(): ConnectionStatus {
    const status: ConnectionStatus = {
      connected: this.isConnected,
      timestamp: new Date().toISOString()
    }

    // Only include error property if there's an actual error
    if (this.lastHealthCheck?.error) {
      status.error = this.lastHealthCheck.error
    }

    return status
  }

  /**
   * Connect with retry logic
   * Attempts connection with exponential backoff
   * @param maxRetries - Maximum number of retry attempts
   * @param baseDelayMs - Base delay between retries in milliseconds
   */
  async connectWithRetry(maxRetries: number = 3, baseDelayMs: number = 1000): Promise<void> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.connect()
        return // Success!
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt === maxRetries) {
          break // Final attempt failed
        }
        
        // Exponential backoff delay
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1)
        console.log(`🔄 Retrying database connection in ${delayMs}ms (attempt ${attempt}/${maxRetries})`)
        
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    throw new Error(`Database connection failed after ${maxRetries} attempts: ${lastError?.message}`)
  }
}

/**
 * Create and configure database connection manager
 * Factory function for creating database connections
 * @param config - Optional database configuration
 * @returns Configured database connection manager
 */
export function createDatabaseConnection(config?: DatabaseConfig): DatabaseConnectionManager {
  return new DatabaseConnectionManager(config)
}

/**
 * Singleton database connection instance
 * Shared connection manager for application-wide use
 */
let sharedConnection: DatabaseConnectionManager | null = null

/**
 * Get shared database connection instance
 * Creates singleton connection manager if not already initialized
 * @returns Shared database connection manager
 */
export function getSharedDatabaseConnection(): DatabaseConnectionManager {
  if (!sharedConnection) {
    sharedConnection = createDatabaseConnection()
  }
  return sharedConnection
}

/**
 * Initialize database with retry logic
 * Convenience function for application startup
 * @param maxRetries - Maximum connection retry attempts
 * @returns Promise resolving when database is ready
 */
export async function initializeDatabase(maxRetries: number = 3): Promise<DatabaseConnectionManager> {
  const connection = getSharedDatabaseConnection()
  await connection.connectWithRetry(maxRetries)
  return connection
}

/**
 * Cleanup database connections
 * Gracefully disconnects all database connections
 */
export async function cleanupDatabase(): Promise<void> {
  if (sharedConnection) {
    await sharedConnection.disconnect()
    sharedConnection = null
  }
}

// backend/src/config/database.ts
// Version: 1.5.0
// Removed all duplicate export declarations - interfaces are exported directly