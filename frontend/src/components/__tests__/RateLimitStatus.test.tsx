// frontend/src/components/__tests__/RateLimitStatus.test.tsx
// Version: 1.0.0
// Unit tests for RateLimitStatus component

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import RateLimitStatus from '../RateLimitStatus'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Helper function to create mock response with rate limit headers
const createMockResponse = (headers: Record<string, string>, status = 200) => ({
  status,
  headers: {
    get: (name: string) => headers[name] || null
  }
})

// Helper function to create rate limit headers
const createRateLimitHeaders = (
  limit: string,
  remaining: string,
  reset: string,
  authLimit?: string,
  authRemaining?: string,
  authReset?: string
) => ({
  'ratelimit-limit': limit,
  'ratelimit-remaining': remaining,
  'ratelimit-reset': reset,
  ...(authLimit && { 'ratelimit-limit-auth': authLimit }),
  ...(authRemaining && { 'ratelimit-remaining-auth': authRemaining }),
  ...(authReset && { 'ratelimit-reset-auth': authReset })
})

describe('RateLimitStatus Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock Date.now for consistent time-based tests
    vi.spyOn(Date, 'now').mockReturnValue(1000000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      // Mock fetch to never resolve to keep loading state
      mockFetch.mockImplementation(() => new Promise(() => {}))

      render(<RateLimitStatus />)

      expect(screen.getByText('Loading rate limits...')).toBeInTheDocument()
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should show loading spinner with correct styling', () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      render(<RateLimitStatus />)

      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toHaveClass('h-4', 'w-4', 'border-2', 'border-gray-300', 'border-t-blue-600', 'rounded-full')
    })
  })

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      render(<RateLimitStatus />)

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch rate limit status')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to fetch rate limit status')).toHaveClass('text-red-600')
    })

    it('should log error to console when fetch fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const networkError = new Error('Network error')
      mockFetch.mockRejectedValue(networkError)

      render(<RateLimitStatus />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Rate limit status fetch error:', networkError)
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Successful Data Loading', () => {
    it('should parse and display general rate limit information', async () => {
      const headers = createRateLimitHeaders('100', '75', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        expect(screen.getByText('Rate Limit Status')).toBeInTheDocument()
        expect(screen.getByText('75/100')).toBeInTheDocument()
      })
    })

    it('should parse authentication rate limits when present', async () => {
      const headers = createRateLimitHeaders('100', '75', '3600', '5', '3', '60')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        expect(screen.getByText('3/5')).toBeInTheDocument()
        expect(screen.getByText('75/100')).toBeInTheDocument()
      })
    })

    it('should make HEAD request to correct endpoint', async () => {
      const headers = createRateLimitHeaders('100', '75', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/rate-limit-status', {
          method: 'HEAD',
          credentials: 'include'
        })
      })
    })
  })

  describe('Status Color Coding', () => {
    it('should show green color for healthy rate limits (>50%)', async () => {
      const headers = createRateLimitHeaders('100', '75', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        const statusElement = screen.getByText('75/100')
        expect(statusElement).toHaveClass('text-green-600')
      })
    })

    it('should show yellow color for medium rate limits (25-50%)', async () => {
      const headers = createRateLimitHeaders('100', '35', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        const statusElement = screen.getByText('35/100')
        expect(statusElement).toHaveClass('text-yellow-500')
      })
    })

    it('should show orange color for low rate limits (<25%)', async () => {
      const headers = createRateLimitHeaders('100', '15', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        const statusElement = screen.getByText('15/100')
        expect(statusElement).toHaveClass('text-orange-500')
      })
    })

    it('should show red color for exhausted rate limits (0%)', async () => {
      const headers = createRateLimitHeaders('100', '0', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        const statusElement = screen.getByText('0/100')
        expect(statusElement).toHaveClass('text-red-600')
      })
    })
  })

  describe('Time Until Reset Formatting', () => {
    it('should format minutes and seconds correctly', async () => {
      // Mock reset time to be 90 seconds from now (1m 30s)
      const resetTime = Date.now() + 90000
      const headers = createRateLimitHeaders('100', '0', resetTime.toString())
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        expect(screen.getByText('1m 30s')).toBeInTheDocument()
      })
    })

    it('should format seconds only when less than a minute', async () => {
      // Mock reset time to be 30 seconds from now
      const resetTime = Date.now() + 30000
      const headers = createRateLimitHeaders('100', '0', resetTime.toString())
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        expect(screen.getByText('30s')).toBeInTheDocument()
      })
    })

    it('should show "Reset now" when time has passed', async () => {
      // Mock reset time to be in the past
      const resetTime = Date.now() - 1000
      const headers = createRateLimitHeaders('100', '0', resetTime.toString())
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        expect(screen.getByText('Reset now')).toBeInTheDocument()
      })
    })
  })

  describe('Category-Specific Display', () => {
    it('should display only specified category when category prop is provided', async () => {
      const headers = createRateLimitHeaders('100', '75', '3600', '5', '3', '60')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus category="authentication" />)

      await waitFor(() => {
        expect(screen.getByText('Rate limit:')).toBeInTheDocument()
        expect(screen.getByText('3/5')).toBeInTheDocument()
        expect(screen.queryByText('75/100')).not.toBeInTheDocument()
      })
    })

    it('should return null when category not found', async () => {
      const headers = createRateLimitHeaders('100', '75', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      const { container } = render(<RateLimitStatus category="authentication" />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })

    it('should show reset time for exhausted category', async () => {
      const resetTime = Date.now() + 60000
      const headers = createRateLimitHeaders('', '', '', '5', '0', resetTime.toString())
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus category="authentication" />)

      await waitFor(() => {
        expect(screen.getByText('0/5')).toBeInTheDocument()
        expect(screen.getByText('(resets in 1m 0s)')).toBeInTheDocument()
      })
    })
  })

  describe('Show All Categories', () => {
    it('should display all available rate limit categories', async () => {
      const headers = createRateLimitHeaders('100', '75', '3600', '5', '3', '60')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        expect(screen.getByText('Rate Limit Status')).toBeInTheDocument()
        
        // Look for the text content in a more flexible way
        expect(screen.getByText((content, element) => {
          return element?.textContent === 'authentication:'
        })).toBeInTheDocument()
        
        expect(screen.getByText((content, element) => {
          return element?.textContent === 'general:'
        })).toBeInTheDocument()
        
        expect(screen.getByText('3/5')).toBeInTheDocument()
        expect(screen.getByText('75/100')).toBeInTheDocument()
      })
    })

    it('should format category names with proper spacing', async () => {
      const headers = createRateLimitHeaders('100', '75', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        // The component should convert camelCase to spaced words
        expect(screen.getByText((content, element) => {
          return element?.textContent === 'general:'
        })).toBeInTheDocument()
        
        expect(screen.getByText('75/100')).toBeInTheDocument()
      })
    })
  })

  describe('Callback Functionality', () => {
    it('should call onLimitExceeded when rate limit is exhausted', async () => {
      const onLimitExceeded = vi.fn()
      const headers = createRateLimitHeaders('100', '0', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus onLimitExceeded={onLimitExceeded} showAll={true} />)

      await waitFor(() => {
        expect(onLimitExceeded).toHaveBeenCalledWith('general', {
          limit: 100,
          remaining: 0,
          reset: 3600
        })
      })
    })

    it('should not call onLimitExceeded when rate limit is not exhausted', async () => {
      const onLimitExceeded = vi.fn()
      const headers = createRateLimitHeaders('100', '50', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus onLimitExceeded={onLimitExceeded} showAll={true} />)

      await waitFor(() => {
        expect(screen.getByText('50/100')).toBeInTheDocument()
      })

      expect(onLimitExceeded).not.toHaveBeenCalled()
    })
  })

  describe('Development Mode Utilities', () => {
    it('should expose rate limit utilities in development mode', async () => {
      vi.stubEnv('NODE_ENV', 'development')

      const headers = createRateLimitHeaders('100', '75', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus />)

      await waitFor(() => {
        expect((window as typeof window & { rateLimitUtils?: unknown }).rateLimitUtils).toBeDefined()
      })

      vi.unstubAllEnvs()
    })

    it('should not expose utilities in production mode', async () => {
      vi.stubEnv('NODE_ENV', 'production')

      const headers = createRateLimitHeaders('100', '75', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      // Clear any existing rateLimitUtils
      delete (window as typeof window & { rateLimitUtils?: unknown }).rateLimitUtils

      render(<RateLimitStatus />)

      await waitFor(() => {
        expect(screen.queryByText('Loading')).not.toBeInTheDocument()
      })

      expect((window as typeof window & { rateLimitUtils?: unknown }).rateLimitUtils).toBeUndefined()

      vi.unstubAllEnvs()
    })
  })

  describe('Component State Management', () => {
    it('should handle multiple state transitions correctly', async () => {
      // Start with loading
      let resolvePromise: (value: unknown) => void
      const promise = new Promise(resolve => { resolvePromise = resolve })
      mockFetch.mockReturnValue(promise)

      const { rerender } = render(<RateLimitStatus showAll={true} />)

      expect(screen.getByText('Loading rate limits...')).toBeInTheDocument()

      // Resolve with success
      act(() => {
        const headers = createRateLimitHeaders('100', '75', '3600')
        resolvePromise(createMockResponse(headers))
      })

      await waitFor(() => {
        expect(screen.getByText('Rate Limit Status')).toBeInTheDocument()
        expect(screen.queryByText('Loading rate limits...')).not.toBeInTheDocument()
      })
    })

    it('should clear error state on successful fetch', async () => {
      // Start with error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { rerender } = render(<RateLimitStatus />)

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch rate limit status')).toBeInTheDocument()
      })

      // Clear mock and provide successful response
      mockFetch.mockClear()
      const headers = createRateLimitHeaders('100', '75', '3600')
      mockFetch.mockResolvedValueOnce(createMockResponse(headers))

      // Force re-render to trigger new fetch
      rerender(<RateLimitStatus key="new" showAll={true} />)

      await waitFor(() => {
        expect(screen.queryByText('Failed to fetch rate limit status')).not.toBeInTheDocument()
        expect(screen.getByText('Rate Limit Status')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing rate limit headers gracefully', async () => {
      mockFetch.mockResolvedValue(createMockResponse({}))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading rate limits...')).not.toBeInTheDocument()
      })

      // Should show header but no rate limit data when no headers present
      expect(screen.getByText('Rate Limit Status')).toBeInTheDocument()
      expect(screen.queryByText('authentication')).not.toBeInTheDocument()
      expect(screen.queryByText('general')).not.toBeInTheDocument()
    })

    it('should handle invalid header values gracefully', async () => {
      const headers = createRateLimitHeaders('invalid', 'NaN', 'not-a-number')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        expect(screen.queryByText('Loading rate limits...')).not.toBeInTheDocument()
      })

      // Should not crash even with invalid data
      expect(() => screen.getByText('Rate Limit Status')).not.toThrow()
    })

    it('should handle zero limits correctly', async () => {
      const headers = createRateLimitHeaders('0', '0', '3600')
      mockFetch.mockResolvedValue(createMockResponse(headers))

      render(<RateLimitStatus showAll={true} />)

      await waitFor(() => {
        expect(screen.getByText('0/0')).toBeInTheDocument()
      })
    })
  })
})