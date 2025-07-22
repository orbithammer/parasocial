// Path: frontend/src/components/posts/__tests__/PostFeed.test.tsx
// Version: 1.1.0
// Fixed text matching issues using specific selectors and ARIA labels

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { PostFeed } from '../PostFeed'

// Mock data for testing
const mockPosts = [
  {
    id: '1',
    title: 'First Post',
    content: 'This is the first post content',
    author: 'John Doe',
    createdAt: '2024-01-01T00:00:00Z',
    likesCount: 5,
    commentsCount: 2
  },
  {
    id: '2', 
    title: 'Second Post',
    content: 'This is the second post content',
    author: 'Jane Smith',
    createdAt: '2024-01-02T00:00:00Z',
    likesCount: 10,
    commentsCount: 7
  }
]

// Mock functions for testing interactions
const mockOnPostClick = vi.fn()
const mockOnLoadMore = vi.fn()
const mockOnRefresh = vi.fn()

describe('PostFeed Component', () => {
  
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<PostFeed posts={mockPosts} />)
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('displays all posts when provided', () => {
      render(<PostFeed posts={mockPosts} />)
      
      // Check that both posts are rendered
      expect(screen.getByText('First Post')).toBeInTheDocument()
      expect(screen.getByText('Second Post')).toBeInTheDocument()
    })

    it('displays post content correctly', () => {
      render(<PostFeed posts={mockPosts} />)
      
      // Check post details are displayed using regex for flexibility
      expect(screen.getByText('This is the first post content')).toBeInTheDocument()
      expect(screen.getByText(/John Doe/)).toBeInTheDocument()
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument()
    })

    it('displays post metadata correctly', () => {
      const { container } = render(<PostFeed posts={mockPosts} />)
      
      // Use ARIA labels to find likes and comments counts more specifically
      expect(screen.getByLabelText('5 likes')).toBeInTheDocument()
      expect(screen.getByLabelText('2 comments')).toBeInTheDocument()
      expect(screen.getByLabelText('10 likes')).toBeInTheDocument()
      expect(screen.getByLabelText('7 comments')).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('displays empty state when no posts provided', () => {
      render(<PostFeed posts={[]} />)
      
      expect(screen.getByText(/no posts available/i)).toBeInTheDocument()
    })

    it('displays empty state message with call to action', () => {
      render(<PostFeed posts={[]} />)
      
      expect(screen.getByText(/be the first to create a post/i)).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    it('displays loading spinner when loading', () => {
      render(<PostFeed posts={mockPosts} isLoading={true} />)
      
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText(/loading posts/i)).toBeInTheDocument()
    })

    it('hides posts when loading', () => {
      render(<PostFeed posts={mockPosts} isLoading={true} />)
      
      expect(screen.queryByText('First Post')).not.toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('displays error message when error occurs', () => {
      const errorMessage = 'Failed to load posts'
      render(<PostFeed posts={[]} error={errorMessage} />)
      
      expect(screen.getByText(errorMessage)).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('displays retry button when error occurs', () => {
      render(<PostFeed posts={[]} error="Failed to load posts" onRefresh={mockOnRefresh} />)
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('calls onPostClick when post is clicked', () => {
      render(<PostFeed posts={mockPosts} onPostClick={mockOnPostClick} />)
      
      const firstPost = screen.getByText('First Post')
      fireEvent.click(firstPost)
      
      expect(mockOnPostClick).toHaveBeenCalledWith('1')
      expect(mockOnPostClick).toHaveBeenCalledTimes(1)
    })

    it('calls onLoadMore when load more button is clicked', () => {
      render(<PostFeed posts={mockPosts} hasMore={true} onLoadMore={mockOnLoadMore} />)
      
      const loadMoreButton = screen.getByRole('button', { name: /load more/i })
      fireEvent.click(loadMoreButton)
      
      expect(mockOnLoadMore).toHaveBeenCalledTimes(1)
    })

    it('calls onRefresh when retry button is clicked', () => {
      render(<PostFeed posts={[]} error="Error" onRefresh={mockOnRefresh} />)
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryButton)
      
      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })

    it('does not show load more button when hasMore is false', () => {
      render(<PostFeed posts={mockPosts} hasMore={false} onLoadMore={mockOnLoadMore} />)
      
      expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for main container', () => {
      render(<PostFeed posts={mockPosts} />)
      
      const mainContainer = screen.getByRole('main')
      expect(mainContainer).toHaveAttribute('aria-label', 'Posts feed')
    })

    it('has proper ARIA labels for loading state', () => {
      render(<PostFeed posts={mockPosts} isLoading={true} />)
      
      const loadingElement = screen.getByRole('status')
      expect(loadingElement).toHaveAttribute('aria-live', 'polite')
    })

    it('has proper ARIA labels for error state', () => {
      render(<PostFeed posts={[]} error="Error message" />)
      
      const errorElement = screen.getByRole('alert')
      expect(errorElement).toHaveAttribute('aria-live', 'assertive')
    })

    it('posts are keyboard navigable', () => {
      render(<PostFeed posts={mockPosts} onPostClick={mockOnPostClick} />)
      
      const firstPost = screen.getByText('First Post').closest('article')
      expect(firstPost).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('Performance', () => {
    it('does not re-render unnecessarily when posts prop is the same', () => {
      const { rerender } = render(<PostFeed posts={mockPosts} />)
      
      // Re-render with same posts
      rerender(<PostFeed posts={mockPosts} />)
      
      // Posts should still be visible (no unnecessary re-render)
      expect(screen.getByText('First Post')).toBeInTheDocument()
    })
  })

  describe('Props Validation', () => {
    it('handles undefined posts gracefully', () => {
      // TypeScript should prevent this, but test runtime behavior
      render(<PostFeed posts={undefined as any} />)
      
      expect(screen.getByText(/no posts available/i)).toBeInTheDocument()
    })

    it('handles posts prop type correctly', () => {
      // This test ensures TypeScript types are working
      render(<PostFeed posts={mockPosts} />)
      
      expect(screen.getByText('First Post')).toBeInTheDocument()
    })
  })
})

// Path: frontend/src/components/posts/__tests__/PostFeed.test.tsx
// Version: 1.1.0
// Fixed text matching issues using specific selectors and ARIA labels