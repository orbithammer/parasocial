// frontend/src/contexts/__tests__/PostContext.test.tsx
// Version: 1.1.0
// Added proper TypeScript types to fix implicit any errors

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { PostProvider, usePostContext } from '../PostContext'

// Define Post interface for testing
interface Post {
  id: string
  title: string
  content: string
}

// Mock fetch globally
global.fetch = vi.fn()

// Test component to access context values
const TestComponent = () => {
  const {
    posts,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    fetchPosts
  } = usePostContext()

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="error">{error || 'No Error'}</div>
      <div data-testid="posts-count">{posts.length}</div>
      
      {posts.map((post: Post) => (
        <div key={post.id} data-testid={`post-${post.id}`}>
          <h3>{post.title}</h3>
          <p>{post.content}</p>
        </div>
      ))}
      
      <button 
        onClick={() => createPost({ title: 'New Post', content: 'New Content' })}
        data-testid="create-post"
      >
        Create Post
      </button>
      
      <button 
        onClick={() => updatePost('1', { title: 'Updated Post', content: 'Updated Content' })}
        data-testid="update-post"
      >
        Update Post
      </button>
      
      <button 
        onClick={() => deletePost('1')}
        data-testid="delete-post"
      >
        Delete Post
      </button>
      
      <button 
        onClick={() => fetchPosts()}
        data-testid="fetch-posts"
      >
        Fetch Posts
      </button>
    </div>
  )
}

// Wrapper component for testing context provider
const ContextWrapper = ({ children }: { children: React.ReactNode }) => (
  <PostProvider>{children}</PostProvider>
)

describe('PostContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock before each test
    ;(global.fetch as any).mockReset()
  })

  describe('PostProvider', () => {
    it('should render children without crashing', () => {
      render(
        <ContextWrapper>
          <div data-testid="child">Test Child</div>
        </ContextWrapper>
      )
      
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should provide initial context values', () => {
      render(
        <ContextWrapper>
          <TestComponent />
        </ContextWrapper>
      )
      
      // Check initial state
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      expect(screen.getByTestId('error')).toHaveTextContent('No Error')
      expect(screen.getByTestId('posts-count')).toHaveTextContent('0')
    })
  })

  describe('usePostContext', () => {
    it('should throw error when used outside PostProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error
      console.error = vi.fn()
      
      expect(() => {
        render(<TestComponent />)
      }).toThrow()
      
      console.error = originalError
    })
  })

  describe('fetchPosts', () => {
    it('should fetch posts successfully', async () => {
      const mockPosts = [
        { id: '1', title: 'Post 1', content: 'Content 1' },
        { id: '2', title: 'Post 2', content: 'Content 2' }
      ]
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPosts
      })
      
      render(
        <ContextWrapper>
          <TestComponent />
        </ContextWrapper>
      )
      
      const fetchButton = screen.getByTestId('fetch-posts')
      await userEvent.click(fetchButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('posts-count')).toHaveTextContent('2')
      })
      
      expect(screen.getByTestId('post-1')).toBeInTheDocument()
      expect(screen.getByTestId('post-2')).toBeInTheDocument()
    })

    it('should handle fetch error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))
      
      render(
        <ContextWrapper>
          <TestComponent />
        </ContextWrapper>
      )
      
      const fetchButton = screen.getByTestId('fetch-posts')
      await userEvent.click(fetchButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('No Error')
      })
    })

    it('should set loading state during fetch', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: any) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      
      ;(global.fetch as any).mockReturnValueOnce(promise)
      
      render(
        <ContextWrapper>
          <TestComponent />
        </ContextWrapper>
      )
      
      const fetchButton = screen.getByTestId('fetch-posts')
      await userEvent.click(fetchButton)
      
      // Should be loading
      expect(screen.getByTestId('loading')).toHaveTextContent('Loading')
      
      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => []
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
      })
    })
  })

  describe('createPost', () => {
    it('should create a new post successfully', async () => {
      const newPost = { id: '1', title: 'New Post', content: 'New Content' }
      
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => newPost
      })
      
      render(
        <ContextWrapper>
          <TestComponent />
        </ContextWrapper>
      )
      
      const createButton = screen.getByTestId('create-post')
      await userEvent.click(createButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('posts-count')).toHaveTextContent('1')
      })
      
      expect(screen.getByTestId('post-1')).toBeInTheDocument()
      expect(screen.getByText('New Post')).toBeInTheDocument()
    })

    it('should handle create post error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Create failed'))
      
      render(
        <ContextWrapper>
          <TestComponent />
        </ContextWrapper>
      )
      
      const createButton = screen.getByTestId('create-post')
      await userEvent.click(createButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('No Error')
      })
    })
  })

  describe('updatePost', () => {
    it('should update an existing post successfully', async () => {
      // First, set up initial posts
      const initialPosts = [
        { id: '1', title: 'Original Post', content: 'Original Content' }
      ]
      
      const updatedPost = { id: '1', title: 'Updated Post', content: 'Updated Content' }
      
      // Mock initial fetch
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialPosts
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => updatedPost
        })
      
      render(
        <ContextWrapper>
          <TestComponent />
        </ContextWrapper>
      )
      
      // Fetch initial posts
      const fetchButton = screen.getByTestId('fetch-posts')
      await userEvent.click(fetchButton)
      
      await waitFor(() => {
        expect(screen.getByText('Original Post')).toBeInTheDocument()
      })
      
      // Update the post
      const updateButton = screen.getByTestId('update-post')
      await userEvent.click(updateButton)
      
      await waitFor(() => {
        expect(screen.getByText('Updated Post')).toBeInTheDocument()
      })
      
      expect(screen.queryByText('Original Post')).not.toBeInTheDocument()
    })

    it('should handle update post error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Update failed'))
      
      render(
        <ContextWrapper>
          <TestComponent />
        </ContextWrapper>
      )
      
      const updateButton = screen.getByTestId('update-post')
      await userEvent.click(updateButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('No Error')
      })
    })
  })

  describe('deletePost', () => {
    it('should delete a post successfully', async () => {
      // Set up initial posts
      const initialPosts = [
        { id: '1', title: 'Post to Delete', content: 'Content to Delete' },
        { id: '2', title: 'Post to Keep', content: 'Content to Keep' }
      ]
      
      // Mock initial fetch and delete
      ;(global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initialPosts
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        })
      
      render(
        <ContextWrapper>
          <TestComponent />
        </ContextWrapper>
      )
      
      // Fetch initial posts
      const fetchButton = screen.getByTestId('fetch-posts')
      await userEvent.click(fetchButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('posts-count')).toHaveTextContent('2')
      })
      
      // Delete a post
      const deleteButton = screen.getByTestId('delete-post')
      await userEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('posts-count')).toHaveTextContent('1')
      })
      
      expect(screen.queryByTestId('post-1')).not.toBeInTheDocument()
      expect(screen.getByTestId('post-2')).toBeInTheDocument()
    })

    it('should handle delete post error', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Delete failed'))
      
      render(
        <ContextWrapper>
          <TestComponent />
        </ContextWrapper>
      )
      
      const deleteButton = screen.getByTestId('delete-post')
      await userEvent.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('No Error')
      })
    })
  })

  describe('error handling', () => {
    it('should clear error state when a successful operation occurs after an error', async () => {
      // First, cause an error
      ;(global.fetch as any).mockRejectedValueOnce(new Error('First error'))
      
      render(
        <ContextWrapper>
          <TestComponent />
        </ContextWrapper>
      )
      
      const fetchButton = screen.getByTestId('fetch-posts')
      await userEvent.click(fetchButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).not.toHaveTextContent('No Error')
      })
      
      // Then, perform a successful operation
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      
      await userEvent.click(fetchButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('No Error')
      })
    })
  })
})

// frontend/src/contexts/__tests__/PostContext.test.tsx
// Version: 1.0.0
// Initial test suite for PostContext with comprehensive coverage