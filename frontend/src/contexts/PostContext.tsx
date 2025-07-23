// frontend/src/contexts/PostContext.tsx
// Version: 1.0.0
// React context for managing post data with CRUD operations

'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

// Post interface definition
export interface Post {
  id: string
  title: string
  content: string
}

// Input types for post operations
export interface CreatePostInput {
  title: string
  content: string
}

export interface UpdatePostInput {
  title?: string
  content?: string
}

// Context value interface
interface PostContextValue {
  posts: Post[]
  loading: boolean
  error: string | null
  createPost: (input: CreatePostInput) => Promise<void>
  updatePost: (id: string, input: UpdatePostInput) => Promise<void>
  deletePost: (id: string) => Promise<void>
  fetchPosts: () => Promise<void>
}

// Create context with undefined default (will throw if used outside provider)
const PostContext = createContext<PostContextValue | undefined>(undefined)

// Custom hook to use post context
export const usePostContext = (): PostContextValue => {
  const context = useContext(PostContext)
  if (context === undefined) {
    throw new Error('usePostContext must be used within a PostProvider')
  }
  return context
}

// Provider props interface
interface PostProviderProps {
  children: ReactNode
}

// Post context provider component
export const PostProvider: React.FC<PostProviderProps> = ({ children }) => {
  // State management
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // API base URL (could be moved to environment variable)
  const API_BASE = '/api/posts'

  // Helper function to handle API errors
  const handleError = (error: unknown): void => {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    setError(errorMessage)
    setLoading(false)
  }

  // Helper function to clear error state
  const clearError = (): void => {
    setError(null)
  }

  // Fetch all posts
  const fetchPosts = async (): Promise<void> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await fetch(API_BASE)
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.status}`)
      }
      
      const fetchedPosts: Post[] = await response.json()
      setPosts(fetchedPosts)
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  // Create a new post
  const createPost = async (input: CreatePostInput): Promise<void> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create post: ${response.status}`)
      }
      
      const newPost: Post = await response.json()
      setPosts(prevPosts => [...prevPosts, newPost])
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  // Update an existing post
  const updatePost = async (id: string, input: UpdatePostInput): Promise<void> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update post: ${response.status}`)
      }
      
      const updatedPost: Post = await response.json()
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === id ? updatedPost : post
        )
      )
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  // Delete a post
  const deletePost = async (id: string): Promise<void> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error(`Failed to delete post: ${response.status}`)
      }
      
      setPosts(prevPosts => prevPosts.filter(post => post.id !== id))
    } catch (error) {
      handleError(error)
    } finally {
      setLoading(false)
    }
  }

  // Context value object
  const contextValue: PostContextValue = {
    posts,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    fetchPosts,
  }

  return (
    <PostContext.Provider value={contextValue}>
      {children}
    </PostContext.Provider>
  )
}

// frontend/src/contexts/PostContext.tsx
// Version: 1.0.0
// React context for managing post data with CRUD operations