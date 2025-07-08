// backend/src/test-supertest-check.test.ts
// Version: 1.0.0 - Quick test to verify supertest installation
// Purpose: Diagnose supertest import issues in test files

import { describe, it, expect } from 'vitest'

// Test basic supertest import
describe('Supertest Installation Check', () => {
  it('should import supertest successfully', async () => {
    try {
      // Try to import supertest
      const request = await import('supertest')
      console.log('✅ Supertest imported successfully')
      expect(request).toBeDefined()
      expect(typeof request.default).toBe('function')
    } catch (error) {
      console.error('❌ Supertest import failed:', error)
      throw error
    }
  })

  it('should import express successfully', async () => {
    try {
      // Try to import express (needed for supertest)
      const express = await import('express')
      console.log('✅ Express imported successfully') 
      expect(express).toBeDefined()
      expect(typeof express.default).toBe('function')
    } catch (error) {
      console.error('❌ Express import failed:', error)
      throw error
    }
  })

  it('should create basic express app and test with supertest', async () => {
    try {
      const express = await import('express')
      const request = await import('supertest')
      
      // Create minimal express app
      const app = express.default()
      app.get('/test', (req, res) => {
        res.json({ success: true, message: 'Test endpoint working' })
      })
      
      // Test with supertest
      const response = await request.default(app).get('/test')
      
      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      console.log('✅ Supertest + Express integration working')
    } catch (error) {
      console.error('❌ Supertest + Express integration failed:', error)
      throw error
    }
  })
})