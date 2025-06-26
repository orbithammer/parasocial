// backend/src/services/container.ts
// Dependency injection container that wires up all services and repositories

import { PrismaClient } from '@prisma/client'
import { AuthController } from '../controllers/AuthController'
import { PostController } from '../controllers/PostController'
import { UserController } from '../controllers/UserController'
import { UserRepository } from '../repositories/UserRepository'
import { PostRepository } from '../repositories/PostRepository'
import { FollowRepository } from '../repositories/FollowRepository'
import { BlockRepository } from '../repositories/BlockRepository'
import { AuthService } from './AuthService'
import { createAuthMiddleware, createOptionalAuthMiddleware } from '../middleware/authMiddleware'
import type { RequestHandler } from 'express'

/**
 * Health check result interface
 */
interface HealthCheckResult {
  healthy: boolean
  checks: {
    database: boolean
    services: boolean
    controllers: boolean
  }
  error?: string
  timestamp: string
}

/**
 * Dependencies interface for routes
 */
interface Dependencies {
  authController: AuthController
  postController: PostController
  userController: UserController
  authMiddleware: RequestHandler
  optionalAuthMiddleware: RequestHandler
  authService: AuthService
  userRepository: UserRepository
  postRepository: PostRepository
  followRepository: FollowRepository
  blockRepository: BlockRepository
  prisma: PrismaClient
}

/**
 * Service container class
 * Manages all service dependencies and their lifecycle
 */
class ServiceContainer {
  private services = new Map()
  private initialized = false
  private prisma!: PrismaClient
  private userRepository!: UserRepository
  private postRepository!: PostRepository
  private followRepository!: FollowRepository
  private blockRepository!: BlockRepository
  private authService!: AuthService
  private authController!: AuthController
  private postController!: PostController
  private userController!: UserController
  private authMiddleware!: RequestHandler
  private optionalAuthMiddleware!: RequestHandler

  /**
   * Initialize all services and dependencies
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      // Initialize Prisma client
      console.log('🔄 Initializing database connection...')
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
      })

      // Test database connection
      await this.prisma.$connect()
      console.log('✅ Database connected successfully')

      // Initialize repositories
      console.log('🔄 Initializing repositories...')
      this.userRepository = new UserRepository(this.prisma)
      this.postRepository = new PostRepository(this.prisma)
      this.followRepository = new FollowRepository(this.prisma)
      this.blockRepository = new BlockRepository(this.prisma)

      // Initialize services
      console.log('🔄 Initializing services...')
      this.authService = new AuthService()

      // Initialize controllers
      console.log('🔄 Initializing controllers...')
      this.authController = new AuthController(this.authService, this.userRepository)
      this.postController = new PostController(this.postRepository, this.userRepository)
      this.userController = new UserController(
        this.userRepository, 
        this.followRepository, 
        this.blockRepository
      )

      // Initialize middleware
      console.log('🔄 Initializing middleware...')
      this.authMiddleware = createAuthMiddleware(this.authService)
      this.optionalAuthMiddleware = createOptionalAuthMiddleware(this.authService)

      this.initialized = true
      console.log('✅ All services initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize services:', error)
      throw error
    }
  }

  /**
   * Get Prisma client instance
   */
  getPrisma(): PrismaClient {
    this.checkInitialized()
    return this.prisma
  }

  /**
   * Get repository instances
   */
  getRepositories() {
    this.checkInitialized()
    return {
      userRepository: this.userRepository,
      postRepository: this.postRepository,
      followRepository: this.followRepository,
      blockRepository: this.blockRepository
    }
  }

  /**
   * Get service instances
   */
  getServices() {
    this.checkInitialized()
    return {
      authService: this.authService
    }
  }

  /**
   * Get controller instances
   */
  getControllers() {
    this.checkInitialized()
    return {
      authController: this.authController,
      postController: this.postController,
      userController: this.userController
    }
  }

  /**
   * Get middleware instances
   */
  getMiddleware() {
    this.checkInitialized()
    return {
      authMiddleware: this.authMiddleware,
      optionalAuthMiddleware: this.optionalAuthMiddleware
    }
  }

  /**
   * Get all dependencies needed for route setup
   */
  getDependencies(): Dependencies {
    this.checkInitialized()
    return {
      ...this.getControllers(),
      ...this.getMiddleware(),
      ...this.getServices(),
      ...this.getRepositories(),
      prisma: this.prisma
    }
  }

  /**
   * Graceful shutdown - close database connections
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down services...')
    
    if (this.prisma) {
      await this.prisma.$disconnect()
      console.log('✅ Database disconnected')
    }

    this.initialized = false
    console.log('✅ Services shut down successfully')
  }

  /**
   * Check if container is initialized
   * @private
   */
  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('ServiceContainer not initialized. Call initialize() first.')
    }
  }

  /**
   * Health check - verify all services are working
   */
  async healthCheck(): Promise<HealthCheckResult> {
    this.checkInitialized()

    const checks = {
      database: false,
      services: false,
      controllers: false
    }

    try {
      // Test database connection
      await this.prisma.$queryRaw`SELECT 1`
      checks.database = true

      // Test services
      if (this.authService && this.userRepository) {
        checks.services = true
      }

      // Test controllers
      if (this.authController && this.postController && this.userController) {
        checks.controllers = true
      }

      const allHealthy = Object.values(checks).every(check => check)

      return {
        healthy: allHealthy,
        checks,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        healthy: false,
        checks,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  }
}

// Create singleton instance
const container = new ServiceContainer()

export default container
export type { Dependencies, HealthCheckResult }