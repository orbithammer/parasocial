// frontend/src/components/__tests__/PostCard.test.tsx
// Unit tests for PostCard component using Vitest
// Version: 1.2.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Next.js dependencies for testing environment
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}))

// Utility functions extracted from the main component
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

// PostCard component for testing (extracted from page.tsx)
function PostCard({ post }: { post: Post }) {
  const verificationBadgeClasses = getVerificationBadgeColor(post.author.verificationTier)
  
  return (
    <article className="card-base transition-smooth hover:shadow-md" data-testid="post-card">
      <header className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0">
          <img
            src={post.author.avatar}
            alt={`${post.author.displayName} avatar`}
            className="w-12 h-12 rounded-full bg-gray-200 border-2 border-gray-100"
            loading="lazy"
            data-testid="user-avatar"
          />
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-ellipsis" data-testid="display-name">
              {post.author.displayName}
            </h3>
            
            {post.author.isVerified && (
              <span 
                className={`px-2 py-1 text-xs font-medium rounded-full border ${verificationBadgeClasses}`}
                title={`Verified ${post.author.verificationTier} account`}
                data-testid="verification-badge"
              >
                ✓ {post.author.verificationTier}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span data-testid="username">@{post.author.username}</span>
            <span>·</span>
            <time 
              dateTime={post.createdAt} 
              title={new Date(post.createdAt).toLocaleString()}
              data-testid="timestamp"
            >
              {formatTimeAgo(post.createdAt)}
            </time>
            <span>·</span>
            <span data-testid="follower-count">{post.followerCount} followers</span>
          </div>
        </div>
      </header>
      
      <div className="mb-4">
        <p className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap" data-testid="post-content">
          {post.content}
        </p>
        
        {post.hasMedia && (
          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700" data-testid="media-indicator">
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
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-smooth"
            aria-label={`View ${post.author.displayName}'s profile`}
            data-testid="view-profile-button"
          >
            View profile
          </button>
        </div>
      </footer>
    </article>
  )
}

// Test data fixtures
const mockPosts = {
  verifiedNotable: {
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
  },
  
  verifiedIdentity: {
    id: '2',
    author: {
      username: 'tech_mike',
      displayName: 'Mike Tech',
      avatar: '/api/placeholder/avatar/mike',
      isVerified: true,
      verificationTier: 'identity'
    },
    content: 'Deep dive into ActivityPub federation coming tomorrow.',
    createdAt: '2024-12-20T09:15:00Z',
    hasMedia: true,
    followerCount: 890
  },
  
  verifiedEmail: {
    id: '3',
    author: {
      username: 'new_creator',
      displayName: 'New Creator',
      avatar: '/api/placeholder/avatar/new',
      isVerified: true,
      verificationTier: 'email'
    },
    content: 'Hello fediverse! Just getting started.',
    createdAt: '2024-12-20T12:00:00Z',
    hasMedia: false,
    followerCount: 5
  },
  
  unverified: {
    id: '4',
    author: {
      username: 'artist_sam',
      displayName: 'Sam Artist',
      avatar: '/api/placeholder/avatar/sam',
      isVerified: false,
      verificationTier: null
    },
    content: 'New artwork finished! This piece represents the connection between technology and human creativity.',
    createdAt: '2024-12-20T08:45:00Z',
    hasMedia: true,
    followerCount: 340
  },
  
  longContent: {
    id: '5',
    author: {
      username: 'writer_alex',
      displayName: 'Alex Writer with a Very Long Display Name That Might Cause Overflow Issues',
      avatar: '/api/placeholder/avatar/alex',
      isVerified: true,
      verificationTier: 'identity'
    },
    content: 'This is a very long post content that should test how the component handles text wrapping and layout when there is a significant amount of text to display. '.repeat(3),
    createdAt: '2024-12-19T15:30:00Z',
    hasMedia: false,
    followerCount: 15000
  }
} as const

describe('PostCard Component', () => {
  // Clean up after each test
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render all required elements for a complete post', () => {
      render(<PostCard post={mockPosts.verifiedNotable} />)
      
      expect(screen.getByTestId('post-card')).toBeInTheDocument()
      expect(screen.getByTestId('user-avatar')).toBeInTheDocument()
      expect(screen.getByTestId('display-name')).toBeInTheDocument()
      expect(screen.getByTestId('username')).toBeInTheDocument()
      expect(screen.getByTestId('timestamp')).toBeInTheDocument()
      expect(screen.getByTestId('follower-count')).toBeInTheDocument()
      expect(screen.getByTestId('post-content')).toBeInTheDocument()
      expect(screen.getByTestId('view-profile-button')).toBeInTheDocument()
    })

    it('should display correct user information', () => {
      render(<PostCard post={mockPosts.verifiedNotable} />)
      
      expect(screen.getByTestId('display-name')).toHaveTextContent('Jane Creator')
      expect(screen.getByTestId('username')).toHaveTextContent('@creator_jane')
      expect(screen.getByTestId('follower-count')).toHaveTextContent('1250 followers')
      
      const avatar = screen.getByTestId('user-avatar')
      expect(avatar).toHaveAttribute('src', '/api/placeholder/avatar/jane')
      expect(avatar).toHaveAttribute('alt', 'Jane Creator avatar')
    })

    it('should display post content correctly', () => {
      render(<PostCard post={mockPosts.verifiedNotable} />)
      
      const content = screen.getByTestId('post-content')
      expect(content).toHaveTextContent('Just launched my new project! Excited to share this journey with everyone following from across the fediverse. 🚀')
    })
  })

  describe('Verification Badge Rendering', () => {
    it('should render notable verification badge with correct styling', () => {
      render(<PostCard post={mockPosts.verifiedNotable} />)
      
      const badge = screen.getByTestId('verification-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('✓ notable')
      expect(badge).toHaveClass('text-yellow-600', 'bg-yellow-50', 'border-yellow-200')
      expect(badge).toHaveAttribute('title', 'Verified notable account')
    })

    it('should render identity verification badge with correct styling', () => {
      render(<PostCard post={mockPosts.verifiedIdentity} />)
      
      const badge = screen.getByTestId('verification-badge')
      expect(badge).toHaveTextContent('✓ identity')
      expect(badge).toHaveClass('text-blue-600', 'bg-blue-50', 'border-blue-200')
      expect(badge).toHaveAttribute('title', 'Verified identity account')
    })

    it('should render email verification badge with correct styling', () => {
      render(<PostCard post={mockPosts.verifiedEmail} />)
      
      const badge = screen.getByTestId('verification-badge')
      expect(badge).toHaveTextContent('✓ email')
      expect(badge).toHaveClass('text-green-600', 'bg-green-50', 'border-green-200')
      expect(badge).toHaveAttribute('title', 'Verified email account')
    })

    it('should not render verification badge for unverified users', () => {
      render(<PostCard post={mockPosts.unverified} />)
      
      expect(screen.queryByTestId('verification-badge')).not.toBeInTheDocument()
    })
  })

  describe('Media Indicator', () => {
    it('should show media indicator when post has media', () => {
      render(<PostCard post={mockPosts.verifiedIdentity} />)
      
      const mediaIndicator = screen.getByTestId('media-indicator')
      expect(mediaIndicator).toBeInTheDocument()
      expect(screen.getByText('Media content')).toBeInTheDocument()
    })

    it('should not show media indicator when post has no media', () => {
      render(<PostCard post={mockPosts.verifiedNotable} />)
      
      expect(screen.queryByTestId('media-indicator')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases and Long Content', () => {
    it('should handle long display names without breaking layout', () => {
      render(<PostCard post={mockPosts.longContent} />)
      
      const displayName = screen.getByTestId('display-name')
      expect(displayName).toHaveTextContent('Alex Writer with a Very Long Display Name That Might Cause Overflow Issues')
      expect(displayName).toHaveClass('text-ellipsis')
    })

    it('should handle long content correctly', () => {
      render(<PostCard post={mockPosts.longContent} />)
      
      const content = screen.getByTestId('post-content')
      expect(content.textContent).toContain('This is a very long post content')
      expect(content).toHaveClass('whitespace-pre-wrap')
    })

    it('should format large follower counts correctly', () => {
      render(<PostCard post={mockPosts.longContent} />)
      
      expect(screen.getByTestId('follower-count')).toHaveTextContent('15000 followers')
    })

    it('should handle small follower counts correctly', () => {
      render(<PostCard post={mockPosts.verifiedEmail} />)
      
      expect(screen.getByTestId('follower-count')).toHaveTextContent('5 followers')
    })
  })

  describe('Accessibility Features', () => {
    it('should use proper semantic HTML structure', () => {
      render(<PostCard post={mockPosts.verifiedNotable} />)
      
      // Should use article element for semantic structure
      expect(screen.getByRole('article')).toBeInTheDocument()
      
      // Should have proper time element with datetime attribute
      const timeElement = screen.getByTestId('timestamp')
      expect(timeElement.tagName).toBe('TIME')
      expect(timeElement).toHaveAttribute('dateTime', '2024-12-20T10:30:00Z')
    })

    it('should have proper button labeling', () => {
      render(<PostCard post={mockPosts.verifiedNotable} />)
      
      const viewProfileButton = screen.getByTestId('view-profile-button')
      expect(viewProfileButton).toHaveAttribute('aria-label', "View Jane Creator's profile")
    })

    it('should have proper image alt text', () => {
      render(<PostCard post={mockPosts.verifiedNotable} />)
      
      const avatar = screen.getByTestId('user-avatar')
      expect(avatar).toHaveAttribute('alt', 'Jane Creator avatar')
    })
  })
})

describe('Utility Functions', () => {
  beforeEach(() => {
    // Set a fixed date for consistent testing
    vi.setSystemTime(new Date('2024-12-20T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatTimeAgo', () => {
    it('should return "just now" for very recent times', () => {
      expect(formatTimeAgo('2024-12-20T11:59:30Z')).toBe('just now')
      expect(formatTimeAgo('2024-12-20T11:59:59Z')).toBe('just now')
    })

    it('should return minutes for times within an hour', () => {
      expect(formatTimeAgo('2024-12-20T11:45:00Z')).toBe('15m ago')
      expect(formatTimeAgo('2024-12-20T11:30:00Z')).toBe('30m ago')
      expect(formatTimeAgo('2024-12-20T11:01:00Z')).toBe('59m ago')
    })

    it('should return hours for times within a day', () => {
      expect(formatTimeAgo('2024-12-20T10:00:00Z')).toBe('2h ago')
      expect(formatTimeAgo('2024-12-20T06:00:00Z')).toBe('6h ago')
      expect(formatTimeAgo('2024-12-20T01:00:00Z')).toBe('11h ago')
    })

    it('should return days for times within a week', () => {
      expect(formatTimeAgo('2024-12-19T12:00:00Z')).toBe('1d ago')
      expect(formatTimeAgo('2024-12-18T12:00:00Z')).toBe('2d ago')
      expect(formatTimeAgo('2024-12-14T12:00:00Z')).toBe('6d ago')
    })

    it('should return formatted date for older times', () => {
      const result = formatTimeAgo('2024-12-10T12:00:00Z')
      expect(result).toBe('Dec 10')
    })
  })

  describe('getVerificationBadgeColor', () => {
    it('should return yellow classes for notable tier', () => {
      expect(getVerificationBadgeColor('notable')).toBe('text-yellow-600 bg-yellow-50 border-yellow-200')
    })

    it('should return blue classes for identity tier', () => {
      expect(getVerificationBadgeColor('identity')).toBe('text-blue-600 bg-blue-50 border-blue-200')
    })

    it('should return green classes for email tier', () => {
      expect(getVerificationBadgeColor('email')).toBe('text-green-600 bg-green-50 border-green-200')
    })

    it('should return gray classes for null or unknown tiers', () => {
      expect(getVerificationBadgeColor(null)).toBe('text-gray-600 bg-gray-50 border-gray-200')
      expect(getVerificationBadgeColor('unknown')).toBe('text-gray-600 bg-gray-50 border-gray-200')
      expect(getVerificationBadgeColor('')).toBe('text-gray-600 bg-gray-50 border-gray-200')
    })
  })
})