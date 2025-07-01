// frontend/src/components/__tests__/PostCard.interactions.test.tsx
// User interaction tests for PostCard component
// Version: 1.0.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}))

// PostCard component interface
interface Post {
  id: string
  author: {
    username: string
    displayName: string
    avatar: string
    isVerified: boolean
    verificationTier: string | null
  }
  content: string
  createdAt: string
  hasMedia: boolean
  followerCount: number
}

// Utility functions
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

function getVerificationBadgeColor(tier: string | null): string {
  switch (tier) {
    case 'notable': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'identity': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'email': return 'text-green-600 bg-green-50 border-green-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

// PostCard component with interaction handlers
function PostCard({ post, onProfileClick, onAvatarClick }: { 
  post: Post
  onProfileClick?: (username: string) => void
  onAvatarClick?: (username: string) => void
}) {
  const verificationBadgeClasses = getVerificationBadgeColor(post.author.verificationTier)
  
  return (
    <article 
      className="card-base transition-smooth hover:shadow-md cursor-pointer" 
      data-testid="post-card"
      onClick={() => {
        // Post card click handler could be added here
      }}
    >
      <header className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0">
          <button
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
            onClick={(e) => {
              e.stopPropagation()
              onAvatarClick?.(post.author.username)
            }}
            aria-label={`View ${post.author.displayName}'s profile`}
            data-testid="avatar-button"
          >
            <img
              src={post.author.avatar}
              alt={`${post.author.displayName} avatar`}
              className="w-12 h-12 rounded-full bg-gray-200 border-2 border-gray-100 hover:border-blue-300 transition-colors"
              loading="lazy"
              data-testid="user-avatar"
            />
          </button>
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              onClick={(e) => {
                e.stopPropagation()
                onProfileClick?.(post.author.username)
              }}
              data-testid="display-name-button"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-ellipsis hover:text-blue-600 transition-colors">
                {post.author.displayName}
              </h3>
            </button>
            
            {post.author.isVerified && (
              <span 
                className={`px-2 py-1 text-xs font-medium rounded-full border ${verificationBadgeClasses} cursor-help`}
                title={`Verified ${post.author.verificationTier} account`}
                data-testid="verification-badge"
                role="tooltip"
              >
                ✓ {post.author.verificationTier}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <button
              className="hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              onClick={(e) => {
                e.stopPropagation()
                onProfileClick?.(post.author.username)
              }}
              data-testid="username-button"
            >
              @{post.author.username}
            </button>
            <span>·</span>
            <time 
              dateTime={post.createdAt} 
              title={new Date(post.createdAt).toLocaleString()}
              data-testid="timestamp"
              className="cursor-help"
            >
              {formatTimeAgo(post.createdAt)}
            </time>
            <span>·</span>
            <span data-testid="follower-count" className="cursor-help" title="Total followers">
              {post.followerCount} followers
            </span>
          </div>
        </div>
      </header>
      
      <div className="mb-4">
        <div 
          className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap select-text"
          data-testid="post-content"
        >
          {post.content}
        </div>
        
        {post.hasMedia && (
          <div 
            className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-300 transition-colors cursor-pointer" 
            data-testid="media-indicator"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              // Media click handler would go here
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                // Media keyboard handler would go here
              }
            }}
            aria-label="View media content"
          >
            <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
              <svg className="w-8 h-8 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Media content</span>
            </div>
          </div>
        )}
      </div>
      
      <footer className="pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Posted to the fediverse</span>
          <button 
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-smooth focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
            aria-label={`View ${post.author.displayName}'s profile`}
            onClick={(e) => {
              e.stopPropagation()
              onProfileClick?.(post.author.username)
            }}
            data-testid="view-profile-button"
          >
            View profile
          </button>
        </div>
      </footer>
    </article>
  )
}

// Test data
const mockPost: Post = {
  id: '1',
  author: {
    username: 'creator_jane',
    displayName: 'Jane Creator',
    avatar: '/api/placeholder/avatar/jane',
    isVerified: true,
    verificationTier: 'notable'
  },
  content: 'Just launched my new project! Excited to share this journey with everyone following from across the fediverse. 🚀',
  createdAt: '2024-12-20T10:30:00Z',
  hasMedia: false,
  followerCount: 1250
}

const mockPostWithMedia: Post = {
  ...mockPost,
  id: '2',
  hasMedia: true,
  content: 'Check out this amazing screenshot of my new app!'
}

describe('PostCard User Interactions', () => {
  let user: ReturnType<typeof userEvent.setup>
  let mockProfileClick: ReturnType<typeof vi.fn>
  let mockAvatarClick: ReturnType<typeof vi.fn>

  beforeEach(() => {
    user = userEvent.setup()
    mockProfileClick = vi.fn()
    mockAvatarClick = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('Profile Navigation Interactions', () => {
    it('should call onProfileClick when view profile button is clicked', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const viewProfileButton = screen.getByTestId('view-profile-button')
      
      await user.click(viewProfileButton)
      
      expect(mockProfileClick).toHaveBeenCalledWith('creator_jane')
      expect(mockProfileClick).toHaveBeenCalledTimes(1)
    })

    it('should call onProfileClick when display name is clicked', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const displayNameButton = screen.getByTestId('display-name-button')
      
      await user.click(displayNameButton)
      
      expect(mockProfileClick).toHaveBeenCalledWith('creator_jane')
    })

    it('should call onProfileClick when username is clicked', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const usernameButton = screen.getByTestId('username-button')
      
      await user.click(usernameButton)
      
      expect(mockProfileClick).toHaveBeenCalledWith('creator_jane')
    })

    it('should call onAvatarClick when avatar is clicked', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const avatarButton = screen.getByTestId('avatar-button')
      
      await user.click(avatarButton)
      
      expect(mockAvatarClick).toHaveBeenCalledWith('creator_jane')
      expect(mockProfileClick).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should allow keyboard navigation through interactive elements', async () => {
      render(
        <PostCard 
          post={mockPostWithMedia} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      // Tab through interactive elements
      await user.tab()
      expect(screen.getByTestId('avatar-button')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByTestId('display-name-button')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByTestId('username-button')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByTestId('media-indicator')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByTestId('view-profile-button')).toHaveFocus()
    })

    it('should activate buttons with Enter key', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const avatarButton = screen.getByTestId('avatar-button')
      avatarButton.focus()
      
      await user.keyboard('{Enter}')
      
      expect(mockAvatarClick).toHaveBeenCalledWith('creator_jane')
    })

    it('should activate buttons with Space key', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const viewProfileButton = screen.getByTestId('view-profile-button')
      viewProfileButton.focus()
      
      await user.keyboard(' ')
      
      expect(mockProfileClick).toHaveBeenCalledWith('creator_jane')
    })

    it('should handle media interaction with keyboard', async () => {
      render(
        <PostCard 
          post={mockPostWithMedia} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const mediaIndicator = screen.getByTestId('media-indicator')
      mediaIndicator.focus()
      
      // Test Enter key
      await user.keyboard('{Enter}')
      
      // Test Space key
      await user.keyboard(' ')
      
      // No callbacks should be triggered (media handler not implemented in test)
      expect(mockProfileClick).not.toHaveBeenCalled()
      expect(mockAvatarClick).not.toHaveBeenCalled()
    })
  })

  describe('Navigation Button Clicks and States', () => {
    it('should handle multiple profile navigation clicks correctly', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const displayNameButton = screen.getByTestId('display-name-button')
      const usernameButton = screen.getByTestId('username-button')
      const viewProfileButton = screen.getByTestId('view-profile-button')
      
      // Test multiple clicks on different elements
      await user.click(displayNameButton)
      await user.click(usernameButton)
      await user.click(viewProfileButton)
      
      // All should call onProfileClick with same username
      expect(mockProfileClick).toHaveBeenCalledTimes(3)
      expect(mockProfileClick).toHaveBeenNthCalledWith(1, 'creator_jane')
      expect(mockProfileClick).toHaveBeenNthCalledWith(2, 'creator_jane')
      expect(mockProfileClick).toHaveBeenNthCalledWith(3, 'creator_jane')
    })

    it('should apply correct hover styles to interactive elements', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const displayNameButton = screen.getByTestId('display-name-button')
      const usernameButton = screen.getByTestId('username-button')
      const viewProfileButton = screen.getByTestId('view-profile-button')
      const avatarButton = screen.getByTestId('avatar-button')
      
      // Check hover classes are present
      expect(displayNameButton.querySelector('h3')).toHaveClass('hover:text-blue-600')
      expect(usernameButton).toHaveClass('hover:text-blue-600')
      expect(viewProfileButton).toHaveClass('hover:text-blue-800')
      expect(avatarButton.querySelector('img')).toHaveClass('hover:border-blue-300')
    })

    it('should show visual feedback on button hover', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const viewProfileButton = screen.getByTestId('view-profile-button')
      const usernameButton = screen.getByTestId('username-button')
      
      // Test hover on view profile button
      await user.hover(viewProfileButton)
      expect(viewProfileButton).toHaveClass('transition-smooth')
      
      // Test hover on username button
      await user.hover(usernameButton)
      expect(usernameButton).toHaveClass('transition-colors')
      
      // Test unhover
      await user.unhover(viewProfileButton)
      await user.unhover(usernameButton)
    })

    it('should handle rapid successive clicks without issues', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const viewProfileButton = screen.getByTestId('view-profile-button')
      
      // Rapid clicks
      await user.click(viewProfileButton)
      await user.click(viewProfileButton)
      await user.click(viewProfileButton)
      
      expect(mockProfileClick).toHaveBeenCalledTimes(3)
      expect(mockProfileClick).toHaveBeenCalledWith('creator_jane')
    })

    it('should maintain focus states correctly during interactions', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const avatarButton = screen.getByTestId('avatar-button')
      const displayNameButton = screen.getByTestId('display-name-button')
      
      // Focus avatar button
      await user.click(avatarButton)
      expect(avatarButton).toHaveFocus()
      
      // Tab to next element
      await user.tab()
      expect(displayNameButton).toHaveFocus()
      
      // Check focus rings are applied
      expect(avatarButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500')
      expect(displayNameButton).toHaveClass('focus:ring-2', 'focus:ring-blue-500')
    })

    it('should handle different verification badge hover states', async () => {
      const verifiedPost = {
        ...mockPost,
        author: {
          ...mockPost.author,
          verificationTier: 'notable'
        }
      }
      
      render(
        <PostCard 
          post={verifiedPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const verificationBadge = screen.getByTestId('verification-badge')
      
      // Test badge has cursor help style
      expect(verificationBadge).toHaveClass('cursor-help')
      
      // Test hover behavior
      await user.hover(verificationBadge)
      
      // Badge should show tooltip on hover (title attribute)
      expect(verificationBadge).toHaveAttribute('title', 'Verified notable account')
    })

    it('should handle media indicator button interactions', async () => {
      render(
        <PostCard 
          post={mockPostWithMedia} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const mediaIndicator = screen.getByTestId('media-indicator')
      
      // Test media indicator has button styling
      expect(mediaIndicator).toHaveClass('cursor-pointer')
      expect(mediaIndicator).toHaveClass('hover:border-blue-300')
      expect(mediaIndicator).toHaveAttribute('role', 'button')
      
      // Test hover behavior
      await user.hover(mediaIndicator)
      expect(mediaIndicator).toHaveClass('transition-colors')
      
      // Test click behavior
      await user.click(mediaIndicator)
      // Media handler not implemented in test, so no callback to verify
      
      // Test keyboard activation
      mediaIndicator.focus()
      await user.keyboard('{Enter}')
      await user.keyboard(' ')
    })

    it('should handle disabled state interactions gracefully', async () => {
      // Test with minimal props to simulate disabled/loading states
      const minimalPost = {
        ...mockPost,
        author: {
          ...mockPost.author,
          isVerified: false
        }
      }
      
      render(<PostCard post={minimalPost} />)
      
      const viewProfileButton = screen.getByTestId('view-profile-button')
      
      // Should still be clickable but no handler
      await user.click(viewProfileButton)
      
      // No errors should occur
      expect(screen.getByTestId('post-card')).toBeInTheDocument()
    })
  })

  describe('Event Propagation', () => {
    it('should stop propagation when interactive elements are clicked', async () => {
      const mockCardClick = vi.fn()
      
      render(
        <div onClick={mockCardClick}>
          <PostCard 
            post={mockPost} 
            onProfileClick={mockProfileClick}
            onAvatarClick={mockAvatarClick}
          />
        </div>
      )
      
      const viewProfileButton = screen.getByTestId('view-profile-button')
      
      await user.click(viewProfileButton)
      
      // Profile click should be called but card click should not (event stopped)
      expect(mockProfileClick).toHaveBeenCalled()
      expect(mockCardClick).not.toHaveBeenCalled()
    })

    it('should handle keyboard interactions on media indicator', async () => {
      render(
        <PostCard 
          post={mockPostWithMedia} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const mediaIndicator = screen.getByTestId('media-indicator')
      
      // Verify media indicator is focusable and has proper attributes
      expect(mediaIndicator).toHaveAttribute('tabIndex', '0')
      expect(mediaIndicator).toHaveAttribute('role', 'button')
      expect(mediaIndicator).toHaveAttribute('aria-label', 'View media content')
      
      // Test keyboard navigation to media indicator
      mediaIndicator.focus()
      expect(mediaIndicator).toHaveFocus()
      
      // Test Enter key activation
      fireEvent.keyDown(mediaIndicator, { key: 'Enter' })
      
      // Test Space key activation  
      fireEvent.keyDown(mediaIndicator, { key: ' ' })
      
      // Test that other keys don't cause issues
      fireEvent.keyDown(mediaIndicator, { key: 'Tab' })
      fireEvent.keyDown(mediaIndicator, { key: 'Escape' })
      
      // Component should still be functional
      expect(mediaIndicator).toBeInTheDocument()
      expect(screen.getByText('Media content')).toBeInTheDocument()
    })
  })

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels for screen readers', () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const avatarButton = screen.getByTestId('avatar-button')
      const viewProfileButton = screen.getByTestId('view-profile-button')
      
      expect(avatarButton).toHaveAttribute('aria-label', "View Jane Creator's profile")
      expect(viewProfileButton).toHaveAttribute('aria-label', "View Jane Creator's profile")
    })

    it('should have proper role attributes for interactive elements', () => {
      render(
        <PostCard 
          post={mockPostWithMedia} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const mediaIndicator = screen.getByTestId('media-indicator')
      const verificationBadge = screen.getByTestId('verification-badge')
      
      expect(mediaIndicator).toHaveAttribute('role', 'button')
      expect(verificationBadge).toHaveAttribute('role', 'tooltip')
    })

    it('should have proper tabIndex for keyboard navigation', () => {
      render(
        <PostCard 
          post={mockPostWithMedia} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const mediaIndicator = screen.getByTestId('media-indicator')
      
      expect(mediaIndicator).toHaveAttribute('tabIndex', '0')
    })

    it('should have helpful title attributes for tooltips', () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const verificationBadge = screen.getByTestId('verification-badge')
      const followerCount = screen.getByTestId('follower-count')
      
      expect(verificationBadge).toHaveAttribute('title', 'Verified notable account')
      expect(followerCount).toHaveAttribute('title', 'Total followers')
    })
  })

  describe('Content Selection', () => {
    it('should allow text selection in post content', () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const postContent = screen.getByTestId('post-content')
      
      expect(postContent).toHaveClass('select-text')
    })
  })

  describe('Button State Transitions', () => {
    it('should handle button state transitions correctly', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const viewProfileButton = screen.getByTestId('view-profile-button')
      
      // Test initial state
      expect(viewProfileButton).not.toHaveFocus()
      
      // Test focus state
      await user.click(viewProfileButton)
      expect(viewProfileButton).toHaveFocus()
      
      // Test blur
      await user.tab() // Focus next element
      expect(viewProfileButton).not.toHaveFocus()
    })

    it('should maintain button styling during rapid interactions', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const avatarButton = screen.getByTestId('avatar-button')
      const displayNameButton = screen.getByTestId('display-name-button')
      
      // Rapid focus changes
      await user.hover(avatarButton)
      await user.hover(displayNameButton)
      await user.unhover(avatarButton)
      await user.click(displayNameButton)
      await user.hover(avatarButton)
      
      // Elements should maintain their classes
      expect(avatarButton).toHaveClass('focus:outline-none')
      expect(displayNameButton).toHaveClass('focus:outline-none')
      
      expect(mockProfileClick).toHaveBeenCalledWith('creator_jane')
      expect(mockAvatarClick).not.toHaveBeenCalled()
    })

    it('should handle simultaneous hover and keyboard focus', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const usernameButton = screen.getByTestId('username-button')
      
      // Keyboard focus
      usernameButton.focus()
      expect(usernameButton).toHaveFocus()
      
      // Mouse hover while focused
      await user.hover(usernameButton)
      
      // Should maintain both focus and hover styles
      expect(usernameButton).toHaveClass('focus:ring-2')
      expect(usernameButton).toHaveClass('hover:text-blue-600')
      
      // Activate with keyboard
      await user.keyboard('{Enter}')
      expect(mockProfileClick).toHaveBeenCalledWith('creator_jane')
    })

    it('should handle tooltip interactions correctly', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const followerCount = screen.getByTestId('follower-count')
      const timestamp = screen.getByTestId('timestamp')
      
      // Test tooltip attributes
      expect(followerCount).toHaveAttribute('title', 'Total followers')
      expect(followerCount).toHaveClass('cursor-help')
      
      expect(timestamp).toHaveAttribute('title', new Date(mockPost.createdAt).toLocaleString())
      expect(timestamp).toHaveClass('cursor-help')
      
      // Test hover behavior for tooltips
      await user.hover(followerCount)
      await user.hover(timestamp)
      
      // Tooltips should be accessible
      expect(followerCount).toHaveAttribute('title')
      expect(timestamp).toHaveAttribute('title')
    })

    it('should handle complex interaction sequences', async () => {
      render(
        <PostCard 
          post={mockPostWithMedia} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const avatarButton = screen.getByTestId('avatar-button')
      const mediaIndicator = screen.getByTestId('media-indicator')
      const viewProfileButton = screen.getByTestId('view-profile-button')
      
      // Complex interaction sequence
      await user.hover(avatarButton)
      await user.click(avatarButton)
      expect(mockAvatarClick).toHaveBeenCalledWith('creator_jane')
      
      // Tab through the correct sequence: avatar → display name → username → media
      await user.tab() // Move to display name button
      await user.tab() // Move to username button  
      await user.tab() // Move to media indicator
      expect(mediaIndicator).toHaveFocus()
      
      await user.keyboard('{Enter}') // Activate media
      
      await user.click(viewProfileButton)
      expect(mockProfileClick).toHaveBeenCalledWith('creator_jane')
      
      // Verify state consistency
      expect(mockAvatarClick).toHaveBeenCalledTimes(1)
      expect(mockProfileClick).toHaveBeenCalledTimes(1)
    })

    it('should maintain accessible button labeling throughout interactions', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
          onAvatarClick={mockAvatarClick}
        />
      )
      
      const avatarButton = screen.getByTestId('avatar-button')
      const viewProfileButton = screen.getByTestId('view-profile-button')
      
      // Check ARIA labels persist through interactions
      expect(avatarButton).toHaveAttribute('aria-label', "View Jane Creator's profile")
      expect(viewProfileButton).toHaveAttribute('aria-label', "View Jane Creator's profile")
      
      // After interactions, labels should remain
      await user.click(avatarButton)
      await user.hover(viewProfileButton)
      await user.click(viewProfileButton)
      
      expect(avatarButton).toHaveAttribute('aria-label', "View Jane Creator's profile")
      expect(viewProfileButton).toHaveAttribute('aria-label', "View Jane Creator's profile")
    })
  })

  describe('Error Handling', () => {
    it('should handle missing callback functions gracefully', async () => {
      // Render without callback functions
      render(<PostCard post={mockPost} />)
      
      const viewProfileButton = screen.getByTestId('view-profile-button')
      
      // Should not throw error when clicked
      await user.click(viewProfileButton)
      
      // Component should still be rendered
      expect(screen.getByTestId('post-card')).toBeInTheDocument()
    })

    it('should handle avatar click without onAvatarClick callback', async () => {
      render(
        <PostCard 
          post={mockPost} 
          onProfileClick={mockProfileClick}
        />
      )
      
      const avatarButton = screen.getByTestId('avatar-button')
      
      // Should not throw error when clicked
      await user.click(avatarButton)
      
      expect(mockProfileClick).not.toHaveBeenCalled()
    })
  })
})