// frontend/src/app/page.tsx
// Home page with public discovery feed showing all posts from ParaSocial creators
// Version: 1.1.0 - Fixed broken Tailwind className in PostCard component

'use client'

import { Suspense } from 'react'

/**
 * Mock data for demonstration purposes
 * In production, this would come from your API
 */
const mockPosts = [
  {
    id: '1',
    author: {
      username: 'sarah_creator',
      displayName: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b12f1b38?w=100&h=100&fit=crop&crop=face',
      isVerified: true,
      verificationTier: 'notable' as const
    },
    content: 'Just finished recording a new video about sustainable living! 🌱 Really excited to share some practical tips that have made a huge difference in my daily routine. What small changes have you made recently?',
    createdAt: '2024-01-15T10:30:00Z',
    hasMedia: true,
    followerCount: 12400
  },
  {
    id: '2',
    author: {
      username: 'tech_mike',
      displayName: 'Michael Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      isVerified: true,
      verificationTier: 'identity' as const
    },
    content: 'Working on a fascinating project involving machine learning and climate data. The patterns we\'re discovering could help predict weather changes with much higher accuracy. Science is amazing! 🔬',
    createdAt: '2024-01-15T08:15:00Z',
    hasMedia: false,
    followerCount: 8900
  },
  {
    id: '3',
    author: {
      username: 'artist_emma',
      displayName: 'Emma Rodriguez',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
      isVerified: false,
      verificationTier: null
    },
    content: 'New painting series inspired by ocean waves and the way light dances on water. Each piece captures a different mood of the sea. The creative process has been incredibly meditative.',
    createdAt: '2024-01-14T16:45:00Z',
    hasMedia: true,
    followerCount: 3200
  }
]

/**
 * Formats a date string into a human-readable "time ago" format
 * @param dateString - ISO date string
 * @returns Formatted time ago string
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Gets the verification badge color based on tier
 * @param tier - Verification tier level
 * @returns CSS classes for badge styling
 */
function getVerificationBadgeColor(tier: string | null): string {
  switch (tier) {
    case 'notable': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'identity': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'email': return 'text-green-600 bg-green-50 border-green-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

/**
 * Post component for displaying individual posts in the feed
 * @param post - Post data object
 * @returns JSX element representing a single post
 */
function PostCard({ post }: { post: typeof mockPosts[0] }) {
  const verificationBadgeClasses = getVerificationBadgeColor(post.author.verificationTier)
  
  return (
    <article className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10 transition-all duration-500 hover:-translate-y-1 hover:border-blue-200/50 dark:hover:border-blue-700/50">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-purple-50/0 to-pink-50/0 group-hover:from-blue-50/20 group-hover:via-purple-50/10 group-hover:to-pink-50/20 dark:group-hover:from-blue-900/10 dark:group-hover:via-purple-900/5 dark:group-hover:to-pink-900/10 rounded-2xl transition-all duration-500 pointer-events-none"></div>
      
      {/* Post header with author info */}
      <header className="relative flex items-start gap-4 mb-6">
        {/* Author avatar with glow effect */}
        <div className="flex-shrink-0 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full opacity-0 group-hover:opacity-30 blur-md transition-opacity duration-500"></div>
          <img
            src={post.author.avatar}
            alt={`${post.author.displayName} avatar`}
            className="relative w-14 h-14 rounded-full bg-gray-200 border-3 border-white dark:border-gray-700 shadow-lg ring-2 ring-gray-100 dark:ring-gray-600 group-hover:ring-blue-200 dark:group-hover:ring-blue-700 transition-all duration-300"
            loading="lazy"
          />
        </div>
        
        {/* Author details */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg truncate group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors duration-300">
              {post.author.displayName}
            </h3>
            
            {/* Verification badge with modern styling */}
            {post.author.isVerified && (
              <span 
                className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border backdrop-blur-sm ${verificationBadgeClasses} shadow-sm group-hover:shadow-md transition-all duration-300`}
                title={`Verified ${post.author.verificationTier} account`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {post.author.verificationTier}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
            <span className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 cursor-pointer">@{post.author.username}</span>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <time 
              dateTime={post.createdAt} 
              title={new Date(post.createdAt).toLocaleString()}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
            >
              {formatTimeAgo(post.createdAt)}
            </time>
            <span className="text-gray-300 dark:text-gray-600">•</span>
            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
              {post.followerCount.toLocaleString()} followers
            </span>
          </div>
        </div>
      </header>
      
      {/* Post content with enhanced typography */}
      <div className="relative mb-6">
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap text-base font-medium">
          {post.content}
        </p>
        
        {/* Media indicator with modern glassmorphism */}
        {post.hasMedia && (
          <div className="mt-4 p-5 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 backdrop-blur-sm rounded-xl border border-blue-200/30 dark:border-blue-700/30 shadow-inner group-hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-center text-blue-600 dark:text-blue-400">
              <div className="p-2 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg mr-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-semibold block">Media Attachment</span>
                <span className="text-xs opacity-75">Tap to view content</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Post footer with enhanced interaction design */}
      <footer className="relative pt-4 border-t border-gray-200/60 dark:border-gray-700/60">
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
              creativity, and passions with the fediverse community.
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
            <p>© 2024 ParaSocial. Connecting creators with the fediverse.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// frontend/src/app/page.tsx
// Version: 1.1.0 - Fixed broken Tailwind className in PostCard component