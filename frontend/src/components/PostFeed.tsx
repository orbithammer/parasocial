// frontend/src/components/PostFeed.tsx
// Feed component for displaying posts with pagination and real-time updates

'use client'

import { useState, useEffect, useCallback } from 'react'

// Types for the post feed
interface Author {
  id: string
  username: string
  displayName: string
  avatar: string | null
  isVerified: boolean
  verificationTier?: string
}

interface MediaAttachment {
  id: string
  url: string
  altText: string | null
  mimeType: string
  width?: number
  height?: number
}

interface Post {
  id: string
  content: string
  contentWarning: string | null
  createdAt: string
  publishedAt: string | null
  author: Author
  media: MediaAttachment[]
}

interface PostFeedResponse {
  success: boolean
  data?: {
    posts: Post[]
    pagination: {
      currentPage: number
      totalPages: number
      totalPosts: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
  error?: string
}

interface PostFeedProps {
  className?: string
  postsPerPage?: number
  refreshTrigger?: number // Prop to trigger refresh from parent
  onPostClick?: (post: Post) => void
}

export default function PostFeed({ 
  className = '', 
  postsPerPage = 20,
  refreshTrigger = 0,
  onPostClick 
}: PostFeedProps) {
  // State management
  const [posts, setPosts] = useState<Post[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 0,
    totalPosts: 0,
    hasNext: false,
    hasPrev: false
  })
  
  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  // Configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const MAX_RETRY_ATTEMPTS = 3

  // Format relative time
  const formatRelativeTime = useCallback((dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString()
  }, [])

  // Fetch posts from API
  const fetchPosts = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      setError('')

      // Get auth token for optional authentication
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(
        `${API_BASE_URL}/api/v1/posts?page=${page}&limit=${postsPerPage}`,
        { headers }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result: PostFeedResponse = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch posts')
      }

      const { posts: newPosts, pagination: newPagination } = result.data

      if (append) {
        // Append new posts for "load more" functionality
        setPosts(prevPosts => [...prevPosts, ...newPosts])
      } else {
        // Replace posts for fresh load or page change
        setPosts(newPosts)
      }

      setPagination(newPagination)
      setCurrentPage(page)
      setRetryCount(0) // Reset retry count on success

    } catch (error) {
      console.error('Failed to fetch posts:', error)
      setError(error instanceof Error ? error.message : 'Failed to load posts')
      
      // Don't show error immediately, allow for retry
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          fetchPosts(page, append)
        }, 1000 * Math.pow(2, retryCount)) // Exponential backoff
      }
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [API_BASE_URL, postsPerPage, retryCount])

  // Load more posts
  const loadMorePosts = useCallback(() => {
    if (pagination.hasNext && !isLoadingMore) {
      fetchPosts(currentPage + 1, true)
    }
  }, [pagination.hasNext, isLoadingMore, currentPage, fetchPosts])

  // Refresh posts
  const refreshPosts = useCallback(() => {
    setCurrentPage(1)
    fetchPosts(1, false)
  }, [fetchPosts])

  // Initial load and refresh trigger effect
  useEffect(() => {
    fetchPosts(1, false)
  }, [refreshTrigger]) // Refresh when parent triggers it

  // Initial load only
  useEffect(() => {
    fetchPosts(1, false)
  }, []) // Only run once on mount

  // Render individual post
  const renderPost = useCallback((post: Post) => (
    <article 
      key={post.id}
      onClick={() => onPostClick?.(post)}
      className={`
        bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 
        p-6 shadow-sm hover:shadow-md transition-shadow duration-200
        ${onPostClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750' : ''}
      `}
    >
      {/* Author Info */}
      <header className="flex items-center space-x-3 mb-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {post.author.avatar ? (
            <img
              src={post.author.avatar}
              alt={`${post.author.displayName}'s avatar`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                {post.author.displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Author Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {post.author.displayName}
            </h3>
            {post.author.isVerified && (
              <svg 
                className="w-4 h-4 text-blue-500" 
                fill="currentColor" 
                viewBox="0 0 20 20"
                aria-label="Verified account"
              >
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <span>@{post.author.username}</span>
            <span>•</span>
            <time dateTime={post.publishedAt || post.createdAt}>
              {formatRelativeTime(post.publishedAt || post.createdAt)}
            </time>
          </div>
        </div>
      </header>

      {/* Content Warning */}
      {post.contentWarning && (
        <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Content Warning: {post.contentWarning}
            </span>
          </div>
        </div>
      )}

      {/* Post Content */}
      <div className="prose dark:prose-invert max-w-none mb-4">
        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Media Attachments */}
      {post.media && post.media.length > 0 && (
        <div className="mt-4 space-y-2">
          {post.media.map((media) => (
            <div key={media.id} className="rounded-lg overflow-hidden">
              {media.mimeType.startsWith('image/') ? (
                <img
                  src={media.url}
                  alt={media.altText || 'Image attachment'}
                  className="w-full max-h-96 object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Media attachment: {media.mimeType}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  ), [formatRelativeTime, onPostClick])

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Feed Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Latest Posts
          </h2>
          {pagination.totalPosts > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {pagination.totalPosts} post{pagination.totalPosts !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        
        <button
          onClick={refreshPosts}
          disabled={isLoading}
          className="
            px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 
            rounded-md shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 
            disabled:opacity-50 disabled:cursor-not-allowed
            dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700
          "
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {/* Error State */}
      {error && retryCount >= MAX_RETRY_ATTEMPTS && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => {
                setRetryCount(0)
                refreshPosts()
              }}
              className="ml-4 text-sm font-medium text-red-800 hover:text-red-900"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && posts.length === 0 ? (
        renderLoadingSkeleton()
      ) : (
        <>
          {/* Posts List */}
          {posts.length > 0 ? (
            <div className="space-y-6">
              {posts.map(renderPost)}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1l-4 4z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No posts yet</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Be the first to share something!
              </p>
            </div>
          )}

          {/* Load More Button */}
          {pagination.hasNext && (
            <div className="flex justify-center pt-6">
              <button
                onClick={loadMorePosts}
                disabled={isLoadingMore}
                className="
                  px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent 
                  rounded-md shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {isLoadingMore ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : (
                  `Load More Posts (${pagination.totalPages - pagination.currentPage} more page${pagination.totalPages - pagination.currentPage !== 1 ? 's' : ''})`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}