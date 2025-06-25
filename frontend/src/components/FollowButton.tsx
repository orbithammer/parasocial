// frontend/src/components/FollowButton.tsx
// Interactive follow/unfollow button component with state management

'use client'

import { useState, useCallback, useEffect } from 'react'

// Types for follow functionality
interface FollowResponse {
  success: boolean
  data?: {
    id: string
    followerId: string
    followedId: string
    actorId?: string | null
    createdAt: string
  }
  error?: string
  message?: string
}

interface FollowButtonProps {
  username: string
  initialFollowState?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
  disabled?: boolean
  showFollowerCount?: boolean
  followerCount?: number
  onFollowChange?: (isFollowing: boolean, followerCount?: number) => void
}

export default function FollowButton({
  username,
  initialFollowState = false,
  size = 'md',
  variant = 'primary',
  className = '',
  disabled = false,
  showFollowerCount = false,
  followerCount = 0,
  onFollowChange
}: FollowButtonProps) {
  // State management
  const [isFollowing, setIsFollowing] = useState(initialFollowState)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentFollowerCount, setCurrentFollowerCount] = useState(followerCount)

  // Configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Update state when props change
  useEffect(() => {
    setIsFollowing(initialFollowState)
  }, [initialFollowState])

  useEffect(() => {
    setCurrentFollowerCount(followerCount)
  }, [followerCount])

  // Get button styling based on props
  const getButtonStyles = useCallback(() => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
    
    // Size variants
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    }

    // Color variants based on follow state
    let colorStyles = ''
    if (isFollowing) {
      // Following state (unfollow on hover)
      switch (variant) {
        case 'primary':
          colorStyles = 'bg-green-600 text-white border border-green-600 hover:bg-red-600 hover:border-red-600 focus:ring-green-500'
          break
        case 'secondary':
          colorStyles = 'bg-gray-600 text-white border border-gray-600 hover:bg-red-600 hover:border-red-600 focus:ring-gray-500'
          break
        case 'outline':
          colorStyles = 'bg-transparent text-green-600 border border-green-600 hover:bg-red-50 hover:text-red-600 hover:border-red-600 focus:ring-green-500'
          break
      }
    } else {
      // Not following state
      switch (variant) {
        case 'primary':
          colorStyles = 'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 hover:border-blue-700 focus:ring-blue-500'
          break
        case 'secondary':
          colorStyles = 'bg-gray-600 text-white border border-gray-600 hover:bg-gray-700 hover:border-gray-700 focus:ring-gray-500'
          break
        case 'outline':
          colorStyles = 'bg-transparent text-blue-600 border border-blue-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-700 focus:ring-blue-500'
          break
      }
    }

    const disabledStyles = disabled || isLoading 
      ? 'opacity-50 cursor-not-allowed' 
      : 'cursor-pointer'

    return `${baseStyles} ${sizeStyles[size]} ${colorStyles} ${disabledStyles} ${className}`
  }, [isFollowing, variant, size, disabled, isLoading, className])

  // Get button text based on state
  const getButtonText = useCallback(() => {
    if (isLoading) {
      return isFollowing ? 'Unfollowing...' : 'Following...'
    }
    return isFollowing ? 'Following' : 'Follow'
  }, [isFollowing, isLoading])

  // Handle follow/unfollow action
  const handleFollowToggle = useCallback(async () => {
    if (disabled || isLoading) return

    // Get auth token
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setError('You must be logged in to follow users')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const method = isFollowing ? 'DELETE' : 'POST'
      const url = `${API_BASE_URL}/api/v1/users/${encodeURIComponent(username)}/follow`
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        // For POST requests, send empty body (actorId is optional and handled by backend)
        body: method === 'POST' ? JSON.stringify({}) : undefined
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result: FollowResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to update follow status')
      }

      // Update local state
      const newFollowState = !isFollowing
      setIsFollowing(newFollowState)

      // Update follower count
      let newFollowerCount = currentFollowerCount
      if (showFollowerCount) {
        newFollowerCount = newFollowState 
          ? currentFollowerCount + 1 
          : Math.max(0, currentFollowerCount - 1)
        setCurrentFollowerCount(newFollowerCount)
      }

      // Notify parent component
      if (onFollowChange) {
        onFollowChange(newFollowState, newFollowerCount)
      }

    } catch (error) {
      console.error('Follow/unfollow error:', error)
      setError(error instanceof Error ? error.message : 'Failed to update follow status')
      
      // Show error briefly then clear it
      setTimeout(() => setError(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }, [
    username,
    isFollowing,
    disabled,
    isLoading,
    API_BASE_URL,
    showFollowerCount,
    currentFollowerCount,
    onFollowChange
  ])

  // Loading spinner component
  const LoadingSpinner = () => (
    <svg 
      className={`animate-spin ${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )

  // Follow icon component
  const FollowIcon = () => {
    if (isFollowing) {
      return (
        <svg 
          className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )
    } else {
      return (
        <svg 
          className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    }
  }

  return (
    <div className="relative">
      {/* Main Follow Button */}
      <button
        onClick={handleFollowToggle}
        disabled={disabled || isLoading}
        className={getButtonStyles()}
        aria-label={`${isFollowing ? 'Unfollow' : 'Follow'} @${username}`}
      >
        {/* Icon and Text */}
        <span className="flex items-center space-x-2">
          {isLoading ? <LoadingSpinner /> : <FollowIcon />}
          <span>{getButtonText()}</span>
          {showFollowerCount && (
            <span className="ml-1 font-normal opacity-75">
              ({currentFollowerCount.toLocaleString()})
            </span>
          )}
        </span>
      </button>

      {/* Error Message */}
      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-100 border border-red-400 text-red-700 text-xs rounded-md shadow-lg z-10 whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  )
}

// Compound component for follow button with user info
interface FollowButtonWithUserProps extends FollowButtonProps {
  displayName?: string
  avatar?: string | null
  isVerified?: boolean
  showUserInfo?: boolean
}

export function FollowButtonWithUser({
  displayName,
  avatar,
  isVerified = false,
  showUserInfo = true,
  ...followButtonProps
}: FollowButtonWithUserProps) {
  if (!showUserInfo) {
    return <FollowButton {...followButtonProps} />
  }

  return (
    <div className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* User Avatar */}
      <div className="flex-shrink-0">
        {avatar ? (
          <img
            src={avatar}
            alt={`${displayName}'s avatar`}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">
              {displayName?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {displayName || followButtonProps.username}
          </p>
          {isVerified && (
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">@{followButtonProps.username}</p>
      </div>

      {/* Follow Button */}
      <FollowButton {...followButtonProps} />
    </div>
  )
}