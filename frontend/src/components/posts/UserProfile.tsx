// frontend/src/components/posts/UserProfile.tsx
// Version: 1.0.0
// UserProfile component for displaying user profile information, stats, and actions

'use client'

import { User, MapPin, Calendar, Link, Shield, MoreHorizontal, Edit } from 'lucide-react'

/**
 * User profile data structure
 */
interface UserProfileData {
  id: string
  username: string
  displayName?: string
  bio?: string
  avatar?: string
  location?: string
  website?: string
  joinedAt: string
  isVerified?: boolean
  verificationTier?: 'email' | 'phone' | 'premium'
  followersCount: number
  followingCount: number
  postsCount: number
}

/**
 * Props for the UserProfile component
 */
interface UserProfileProps {
  /** User data to display */
  user: UserProfileData
  /** Current user's ID for comparison */
  currentUserId?: string
  /** Loading state indicator */
  isLoading?: boolean
  /** Whether this is the current user's own profile */
  isOwnProfile?: boolean
  /** Handler for follow/unfollow actions */
  onFollowToggle?: (userId: string, isFollowing: boolean) => Promise<void>
  /** Handler for blocking user */
  onBlock?: (userId: string) => Promise<void>
  /** Handler for reporting user */
  onReport?: (userId: string, reason: string) => Promise<void>
  /** Handler for editing profile */
  onEditProfile?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * UserProfile component displays comprehensive user information including
 * avatar, bio, stats, and appropriate action buttons based on relationship
 */
export function UserProfile({
  user,
  currentUserId,
  isLoading = false,
  isOwnProfile = false,
  onFollowToggle,
  onBlock,
  onReport,
  onEditProfile,
  className = ''
}: UserProfileProps) {
  /**
   * Format date for display
   */
  const formatJoinDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }

  /**
   * Get first letter for default avatar
   */
  const getInitial = (): string => {
    const name = user.displayName || user.username
    return name.charAt(0).toUpperCase()
  }

  /**
   * Get verification badge title text
   */
  const getVerificationTitle = (): string => {
    if (!user.verificationTier) return 'Verified'
    return `Verified ${user.verificationTier}`
  }

  /**
   * Handle follow button click
   */
  const handleFollowClick = async (): Promise<void> => {
    if (onFollowToggle) {
      await onFollowToggle(user.id, false)
    }
  }

  /**
   * Handle block button click
   */
  const handleBlockClick = async (): Promise<void> => {
    if (onBlock) {
      await onBlock(user.id)
    }
  }

  /**
   * Handle report button click
   */
  const handleReportClick = async (): Promise<void> => {
    if (onReport) {
      await onReport(user.id, 'spam')
    }
  }

  /**
   * Render loading state
   */
  if (isLoading) {
    return (
      <div 
        data-testid="user-profile-loading" 
        className={`user-profile bg-white rounded-lg shadow-sm border p-6 ${className}`}
      >
        <div className="animate-pulse space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="text-center text-gray-500">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <article 
      data-testid="user-profile" 
      className={`user-profile bg-white rounded-lg shadow-sm border ${className}`}
    >
      {/* Profile Header */}
      <header className="profile-header p-6">
        <div className="flex items-start justify-between mb-4">
          {/* Avatar Section */}
          <div className="avatar-section">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={`${user.displayName || user.username}'s avatar`}
                className="profile-avatar w-20 h-20 rounded-full object-cover border-2 border-gray-100"
                data-testid="profile-avatar"
              />
            ) : (
              <div 
                className="default-avatar w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold"
                data-testid="default-avatar"
              >
                {getInitial()}
              </div>
            )}
          </div>

          {/* Profile Actions */}
          <div className="profile-actions flex gap-2" data-testid="profile-actions">
            {isOwnProfile ? (
              <button
                onClick={onEditProfile}
                className="edit-profile-btn inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                data-testid="edit-profile-btn"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleFollowClick}
                  className="follow-btn px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  data-testid="follow-btn"
                >
                  Follow
                </button>
                <button
                  onClick={handleBlockClick}
                  className="block-btn px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors"
                  data-testid="block-btn"
                >
                  Block
                </button>
                <button
                  onClick={handleReportClick}
                  className="report-btn px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium transition-colors"
                  data-testid="report-btn"
                >
                  Report
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="profile-info">
          {/* Name Section */}
          <div className="name-section mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 
                className="display-name text-2xl font-bold text-gray-900"
                data-testid="display-name"
              >
                {user.displayName || user.username}
              </h1>
              {user.isVerified && (
                <span 
                  className={`verification-badge inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold ${
                    user.verificationTier === 'premium' 
                      ? 'bg-yellow-500' 
                      : user.verificationTier === 'phone'
                      ? 'bg-green-500'
                      : 'bg-blue-500'
                  } ${user.verificationTier || ''}`}
                  data-testid="verification-badge"
                  title={getVerificationTitle()}
                >
                  ✓
                </span>
              )}
            </div>
            <span 
              className="username text-gray-600 font-medium"
              data-testid="username"
            >
              @{user.username}
            </span>
          </div>

          {/* Bio */}
          {user.bio && (
            <p 
              className="bio text-gray-800 mb-4 whitespace-pre-wrap leading-relaxed"
              data-testid="profile-bio"
            >
              {user.bio}
            </p>
          )}

          {/* Metadata */}
          <div 
            className="metadata flex flex-wrap gap-4 text-sm text-gray-600 mb-4"
            data-testid="profile-metadata"
          >
            {user.location && (
              <span 
                className="location inline-flex items-center gap-1"
                data-testid="profile-location"
              >
                <MapPin className="w-4 h-4" />
                📍 {user.location}
              </span>
            )}
            {user.website && (
              <a 
                href={user.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="website inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                data-testid="profile-website"
              >
                <Link className="w-4 h-4" />
                🔗 {user.website}
              </a>
            )}
            <span 
              className="joined-date inline-flex items-center gap-1"
              data-testid="joined-date"
            >
              <Calendar className="w-4 h-4" />
              📅 Joined {formatJoinDate(user.joinedAt)}
            </span>
          </div>

          {/* Stats */}
          <div 
            className="stats flex gap-6 text-sm"
            data-testid="profile-stats"
          >
            <span 
              className="stat text-gray-700"
              data-testid="posts-count"
            >
              <strong className="font-bold text-gray-900">{user.postsCount}</strong> Posts
            </span>
            <span 
              className="stat text-gray-700"
              data-testid="followers-count"
            >
              <strong className="font-bold text-gray-900">{user.followersCount}</strong> Followers
            </span>
            <span 
              className="stat text-gray-700"
              data-testid="following-count"
            >
              <strong className="font-bold text-gray-900">{user.followingCount}</strong> Following
            </span>
          </div>
        </div>
      </header>
    </article>
  )
}

export default UserProfile

// frontend/src/components/posts/UserProfile.tsx
// Version: 1.0.0