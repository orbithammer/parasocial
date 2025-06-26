'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle, Clock, Verified, MoreHorizontal, Heart, MessageCircle, Share, Bookmark } from 'lucide-react'

/**
 * Post data interface
 */
interface Post {
  id: string
  content: string
  contentWarning?: string | null
  createdAt: string
  publishedAt?: string | null
  author: {
    id: string
    username: string
    displayName: string
    avatar?: string | null
    isVerified: boolean
    verificationTier?: string
  }
  media?: Array<{
    id: string
    url: string
    altText?: string | null
    mimeType: string
    width?: number | null
    height?: number | null
  }>
}

/**
 * API response interface
 */
interface PostFeedResponse {
  success: boolean
  data: {
    posts: Post[]
    pagination: {
      currentPage: number
      totalPages: number
      totalPosts: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
}

/**
 * Props for PostFeed component
 */
interface PostFeedProps {
  apiUrl?: string
  className?: string
  postsPerPage?: number
}

/**
 * Individual post card component
 */
function PostCard({ post }: { post: Post }) {
  const [showFullContent, setShowFullContent] = useState(!post.contentWarning)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  /**
   * Get user avatar or generate initials
   */
  const getAvatarContent = () => {
    if (post.author.avatar) {
      return (
        <img 
          src={post.author.avatar} 
          alt={`${post.author.displayName}'s avatar`}
          className="w-full h-full object-cover"
        />
      )
    }
    
    const initials = post.author.displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
    
    return (
      <span className="text-white font-semibold text-sm">
        {initials}
      </span>
    )
  }

  return (
    <article className="bg-white border-b border-gray-200 p-6 hover:bg-gray-50/50 transition-colors duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {getAvatarContent()}
          </div>
          
          {/* User Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {post.author.displayName}
              </h3>
              {post.author.isVerified && (
                <Verified className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>@{post.author.username}</span>
              <span>·</span>
              <time dateTime={post.publishedAt || post.createdAt}>
                {formatRelativeTime(post.publishedAt || post.createdAt)}
              </time>
            </div>
          </div>
        </div>

        {/* More Menu */}
        <button className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Content Warning */}
      {post.contentWarning && !showFullContent && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-amber-800">Content Warning</span>
          </div>
          <p className="text-amber-700 text-sm mb-3">{post.contentWarning}</p>
          <button
            onClick={() => setShowFullContent(true)}
            className="text-amber-800 text-sm font-medium hover:text-amber-900 transition-colors"
          >
            Show content
          </button>
        </div>
      )}

      {/* Post Content */}
      {showFullContent && (
        <div className="mb-4">
          <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>
          
          {/* Media Attachments */}
          {post.media && post.media.length > 0 && (
            <div className="mt-4 grid gap-2">
              {post.media.map((media) => (
                <div key={media.id} className="relative rounded-xl overflow-hidden bg-gray-100">
                  {media.mimeType.startsWith('image/') && (
                    <img
                      src={media.url}
                      alt={media.altText || 'Post image'}
                      className="w-full h-auto max-h-96 object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Engagement Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-6">
          {/* Like */}
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`flex items-center gap-2 p-2 rounded-full transition-colors group ${
              isLiked 
                ? 'text-red-500' 
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-medium">0</span>
          </button>

          {/* Comment (disabled for ParaSocial) */}
          <button className="flex items-center gap-2 p-2 rounded-full text-gray-300 cursor-not-allowed">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm font-medium">0</span>
          </button>

          {/* Share */}
          <button className="flex items-center gap-2 p-2 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
            <Share className="w-5 h-5" />
          </button>
        </div>

        {/* Bookmark */}
        <button
          onClick={() => setIsBookmarked(!isBookmarked)}
          className={`p-2 rounded-full transition-colors ${
            isBookmarked 
              ? 'text-blue-500' 
              : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
          }`}
        >
          <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </article>
  )
}

/**
 * Loading skeleton for posts
 */
function PostSkeleton() {
  return (
    <div className="bg-white border-b border-gray-200 p-6">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded animate-pulse mb-1 w-32" />
          <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/5" />
      </div>
      <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-12" />
        <div className="h-8 bg-gray-200 rounded animate-pulse w-12" />
        <div className="h-8 bg-gray-200 rounded animate-pulse w-8" />
      </div>
    </div>
  )
}

/**
 * Main PostFeed component
 * Displays a feed of posts with pagination and modern styling
 */
export default function PostFeed({ 
  apiUrl = '/api/posts',
  className = '',
  postsPerPage = 20
}: PostFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [totalPosts, setTotalPosts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch posts from API
   */
  const fetchPosts = async (page: number) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`${apiUrl}?page=${page}&limit=${postsPerPage}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch posts: ${response.statusText}`)
      }

      const data: PostFeedResponse = await response.json()
      
      if (!data.success) {
        throw new Error('Failed to load posts')
      }

      setPosts(data.data.posts)
      setCurrentPage(data.data.pagination.currentPage)
      setTotalPages(data.data.pagination.totalPages)
      setTotalPosts(data.data.pagination.totalPosts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Error fetching posts:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle page navigation
   */
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !loading) {
      setCurrentPage(newPage)
      fetchPosts(newPage)
      // Scroll to top of feed
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Initial load
  useEffect(() => {
    fetchPosts(1)
  }, [])

  return (
    <div className={`max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Latest Posts</h2>
          {!loading && totalPosts > 0 && (
            <span className="text-sm text-gray-500">
              {totalPosts.toLocaleString()} posts
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {/* Loading State */}
        {loading && (
          <div>
            {Array.from({ length: 3 }).map((_, index) => (
              <PostSkeleton key={index} />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to load posts
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => fetchPosts(currentPage)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && posts.length === 0 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600">
              Be the first to share something with the community!
            </p>
          </div>
        )}

        {/* Posts List */}
        {!loading && !error && posts.length > 0 && (
          <div>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage <= 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage >= totalPages
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}