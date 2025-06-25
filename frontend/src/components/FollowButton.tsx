// frontend/src/components/FollowButton.tsx
// Modern social media style follow/unfollow button component

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
  const [isHovered, setIsHovered] = useState(false)

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
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95'
    
    // Size variants
    const sizeStyles = {
      sm: 'px-4 py-1.5 text-xs min-w-[80px]',
      md: 'px-6 py-2 text-sm min-w-[100px]',
      lg: 'px-8 py-3 text-base min-w-[120px]'
    }

    // Color variants based on follow state and hover
    let colorStyles = ''
    
    if (disabled || isLoading) {
      colorStyles = 'opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border border-gray-300'
    } else if (isFollowing) {
      if (isHovered) {
        // Unfollow state (red on hover)
        colorStyles = 'bg-red-500 hover:bg-red-600 text-white border border-red-500 focus:ring-red-500'
      } else {
        // Following state (gray)
        colorStyles = 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
      }
    } else {
      // Not following state (blue)
      switch (variant) {
        case 'primary':
          colorStyles = 'bg-blue-500 hover:bg-blue-600 text-white border border-blue-500 focus:ring-blue-500'
          break
        case 'secondary':
          colorStyles = 'bg-gray-800 hover:bg-gray-900 text-white border border-gray-800 focus:ring-gray-500'
          break
        case 'outline':
          colorStyles = 'bg-transparent hover:bg-blue-50 text-blue-600 border border-blue-500 focus:ring-blue-500'
          break
        default:
          colorStyles = 'bg-blue-500 hover:bg-blue-600 text-white border border-blue-500 focus:ring-blue-500'
      }
    }

    return `${baseStyles} ${sizeStyles[size]} ${colorStyles} ${className}`
  }, [isFollowing, variant, size, disabled, isLoading, className, isHovered])

  // Get button text based on state
  const getButtonText = useCallback(() => {
    if (isLoading) {
      return isFollowing ? 'Unfollowing...' : 'Following...'
    }
    
    if (isFollowing) {
      return isHovered ? 'Unfollow' : 'Following'
    }
    
    return 'Follow'
  }, [isFollowing, isLoading, isHovered])

  // Format follower count
  const formatFollowerCount = useCallback((count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }, [])

  // Handle follow/unfollow action
  const handleFollowToggle = useCallback(async () => {
    if (disabled || isLoading) return

    // Get auth token
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setError('You must be logged in to follow users')
      setTimeout(() => setError(''), 3000)
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

  // Loading spinner
  const LoadingSpinner = () => (
    <svg 
      className={`animate-spin ${size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} mr-2`} 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )

  // Follow icon
  const FollowIcon = () => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
    
    if (isFollowing) {
      if (isHovered) {
        // Unfollow icon (minus)
        return (
          <svg className={`${iconSize} mr-2`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )
      } else {
        // Following icon (check)
        return (
          <svg className={`${iconSize} mr-2`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )
      }
    } else {
      // Follow icon (plus)
      return (
        <svg className={`${iconSize} mr-2`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={disabled || isLoading}
        className={getButtonStyles()}
        aria-label={`${isFollowing ? 'Unfollow' : 'Follow'} @${username}`}
      >
        {/* Button Content */}
        <span className="flex items-center">
          {isLoading ? <LoadingSpinner /> : <FollowIcon />}
          <span>{getButtonText()}</span>
          {showFollowerCount && (
            <span className="ml-2 text-xs opacity-75">
              ({formatFollowerCount(currentFollowerCount)})
            </span>
          )}
        </span>
      </button>

      {/* Error Message */}
      {error && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-red-500 text-white text-xs rounded-md shadow-lg z-50 whitespace-nowrap">
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
    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
      {/* User Info */}
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt={`${displayName}'s avatar`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white font-medium text-sm">
                {displayName?.charAt(0).toUpperCase() || followButtonProps.username.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* User Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {displayName || followButtonProps.username}
            </p>
            {isVerified && (
              <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">@{followButtonProps.username}</p>
        </div>
      </div>

      {/* Follow Button */}
      <div className="flex-shrink-0 ml-3">
        <FollowButton {...followButtonProps} size="sm" />
      </div>
    </div>
  )
}