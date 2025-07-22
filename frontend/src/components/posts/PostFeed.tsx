// Path: frontend/src/components/posts/PostFeed.tsx
// Version: 1.0.0
// PostFeed component for displaying a list of posts with loading, error, and empty states

import React from 'react'

// Type definitions for post data
interface Post {
  id: string
  title: string
  content: string
  author: string
  createdAt: string
  likesCount: number
  commentsCount: number
}

// Props interface for PostFeed component
interface PostFeedProps {
  posts: Post[] | undefined
  isLoading?: boolean
  error?: string
  hasMore?: boolean
  onPostClick?: (postId: string) => void
  onLoadMore?: () => void
  onRefresh?: () => void
}

export const PostFeed: React.FC<PostFeedProps> = ({
  posts,
  isLoading = false,
  error,
  hasMore = false,
  onPostClick,
  onLoadMore,
  onRefresh
}) => {
  // Handle undefined posts prop gracefully
  const safePosts = posts || []

  // Handle post click with keyboard support
  const handlePostClick = (postId: string) => {
    if (onPostClick) {
      onPostClick(postId)
    }
  }

  // Handle keyboard events for post navigation
  const handlePostKeyDown = (event: React.KeyboardEvent, postId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handlePostClick(postId)
    }
  }

  // Render loading state
  if (isLoading) {
    return (
      <main role="main" aria-label="Posts feed">
        <div 
          role="status" 
          aria-live="polite"
          className="loading-container"
        >
          <div className="loading-spinner" aria-hidden="true">
            ⏳
          </div>
          <p>Loading posts...</p>
        </div>
      </main>
    )
  }

  // Render error state
  if (error) {
    return (
      <main role="main" aria-label="Posts feed">
        <div 
          role="alert" 
          aria-live="assertive"
          className="error-container"
        >
          <p>{error}</p>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="retry-button"
            >
              Retry
            </button>
          )}
        </div>
      </main>
    )
  }

  // Render empty state
  if (safePosts.length === 0) {
    return (
      <main role="main" aria-label="Posts feed">
        <div className="empty-state">
          <p>No posts available</p>
          <p>Be the first to create a post!</p>
        </div>
      </main>
    )
  }

  // Render posts feed
  return (
    <main role="main" aria-label="Posts feed">
      <div className="posts-container">
        {safePosts.map((post) => (
          <article
            key={post.id}
            className="post-item"
            tabIndex={onPostClick ? 0 : undefined}
            onClick={onPostClick ? () => handlePostClick(post.id) : undefined}
            onKeyDown={onPostClick ? (e) => handlePostKeyDown(e, post.id) : undefined}
            role={onPostClick ? 'button' : 'article'}
            aria-label={onPostClick ? `Open post: ${post.title}` : undefined}
          >
            {/* Post header with title and author */}
            <header className="post-header">
              <h2 className="post-title">{post.title}</h2>
              <p className="post-author">by {post.author}</p>
              <time 
                className="post-date"
                dateTime={post.createdAt}
              >
                {new Date(post.createdAt).toLocaleDateString()}
              </time>
            </header>

            {/* Post content */}
            <div className="post-content">
              <p>{post.content}</p>
            </div>

            {/* Post footer with engagement metrics */}
            <footer className="post-footer">
              <div className="post-stats">
                <span 
                  className="likes-count"
                  aria-label={`${post.likesCount} likes`}
                >
                  👍 {post.likesCount}
                </span>
                <span 
                  className="comments-count"
                  aria-label={`${post.commentsCount} comments`}
                >
                  💬 {post.commentsCount}
                </span>
              </div>
            </footer>
          </article>
        ))}
      </div>

      {/* Load more button */}
      {hasMore && onLoadMore && (
        <div className="load-more-container">
          <button
            type="button"
            onClick={onLoadMore}
            className="load-more-button"
          >
            Load more posts
          </button>
        </div>
      )}
    </main>
  )
}

// Export the Post type for use in other components
export type { Post }

// Path: frontend/src/components/posts/PostFeed.tsx
// Version: 1.0.0
// PostFeed component for displaying a list of posts with loading, error, and empty states