import { describe, test, expect } from 'vitest'

describe('Environment Debug', () => {
  test('should show DATABASE_URL', () => {
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('DATABASE_URL:', process.env.DATABASE_URL)
    console.log('TEST_DATABASE_URL:', process.env.TEST_DATABASE_URL)
    console.log('All env vars:', Object.keys(process.env).filter(key => key.includes('DATABASE')))
    expect(true).toBe(true)
  })
})
