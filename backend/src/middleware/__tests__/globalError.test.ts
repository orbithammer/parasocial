// backend/src/middleware/__tests__/globalError.test.ts
// Version: 1.0.8 - Updated mock response interface for proper TypeScript support
// Changed: Added proper type assertions and interface documentation

import { Response } from 'express'
import { vi } from 'vitest'

/**
 * Interface for mock response with access to mock functions
 * Extends Express Response with references to the original Vitest mocks
 * This solves the TypeScript error where jsonMock doesn't exist on Response type
 */
interface MockResponse extends Response {
  statusMock: ReturnType<typeof vi.fn>
  jsonMock: ReturnType<typeof vi.fn>
}

/**
 * Create mock Express response object with spy functions
 * Tracks status codes and JSON responses for assertions
 * Uses type assertion to properly type the mock for TypeScript
 */
function createMockResponse(): MockResponse {
  const statusMock = vi.fn().mockReturnThis()
  const jsonMock = vi.fn().mockReturnThis()
  
  const mockResponse = {
    status: statusMock,
    json: jsonMock,
    send: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
    // Add minimal required properties to satisfy Express Response interface
    locals: {},
    headersSent: false,
    // Mock other commonly used methods
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    render: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    get: vi.fn(),
    type: vi.fn().mockReturnThis(),
    vary: vi.fn().mockReturnThis(),
    // Keep references to mocks for testing
    statusMock,
    jsonMock
  }

  // Type assertion to tell TypeScript this is a MockResponse
  // This is the key fix for the jsonMock property error
  return mockResponse as unknown as MockResponse
}

// Example usage in a test
describe('Example Test', () => {
  it('should properly access mock functions', () => {
    const res = createMockResponse()
    
    // Now TypeScript knows about jsonMock and statusMock
    res.status(200)
    res.json({ success: true })
    
    // These assertions will work without TypeScript errors
    expect(res.statusMock).toHaveBeenCalledWith(200)
    expect(res.jsonMock).toHaveBeenCalledWith({ success: true })
  })
})