// backend/test-setup.ts
// Version: 1.3.0 - Fixed aggressive process.exit that was interfering with Vitest
// Changed: Removed forced process.exit that was causing test runner errors

import { afterAll, beforeAll } from 'vitest'

// Track all resources that need cleanup
const activeTimers = new Set<any>()
const activeIntervals = new Set<any>()
const activeServers = new Set<any>()

// Override timer functions to track them
const originalSetTimeout = global.setTimeout
const originalSetInterval = global.setInterval
const originalClearTimeout = global.clearTimeout
const originalClearInterval = global.clearInterval

global.setTimeout = ((callback: Function, delay?: number, ...args: any[]) => {
  const timer = originalSetTimeout(callback, delay, ...args)
  activeTimers.add(timer)
  return timer
}) as any

global.setInterval = ((callback: Function, delay?: number, ...args: any[]) => {
  const interval = originalSetInterval(callback, delay, ...args)
  activeIntervals.add(interval)
  return interval
}) as any

global.clearTimeout = (timer: any) => {
  activeTimers.delete(timer)
  return originalClearTimeout(timer)
}

global.clearInterval = (interval: any) => {
  activeIntervals.delete(interval)
  return originalClearInterval(interval)
}

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test'
  
  // Reduce test timeouts for faster feedback
  process.env.TEST_TIMEOUT = '5000'
  
  console.log('Test setup initialized')
})

// Global test cleanup - FIXED: Removed aggressive process.exit
afterAll(async () => {
  console.log('Starting test cleanup...')
  
  // Clear all active timers
  for (const timer of activeTimers) {
    clearTimeout(timer)
  }
  activeTimers.clear()
  
  // Clear all active intervals
  for (const interval of activeIntervals) {
    clearInterval(interval)
  }
  activeIntervals.clear()
  
  // Close any active servers
  for (const server of activeServers) {
    if (server && typeof server.close === 'function') {
      try {
        await new Promise<void>((resolve, reject) => {
          const closeTimeout = setTimeout(() => {
            reject(new Error('Server close timeout'))
          }, 1000)
          
          server.close((err: any) => {
            clearTimeout(closeTimeout)
            if (err) reject(err)
            else resolve()
          })
        })
      } catch (error) {
        console.warn('Error closing server:', error)
      }
    }
  }
  activeServers.clear()
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
  
  // FIXED: Let Vitest handle process lifecycle naturally
  // Removed the aggressive process.exit(0) that was causing test runner errors
  console.log('Test cleanup completed')
})

// Export utility for tests to register servers
export function registerServer(server: any) {
  activeServers.add(server)
}

// Export utility for tests to unregister servers
export function unregisterServer(server: any) {
  activeServers.delete(server)
}