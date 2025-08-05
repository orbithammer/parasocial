// frontend/src/hooks/usePostCreation.ts
// Version: 1.1.0
// Custom hook for post creation with API integration and error handling
// Changed: Added useAuth integration and fixed CreatePostRequest type matching

import { useState, useCallback } from 'react'
import { postService } from '@/services/postService'
import { useAuth } from '@/contexts/AuthContext'

// Type definitions for post creation
interface PostCreationData {
  content: string
  contentWarning?: string
  hasContentWarning: boolean
  scheduledTime?: string
  mediaAttachments: string[]
}

interface PostCreationResult {
  success: boolean
  postId?: string
  error?: string
}

interface UsePostCreationReturn {
  createPost: (data: PostCreationData) => Promise<PostCreationResult>
  isCreating: boolean
  lastError: string | null
  clearError: () => void
}

/**
 * Custom hook for handling post creation functionality
 * Integrates with backend API and provides loading/error states
 */
export function usePostCreation(): UsePostCreationReturn {
  const [isCreating, setIsCreating] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)
  const { user } = useAuth()

  /**
   * Creates a new post by calling the backend API
   * @param data - Post creation data from the form
   * @returns Promise with creation result
   */
  const createPost = useCallback(async (data: PostCreationData): Promise<PostCreationResult> => {
    setIsCreating(true)
    setLastError(null)

    try {
      // Validate content is not empty
      if (!data.content.trim()) {
        throw new Error('Post content cannot be empty')
      }

      // Get current user ID for the post
      if (!user?.id) {
        throw new Error('User must be logged in to create posts')
      }

      // Prepare post data for API call matching CreatePostRequest interface
      const postData = {
        title: data.content.substring(0, 50) + (data.content.length > 50 ? '...' : ''), // Generate title from content
        content: data.content.trim(),
        authorId: user.id,
        published: !Boolean(data.scheduledTime), // Unpublished if scheduled
        tags: [] // Default empty tags
      }

      // Call the backend API to create the post
      const createdPost = await postService.createPost(postData)

      return {
        success: true,
        postId: createdPost.id
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create post'
      setLastError(errorMessage)

      return {
        success: false,
        error: errorMessage
      }

    } finally {
      setIsCreating(false)
    }
  }, [user])

  /**
   * Clears the last error state
   */
  const clearError = useCallback(() => {
    setLastError(null)
  }, [])

  return {
    createPost,
    isCreating,
    lastError,
    clearError
  }
}

// frontend/src/hooks/usePostCreation.ts
// Version: 1.0.0
// Custom hook for post creation with API integration and error handling