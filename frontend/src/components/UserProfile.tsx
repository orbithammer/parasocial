'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  MapPin, 
  Link2, 
  MoreHorizontal, 
  UserPlus, 
  UserMinus, 
  Shield, 
  Flag, 
  Settings, 
  Verified,
  Users,
  FileText,
  ExternalLink,
  Edit3
} from 'lucide-react'

/**
 * User profile data interface
 */
interface UserProfile {
  id: string
  username: string
  displayName: string
  bio?: string | null
  avatar?: string | null
  website?: string | null
  isVerified: boolean
  verificationTier: string
  followersCount: number
  postsCount: number
  actorId?: string | null
  createdAt: string
}

/**
 * API response interface for user profile
 */
interface UserProfileResponse {
  success: boolean
  data: UserProfile
}

/**
 * Follow state interface
 */
interface FollowState {
  isFollowing: boolean
  isBlocked: boolean
  followersCount: number
}

/**
 * Props for UserProfile component
 */
interface UserProfileProps {
  username: string
  currentUserId?: string
  apiUrl?: string
  onFollow?: (username: string) => Promise<void>
  onUnfollow?: (username: string) => Promise<void>
  onBlock?: (username: string) => Promise<void>
  onUnblock?: (username: string) => Promise<void>
  onReport?: (username: string) => Promise<void>
  onEditProfile?: () => void
  className?: string
}

/**
 * Dropdown menu for user actions
 */
function UserActionsDropdown({
  user,
  currentUserId,
  followState,
  onBlock,
  onUnblock,
  onReport,
  onClose
}: {
  user: UserProfile
  currentUserId?: string
  followState: FollowState
  onBlock?: (username: string) => Promise<void>
  onUnblock?: (username: string) => Promise<void>
  onReport?: (username: string) => Promise<void>
  onClose: () => void
}) {
  const isOwnProfile = currentUserId === user.id

  const handleAction = async (action: () => Promise<void>) => {
    try {
      await action()
      onClose()
    } catch (error) {
      console.error('Action failed:', error)
      onClose()
    }
  }

  if (isOwnProfile) {
    return (
      <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <Link2 className="w-4 h-4" />
          Copy profile link
        </button>
      </div>
    )
  }

  return (
    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
      <button
        onClick={() => navigator.clipboard.writeText(window.location.href)}
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
      >
        <Link2 className="w-4 h-4" />
        Copy profile link
      </button>
      
      {followState.isBlocked ? (
        onUnblock && (
          <button
            onClick={() => handleAction(() => onUnblock!(user.username))}
            className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Unblock user
          </button>
        )
      ) : (
        onBlock && (
          <button
            onClick={() => handleAction(() => onBlock!(user.username))}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Block user
          </button>
        )
      )}
      
      {onReport && (
        <button
          onClick={() => handleAction(() => onReport!(user.username))}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
        >
          <Flag className="w-4 h-4" />
          Report user
        </button>
      )}
    </div>
  )
}

/**
 * Profile stats component
 */
function ProfileStats({ user }: { user: UserProfile }) {
  return (
    <div className="flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-400" />
        <span className="font-semibold text-gray-900">
          {user.postsCount.toLocaleString()}
        </span>
        <span className="text-gray-600">
          {user.postsCount === 1 ? 'post' : 'posts'}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-gray-400" />
        <span className="font-semibold text-gray-900">
          {user.followersCount.toLocaleString()}
        </span>
        <span className="text-gray-600">
          {user.followersCount === 1 ? 'follower' : 'followers'}
        </span>
      </div>
    </div>
  )
}

/**
 * Main UserProfile component
 * Displays user profile with modern social media styling
 */
export default function UserProfile({
  username,
  currentUserId,
  apiUrl = '/api',
  onFollow,
  onUnfollow,
  onBlock,
  onUnblock,
  onReport,
  onEditProfile,
  className = ''
}: UserProfileProps) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [followState, setFollowState] = useState<FollowState>({
    isFollowing: false,
    isBlocked: false,
    followersCount: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const isOwnProfile = currentUserId === user?.id

  /**
   * Fetch user profile from API
   */
  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${apiUrl}/users/${username}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found')
        }
        throw new Error(`Failed to fetch profile: ${response.statusText}`)
      }

      const data: UserProfileResponse = await response.json()
      
      if (!data.success) {
        throw new Error('Failed to load user profile')
      }

      setUser(data.data)
      setFollowState(prev => ({
        ...prev,
        followersCount: data.data.followersCount
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching user profile:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle follow action
   */
  const handleFollow = async () => {
    if (!user || actionLoading) return

    try {
      setActionLoading('follow')
      
      if (onFollow) {
        await onFollow(user.username)
      } else {
        const response = await fetch(`${apiUrl}/users/${user.username}/follow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (!response.ok) {
          throw new Error('Failed to follow user')
        }
      }

      setFollowState(prev => ({
        ...prev,
        isFollowing: true,
        followersCount: prev.followersCount + 1
      }))
    } catch (err) {
      console.error('Failed to follow user:', err)
    } finally {
      setActionLoading(null)
    }
  }

  /**
   * Handle unfollow action
   */
  const handleUnfollow = async () => {
    if (!user || actionLoading) return

    try {
      setActionLoading('unfollow')
      
      if (onUnfollow) {
        await onUnfollow(user.username)
      } else {
        const response = await fetch(`${apiUrl}/users/${user.username}/follow`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        
        if (!response.ok) {
          throw new Error('Failed to unfollow user')
        }
      }

      setFollowState(prev => ({
        ...prev,
        isFollowing: false,
        followersCount: Math.max(0, prev.followersCount - 1)
      }))
    } catch (err) {
      console.error('Failed to unfollow user:', err)
    } finally {
      setActionLoading(null)
    }
  }

  /**
   * Get user avatar or generate initials
   */
  const getAvatarContent = () => {
    if (!user) return null

    if (user.avatar) {
      return (
        <img 
          src={user.avatar} 
          alt={`${user.displayName}'s avatar`}
          className="w-full h-full object-cover"
        />
      )
    }
    
    const initials = user.displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    
    return (
      <span className="text-white font-bold text-4xl">
        {initials}
      </span>
    )
  }

  /**
   * Format join date
   */
  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  // Fetch profile on mount
  useEffect(() => {
    fetchUserProfile()
  }, [username])

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
        {/* Loading Skeleton */}
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 animate-pulse" />
        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-24 h-24 bg-gray-300 rounded-full animate-pulse -mt-12" />
            <div className="flex-1 space-y-3 mt-4">
              <div className="h-6 bg-gray-300 rounded animate-pulse w-48" />
              <div className="h-4 bg-gray-300 rounded animate-pulse w-32" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded animate-pulse w-full" />
            <div className="h-4 bg-gray-300 rounded animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <Flag className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {error === 'User not found' ? 'User not found' : 'Error loading profile'}
        </h3>
        <p className="text-gray-600 mb-4">
          {error === 'User not found' 
            ? 'This user may have been deleted or the username is incorrect.'
            : error
          }
        </p>
        <button
          onClick={fetchUserProfile}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Cover Image */}
      <div className="h-32 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 relative">
        <div className="absolute inset-0 bg-black bg-opacity-20" />
      </div>

      {/* Profile Content */}
      <div className="p-6">
        {/* Profile Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 overflow-hidden ring-4 ring-white shadow-xl -mt-12">
              {getAvatarContent()}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0 mt-2">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900 truncate">
                  {user.displayName}
                </h1>
                {user.isVerified && (
                  <Verified className="w-6 h-6 text-blue-500 flex-shrink-0" />
                )}
                {user.verificationTier && user.verificationTier !== 'none' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {user.verificationTier}
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-3">@{user.username}</p>
              
              {/* Stats */}
              <ProfileStats user={user} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-2">
            {isOwnProfile ? (
              <button
                onClick={onEditProfile}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
              >
                <Edit3 className="w-4 h-4" />
                Edit profile
              </button>
            ) : (
              <>
                {followState.isBlocked ? (
                  <span className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                    Blocked
                  </span>
                ) : (
                  <button
                    onClick={followState.isFollowing ? handleUnfollow : handleFollow}
                    disabled={!!actionLoading}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                      followState.isFollowing
                        ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-300'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                    } ${actionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {actionLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : followState.isFollowing ? (
                      <UserMinus className="w-4 h-4" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    <span>
                      {actionLoading === 'follow' ? 'Following...' :
                       actionLoading === 'unfollow' ? 'Unfollowing...' :
                       followState.isFollowing ? 'Following' : 'Follow'}
                    </span>
                  </button>
                )}
              </>
            )}

            {/* More Actions */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>

              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-5" 
                    onClick={() => setShowDropdown(false)}
                  />
                  <UserActionsDropdown
                    user={user}
                    currentUserId={currentUserId}
                    followState={followState}
                    onBlock={onBlock}
                    onUnblock={onUnblock}
                    onReport={onReport}
                    onClose={() => setShowDropdown(false)}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="mb-4">
            <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
              {user.bio}
            </p>
          </div>
        )}

        {/* Additional Info */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          {user.website && (
            <a
              href={user.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            >
              <Link2 className="w-4 h-4" />
              <span className="truncate max-w-xs">{user.website.replace(/^https?:\/\//, '')}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>Joined {formatJoinDate(user.createdAt)}</span>
          </div>
        </div>

        {/* Updated follower count */}
        {followState.followersCount !== user.followersCount && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">{followState.followersCount.toLocaleString()}</span> followers
            </p>
          </div>
        )}
      </div>
    </div>
  )
}