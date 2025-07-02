// __tests__/setup.ts
// Version: 1.0.0
// Global test setup and teardown for Vitest

import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

// Load test environment variables
dotenv.config({ path: '.env.test' })

let prisma: PrismaClient

/**
 * Global setup function - runs once before all tests
 * Called by Vitest when configured as globalSetup
 */
export async function setup() {
  console.log('🧪 Test environment initialized')
  
  // Initialize Prisma client for tests
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })
  
  // Connect to test database
  await prisma.$connect()
  
  // Run any global test setup here
  // For example: seed test data, clear caches, etc.
  
  return async () => {
    // This cleanup function runs after all tests
    await teardown()
  }
}

/**
 * Global teardown function - runs once after all tests
 */
export async function teardown() {
  console.log('🧹 Test cleanup completed')
  
  if (prisma) {
    // Clean up database connections
    await prisma.$disconnect()
  }
  
  // Any other global cleanup
}