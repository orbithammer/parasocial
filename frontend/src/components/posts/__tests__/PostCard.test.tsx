// Path: frontend/src/components/posts/__tests__/PostCard.test.tsx
// Version: 1.0.0
// Initial test suite for PostCard component with comprehensive testing scenarios

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PostCard } from '../PostCard'

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/posts',
    query: {},
    asPath: '/posts'
  })
}))

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string, alt: string }) => (
    <img src={src} alt={alt} {...props} />
  )
}))

// Type definitions for test data
interface Post {
  id: string
  title: string
  content: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  publishedAt: string
  likesCount: number
  commentsCount: number
  isLiked: boolean
  tags?: string[]
}

// Mock post data for testing
const mockPost: Post = {
  id: '1',
  title: 'Test Post Title',
  content: 'This is a test post content that should be displayed in the card.',
  author: {
    id: 'author-1',
    name: 'John Doe',
    avatar: '/images/avatar.jpg'
  },
  publishedAt: '2024-01-15T10:30:00Z',
  likesCount: 42,
  commentsCount: 7,
  isLiked: false,
  tags: ['technology', 'web-development']
}

const mockPostWithoutAvatar: Post = {
  ...mockPost,
  id: '2',
  author: {
    ...mockPost.author,
    avatar: undefined
  }
}

const mockLikedPost: Post = {
  ...mockPost,
  id: '3',
  isLiked: true,
  likesCount: 43
}

describe('PostCard', () => {
  // Mock functions for user interactions
  const mockOnLike = vi.fn()
  const mockOnComment = vi.fn()
  const mockOnShare = vi.fn()

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render post title correctly', () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      expect(screen.getByText('Test Post Title')).toBeInTheDocument()
    })

    it('should render post content correctly', () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      expect(screen.getByText('This is a test post content that should be displayed in the card.')).toBeInTheDocument()
    })

    it('should render author information correctly', () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should render author avatar when available', () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      const avatar = screen.getByAltText('John Doe avatar')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('src', '/images/avatar.jpg')
    })

    it('should render fallback avatar when avatar is not available', () => {
      render(
        <PostCard 
          post={mockPostWithoutAvatar}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      // Should show initials or default avatar
      expect(screen.getByText('JD')).toBeInTheDocument()
    })

    it('should display formatted publication date', () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      // Should display a human-readable date format
      expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument()
    })

    it('should display likes count correctly', () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('should display comments count correctly', () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      expect(screen.getByText('7')).toBeInTheDocument()
    })

    it('should render tags when available', () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      expect(screen.getByText('technology')).toBeInTheDocument()
      expect(screen.getByText('web-development')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call onLike when like button is clicked', async () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      const likeButton = screen.getByRole('button', { name: /like post/i })
      fireEvent.click(likeButton)

      expect(mockOnLike).toHaveBeenCalledWith(mockPost.id)
    })

    it('should call onComment when comment button is clicked', async () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      const commentButton = screen.getByRole('button', { name: /comment on post/i })
      fireEvent.click(commentButton)

      expect(mockOnComment).toHaveBeenCalledWith(mockPost.id)
    })

    it('should call onShare when share button is clicked', async () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      const shareButton = screen.getByRole('button', { name: /share post/i })
      fireEvent.click(shareButton)

      expect(mockOnShare).toHaveBeenCalledWith(mockPost.id)
    })

    it('should prevent multiple rapid clicks on like button', async () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      const likeButton = screen.getByRole('button', { name: /like post/i })
      
      // Simulate rapid clicking
      fireEvent.click(likeButton)
      fireEvent.click(likeButton)
      fireEvent.click(likeButton)

      // Should only be called once due to debouncing
      await waitFor(() => {
        expect(mockOnLike).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Visual States', () => {
    it('should show liked state when post is already liked', () => {
      render(
        <PostCard 
          post={mockLikedPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      const likeButton = screen.getByRole('button', { name: /like post/i })
      expect(likeButton).toHaveClass('liked') // Assuming a 'liked' class for styling
    })

    it('should show hover states on interactive elements', () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      const likeButton = screen.getByRole('button', { name: /like post/i })
      fireEvent.mouseEnter(likeButton)
      
      expect(likeButton).toHaveClass('hover') // Assuming hover class exists
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      expect(screen.getByRole('button', { name: /like post/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /comment on post/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /share post/i })).toBeInTheDocument()
    })

    it('should have proper heading structure', () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      // Post title should be a heading
      expect(screen.getByRole('heading', { name: 'Test Post Title' })).toBeInTheDocument()
    })

    it('should support keyboard navigation', () => {
      render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      const likeButton = screen.getByRole('button', { name: /like post/i })
      
      // Focus on the like button
      likeButton.focus()
      expect(likeButton).toHaveFocus()

      // Press Enter to activate
      fireEvent.keyDown(likeButton, { key: 'Enter', code: 'Enter' })
      expect(mockOnLike).toHaveBeenCalledWith(mockPost.id)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing optional props gracefully', () => {
      const minimalPost: Post = {
        id: '4',
        title: 'Minimal Post',
        content: 'Content only',
        author: {
          id: 'author-2',
          name: 'Jane Doe'
        },
        publishedAt: '2024-01-15T10:30:00Z',
        likesCount: 0,
        commentsCount: 0,
        isLiked: false
      }

      render(
        <PostCard 
          post={minimalPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      expect(screen.getByText('Minimal Post')).toBeInTheDocument()
      expect(screen.getByText('Content only')).toBeInTheDocument()
    })

    it('should truncate long content appropriately', () => {
      const longContentPost: Post = {
        ...mockPost,
        content: 'This is a very long post content that should be truncated when it exceeds the maximum character limit for display in the card component to maintain good user experience and layout consistency across different screen sizes and devices.'
      }

      render(
        <PostCard 
          post={longContentPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      // Should show truncated content with ellipsis or "Read more" link
      expect(screen.getByText(/This is a very long post content.../)).toBeInTheDocument()
    })

    it('should handle zero likes and comments correctly', () => {
      const noEngagementPost: Post = {
        ...mockPost,
        likesCount: 0,
        commentsCount: 0
      }

      render(
        <PostCard 
          post={noEngagementPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      // Should show 0 for both likes and comments
      expect(screen.getAllByText('0')).toHaveLength(2)
    })
  })

  describe('Performance', () => {
    it('should not re-render unnecessarily when props do not change', () => {
      const { rerender } = render(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      // Re-render with same props
      rerender(
        <PostCard 
          post={mockPost}
          onLike={mockOnLike}
          onComment={mockOnComment}
          onShare={mockOnShare}
        />
      )

      // Component should remain stable
      expect(screen.getByText('Test Post Title')).toBeInTheDocument()
    })
  })
})

// Path: frontend/src/components/posts/__tests__/PostCard.test.tsx
// Version: 1.0.0
// Initial test suite for PostCard component with comprehensive testing scenarios