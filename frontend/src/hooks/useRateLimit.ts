// frontend/src/hooks/useRateLimit.ts
// Version: 1.0.0
// Custom hook for managing rate limits across the application

import { useState, useEffect, useCallback, useRef } from 'react'

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

// Error type for rate limit exceeded responses
interface RateLimitError {
  code: 'RATE_LIMIT_EXCEEDED'
  message: string
  retryAfter: string
  rateLimitKey?: string
}

// Hook options configuration
interface UseRateLimitOptions {
  autoRefresh?: boolean
  refreshInterval?: number
  onLimitExceeded?: (category: keyof RateLimits, info: RateLimitInfo) => void
  onError?: (error: Error) => void
}

// Return type for the hook
interface UseRateLimitReturn {
  rateLimits: Partial<RateLimits>
  loading: boolean
  error: string | null
  updateFromResponse: (response: Response, category?: keyof RateLimits) => void
  updateFromError: (errorData: RateLimitError, category: keyof RateLimits) => void
  checkLimit: (category: keyof RateLimits, requestCount?: number) => boolean
  getTimeUntilReset: (category: keyof RateLimits) => number
  refresh: () => Promise<void>
  clearError: () => void
  isLimitExceeded: (category: keyof RateLimits) => boolean
  getLimitPercentage: (category: keyof RateLimits) => number
}

export default function useRateLimit(options: UseRateLimitOptions = {}): UseRateLimitReturn {
  const {
    autoRefresh = false,
    refreshInterval = 60000, // 1 minute default
    onLimitExceeded,
    onError
  } = options

  // State management
  const [rateLimits, setRateLimits] = useState<Partial<RateLimits>>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Refs for cleanup and avoiding stale closures
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef<boolean>(true)

  // Clear error state
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Parse rate limit headers from API response
  const parseRateLimitHeaders = useCallback((response: Response): Partial<RateLimits> => {
    const rateLimitData: Partial<RateLimits> = {}

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

    // Parse post creation rate limits
    const postLimit = response.headers.get('ratelimit-limit-post')
    const postRemaining = response.headers.get('ratelimit-remaining-post')
    const postReset = response.headers.get('ratelimit-reset-post')

    if (postLimit && postRemaining && postReset) {
      rateLimitData.postCreation = {
        limit: parseInt(postLimit),
        remaining: parseInt(postRemaining),
        reset: parseInt(postReset)
      }
    }

    // Parse follow operations rate limits
    const followLimit = response.headers.get('ratelimit-limit-follow')
    const followRemaining = response.headers.get('ratelimit-remaining-follow')
    const followReset = response.headers.get('ratelimit-reset-follow')

    if (followLimit && followRemaining && followReset) {
      rateLimitData.followOperations = {
        limit: parseInt(followLimit),
        remaining: parseInt(followRemaining),
        reset: parseInt(followReset)
      }
    }

    // Parse media upload rate limits
    const mediaLimit = response.headers.get('ratelimit-limit-media')
    const mediaRemaining = response.headers.get('ratelimit-remaining-media')
    const mediaReset = response.headers.get('ratelimit-reset-media')

    if (mediaLimit && mediaRemaining && mediaReset) {
      rateLimitData.mediaUpload = {
        limit: parseInt(mediaLimit),
        remaining: parseInt(mediaRemaining),
        reset: parseInt(mediaReset)
      }
    }

    // Parse password reset rate limits
    const passwordLimit = response.headers.get('ratelimit-limit-password')
    const passwordRemaining = response.headers.get('ratelimit-remaining-password')
    const passwordReset = response.headers.get('ratelimit-reset-password')

    if (passwordLimit && passwordRemaining && passwordReset) {
      rateLimitData.passwordReset = {
        limit: parseInt(passwordLimit),
        remaining: parseInt(passwordRemaining),
        reset: parseInt(passwordReset)
      }
    }

    return rateLimitData
  }, [])

  // Update rate limits from API response headers
  const updateFromResponse = useCallback((response: Response, category?: keyof RateLimits) => {
    const newRateLimits = parseRateLimitHeaders(response)
    
    setRateLimits(prev => {
      const updated = { ...prev, ...newRateLimits }
      
      // Check for exceeded limits and trigger callbacks
      Object.entries(updated).forEach(([cat, info]) => {
        if (info && info.remaining === 0 && onLimitExceeded) {
          onLimitExceeded(cat as keyof RateLimits, info)
        }
      })
      
      return updated
    })
  }, [parseRateLimitHeaders, onLimitExceeded])

  // Update rate limits from error response
  const updateFromError = useCallback((errorData: RateLimitError, category: keyof RateLimits) => {
    const retryAfterSeconds = parseInt(errorData.retryAfter.replace(' seconds', ''))
    const resetTime = Date.now() + (retryAfterSeconds * 1000)
    
    setRateLimits(prev => ({
      ...prev,
      [category]: {
        limit: 0,
        remaining: 0,
        reset: resetTime,
        retryAfter: errorData.retryAfter
      }
    }))

    if (onLimitExceeded) {
      onLimitExceeded(category, {
        limit: 0,
        remaining: 0,
        reset: resetTime,
        retryAfter: errorData.retryAfter
      })
    }
  }, [onLimitExceeded])

  // Check if an action is allowed based on current rate limits
  const checkLimit = useCallback((category: keyof RateLimits, requestCount: number = 1): boolean => {
    const limit = rateLimits[category]
    
    if (!limit) {
      // If no rate limit info available, allow the action
      return true
    }

    // Check if enough requests remaining
    if (limit.remaining < requestCount) {
      // Check if reset time has passed
      const now = Date.now()
      if (now >= limit.reset) {
        // Reset time has passed, should be safe to proceed
        return true
      }
      return false
    }

    return true
  }, [rateLimits])

  // Get time remaining until rate limit resets (in milliseconds)
  const getTimeUntilReset = useCallback((category: keyof RateLimits): number => {
    const limit = rateLimits[category]
    
    if (!limit) {
      return 0
    }

    const now = Date.now()
    return Math.max(0, limit.reset - now)
  }, [rateLimits])

  // Check if a specific rate limit is currently exceeded
  const isLimitExceeded = useCallback((category: keyof RateLimits): boolean => {
    const limit = rateLimits[category]
    
    if (!limit) {
      return false
    }

    // If remaining is 0 and reset time hasn't passed
    if (limit.remaining === 0) {
      const now = Date.now()
      return now < limit.reset
    }

    return false
  }, [rateLimits])

  // Get percentage of rate limit remaining (0-100)
  const getLimitPercentage = useCallback((category: keyof RateLimits): number => {
    const limit = rateLimits[category]
    
    if (!limit || limit.limit === 0) {
      return 100
    }

    return Math.round((limit.remaining / limit.limit) * 100)
  }, [rateLimits])

  // Fetch current rate limit status
  const refresh = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/rate-limit-status', {
        method: 'HEAD',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Rate limit status request failed: ${response.status}`)
      }

      updateFromResponse(response)

    } catch (err) {
      if (!mountedRef.current) return

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rate limit status'
      setError(errorMessage)
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage))
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [updateFromResponse, onError])

  // Set up auto-refresh if enabled
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      // Initial fetch
      refresh()

      // Set up interval
      refreshIntervalRef.current = setInterval(() => {
        if (mountedRef.current) {
          refresh()
        }
      }, refreshInterval)

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
          refreshIntervalRef.current = null
        }
      }
    }
  }, [autoRefresh, refreshInterval, refresh])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  return {
    rateLimits,
    loading,
    error,
    updateFromResponse,
    updateFromError,
    checkLimit,
    getTimeUntilReset,
    refresh,
    clearError,
    isLimitExceeded,
    getLimitPercentage
  }
}