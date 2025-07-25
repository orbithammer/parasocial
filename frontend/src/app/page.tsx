// frontend/src/app/page.tsx
// Home page component displaying the public discovery feed
// Version: 1.3.0 - Added placeholder avatar for failed image loads

'use client'

import { Suspense, useState } from 'react'

// Type definitions for the post data structure
interface Author {
  username: string
  displayName: string
  avatar: string
  isVerified: boolean
  verificationTier: string | null
  followerCount: number
}

interface Post {
  id: string
  author: Author
  content: string
  createdAt: string
  hasMedia: boolean
}

// Mock posts data for the discovery feed
const mockPosts: Post[] = [
  {
    id: '1',
    author: {
      username: 'sarahjohnson',
      displayName: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b12f1b38?w=100&h=100&fit=crop&crop=face',
      isVerified: true,
      verificationTier: 'notable',
      followerCount: 12500
    },
    content: 'Excited to share my latest thoughts on sustainable living and how small changes can make a big impact on our planet. The future is in our hands! 🌱',
    createdAt: '2024-12-20T10:30:00Z',
    hasMedia: false
  },
  {
    id: '2',
    author: {
      username: 'michaelchen',
      displayName: 'Michael Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      isVerified: true,
      verificationTier: 'identity',
      followerCount: 8900
    },
    content: 'Deep dive into machine learning algorithms coming tomorrow. The intersection of AI and creativity is more fascinating than you might think.',
    createdAt: '2024-12-20T09:15:00Z',
    hasMedia: true
  },
  {
    id: '3',
    author: {
      username: 'emmarodriguez',
      displayName: 'Emma Rodriguez',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      isVerified: false,
      verificationTier: null,
      followerCount: 3400
    },
    content: 'Captured this amazing shot of ocean waves at sunset yesterday. Nature never fails to inspire my photography work.',
    createdAt: '2024-12-19T16:45:00Z',
    hasMedia: true
  }
]

// Utility function to format time ago
function formatTimeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

// Utility function to format follower count
function formatFollowerCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return count.toString()
}

// Utility function to generate initials from display name
function getInitials(displayName: string): string {
  return displayName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Utility function to generate a background color from username
function getAvatarBackgroundColor(username: string): string {
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-indigo-500'
  ]
  
  const hash = username.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  
  return colors[Math.abs(hash) % colors.length]
}

/**
 * Individual post card component
 * @param post - Post data to display
 * @returns JSX element for a single post card
 */
function PostCard({ post }: { post: Post }) {
  const [avatarLoadError, setAvatarLoadError] = useState<boolean>(false)

  // Handle avatar image load error
  const handleAvatarError = () => {
    setAvatarLoadError(true)
  }

  return (
    <article className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 transition-all duration-500 hover:-translate-y-1 hover:border-blue-200/50 dark:hover:border-blue-700/50">
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-purple-50/0 to-pink-50/0 group-hover:from-blue-50/20 group-hover:via-purple-50/10 group-hover:to-pink-50/20 dark:group-hover:from-blue-900/10 dark:group-hover:via-purple-900/5 dark:group-hover:to-pink-900/10 rounded-2xl transition-all duration-500 pointer-events-none" />

      {/* Post header */}
      <header className="relative flex items-start gap-4">
        {/* Avatar with glow effect */}
        <div className="flex-shrink-0 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-500" />
          {!avatarLoadError ? (
            <img
              src={post.author.avatar}
              alt={`${post.author.displayName} avatar`}
              className="relative w-14 h-14 rounded-full bg-gray-200 border-3 border-white dark:border-gray-700 shadow-lg ring-2 ring-gray-100 dark:ring-gray-600 group-hover:ring-blue-200 dark:group-hover:ring-blue-700 transition-all duration-300"
              loading="lazy"
              onError={handleAvatarError}
            />
          ) : (
            <div 
              className={`relative w-14 h-14 rounded-full ${getAvatarBackgroundColor(post.author.username)} border-3 border-white dark:border-gray-700 shadow-lg ring-2 ring-gray-100 dark:ring-gray-600 group-hover:ring-blue-200 dark:group-hover:ring-blue-700 transition-all duration-300 flex items-center justify-center`}
            >
              <span className="text-white font-bold text-lg">
                {getInitials(post.author.displayName)}
              </span>
            </div>
          )}
        </div>

        {/* Author info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-start gap-3 flex-wrap">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg truncate group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors duration-300">
              {post.author.displayName}
            </h3>
            
            {/* Verification badge */}
            {post.author.isVerified && (
              <span 
                className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border backdrop-blur-sm shadow-sm group-hover:shadow-md transition-all duration-300 ${
                  post.author.verificationTier === 'notable' 
                    ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
                    : 'text-blue-600 bg-blue-50 border-blue-200'
                }`}
                title={`Verified ${post.author.verificationTier} account`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {post.author.verificationTier}
              </span>
            )}
          </div>

          {/* Meta information */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 -mt-1">
            <span>@{post.author.username}</span>
            <span>·</span>
            <time 
              dateTime={post.createdAt}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-help"
              title={new Date(post.createdAt).toLocaleString()}
            >
              {formatTimeAgo(post.createdAt)}
            </time>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatFollowerCount(post.author.followerCount)} followers
            </span>
          </div>
        </div>
      </header>

      {/* Post content */}
      <div className="relative mb-3 mt-3">
        <p className="text-gray-900 dark:text-gray-100 leading-relaxed text-lg">
          {post.content}
        </p>

        {/* Media indicator */}
        {post.hasMedia && (
          <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors duration-300">
            <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
              <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <div>
                <span className="text-sm font-semibold block">Media Attachment</span>
                <span className="text-xs opacity-75">Tap to view content</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Post action buttons - Added Like, Reply, Share buttons */}
      <div className="relative flex items-center gap-6 pt-2 border-t border-gray-200/60 -mb-1 dark:border-gray-700/60">
        <button className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L7.5 15.75a4.5 4.5 0 006.364 0l3.182-3.182a4.5 4.5 0 000-6.364l-3.182-3.182a4.5 4.5 0 00-6.364 0L4.318 6.318z" />
          </svg>
          Like
        </button>
        
        <button className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Reply
        </button>
        
        <button className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all duration-200">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
          Share
        </button>
      </div>
      
      {/* Post footer */}
      <footer className="relative pt-4 border-t border-gray-200/60 dark:border-gray-700/60 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-700/50 px-3 py-1 rounded-full backdrop-blur-sm">
              Federated Post
            </span>
          </div>
          
          <button 
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/50 dark:border-blue-700/50 rounded-full backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 hover:-translate-y-0.5"
            aria-label={`View ${post.author.displayName}'s profile`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            View Profile
          </button>
        </div>
      </footer>
    </article>
  )
}

/**
 * Home page component displaying the public discovery feed
 * Shows all posts from ParaSocial creators for discovery by fediverse users
 * @returns JSX element for the complete home page
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Page header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container-lg py-4">
          <div className="flex items-center justify-between">
            {/* Brand logo and title */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  ParaSocial
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Discovery Feed
                </p>
              </div>
            </div>
            
            {/* Navigation actions */}
            <nav className="flex items-center gap-3">
              <button className="btn-base text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                Explore
              </button>
              <button className="btn-base bg-blue-600 text-white hover:bg-blue-700">
                Join ParaSocial
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container-lg py-8">
        <div className="max-w-2xl mx-auto">
          {/* Feed introduction */}
          <section className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Discover Amazing Creators
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-lg mx-auto">
              Explore posts from ParaSocial creators who are sharing their knowledge, 
              creativity, and passions with the federated social web.
            </p>
          </section>

          {/* Posts feed */}
          <section className="space-y-6">
            <Suspense fallback={
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Loading posts...</p>
              </div>
            }>
              {mockPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </Suspense>
          </section>

          {/* Load More Posts button */}
          <section className="mt-8 text-center">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-lg hover:shadow-xl">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Load More Posts
            </button>
          </section>

          {/* Call to action */}
          <section className="mt-12 text-center p-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Ready to join the community?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your ParaSocial account and start sharing with the fediverse.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button className="btn-base bg-blue-600 text-white hover:bg-blue-700">
                Get Started
              </button>
              <button className="btn-base text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                Learn More
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div className="container-lg py-8">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            <p>© 2025 ParaSocial. Connecting creators with the fediverse.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// frontend/src/app/page.tsx
// Version: 1.3.0 - Added placeholder avatar for failed image loads