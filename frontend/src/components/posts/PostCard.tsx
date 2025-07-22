// Path: frontend/src/components/posts/PostCard.tsx
// Version: 1.0.0
// PostCard component for displaying individual post information with user interactions

import React, { useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/router'

// Type definitions for the PostCard component
interface Author {
  id: string
  name: string
  avatar?: string
}

interface Post {
  id: string
  title: string
  content: string
  author: Author
  publishedAt: string
  likesCount: number
  commentsCount: number
  isLiked: boolean
  tags?: string[]
}

interface PostCardProps {
  post: Post
  onLike: (postId: string) => void
  onComment: (postId: string) => void
  onShare: (postId: string) => void
}

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Helper function to get user initials for fallback avatar
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)
}

// Helper function to truncate long content
const truncateContent = (content: string, maxLength: number = 200): string => {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength).trim() + '...'
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare
}) => {
  const router = useRouter()
  
  // State for handling interaction loading states
  const [isLikeLoading, setIsLikeLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Debounced like handler to prevent rapid clicking
  const handleLike = useCallback(async () => {
    if (isLikeLoading) return
    
    setIsLikeLoading(true)
    try {
      onLike(post.id)
      // Add small delay to prevent rapid clicking
      setTimeout(() => setIsLikeLoading(false), 300)
    } catch (error) {
      setIsLikeLoading(false)
    }
  }, [post.id, onLike, isLikeLoading])

  // Handler for comment button
  const handleComment = useCallback(() => {
    onComment(post.id)
  }, [post.id, onComment])

  // Handler for share button
  const handleShare = useCallback(() => {
    onShare(post.id)
  }, [post.id, onShare])

  // Handler for keyboard interactions
  const handleKeyDown = useCallback((
    event: React.KeyboardEvent<HTMLButtonElement>,
    action: () => void
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      action()
    }
  }, [])

  return (
    <article className="post-card bg-white rounded-lg shadow-md p-6 mb-4 hover:shadow-lg transition-shadow duration-200">
      {/* Post Header with Author Information */}
      <header className="flex items-center mb-4">
        <div className="flex items-center mr-4">
          {post.author.avatar ? (
            <Image
              src={post.author.avatar}
              alt={`${post.author.name} avatar`}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-semibold">
              {getInitials(post.author.name)}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{post.author.name}</h3>
          <time 
            dateTime={post.publishedAt}
            className="text-sm text-gray-500"
          >
            {formatDate(post.publishedAt)}
          </time>
        </div>
      </header>

      {/* Post Content */}
      <main className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
          {post.title}
        </h1>
        <p className="text-gray-700 leading-relaxed">
          {truncateContent(post.content)}
        </p>
      </main>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <section className="mb-4">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Interaction Buttons */}
      <footer className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center space-x-6">
          {/* Like Button */}
          <button
            type="button"
            onClick={handleLike}
            onKeyDown={(e) => handleKeyDown(e, handleLike)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={isLikeLoading}
            className={`flex items-center space-x-2 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1 ${
              post.isLiked 
                ? 'text-red-600 liked' 
                : 'text-gray-500 hover:text-red-600'
            } ${isHovered ? 'hover' : ''} ${
              isLikeLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
            aria-label="Like post"
          >
            <svg
              className="w-5 h-5"
              fill={post.isLiked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{post.likesCount}</span>
          </button>

          {/* Comment Button */}
          <button
            type="button"
            onClick={handleComment}
            onKeyDown={(e) => handleKeyDown(e, handleComment)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1 cursor-pointer"
            aria-label="Comment on post"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>{post.commentsCount}</span>
          </button>

          {/* Share Button */}
          <button
            type="button"
            onClick={handleShare}
            onKeyDown={(e) => handleKeyDown(e, handleShare)}
            className="flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-green-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-2 py-1 cursor-pointer"
            aria-label="Share post"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
              />
            </svg>
            <span>Share</span>
          </button>
        </div>
      </footer>
    </article>
  )
}

// Path: frontend/src/components/posts/PostCard.tsx
// Version: 1.0.0
// PostCard component for displaying individual post information with user interactions