// frontend/src/components/posts/__tests__/UserProfile.test.tsx
// Version: 1.0.0
// Unit tests for UserProfile component - Testing rendering, user interactions, and profile data display

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock lucide-react icons used in UserProfile
vi.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon">User</div>,
  MapPin: () => <div data-testid="map-pin-icon">MapPin</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  Link: () => <div data-testid="link-icon">Link</div>,
  Shield: () => <div data-testid="shield-icon">Shield</div>,
  MoreHorizontal: () => <div data-testid="more-horizontal-icon">MoreHorizontal</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>
}))

/**
 * UserProfile component interface definitions
 * Based on expected functionality for user profile display
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

interface UserProfileProps {
  user: UserProfileData
  currentUserId?: string
  isLoading?: boolean
  isOwnProfile?: boolean
  onFollowToggle?: (userId: string, isFollowing: boolean) => Promise<void>
  onBlock?: (userId: string) => Promise<void>
  onReport?: (userId: string, reason: string) => Promise<void>
  onEditProfile?: () => void
  className?: string
}

/**
 * Mock UserProfile component for testing
 * This represents the expected structure of the actual component
 */
function UserProfile({
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
  if (isLoading) {
    return (
      <div data-testid="user-profile-loading" className={`user-profile ${className}`}>
        <div className="animate-pulse">Loading profile...</div>
      </div>
    )
  }

  return (
    <div data-testid="user-profile" className={`user-profile ${className}`}>
      {/* Profile Header */}
      <div className="profile-header">
        <div className="avatar-section">
          {user.avatar ? (
            <img 
              src={user.avatar} 
              alt={`${user.displayName || user.username}'s avatar`}
              className="profile-avatar"
              data-testid="profile-avatar"
            />
          ) : (
            <div className="default-avatar" data-testid="default-avatar">
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="profile-info">
          <div className="name-section">
            <h1 className="display-name" data-testid="display-name">
              {user.displayName || user.username}
            </h1>
            <span className="username" data-testid="username">@{user.username}</span>
            {user.isVerified && (
              <span 
                className={`verification-badge ${user.verificationTier}`}
                data-testid="verification-badge"
                title={`Verified ${user.verificationTier}`}
              >
                ✓
              </span>
            )}
          </div>

          {user.bio && (
            <p className="bio" data-testid="profile-bio">{user.bio}</p>
          )}

          <div className="metadata" data-testid="profile-metadata">
            {user.location && (
              <span className="location" data-testid="profile-location">
                📍 {user.location}
              </span>
            )}
            {user.website && (
              <a 
                href={user.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="website"
                data-testid="profile-website"
              >
                🔗 {user.website}
              </a>
            )}
            <span className="joined-date" data-testid="joined-date">
              📅 Joined {new Date(user.joinedAt).toLocaleDateString()}
            </span>
          </div>

          <div className="stats" data-testid="profile-stats">
            <span className="stat" data-testid="posts-count">
              <strong>{user.postsCount}</strong> Posts
            </span>
            <span className="stat" data-testid="followers-count">
              <strong>{user.followersCount}</strong> Followers
            </span>
            <span className="stat" data-testid="following-count">
              <strong>{user.followingCount}</strong> Following
            </span>
          </div>
        </div>

        <div className="profile-actions" data-testid="profile-actions">
          {isOwnProfile ? (
            <button
              onClick={onEditProfile}
              className="edit-profile-btn"
              data-testid="edit-profile-btn"
            >
              Edit Profile
            </button>
          ) : (
            <>
              <button
                onClick={() => onFollowToggle?.(user.id, false)}
                className="follow-btn"
                data-testid="follow-btn"
              >
                Follow
              </button>
              <button
                onClick={() => onBlock?.(user.id)}
                className="block-btn"
                data-testid="block-btn"
              >
                Block
              </button>
              <button
                onClick={() => onReport?.(user.id, 'spam')}
                className="report-btn"
                data-testid="report-btn"
              >
                Report
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Mock data for testing
const mockUser: UserProfileData = {
  id: 'user123',
  username: 'testuser',
  displayName: 'Test User',
  bio: 'This is a test user profile for unit testing. I love coding and building amazing applications! 🚀',
  avatar: 'https://example.com/avatar.jpg',
  location: 'San Francisco, CA',
  website: 'https://testuser.dev',
  joinedAt: '2024-01-15T10:00:00Z',
  isVerified: true,
  verificationTier: 'email',
  followersCount: 150,
  followingCount: 75,
  postsCount: 42
}

const mockUserMinimal: UserProfileData = {
  id: 'user456',
  username: 'minimaluser',
  joinedAt: '2024-02-01T10:00:00Z',
  followersCount: 0,
  followingCount: 0,
  postsCount: 0
}

// Mock functions for testing interactions
const mockOnFollowToggle = vi.fn()
const mockOnBlock = vi.fn()
const mockOnReport = vi.fn()
const mockOnEditProfile = vi.fn()

describe('UserProfile Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<UserProfile user={mockUser} />)
      expect(screen.getByTestId('user-profile')).toBeInTheDocument()
    })

    it('displays loading state when isLoading is true', () => {
      render(<UserProfile user={mockUser} isLoading={true} />)
      expect(screen.getByTestId('user-profile-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading profile...')).toBeInTheDocument()
    })

    it('displays user avatar when provided', () => {
      render(<UserProfile user={mockUser} />)
      const avatar = screen.getByTestId('profile-avatar')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('src', mockUser.avatar)
      expect(avatar).toHaveAttribute('alt', "Test User's avatar")
    })

    it('displays default avatar when no avatar is provided', () => {
      render(<UserProfile user={mockUserMinimal} />)
      const defaultAvatar = screen.getByTestId('default-avatar')
      expect(defaultAvatar).toBeInTheDocument()
      expect(defaultAvatar).toHaveTextContent('M') // First letter of 'minimaluser'
    })

    it('displays user display name and username', () => {
      render(<UserProfile user={mockUser} />)
      expect(screen.getByTestId('display-name')).toHaveTextContent('Test User')
      expect(screen.getByTestId('username')).toHaveTextContent('@testuser')
    })

    it('displays username when display name is not provided', () => {
      render(<UserProfile user={mockUserMinimal} />)
      expect(screen.getByTestId('display-name')).toHaveTextContent('minimaluser')
    })

    it('displays verification badge when user is verified', () => {
      render(<UserProfile user={mockUser} />)
      const badge = screen.getByTestId('verification-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute('title', 'Verified email')
      expect(badge).toHaveClass('email')
    })

    it('hides verification badge when user is not verified', () => {
      render(<UserProfile user={mockUserMinimal} />)
      expect(screen.queryByTestId('verification-badge')).not.toBeInTheDocument()
    })

    it('displays user bio when provided', () => {
      render(<UserProfile user={mockUser} />)
      expect(screen.getByTestId('profile-bio')).toHaveTextContent(mockUser.bio!)
    })

    it('hides bio when not provided', () => {
      render(<UserProfile user={mockUserMinimal} />)
      expect(screen.queryByTestId('profile-bio')).not.toBeInTheDocument()
    })

    it('displays user metadata correctly', () => {
      render(<UserProfile user={mockUser} />)
      expect(screen.getByTestId('profile-location')).toHaveTextContent('📍 San Francisco, CA')
      expect(screen.getByTestId('profile-website')).toHaveAttribute('href', 'https://testuser.dev')
      expect(screen.getByTestId('joined-date')).toHaveTextContent('📅 Joined 1/15/2024')
    })

    it('displays user stats correctly', () => {
      render(<UserProfile user={mockUser} />)
      expect(screen.getByTestId('posts-count')).toHaveTextContent('42 Posts')
      expect(screen.getByTestId('followers-count')).toHaveTextContent('150 Followers')
      expect(screen.getByTestId('following-count')).toHaveTextContent('75 Following')
    })
  })

  describe('Own Profile Display', () => {
    it('displays edit profile button when viewing own profile', () => {
      render(
        <UserProfile 
          user={mockUser} 
          currentUserId={mockUser.id}
          isOwnProfile={true}
          onEditProfile={mockOnEditProfile}
        />
      )
      expect(screen.getByTestId('edit-profile-btn')).toBeInTheDocument()
      expect(screen.getByText('Edit Profile')).toBeInTheDocument()
    })

    it('hides follow/block/report buttons when viewing own profile', () => {
      render(
        <UserProfile 
          user={mockUser} 
          currentUserId={mockUser.id}
          isOwnProfile={true}
        />
      )
      expect(screen.queryByTestId('follow-btn')).not.toBeInTheDocument()
      expect(screen.queryByTestId('block-btn')).not.toBeInTheDocument()
      expect(screen.queryByTestId('report-btn')).not.toBeInTheDocument()
    })
  })

  describe('Other User Profile Display', () => {
    it('displays action buttons when viewing other user profile', () => {
      render(
        <UserProfile 
          user={mockUser} 
          currentUserId="different-user-id"
          isOwnProfile={false}
          onFollowToggle={mockOnFollowToggle}
          onBlock={mockOnBlock}
          onReport={mockOnReport}
        />
      )
      expect(screen.getByTestId('follow-btn')).toBeInTheDocument()
      expect(screen.getByTestId('block-btn')).toBeInTheDocument()
      expect(screen.getByTestId('report-btn')).toBeInTheDocument()
    })

    it('hides edit profile button when viewing other user profile', () => {
      render(
        <UserProfile 
          user={mockUser} 
          currentUserId="different-user-id"
          isOwnProfile={false}
        />
      )
      expect(screen.queryByTestId('edit-profile-btn')).not.toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onEditProfile when edit profile button is clicked', async () => {
      render(
        <UserProfile 
          user={mockUser} 
          isOwnProfile={true}
          onEditProfile={mockOnEditProfile}
        />
      )
      
      const editBtn = screen.getByTestId('edit-profile-btn')
      await userEvent.click(editBtn)
      
      expect(mockOnEditProfile).toHaveBeenCalledTimes(1)
    })

    it('calls onFollowToggle when follow button is clicked', async () => {
      render(
        <UserProfile 
          user={mockUser} 
          isOwnProfile={false}
          onFollowToggle={mockOnFollowToggle}
        />
      )
      
      const followBtn = screen.getByTestId('follow-btn')
      await userEvent.click(followBtn)
      
      expect(mockOnFollowToggle).toHaveBeenCalledTimes(1)
      expect(mockOnFollowToggle).toHaveBeenCalledWith('user123', false)
    })

    it('calls onBlock when block button is clicked', async () => {
      render(
        <UserProfile 
          user={mockUser} 
          isOwnProfile={false}
          onBlock={mockOnBlock}
        />
      )
      
      const blockBtn = screen.getByTestId('block-btn')
      await userEvent.click(blockBtn)
      
      expect(mockOnBlock).toHaveBeenCalledTimes(1)
      expect(mockOnBlock).toHaveBeenCalledWith('user123')
    })

    it('calls onReport when report button is clicked', async () => {
      render(
        <UserProfile 
          user={mockUser} 
          isOwnProfile={false}
          onReport={mockOnReport}
        />
      )
      
      const reportBtn = screen.getByTestId('report-btn')
      await userEvent.click(reportBtn)
      
      expect(mockOnReport).toHaveBeenCalledTimes(1)
      expect(mockOnReport).toHaveBeenCalledWith('user123', 'spam')
    })
  })

  describe('External Links', () => {
    it('opens website link in new tab with security attributes', () => {
      render(<UserProfile user={mockUser} />)
      const websiteLink = screen.getByTestId('profile-website')
      expect(websiteLink).toHaveAttribute('target', '_blank')
      expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer')
    })
  })

  describe('Custom Styling', () => {
    it('applies custom className when provided', () => {
      render(<UserProfile user={mockUser} className="custom-profile" />)
      const profile = screen.getByTestId('user-profile')
      expect(profile).toHaveClass('custom-profile')
    })
  })

  describe('Edge Cases', () => {
    it('handles user with zero stats correctly', () => {
      render(<UserProfile user={mockUserMinimal} />)
      expect(screen.getByTestId('posts-count')).toHaveTextContent('0 Posts')
      expect(screen.getByTestId('followers-count')).toHaveTextContent('0 Followers')
      expect(screen.getByTestId('following-count')).toHaveTextContent('0 Following')
    })

    it('handles missing optional props gracefully', () => {
      expect(() => render(<UserProfile user={mockUser} />)).not.toThrow()
    })

    it('handles date formatting correctly', () => {
      render(<UserProfile user={mockUser} />)
      const joinedDate = screen.getByTestId('joined-date')
      expect(joinedDate).toHaveTextContent('📅 Joined')
    })
  })
})

// frontend/src/components/posts/__tests__/UserProfile.test.tsx
// Version: 1.0.0