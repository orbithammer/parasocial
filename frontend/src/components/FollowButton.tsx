'use client'

import { useState, useEffect } from 'react'
import { 
  UserPlus, 
  UserMinus, 
  UserX, 
  Shield, 
  Check, 
  Loader2,
  AlertCircle
} from 'lucide-react'

/**
 * Follow relationship state
 */
type FollowState = 'not-following' | 'following' | 'blocked' | 'self' | 'unknown'

/**
 * Button variants for different contexts
 */
type ButtonVariant = 'default' | 'outline' | 'ghost' | 'compact' | 'icon-only'

/**
 * Button sizes
 */
type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * Props for FollowButton component
 */
interface FollowButtonProps {
  /** Username of the user to follow/unfollow */
  username: string
  /** Current user's ID (to prevent self-following) */
  currentUserId?: string
  /** Target user's ID (to check if it's self) */
  targetUserId?: string
  /** Initial follow state */
  initialState?: FollowState
  /** Button variant style */
  variant?: ButtonVariant
  /** Button size */
  size?: ButtonSize
  /** API base URL */
  apiUrl?: string
  /** Custom follow handler */
  onFollow?: (username: string) => Promise<void>
  /** Custom unfollow handler */
  onUnfollow?: (username: string) => Promise<void>
  /** Custom block handler */
  onBlock?: (username: string) => Promise<void>
  /** Custom unblock handler */
  onUnblock?: (username: string) => Promise<void>
  /** Callback when state changes */
  onStateChange?: (newState: FollowState) => void
  /** Show follower count */
  showCount?: boolean
  /** Initial follower count */
  followerCount?: number
  /** Disabled state */
  disabled?: boolean
  /** Custom CSS classes */
  className?: string
  /** Show text labels */
  showLabel?: boolean
}

/**
 * Get authentication token from localStorage
 */
const getAuthToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token')
  }
  return null
}

/**
 * Versatile FollowButton component
 * Can be used in profiles, user cards, lists, etc.
 */
export default function FollowButton({
  username,
  currentUserId,
  targetUserId,
  initialState = 'unknown',
  variant = 'default',
  size = 'md',
  apiUrl = '/api',
  onFollow,
  onUnfollow,
  onBlock,
  onUnblock,
  onStateChange,
  showCount = false,
  followerCount = 0,
  disabled = false,
  className = '',
  showLabel = true
}: FollowButtonProps) {
  const [followState, setFollowState] = useState<FollowState>(initialState)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentFollowerCount, setCurrentFollowerCount] = useState(followerCount)
  const [showSuccess, setShowSuccess] = useState(false)

  // Check if this is user's own profile
  const isSelfProfile = currentUserId === targetUserId || 
    (currentUserId && !targetUserId && followState === 'self')

  /**
   * Fetch current follow state from API
   */
  const fetchFollowState = async () => {
    if (!currentUserId || isSelfProfile) {
      setFollowState('self')
      return
    }

    try {
      const token = getAuthToken()
      if (!token) {
        setFollowState('not-following')
        return
      }

      // This would typically be an endpoint that returns follow status
      // For now, we'll use the initialState or make assumptions
      setFollowState(initialState !== 'unknown' ? initialState : 'not-following')
    } catch (err) {
      console.error('Failed to fetch follow state:', err)
      setFollowState('not-following')
    }
  }

  /**
   * Handle follow action
   */
  const handleFollow = async () => {
    if (isLoading || !currentUserId || isSelfProfile) return

    setIsLoading(true)
    setError(null)

    try {
      if (onFollow) {
        await onFollow(username)
      } else {
        const token = getAuthToken()
        const response = await fetch(`${apiUrl}/users/${username}/follow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || 'Failed to follow user')
        }
      }

      setFollowState('following')
      setCurrentFollowerCount(prev => prev + 1)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
      
      if (onStateChange) {
        onStateChange('following')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to follow user'
      setError(errorMessage)
      console.error('Follow error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle unfollow action
   */
  const handleUnfollow = async () => {
    if (isLoading || !currentUserId || isSelfProfile) return

    setIsLoading(true)
    setError(null)

    try {
      if (onUnfollow) {
        await onUnfollow(username)
      } else {
        const token = getAuthToken()
        const response = await fetch(`${apiUrl}/users/${username}/follow`, {
          method: 'DELETE',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || 'Failed to unfollow user')
        }
      }

      setFollowState('not-following')
      setCurrentFollowerCount(prev => Math.max(0, prev - 1))
      
      if (onStateChange) {
        onStateChange('not-following')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unfollow user'
      setError(errorMessage)
      console.error('Unfollow error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle block action
   */
  const handleBlock = async () => {
    if (isLoading || !currentUserId || isSelfProfile) return

    setIsLoading(true)
    setError(null)

    try {
      if (onBlock) {
        await onBlock(username)
      } else {
        const token = getAuthToken()
        const response = await fetch(`${apiUrl}/users/${username}/block`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || 'Failed to block user')
        }
      }

      setFollowState('blocked')
      
      if (onStateChange) {
        onStateChange('blocked')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to block user'
      setError(errorMessage)
      console.error('Block error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle unblock action
   */
  const handleUnblock = async () => {
    if (isLoading || !currentUserId || isSelfProfile) return

    setIsLoading(true)
    setError(null)

    try {
      if (onUnblock) {
        await onUnblock(username)
      } else {
        const token = getAuthToken()
        const response = await fetch(`${apiUrl}/users/${username}/block`, {
          method: 'DELETE',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => null)
          throw new Error(errorData?.error || 'Failed to unblock user')
        }
      }

      setFollowState('not-following')
      
      if (onStateChange) {
        onStateChange('not-following')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unblock user'
      setError(errorMessage)
      console.error('Unblock error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Get button configuration based on state and variant
   */
  const getButtonConfig = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
    
    // Size classes
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2'
    }

    // Rounded classes based on variant
    const roundedClasses = {
      'default': 'rounded-lg',
      'outline': 'rounded-lg',
      'ghost': 'rounded-lg',
      'compact': 'rounded-md',
      'icon-only': 'rounded-full'
    }

    const sizeClass = sizeClasses[size]
    const roundedClass = roundedClasses[variant]

    if (isSelfProfile || followState === 'self') {
      return {
        classes: `${baseClasses} ${sizeClass} ${roundedClass} bg-gray-100 text-gray-400 cursor-not-allowed`,
        icon: UserX,
        label: 'You',
        action: () => {}
      }
    }

    switch (followState) {
      case 'following':
        if (variant === 'icon-only') {
          return {
            classes: `${baseClasses} ${sizeClass} ${roundedClass} bg-blue-100 text-blue-600 hover:bg-red-50 hover:text-red-600 focus:ring-red-500`,
            icon: showSuccess ? Check : UserMinus,
            label: showSuccess ? 'Following' : 'Unfollow',
            action: handleUnfollow
          }
        }
        return {
          classes: `${baseClasses} ${sizeClass} ${roundedClass} ${
            variant === 'outline' 
              ? 'border-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
              : 'bg-blue-100 text-blue-700 hover:bg-red-50 hover:text-red-600'
          } focus:ring-blue-500`,
          icon: showSuccess ? Check : UserMinus,
          label: showSuccess ? 'Following!' : 'Following',
          action: handleUnfollow
        }

      case 'blocked':
        return {
          classes: `${baseClasses} ${sizeClass} ${roundedClass} ${
            variant === 'outline' 
              ? 'border-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100' 
              : 'bg-red-100 text-red-700 hover:bg-red-200'
          } focus:ring-red-500`,
          icon: Shield,
          label: 'Blocked',
          action: handleUnblock
        }

      case 'not-following':
      default:
        if (variant === 'ghost') {
          return {
            classes: `${baseClasses} ${sizeClass} ${roundedClass} text-blue-600 hover:bg-blue-50 focus:ring-blue-500`,
            icon: UserPlus,
            label: 'Follow',
            action: handleFollow
          }
        }
        return {
          classes: `${baseClasses} ${sizeClass} ${roundedClass} ${
            variant === 'outline' 
              ? 'border-2 border-blue-500 text-blue-600 hover:bg-blue-500 hover:text-white' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
          } focus:ring-blue-500`,
          icon: UserPlus,
          label: 'Follow',
          action: handleFollow
        }
    }
  }

  // Initialize follow state
  useEffect(() => {
    if (initialState === 'unknown') {
      fetchFollowState()
    } else {
      setFollowState(initialState)
    }
  }, [username, currentUserId, initialState])

  // Clear error after a delay
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const buttonConfig = getButtonConfig()
  const IconComponent = buttonConfig.icon

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={buttonConfig.action}
        disabled={Boolean(disabled || isLoading || isSelfProfile)}
        className={`${buttonConfig.classes} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={error || buttonConfig.label}
      >
        {isLoading ? (
          <Loader2 className={`${variant === 'icon-only' ? 'w-5 h-5' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} />
        ) : (
          <IconComponent className={`${variant === 'icon-only' ? 'w-5 h-5' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}`} />
        )}
        
        {showLabel && variant !== 'icon-only' && (
          <span className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}>
            {buttonConfig.label}
          </span>
        )}

        {showCount && followState !== 'self' && (
          <span className="ml-1 text-xs font-semibold">
            {currentFollowerCount > 0 ? currentFollowerCount.toLocaleString() : ''}
          </span>
        )}
      </button>

      {/* Error Tooltip */}
      {error && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-red-600 text-white text-xs rounded-lg whitespace-nowrap z-10">
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-red-600" />
        </div>
      )}

      {/* Success Animation */}
      {showSuccess && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded-md animate-pulse">
          Following!
        </div>
      )}
    </div>
  )
}