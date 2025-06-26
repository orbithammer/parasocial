'use client'

import { useState } from 'react'
import { 
  AlertTriangle, 
  MoreHorizontal, 
  Heart, 
  MessageCircle, 
  Share, 
  Bookmark, 
  Verified,
  Clock,
  Calendar,
  Trash2,
  Edit3,
  Flag,
  Link2
} from 'lucide-react'

/**
 * Post data interface
 */
interface Post {
  id: string
  content: string
  contentWarning?: string | null
  createdAt: string
  publishedAt?: string | null
  isScheduled?: boolean
  scheduledFor?: string | null
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
 * Props for PostCard component
 */
interface PostCardProps {
  post: Post
  currentUserId?: string
  onLike?: (postId: string) => void
  onBookmark?: (postId: string) => void
  onShare?: (post: Post) => void
  onEdit?: (post: Post) => void
  onDelete?: (postId: string) => void
  onReport?: (postId: string) => void
  className?: string
  showEngagement?: boolean
  showActions?: boolean
}

/**
 * Dropdown menu component for post actions
 */
function PostDropdownMenu({ 
  post, 
  currentUserId, 
  onEdit, 
  onDelete, 
  onReport, 
  onClose 
}: {
  post: Post
  currentUserId?: string
  onEdit?: (post: Post) => void
  onDelete?: (postId: string) => void
  onReport?: (postId: string) => void
  onClose: () => void
}) {
  const isOwnPost = currentUserId === post.author.id

  const handleAction = (action: () => void) => {
    action()
    onClose()
  }

  return (
    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
      {isOwnPost ? (
        <>
          {onEdit && (
            <button
              onClick={() => handleAction(() => onEdit(post))}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit post
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => handleAction(() => onDelete(post.id))}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete post
            </button>
          )}
        </>
      ) : (
        <>
          <button
            onClick={() => handleAction(() => navigator.clipboard.writeText(window.location.href))}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            Copy link
          </button>
          {onReport && (
            <button
              onClick={() => handleAction(() => onReport(post.id))}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <Flag className="w-4 h-4" />
              Report post
            </button>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Standalone PostCard component
 * Displays an individual post with modern social media styling
 */
export default function PostCard({
  post,
  currentUserId,
  onLike,
  onBookmark,
  onShare,
  onEdit,
  onDelete,
  onReport,
  className = '',
  showEngagement = true,
  showActions = true
}: PostCardProps) {
  const [showFullContent, setShowFullContent] = useState(!post.contentWarning)
  const [isLiked, setIsLiked] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [likeCount, setLikeCount] = useState(0)

  /**
   * Format relative time (e.g., "2 hours ago")
   */
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 0) return 'scheduled'
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
   * Format full timestamp for hover tooltip
   */
  const formatFullTimestamp = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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

  /**
   * Handle like action
   */
  const handleLike = () => {
    const newLikedState = !isLiked
    setIsLiked(newLikedState)
    setLikeCount(prev => newLikedState ? prev + 1 : Math.max(0, prev - 1))
    
    if (onLike) {
      onLike(post.id)
    }
  }

  /**
   * Handle bookmark action
   */
  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    
    if (onBookmark) {
      onBookmark(post.id)
    }
  }

  /**
   * Handle share action
   */
  const handleShare = () => {
    if (onShare) {
      onShare(post)
    } else {
      // Default share behavior
      if (navigator.share) {
        navigator.share({
          title: `Post by ${post.author.displayName}`,
          text: post.content.slice(0, 100) + (post.content.length > 100 ? '...' : ''),
          url: window.location.href
        })
      } else {
        navigator.clipboard.writeText(window.location.href)
      }
    }
  }

  /**
   * Check if post is scheduled
   */
  const isScheduledPost = post.isScheduled && post.scheduledFor && new Date(post.scheduledFor) > new Date()
  const displayTime = post.publishedAt || post.createdAt

  return (
    <article className={`bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all duration-200 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-white shadow-sm">
            {getAvatarContent()}
          </div>
          
          {/* User Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {post.author.displayName}
              </h3>
              {post.author.isVerified && (
                <Verified className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
              {post.author.verificationTier && post.author.verificationTier !== 'none' && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {post.author.verificationTier}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>@{post.author.username}</span>
              <span>·</span>
              <time 
                dateTime={displayTime}
                title={formatFullTimestamp(displayTime)}
                className="hover:underline cursor-help"
              >
                {formatRelativeTime(displayTime)}
              </time>
              {isScheduledPost && (
                <>
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>scheduled</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions Menu */}
        {showActions && (
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
            
            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-5" 
                  onClick={() => setShowDropdown(false)}
                />
                <PostDropdownMenu
                  post={post}
                  currentUserId={currentUserId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReport={onReport}
                  onClose={() => setShowDropdown(false)}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Scheduled Post Banner */}
      {isScheduledPost && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              Scheduled for {formatFullTimestamp(post.scheduledFor!)}
            </span>
          </div>
        </div>
      )}

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
            className="px-3 py-1 bg-amber-100 text-amber-800 text-sm font-medium rounded-md hover:bg-amber-200 transition-colors"
          >
            Show content
          </button>
        </div>
      )}

      {/* Post Content */}
      {showFullContent && (
        <div className="mb-4">
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap m-0">
              {post.content}
            </p>
          </div>
          
          {/* Media Attachments */}
          {post.media && post.media.length > 0 && (
            <div className="mt-4">
              <div className={`grid gap-2 ${
                post.media.length === 1 ? 'grid-cols-1' :
                post.media.length === 2 ? 'grid-cols-2' :
                post.media.length === 3 ? 'grid-cols-2' :
                'grid-cols-2'
              }`}>
                {post.media.slice(0, 4).map((media, index) => (
                  <div 
                    key={media.id} 
                    className={`relative rounded-xl overflow-hidden bg-gray-100 ${
                      post.media!.length === 3 && index === 0 ? 'col-span-2' : ''
                    }`}
                  >
                    {media.mimeType.startsWith('image/') && (
                      <img
                        src={media.url}
                        alt={media.altText || 'Post image'}
                        className="w-full h-auto max-h-96 object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
                        loading="lazy"
                      />
                    )}
                    
                    {/* Show +N overlay for more than 4 images */}
                    {index === 3 && post.media!.length > 4 && (
                      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                        <span className="text-white font-semibold text-xl">
                          +{post.media!.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Media count indicator */}
              {post.media.length > 1 && (
                <p className="text-xs text-gray-500 mt-2">
                  {post.media.length} {post.media.length === 1 ? 'image' : 'images'}
                </p>
              )}
            </div>
          )}

          {/* Content warning toggle (if content is shown) */}
          {post.contentWarning && (
            <button
              onClick={() => setShowFullContent(false)}
              className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              Hide content
            </button>
          )}
        </div>
      )}

      {/* Engagement Bar */}
      {showEngagement && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1">
            {/* Like Button */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200 group ${
                isLiked 
                  ? 'text-red-500 bg-red-50' 
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
            >
              <Heart className={`w-5 h-5 transition-transform ${
                isLiked ? 'fill-current scale-110' : 'group-hover:scale-110'
              }`} />
              <span className="text-sm font-medium">
                {likeCount > 0 ? likeCount.toLocaleString() : ''}
              </span>
            </button>

            {/* Comment Button (disabled for ParaSocial) */}
            <button 
              disabled
              className="flex items-center gap-2 px-3 py-2 rounded-full text-gray-300 cursor-not-allowed"
              title="Comments not available on ParaSocial"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">0</span>
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200 group"
            >
              <Share className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleBookmark}
            className={`p-2 rounded-full transition-all duration-200 ${
              isBookmarked 
                ? 'text-blue-500 bg-blue-50' 
                : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
            }`}
          >
            <Bookmark className={`w-5 h-5 transition-transform hover:scale-110 ${
              isBookmarked ? 'fill-current' : ''
            }`} />
          </button>
        </div>
      )}
    </article>
  )
}