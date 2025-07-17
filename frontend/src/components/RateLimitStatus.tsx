// frontend/src/components/RateLimitStatus.tsx
// Version: 1.0.0
// Initial implementation of rate limit status display component

'use client'

import { useState, useEffect } from 'react'

// Type definitions for rate limit information
interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  retryAfter?: string
}

// Rate limit categories based on backend implementation
interface RateLimits {
  authentication: RateLimitInfo
  postCreation: RateLimitInfo
  followOperations: RateLimitInfo
  mediaUpload: RateLimitInfo
  general: RateLimitInfo
  passwordReset: RateLimitInfo
}

// Props for the RateLimitStatus component
interface RateLimitStatusProps {
  category?: keyof RateLimits
  showAll?: boolean
  onLimitExceeded?: (category: keyof RateLimits, info: RateLimitInfo) => void
}

// Error type for rate limit exceeded responses
interface RateLimitError {
  code: 'RATE_LIMIT_EXCEEDED'
  message: string
  retryAfter: string
  rateLimitKey?: string
}

export default function RateLimitStatus({ 
  category, 
  showAll = false, 
  onLimitExceeded 
}: RateLimitStatusProps) {
  const [rateLimits, setRateLimits] = useState<Partial<RateLimits>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch current rate limit status from headers or API
  const fetchRateLimitStatus = async () => {
    try {
      setLoading(true)
      setError(null)

      // Make a lightweight request to get rate limit headers
      const response = await fetch('/api/rate-limit-status', {
        method: 'HEAD',
        credentials: 'include'
      })

      // Extract rate limit information from response headers
      const rateLimitData: Partial<RateLimits> = {}

      // Parse authentication rate limits
      const authLimit = response.headers.get('ratelimit-limit-auth')
      const authRemaining = response.headers.get('ratelimit-remaining-auth')
      const authReset = response.headers.get('ratelimit-reset-auth')

      if (authLimit && authRemaining && authReset) {
        rateLimitData.authentication = {
          limit: parseInt(authLimit),
          remaining: parseInt(authRemaining),
          reset: parseInt(authReset)
        }
      }

      // Parse general API rate limits
      const generalLimit = response.headers.get('ratelimit-limit')
      const generalRemaining = response.headers.get('ratelimit-remaining')
      const generalReset = response.headers.get('ratelimit-reset')

      if (generalLimit && generalRemaining && generalReset) {
        rateLimitData.general = {
          limit: parseInt(generalLimit),
          remaining: parseInt(generalRemaining),
          reset: parseInt(generalReset)
        }
      }

      setRateLimits(rateLimitData)

      // Check for rate limit violations and notify parent
      Object.entries(rateLimitData).forEach(([cat, info]) => {
        if (info.remaining === 0 && onLimitExceeded) {
          onLimitExceeded(cat as keyof RateLimits, info)
        }
      })

    } catch (err) {
      setError('Failed to fetch rate limit status')
      console.error('Rate limit status fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Update rate limits when API responses include rate limit headers
  const updateFromResponse = (response: Response) => {
    const limit = response.headers.get('ratelimit-limit')
    const remaining = response.headers.get('ratelimit-remaining')
    const reset = response.headers.get('ratelimit-reset')

    if (limit && remaining && reset) {
      setRateLimits(prev => ({
        ...prev,
        general: {
          limit: parseInt(limit),
          remaining: parseInt(remaining),
          reset: parseInt(reset)
        }
      }))
    }
  }

  // Handle rate limit exceeded errors
  const handleRateLimitError = (errorData: RateLimitError, category: keyof RateLimits) => {
    // Update the specific rate limit to show it's exceeded
    setRateLimits(prev => ({
      ...prev,
      [category]: {
        limit: 0,
        remaining: 0,
        reset: Date.now() + (parseInt(errorData.retryAfter.replace(' seconds', '')) * 1000),
        retryAfter: errorData.retryAfter
      }
    }))

    if (onLimitExceeded) {
      onLimitExceeded(category, {
        limit: 0,
        remaining: 0,
        reset: Date.now() + (parseInt(errorData.retryAfter.replace(' seconds', '')) * 1000),
        retryAfter: errorData.retryAfter
      })
    }
  }

  // Format time remaining until reset
  const formatTimeUntilReset = (resetTime: number): string => {
    const now = Date.now()
    const timeUntilReset = Math.max(0, resetTime - now)
    
    if (timeUntilReset === 0) return 'Reset now'
    
    const minutes = Math.floor(timeUntilReset / 60000)
    const seconds = Math.floor((timeUntilReset % 60000) / 1000)
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  }

  // Get status color based on remaining requests
  const getStatusColor = (remaining: number, limit: number): string => {
    const percentage = (remaining / limit) * 100
    
    if (percentage === 0) return 'text-red-600'
    if (percentage < 25) return 'text-orange-500'
    if (percentage < 50) return 'text-yellow-500'
    return 'text-green-600'
  }

  // Fetch initial rate limit status
  useEffect(() => {
    fetchRateLimitStatus()
  }, [])

  // Expose methods for parent components to use
  useEffect(() => {
    // Add methods to window for global access (development only)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as typeof window & { rateLimitUtils?: unknown }).rateLimitUtils = {
        updateFromResponse,
        handleRateLimitError,
        refresh: fetchRateLimitStatus
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
        <span>Loading rate limits...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
        {error}
      </div>
    )
  }

  // Render single category if specified
  if (category && rateLimits[category]) {
    const info = rateLimits[category]!
    return (
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-gray-600">Rate limit:</span>
        <span className={getStatusColor(info.remaining, info.limit)}>
          {info.remaining}/{info.limit}
        </span>
        {info.remaining === 0 && (
          <span className="text-gray-500">
            (resets in {formatTimeUntilReset(info.reset)})
          </span>
        )}
      </div>
    )
  }

  // Render all categories if showAll is true
  if (showAll) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-900">Rate Limit Status</h3>
        {Object.entries(rateLimits).map(([cat, info]) => (
          <div key={cat} className="flex justify-between items-center text-sm">
            <span className="text-gray-600 capitalize">
              {cat.replace(/([A-Z])/g, ' $1').trim()}:
            </span>
            <div className="flex items-center space-x-2">
              <span className={getStatusColor(info.remaining, info.limit)}>
                {info.remaining}/{info.limit}
              </span>
              {info.remaining === 0 && (
                <span className="text-gray-500 text-xs">
                  {formatTimeUntilReset(info.reset)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Default: don't render anything if no specific category and showAll is false
  return null
}