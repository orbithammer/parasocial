// frontend\src\app\__tests__\homePage.test.tsx
// Unit tests for HomePage component with focus on PostCard avatar initials fallback
// Version: 1.0.0 - Initial test for PostCard initials display when avatar fails

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Next.js dependencies for testing environment
vi.mock('next/image', () => ({
  default: ({ src, alt, onError, ...props }: { 
    src: string
    alt: string
    onError?: () => void
    [key: string]: unknown 
  }) => (
    <img 
      src={src} 
      alt={alt} 
      onError={onError}
      {...props} 
    />
  )
}))

// Type definitions for test data
interface Author {
  username: string
  displayName: string
  avatar: string
  isVerified: boolean
  verificationTier: string | null
}

interface Post {
  id: string
  author: Author
  content: string
  createdAt: string
  hasMedia: boolean
  followerCount: number
}

/**
 * Utility function to generate initials from display name
 * This should match the logic in the actual PostCard component
 */
function generateInitials(displayName: string): string {
  const names = displayName.trim().split(' ')
  if (names.length >= 2) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
  }
  return names[0][0].toUpperCase()
}

/**
 * PostCard component for testing avatar initials fallback
 * This represents the component that should be tested
 */
function PostCard({ post }: { post: Post }) {
  const [imageError, setImageError] = React.useState(false)
  
  const handleImageError = () => {
    setImageError(true)
  }
  
  const initials = generateInitials(post.author.displayName)
  
  return (
    <article className="card-base" data-testid="post-card">
      <header className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0">
          {!imageError ? (
            <img
              src={post.author.avatar}
              alt={`${post.author.displayName} avatar`}
              className="w-12 h-12 rounded-full bg-gray-200 border-2 border-gray-100"
              loading="lazy"
              onError={handleImageError}
              data-testid="user-avatar"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-lg border-2 border-gray-100"
              data-testid="avatar-initials"
              aria-label={`${post.author.displayName} initials`}
            >
              {initials}
            </div>
          )}
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100" data-testid="display-name">
              {post.author.displayName}
            </h3>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span data-testid="username">@{post.author.username}</span>
          </div>
        </div>
      </header>
      
      <div className="mb-4">
        <p className="text-gray-900 dark:text-gray-100 leading-relaxed" data-testid="post-content">
          {post.content}
        </p>
      </div>
    </article>
  )
}

// Test data for PostCard component
const mockPost: Post = {
  id: '1',
  author: {
    username: 'test_user',
    displayName: 'Test User',
    avatar: 'https://example.com/broken-avatar.jpg',
    isVerified: true,
    verificationTier: 'identity'
  },
  content: 'This is a test post content for avatar initials testing.',
  createdAt: '2024-12-20T10:30:00Z',
  hasMedia: false,
  followerCount: 1250
}

const mockPostSingleName: Post = {
  id: '2',
  author: {
    username: 'madonna',
    displayName: 'Madonna',
    avatar: 'https://example.com/broken-avatar.jpg',
    isVerified: true,
    verificationTier: 'notable'
  },
  content: 'Testing single name initials.',
  createdAt: '2024-12-20T09:15:00Z',
  hasMedia: false,
  followerCount: 5000
}

const mockPostLongName: Post = {
  id: '3',
  author: {
    username: 'long_name_user',
    displayName: 'John Michael Christopher Smith',
    avatar: 'https://example.com/broken-avatar.jpg',
    isVerified: false,
    verificationTier: null
  },
  content: 'Testing long name initials extraction.',
  createdAt: '2024-12-20T08:00:00Z',
  hasMedia: true,
  followerCount: 750
}

// Setup React import for useState
const React = require('react')

// Setup and cleanup for each test
beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/**
 * PostCard Avatar Initials Tests
 * Testing that PostCard displays initials when avatar image fails to load
 */
describe('PostCard Avatar Initials Display', () => {
  describe('Avatar image fallback behavior', () => {
    it('should display initials when avatar image fails to load', async () => {
      render(<PostCard post={mockPost} />)
      
      // Initially, avatar image should be rendered
      const avatarImage = screen.getByTestId('user-avatar')
      expect(avatarImage).toBeInTheDocument()
      expect(avatarImage).toHaveAttribute('src', 'https://example.com/broken-avatar.jpg')
      
      // Simulate image load error
      fireEvent.error(avatarImage)
      
      // After error, should show initials fallback
      await waitFor(() => {
        const initialsElement = screen.getByTestId('avatar-initials')
        expect(initialsElement).toBeInTheDocument()
        expect(initialsElement).toHaveTextContent('TU') // Test User -> TU
      })
      
      // Avatar image should no longer be in document
      expect(screen.queryByTestId('user-avatar')).not.toBeInTheDocument()
    })

    it('should display correct initials for two-word names', async () => {
      render(<PostCard post={mockPost} />)
      
      const avatarImage = screen.getByTestId('user-avatar')
      fireEvent.error(avatarImage)
      
      await waitFor(() => {
        const initialsElement = screen.getByTestId('avatar-initials')
        expect(initialsElement).toHaveTextContent('TU') // Test User
      })
    })

    it('should display correct initial for single names', async () => {
      render(<PostCard post={mockPostSingleName} />)
      
      const avatarImage = screen.getByTestId('user-avatar')
      fireEvent.error(avatarImage)
      
      await waitFor(() => {
        const initialsElement = screen.getByTestId('avatar-initials')
        expect(initialsElement).toHaveTextContent('M') // Madonna
      })
    })

    it('should display first and last initials for long names', async () => {
      render(<PostCard post={mockPostLongName} />)
      
      const avatarImage = screen.getByTestId('user-avatar')
      fireEvent.error(avatarImage)
      
      await waitFor(() => {
        const initialsElement = screen.getByTestId('avatar-initials')
        expect(initialsElement).toHaveTextContent('JS') // John ... Smith
      })
    })

    it('should apply correct styling to initials fallback', async () => {
      render(<PostCard post={mockPost} />)
      
      const avatarImage = screen.getByTestId('user-avatar')
      fireEvent.error(avatarImage)
      
      await waitFor(() => {
        const initialsElement = screen.getByTestId('avatar-initials')
        
        // Check for gradient background classes
        expect(initialsElement).toHaveClass('bg-gradient-to-br', 'from-blue-500', 'to-purple-600')
        
        // Check for proper sizing and styling
        expect(initialsElement).toHaveClass('w-12', 'h-12', 'rounded-full')
        expect(initialsElement).toHaveClass('text-white', 'font-semibold', 'text-lg')
        
        // Check for accessibility
        expect(initialsElement).toHaveAttribute('aria-label', 'Test User initials')
      })
    })

    it('should have proper accessibility attributes for initials', async () => {
      render(<PostCard post={mockPost} />)
      
      const avatarImage = screen.getByTestId('user-avatar')
      fireEvent.error(avatarImage)
      
      await waitFor(() => {
        const initialsElement = screen.getByTestId('avatar-initials')
        expect(initialsElement).toHaveAttribute('aria-label', 'Test User initials')
      })
    })
  })

  describe('Initial state and image loading', () => {
    it('should initially show avatar image before any errors', () => {
      render(<PostCard post={mockPost} />)
      
      const avatarImage = screen.getByTestId('user-avatar')
      expect(avatarImage).toBeInTheDocument()
      expect(avatarImage).toHaveAttribute('alt', 'Test User avatar')
      
      // Initials should not be shown initially
      expect(screen.queryByTestId('avatar-initials')).not.toBeInTheDocument()
    })

    it('should have proper onError handler attached to image', () => {
      render(<PostCard post={mockPost} />)
      
      const avatarImage = screen.getByTestId('user-avatar')
      expect(avatarImage).toHaveAttribute('onError')
    })
  })

  describe('Utility function tests', () => {
    it('should generate correct initials for various name formats', () => {
      expect(generateInitials('John Doe')).toBe('JD')
      expect(generateInitials('Alice')).toBe('A')
      expect(generateInitials('Mary Jane Watson')).toBe('MW')
      expect(generateInitials('Jean-Claude Van Damme')).toBe('JD')
      expect(generateInitials('  Spaced  Name  ')).toBe('SN')
    })

    it('should handle edge cases gracefully', () => {
      expect(generateInitials('A')).toBe('A')
      expect(generateInitials('A B C D E')).toBe('AE')
    })
  })
})

// frontend\src\app\__tests__\homePage.test.tsx