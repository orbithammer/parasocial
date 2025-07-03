// backend/src/routes/__tests__/debugStaticFile.test.ts
// Version: 1.0
// Debug test to identify the exact issue with static file serving

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import path from 'path'
import fs from 'fs'
import { createSecureStaticFileHandler } from '../../middleware/staticFileSecurityMiddleware'

/**
 * Debug test to isolate the static file serving issue
 */
describe('Debug Static File Serving', () => {
  let app: express.Application
  let testDir: string
  
  beforeEach(() => {
    // Create test app
    app = express()
    app.use(express.json())
    
    // Set up test directory
    testDir = path.join(process.cwd(), 'debug-uploads')
    
    // Ensure test directory exists
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    
    // Add our middleware
    app.use('/uploads', ...createSecureStaticFileHandler(testDir))
  })
  
  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir)
      files.forEach(file => {
        try {
          fs.unlinkSync(path.join(testDir, file))
        } catch (error) {
          console.warn(`Could not delete ${file}:`, error)
        }
      })
      
      try {
        fs.rmdirSync(testDir)
      } catch (error) {
        console.warn(`Could not delete directory ${testDir}:`, error)
      }
    }
  })

  it('should debug file creation and access', async () => {
    // Create a test file
    const testFilePath = path.join(testDir, 'debug-test.txt')
    const testContent = 'debug content'
    
    console.log('Creating test file at:', testFilePath)
    fs.writeFileSync(testFilePath, testContent)
    
    // Verify file exists
    const fileExists = fs.existsSync(testFilePath)
    console.log('File exists:', fileExists)
    
    if (fileExists) {
      const actualContent = fs.readFileSync(testFilePath, 'utf8')
      console.log('File content:', actualContent)
    }
    
    // List directory contents
    const dirContents = fs.readdirSync(testDir)
    console.log('Directory contents:', dirContents)
    
    // Test file access
    console.log('Attempting to access /uploads/debug-test.txt')
    
    const response = await request(app)
      .get('/uploads/debug-test.txt')
    
    console.log('Response status:', response.status)
    console.log('Response headers:', response.headers)
    console.log('Response body:', response.body)
    console.log('Response text:', response.text)
    
    // The test should succeed
    expect(response.status).toBe(200)
    expect(response.text).toBe(testContent)
  })

  it('should debug path traversal blocking', async () => {
    console.log('Testing path traversal: /uploads/../../../etc/passwd')
    
    const response = await request(app)
      .get('/uploads/../../../etc/passwd')
    
    console.log('Path traversal response status:', response.status)
    console.log('Path traversal response body:', response.body)
    console.log('Path traversal response text:', response.text)
    console.log('Path traversal response headers:', response.headers)
    
    // Should be blocked with 400
    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'INVALID_PATH'
      }
    })
  })

  it('should test the exact failing case from original test', async () => {
    console.log('Testing exact case from original failing test')
    
    // This is the exact test case that was failing
    const response = await request(app)
      .get('/uploads/../../../etc/passwd')
    
    console.log('Exact test case status:', response.status)
    console.log('Exact test case body:', response.body)
    
    // Log the middleware execution
    console.log('Request URL:', '/uploads/../../../etc/passwd')
    console.log('Expected: 400 Bad Request with INVALID_PATH error')
    console.log('Actual:', response.status, response.body)
    
    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'INVALID_PATH',
        message: 'Invalid file path'
      }
    })
  })

  it('should debug dotfile access blocking', async () => {
    // Create a dotfile
    const dotfilePath = path.join(testDir, '.env')
    fs.writeFileSync(dotfilePath, 'SECRET=hidden')
    
    console.log('Testing dotfile access: /uploads/.env')
    
    const response = await request(app)
      .get('/uploads/.env')
    
    console.log('Dotfile response status:', response.status)
    console.log('Dotfile response body:', response.body)
    console.log('Dotfile response text:', response.text)
    
    // Should be blocked with 403
    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'DOTFILE_ACCESS_DENIED'
      }
    })
  })
})