// backend/src/utils/logger.ts
// Version: 1.4.0 - Fixed unused parameter warning in error middleware
// Comprehensive logging utility using Pino with TypeScript support for social media backend

import pino from 'pino'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Configuration interface for logger initialization
 * Supports development and production environments with different settings
 */
interface LoggerConfig {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  pretty: boolean
  redact: string[]
  base?: Record<string, unknown>
}

/**
 * Custom logger interface that wraps Pino with additional utilities
 * Provides consistent API for logging throughout the application
 */
interface Logger {
  debug: (message: string, data?: Record<string, unknown>) => void
  info: (message: string, data?: Record<string, unknown>) => void
  warn: (message: string, data?: Record<string, unknown>) => void
  error: (message: string | Error, data?: Record<string, unknown>) => void
  fatal: (message: string | Error, data?: Record<string, unknown>) => void
  child: (bindings: Record<string, unknown>) => Logger
}

/**
 * Interface for HTTP request logging data
 * Standardizes request information across the application
 */
interface RequestLogData {
  method: string
  url: string
  ip: string
  userAgent: string
  statusCode?: number
  responseTime?: number
  userId?: string
  [key: string]: unknown // Allow additional arbitrary fields
}

/**
 * Interface for error logging with additional context
 * Extends basic error information with application-specific data
 */
interface ErrorLogData {
  err: Error
  requestId?: string
  userId?: string
  component?: string
  operation?: string
  [key: string]: unknown // Allow additional arbitrary fields
}

// ============================================================================
// CONFIGURATION AND CONSTANTS
// ============================================================================

/**
 * Sensitive field names that should be redacted from logs
 * Prevents accidental logging of passwords, tokens, and other secrets
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'secret',
  'authorization',
  'refreshToken',
  'accessToken',
  'privateKey',
  'sessionId',
  'cookieSecret',
  'jwtSecret'
] as const

/**
 * Default logger configuration based on environment
 * Development uses pretty printing, production uses structured JSON
 */
const getDefaultConfig = (): LoggerConfig => {
  const nodeEnv = process.env['NODE_ENV']
  const isProduction = nodeEnv === 'production'
  const isDevelopment = nodeEnv === 'development'
  
  return {
    level: (process.env['LOG_LEVEL'] as LoggerConfig['level']) || (isProduction ? 'info' : 'debug'),
    pretty: isDevelopment,
    redact: [...SENSITIVE_FIELDS],
    base: {
      service: 'parasocial-backend',
      version: process.env['npm_package_version'] || '1.0.0',
      environment: nodeEnv || 'development'
    }
  }
}

// ============================================================================
// PINO LOGGER INSTANCE CREATION
// ============================================================================

/**
 * Creates and configures the base Pino logger instance
 * Applies redaction, formatting, and environment-specific settings
 */
const createPinoLogger = (config: LoggerConfig) => {
  const pinoConfig: pino.LoggerOptions = {
    level: config.level,
    base: config.base || {},
    redact: {
      paths: config.redact,
      censor: '[REDACTED]'
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({ level: label }),
      bindings: (bindings: Record<string, unknown>) => ({
        pid: bindings['pid'],
        hostname: bindings['hostname'],
        service: bindings['service'],
        version: bindings['version'],
        environment: bindings['environment']
      })
    }
  }

  // Add pretty printing transport for development
  if (config.pretty) {
    return pino({
      ...pinoConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    })
  }

  return pino(pinoConfig)
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitizes log data by redacting sensitive fields
 * Prevents accidental exposure of secrets in application logs
 */
export const sanitizeLogData = (data: Record<string, unknown>): Record<string, unknown> => {
  if (!data || typeof data !== 'object') {
    return {}
  }

  const sanitized = { ...data }
  
  // Redact sensitive fields at the top level
  SENSITIVE_FIELDS.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  })

  // Recursively sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    const value = sanitized[key]
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeLogData(value as Record<string, unknown>)
    }
  })

  return sanitized
}

/**
 * Formats HTTP request information for consistent request logging
 * Standardizes request data across middleware and route handlers
 */
export const formatRequestLog = (req: {
  method: string
  url: string
  ip: string
  userAgent?: string
  statusCode?: number
  responseTime?: number
  userId?: string
}): RequestLogData => ({
  method: req.method,
  url: req.url,
  ip: req.ip,
  userAgent: req.userAgent || 'unknown',
  ...(req.statusCode && { statusCode: req.statusCode }),
  ...(req.responseTime && { responseTime: req.responseTime }),
  ...(req.userId && { userId: req.userId })
})

/**
 * Formats error information for consistent error logging
 * Extracts error details and adds contextual information
 */
export const formatErrorLog = (
  error: Error,
  context?: Partial<ErrorLogData>
): ErrorLogData => ({
  err: error,
  ...context
})

/**
 * Creates a performance logging wrapper for functions
 * Measures execution time and logs performance metrics
 */
export const createPerformanceLogger = (logger: Logger, operation: string) => {
  return <T extends (...args: unknown[]) => unknown>(fn: T): T => {
    return ((...args: Parameters<T>) => {
      const startTime = Date.now()
      const result = fn(...args)
      
      // Handle both sync and async functions
      if (result instanceof Promise) {
        return result
          .then(value => {
            const duration = Date.now() - startTime
            logger.debug('Operation completed', {
              operation,
              duration,
              status: 'success'
            })
            return value
          })
          .catch(error => {
            const duration = Date.now() - startTime
            logger.error('Operation failed', {
              operation,
              duration,
              status: 'error',
              err: error
            })
            throw error
          })
      } else {
        const duration = Date.now() - startTime
        logger.debug('Operation completed', {
          operation,
          duration,
          status: 'success'
        })
        return result
      }
    }) as T
  }
}

// ============================================================================
// LOGGER IMPLEMENTATION
// ============================================================================

/**
 * Creates a custom logger instance that wraps Pino
 * Provides consistent API with automatic data sanitization
 */
const createLogger = (pinoInstance: pino.Logger): Logger => ({
  /**
   * Logs debug-level messages with optional data
   * Used for detailed diagnostic information during development
   */
  debug: (message: string, data?: Record<string, unknown>) => {
    const sanitizedData = data ? sanitizeLogData(data) : {}
    pinoInstance.debug(sanitizedData, message)
  },

  /**
   * Logs info-level messages with optional data
   * Used for general application flow and important events
   */
  info: (message: string, data?: Record<string, unknown>) => {
    const sanitizedData = data ? sanitizeLogData(data) : {}
    pinoInstance.info(sanitizedData, message)
  },

  /**
   * Logs warning-level messages with optional data
   * Used for potentially harmful situations that don't stop execution
   */
  warn: (message: string, data?: Record<string, unknown>) => {
    const sanitizedData = data ? sanitizeLogData(data) : {}
    pinoInstance.warn(sanitizedData, message)
  },

  /**
   * Logs error-level messages with support for Error objects
   * Automatically extracts error details and stack traces
   */
  error: (message: string | Error, data?: Record<string, unknown>) => {
    const sanitizedData = data ? sanitizeLogData(data) : {}
    
    if (message instanceof Error) {
      pinoInstance.error(
        { err: message, ...sanitizedData },
        message.message
      )
    } else {
      pinoInstance.error(sanitizedData, message)
    }
  },

  /**
   * Logs fatal-level messages for critical errors
   * Used for errors that may cause application termination
   */
  fatal: (message: string | Error, data?: Record<string, unknown>) => {
    const sanitizedData = data ? sanitizeLogData(data) : {}
    
    if (message instanceof Error) {
      pinoInstance.fatal(
        { err: message, ...sanitizedData },
        message.message
      )
    } else {
      pinoInstance.fatal(sanitizedData, message)
    }
  },

  /**
   * Creates a child logger with additional context bindings
   * Child loggers inherit parent configuration and add contextual data
   */
  child: (bindings: Record<string, unknown>) => {
    const sanitizedBindings = sanitizeLogData(bindings)
    const childPino = pinoInstance.child(sanitizedBindings)
    return createLogger(childPino)
  }
})

// ============================================================================
// EXPORTED LOGGER INSTANCES
// ============================================================================

/**
 * Default application logger instance
 * Pre-configured with environment-appropriate settings
 */
export const logger = createLogger(createPinoLogger(getDefaultConfig()))

/**
 * Creates a new logger instance with custom configuration
 * Useful for creating specialized loggers for different components
 */
export const createCustomLogger = (config: Partial<LoggerConfig>): Logger => {
  const fullConfig = { ...getDefaultConfig(), ...config }
  return createLogger(createPinoLogger(fullConfig))
}

/**
 * Pre-configured logger for HTTP request/response logging
 * Includes request-specific context and formatting
 */
export const requestLogger = logger.child({
  component: 'http',
  type: 'request'
})

/**
 * Pre-configured logger for database operations
 * Includes database-specific context for query and transaction logging
 */
export const dbLogger = logger.child({
  component: 'database',
  type: 'operation'
})

/**
 * Pre-configured logger for authentication operations
 * Includes auth-specific context with enhanced security considerations
 */
export const authLogger = logger.child({
  component: 'authentication',
  type: 'security'
})

/**
 * Pre-configured logger for ActivityPub federation operations
 * Includes federation-specific context for inter-instance communication
 */
export const federationLogger = logger.child({
  component: 'activitypub',
  type: 'federation'
})

// ============================================================================
// EXPRESS MIDDLEWARE HELPERS
// ============================================================================

/**
 * Creates Express middleware for automatic request logging
 * Logs incoming requests with standardized format and timing
 */
export const createRequestLoggingMiddleware = () => {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now()
    
    // Log incoming request
    requestLogger.info('Incoming request', formatRequestLog({
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    }))

    // Log response when finished
    res.on('finish', () => {
      const responseTime = Date.now() - startTime
      const logLevel = res.statusCode >= 400 ? 'warn' : 'info'
      
      requestLogger[logLevel]('Request completed', formatRequestLog({
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        responseTime,
        userId: req.user?.id
      }))
    })

    next()
  }
}

/**
 * Creates Express error logging middleware
 * Logs unhandled errors with full context and stack traces
 */
export const createErrorLoggingMiddleware = () => {
  return (err: Error, req: any, _res: any, next: any) => {
    logger.error(err, {
      requestId: req.id,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id,
      body: req.body,
      query: req.query,
      params: req.params
    })
    
    next(err)
  }
}

// Export types for external use
export type { LoggerConfig, Logger, RequestLogData, ErrorLogData }

// backend/src/utils/logger.ts
// Version: 1.4.0