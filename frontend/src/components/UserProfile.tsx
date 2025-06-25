// frontend/src/components/UserProfile.tsx
// User profile component for displaying user information and stats

'use client'

import { useState, useEffect, useCallback } from 'react'

// Types for user profile
interface UserProfile {
  id: string
  username: string
  displayName: string
  bio: string
  avatar: string | null
  website: string | null
  isVerified: boolean
  verificationTier: string
  followersCount?: number
  postsCount?: number
  actorId?: string
}

interface UserProfileResponse {
  success: boolean
  data?: UserProfile
  error?: string
}

interface UserProfileProps {
  username: string
  className?: string
  showFullProfile?: boolean
  onFollowClick?: (username: string) => void
  onPostsClick?: (username: string) => void
}

export default function UserProfile({ 
  username, 
  className = '',
  showFullProfile = true,
  onFollowClick,
  onPostsClick
}: UserProfileProps) {
  // State management
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  // Configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const MAX_RETRY_ATTEMPTS = 3

  // Get verification badge color based on tier
  const getVerificationColor = useCallback((tier: string) => {
    switch (tier) {
      case 'notable': return 'text-purple-500'
      case 'identity': return 'text-green-500'
      case 'phone': return 'text-yellow-500'
      case 'email': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }, [])

  // Get verification tier display name
  const getVerificationTierName = useCallback((tier: string) => {
    switch (tier) {
      case 'notable': return 'Notable Person'
      case 'identity': return 'Identity Verified'
      case 'phone': return 'Phone Verified'
      case 'email': return 'Email Verified'
      default: return 'Unverified'
    }
  }, [])

  // Format website URL for display
  const formatWebsiteUrl = useCallback((url: string | null) => {
    if (!url) return null
    try {
      const urlObj = new URL(url)
      return urlObj.hostname.replace('www.', '')
    } catch {
      return url
    }
  }, [])

  // Fetch user profile from API
  const fetchUserProfile = useCallback(async () => {
    try {
      setIsLoading(true)
      setError('')

      // Optional authentication for potentially enhanced profile data
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/users/${encodeURIComponent(username)}`,
        { headers }
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found')
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: UserProfileResponse = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch user profile')
      }

      setProfile(result.data)
      setRetryCount(0) // Reset retry count on success

    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user profile'
      setError(errorMessage)
      
      // Retry logic for non-404 errors
      if (retryCount < MAX_RETRY_ATTEMPTS && !errorMessage.includes('not found')) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          fetchUserProfile()
        }, 1000 * Math.pow(2, retryCount)) // Exponential backoff
      }
    } finally {
      setIsLoading(false)
    }
  }, [username, API_BASE_URL, retryCount])

  // Load profile when username changes
  useEffect(() => {
    if (username) {
      setRetryCount(0)
      fetchUserProfile()
    }
  }, [username, fetchUserProfile])

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="animate-pulse">
        {showFullProfile ? (
          <>
            {/* Header skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
              <div className="w-24 h-24 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
              </div>
            </div>
            {/* Stats skeleton */}
            <div className="flex space-x-6">
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
            </div>
          </>
        ) : (
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // Render error state
  if (error && retryCount >= MAX_RETRY_ATTEMPTS) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Failed to load profile</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={() => {
              setRetryCount(0)
              fetchUserProfile()
            }}
            className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (isLoading || !profile) {
    return renderLoadingSkeleton()
  }

  // Compact profile view
  if (!showFullProfile) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={`${profile.displayName}'s avatar`}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <span className="text-gray-600 dark:text-gray-300 font-medium text-lg">
                  {profile.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {profile.displayName}
              </h3>
              {profile.isVerified && (
                <svg 
                  className={`w-4 h-4 ${getVerificationColor(profile.verificationTier)}`} 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  aria-label={getVerificationTierName(profile.verificationTier)}
                >
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">@{profile.username}</p>
          </div>
        </div>
      </div>
    )
  }

  // Full profile view
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={`${profile.displayName}'s avatar`}
              className="w-24 h-24 rounded-full object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <span className="text-gray-600 dark:text-gray-300 font-bold text-2xl">
                {profile.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* User Details */}
        <div className="flex-1 min-w-0">
          {/* Name and verification */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
            <div className="flex items-center space-x-2 mb-2 sm:mb-0">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.displayName}
              </h1>
              {profile.isVerified && (
                <div className="flex items-center space-x-1">
                  <svg 
                    className={`w-6 h-6 ${getVerificationColor(profile.verificationTier)}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                    aria-label={getVerificationTierName(profile.verificationTier)}
                  >
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                    {getVerificationTierName(profile.verificationTier)}
                  </span>
                </div>
              )}
            </div>

            {/* Follow Button */}
            {onFollowClick && (
              <button
                onClick={() => onFollowClick(profile.username)}
                className="
                  px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent 
                  rounded-md shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500
                  self-start sm:self-auto
                "
              >
                Follow
              </button>
            )}
          </div>

          {/* Username */}
          <p className="text-gray-500 dark:text-gray-400 mb-3">@{profile.username}</p>

          {/* Bio */}
          {profile.bio && (
            <p className="text-gray-900 dark:text-gray-100 mb-3 whitespace-pre-wrap">
              {profile.bio}
            </p>
          )}

          {/* Website */}
          {profile.website && (
            <div className="mb-3">
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m0-2.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.102 1.102m-2.828 2.828l2.828-2.828" />
                </svg>
                <span>{formatWebsiteUrl(profile.website)}</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex space-x-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        {/* Posts Count */}
        <button
          onClick={() => onPostsClick?.(profile.username)}
          className={`flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2 ${onPostsClick ? 'hover:bg-gray-50 dark:hover:bg-gray-750 rounded p-2 -m-2' : ''}`}
          disabled={!onPostsClick}
        >
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {profile.postsCount?.toLocaleString() || 0}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Post{profile.postsCount !== 1 ? 's' : ''}
          </span>
        </button>

        {/* Followers Count */}
        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {profile.followersCount?.toLocaleString() || 0}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Follower{profile.followersCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ActivityPub Info (for debugging) */}
      {process.env.NODE_ENV === 'development' && profile.actorId && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <details className="text-xs text-gray-500 dark:text-gray-400">
            <summary className="cursor-pointer">ActivityPub Info</summary>
            <p className="mt-1 font-mono break-all">{profile.actorId}</p>
          </details>
        </div>
      )}
    </div>
  )
}