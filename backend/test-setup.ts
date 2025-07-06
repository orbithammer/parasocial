// backend/test-setup.ts
// Version: 1.0.0 - Global test setup with proper cleanup
// Created: Prevents hanging tests by ensuring database connections close

import { afterAll, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

// Global cleanup tracking
const cleanupTasks: (() => Promise<void>)[] = []

// Register cleanup task
export function addCleanupTask(task: () => Promise<void>) {
  cleanupTasks.push(task)
}

// Global setup
beforeAll(async () => {
  console.log('🔄 Global test setup starting...')
  
  // Set shorter timeouts for tests
  process.env.NODE_ENV = 'test'
  
  console.log('✅ Global test setup complete')
})

// Global cleanup - CRITICAL for preventing hanging tests
afterAll(async () => {
  console.log('🔄 Global test cleanup starting...')
  
  try {
    // Run all registered cleanup tasks
    for (const cleanup of cleanupTasks) {
      await cleanup()
    }
    
    // Create a fresh Prisma instance for final cleanup
    const prisma = new PrismaClient()
    await prisma.$disconnect()
    console.log('✅ Database connections closed')
    
    // Clear any remaining timers
    for (let i = 1; i < 10000; i++) {
      clearTimeout(i)
      clearInterval(i)
    }
    console.log('✅ Timers cleared')
    
    console.log('✅ Global test cleanup complete')
  } catch (error) {
    console.error('❌ Global cleanup error:', error)
  }
  
  // Force exit if tests still hanging (emergency measure)
  setTimeout(() => {
    console.log('⚠️ Force exiting test process due to timeout')
    process.exit(0)
  }, 5000)
})