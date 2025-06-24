import React, { useState, useEffect } from 'react'

// TypeScript interfaces
interface User {
  id: string
  username: string
  displayName: string
  bio: string
  avatar: string | null
  website: string | null
  isVerified: boolean
  verificationTier: 'notable' | 'identity' | 'phone' | 'email' | 'none'
  followersCount: number
  postsCount: number
}

interface FollowResponse {
  success: boolean
  data: {
    id: string
    followerId: string
    followedId: string
    createdAt: string
  }
}

interface UnfollowResponse {
  success: boolean
  message: string
}

interface UserProfileResponse {
  success: boolean
  data: User
}

interface FollowStatusResponse {
  isFollowing: boolean
}

interface FollowAction {
  username: string
  action: 'Followed' | 'Unfollowed'
  timestamp: string
}

interface TestUser {
  username: string
  description: string
  scenario: string
}

interface UserProfileCardProps {
  username: string
  onFollowChange?: (username: string, isNowFollowing: boolean) => void
}

// Mock API service for testing follow/unfollow functionality
const mockFollowAPI = {
  async followUser(username: string): Promise<FollowResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Simulate various error conditions
    if (username === 'blocked_user') {
      throw new Error('Cannot follow this user')
    }
    
    if (username === 'nonexistent') {
      throw new Error('User not found')
    }
    
    if (username === 'self') {
      throw new Error('You cannot follow yourself')
    }
    
    // Simulate successful follow
    return {
      success: true,
      data: {
        id: 'follow_' + Date.now(),
        followerId: 'current_user_id',
        followedId: 'user_' + username,
        createdAt: new Date().toISOString()
      }
    }
  },

  async unfollowUser(username: string): Promise<UnfollowResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600))
    
    if (username === 'not_following') {
      throw new Error('You are not following this user')
    }
    
    return {
      success: true,
      message: 'Unfollowed successfully'
    }
  },

  async getUserProfile(username: string): Promise<UserProfileResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400))
    
    const mockUsers: Record<string, User> = {
      'techceo': {
        id: 'user1',
        username: 'techceo',
        displayName: 'Sarah Chen',
        bio: 'CEO & Co-founder at TechCorp. Building the future of software development.',
        avatar: null,
        website: 'https://techcorp.example.com',
        isVerified: true,
        verificationTier: 'notable',
        followersCount: 12500,
        postsCount: 342
      },
      'devguru': {
        id: 'user2',
        username: 'devguru',
        displayName: 'Alex Rodriguez',
        bio: 'Full-stack developer passionate about clean code and great UX. Coffee enthusiast.',
        avatar: null,
        website: null,
        isVerified: false,
        verificationTier: 'email',
        followersCount: 1250,
        postsCount: 89
      },
      'wellness_coach': {
        id: 'user3',
        username: 'wellness_coach',
        displayName: 'Dr. Maria Santos',
        bio: 'Licensed therapist helping tech workers maintain mental health. Author of "Code & Calm".',
        avatar: null,
        website: 'https://drmariasantos.example.com',
        isVerified: true,
        verificationTier: 'identity',
        followersCount: 8900,
        postsCount: 156
      },
      'blocked_user': {
        id: 'user4',
        username: 'blocked_user',
        displayName: 'Blocked User',
        bio: 'This user has blocked you.',
        avatar: null,
        website: null,
        isVerified: false,
        verificationTier: 'none',
        followersCount: 0,
        postsCount: 0
      }
    }
    
    const user = mockUsers[username]
    if (!user) {
      throw new Error('User not found')
    }
    
    return {
      success: true,
      data: user
    }
  },

  async checkFollowStatus(username: string): Promise<FollowStatusResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Mock follow status for different users
    const followingUsers = ['techceo', 'wellness_coach']
    
    return {
      isFollowing: followingUsers.includes(username)
    }
  }
}

/**
 * User Profile Card Component
 * Shows user info with follow/unfollow button
 */
function UserProfileCard({ username, onFollowChange }: UserProfileCardProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isFollowing, setIsFollowing] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isFollowLoading, setIsFollowLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [followError, setFollowError] = useState<string>('')

  useEffect(() => {
    loadUserProfile()
  }, [username])

  const loadUserProfile = async (): Promise<void> => {
    setIsLoading(true)
    setError('')
    
    try {
      const [profileResult, followResult] = await Promise.all([
        mockFollowAPI.getUserProfile(username),
        mockFollowAPI.checkFollowStatus(username)
      ])
      
      setUser(profileResult.data)
      setIsFollowing(followResult.isFollowing)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowToggle = async (): Promise<void> => {
    setIsFollowLoading(true)
    setFollowError('')
    
    try {
      if (isFollowing) {
        await mockFollowAPI.unfollowUser(username)
        setIsFollowing(false)
        onFollowChange?.(username, false)
      } else {
        await mockFollowAPI.followUser(username)
        setIsFollowing(true)
        onFollowChange?.(username, true)
      }
    } catch (err) {
      setFollowError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsFollowLoading(false)
    }
  }

  const getVerificationBadgeColor = (tier: User['verificationTier']): string => {
    switch (tier) {
      case 'notable': return 'text-purple-500'
      case 'identity': return 'text-blue-500'
      case 'phone': return 'text-green-500'
      case 'email': return 'text-gray-500'
      default: return 'text-gray-400'
    }
  }

  const getInitials = (name: string): string => {
    return name?.split(' ').map(word => word.charAt(0)).join('').toUpperCase() || '?'
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
        <div className="flex items-start space-x-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️ {error}</div>
          <button
            onClick={loadUserProfile}
            className="text-red-600 hover:text-red-800 font-medium text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-lg">
            {getInitials(user.displayName)}
          </span>
        </div>
        
        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="font-bold text-lg text-gray-900 truncate">{user.displayName}</h3>
            {user.isVerified && (
              <svg 
                className={`w-5 h-5 flex-shrink-0 ${getVerificationBadgeColor(user.verificationTier)}`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
                aria-label={`Verified ${user.verificationTier}`}
              >
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            )}
          </div>
          
          <div className="text-gray-600 text-sm mb-2">@{user.username}</div>
          
          {user.bio && (
            <p className="text-gray-800 text-sm mb-3 leading-relaxed">{user.bio}</p>
          )}
          
          {user.website && (
            <a 
              href={user.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm mb-3 block truncate"
            >
              🔗 {user.website.replace('https://', '')}
            </a>
          )}
          
          {/* Stats */}
          <div className="flex space-x-4 text-sm text-gray-600 mb-4">
            <span><strong>{formatNumber(user.followersCount)}</strong> followers</span>
            <span><strong>{formatNumber(user.postsCount)}</strong> posts</span>
          </div>
          
          {/* Follow Error */}
          {followError && (
            <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
              <p className="text-red-600 text-sm">{followError}</p>
            </div>
          )}
          
          {/* Follow Button */}
          <button
            onClick={handleFollowToggle}
            disabled={isFollowLoading}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center space-x-2 ${
              isFollowing
                ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 border border-gray-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } ${isFollowLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isFollowLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{isFollowing ? 'Unfollowing...' : 'Following...'}</span>
              </>
            ) : (
              <>
                {isFollowing ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd"/>
                    </svg>
                    <span>Follow</span>
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Follow Test Scenarios Component
 */
function FollowTestScenarios() {
  const [selectedUser, setSelectedUser] = useState<string>('techceo')
  const [followHistory, setFollowHistory] = useState<FollowAction[]>([])

  const testUsers: TestUser[] = [
    {
      username: 'techceo',
      description: 'Verified notable user (already following)',
      scenario: 'Test unfollowing a user you already follow'
    },
    {
      username: 'devguru',
      description: 'Regular user (not following)',
      scenario: 'Test following a new user'
    },
    {
      username: 'wellness_coach',
      description: 'Verified identity user (already following)',
      scenario: 'Test unfollowing verified user'
    },
    {
      username: 'blocked_user',
      description: 'User who has blocked you',
      scenario: 'Test error handling for blocked users'
    },
    {
      username: 'nonexistent',
      description: 'Non-existent user',
      scenario: 'Test error handling for missing users'
    },
    {
      username: 'self',
      description: 'Your own account',
      scenario: 'Test self-follow prevention'
    }
  ]

  const handleFollowChange = (username: string, isNowFollowing: boolean): void => {
    const action: FollowAction['action'] = isNowFollowing ? 'Followed' : 'Unfollowed'
    const timestamp = new Date().toLocaleTimeString()
    
    setFollowHistory(prev => [
      { username, action, timestamp },
      ...prev.slice(0, 4) // Keep only last 5 actions
    ])
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Test Scenarios */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Test Scenarios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {testUsers.map((user) => (
            <button
              key={user.username}
              onClick={() => setSelectedUser(user.username)}
              className={`text-left p-3 rounded border transition-colors ${
                selectedUser === user.username
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <h4 className="font-medium text-gray-900">@{user.username}</h4>
              <p className="text-sm text-gray-600">{user.description}</p>
              <p className="text-xs text-blue-600 mt-1">{user.scenario}</p>
            </button>
          ))}
        </div>
        
        {/* Follow History */}
        {followHistory.length > 0 && (
          <div className="bg-white rounded border p-4">
            <h4 className="font-medium text-gray-900 mb-2">Recent Actions</h4>
            <div className="space-y-1">
              {followHistory.map((action, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-gray-800">
                    {action.action} @{action.username}
                  </span>
                  <span className="text-gray-500">{action.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Current User Profile */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Testing: @{selectedUser}
        </h2>
        <UserProfileCard 
          username={selectedUser} 
          onFollowChange={handleFollowChange}
          key={selectedUser} // Force re-render when user changes
        />
      </div>
    </div>
  )
}

export default function FollowUnfollowTestComponent() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Follow/Unfollow Test</h1>
          <p className="text-gray-600">
            Test user following functionality with different scenarios including error handling
          </p>
        </div>
        
        <FollowTestScenarios />
        
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>This component tests UserController.followUser() and UserController.unfollowUser() functionality</p>
        </div>
      </div>
    </div>
  )
}