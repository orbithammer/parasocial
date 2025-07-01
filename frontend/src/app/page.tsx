// frontend/src/app/page.tsx
// Home page component displaying public discovery feed of ParaSocial posts
// Version: 1.0.0

import { Metadata } from 'next'

// Metadata for the home page
export const metadata: Metadata = {
  title: 'Discover Creators',
  description: 'Discover amazing content from ParaSocial creators across the fediverse.',
  openGraph: {
    title: 'Discover Creators - ParaSocial',
    description: 'Discover amazing content from ParaSocial creators across the fediverse.',
  },
}

// Mock data for initial development - will be replaced with API calls
const mockPosts = [
  {
    id: '1',
    author: {
      username: 'creator_jane',
      displayName: 'Jane Creator',
      avatar: '/api/placeholder/avatar/jane',
      isVerified: true,
      verificationTier: 'notable'
    },
    content: 'Just launched my new project! Excited to share this journey with everyone following from across the fediverse. 🚀',
    createdAt: '2024-12-20T10:30:00Z',
    hasMedia: false,
    followerCount: 1250
  },
  {
    id: '2', 
    author: {
      username: 'tech_mike',
      displayName: 'Mike Tech',
      avatar: '/api/placeholder/avatar/mike',
      isVerified: true,
      verificationTier: 'identity'
    },
    content: 'Deep dive into ActivityPub federation coming tomorrow. Preview: it\'s more fascinating than you think! The decentralized web is the future.',
    createdAt: '2024-12-20T09:15:00Z',
    hasMedia: true,
    followerCount: 890
  },
  {
    id: '3',
    author: {
      username: 'artist_sam',
      displayName: 'Sam Artist',
      avatar: '/api/placeholder/avatar/sam',
      isVerified: false,
      verificationTier: null
    },
    content: 'New artwork finished! This piece represents the connection between technology and human creativity.',
    createdAt: '2024-12-20T08:45:00Z',
    hasMedia: true,
    followerCount: 340
  }
]

/**
 * Formats a date string into a human-readable relative time
 * @param dateString - ISO date string to format
 * @returns Formatted relative time string
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
    <article className="card-base transition-smooth hover:shadow-md">
      {/* Post header with author info */}
      <header className="flex items-start gap-3 mb-4">
        {/* Author avatar */}
        <div className="flex-shrink-0">
          <img
            src={post.author.avatar}
            alt={`${post.author.displayName} avatar`}
            className="w-12 h-12 rounded-full bg-gray-200 border-2 border-gray-100"
            loading="lazy"
          />
        </div>
        
        {/* Author details */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-ellipsis">
              {post.author.displayName}
            </h3>
            
            {/* Verification badge */}
            {post.author.isVerified && (
              <span 
                className={`px-2 py-1 text-xs font-medium rounded-full border ${verificationBadgeClasses}`}
                title={`Verified ${post.author.verificationTier} account`}
              >
                ✓ {post.author.verificationTier}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>@{post.author.username}</span>
            <span>·</span>
            <time dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString()}>
              {formatTimeAgo(post.createdAt)}
            </time>
            <span>·</span>
            <span>{post.followerCount} followers</span>
          </div>
        </div>
      </header>
      
      {/* Post content */}
      <div className="mb-4">
        <p className="text-gray-900 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
        
        {/* Media indicator */}
        {post.hasMedia && (
          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
              <svg className="w-8 h-8 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">Media content</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Post footer */}
      <footer className="pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Posted to the fediverse</span>
          <button 
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-smooth"
            aria-label={`View ${post.author.displayName}'s profile`}
          >
            View profile
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
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">ParaSocial</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Discover creators</p>
              </div>
            </div>
            
            {/* Authentication actions */}
            <nav className="flex items-center gap-3">
              <a 
                href="/login" 
                className="btn-base border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Log in
              </a>
              <a 
                href="/register" 
                className="btn-base bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Sign up
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="container-lg py-8">
        {/* Page introduction */}
        <section className="mb-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Discover Amazing Creators
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              Follow ParaSocial creators from anywhere in the fediverse. 
              No account needed to browse, but sign up to start creating your own content.
            </p>
          </div>
        </section>

        {/* Posts feed */}
        <section aria-label="Creator posts feed">
          <div className="max-w-2xl mx-auto space-y-6">
            {mockPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          
          {/* Load more section */}
          <div className="text-center mt-8">
            <button className="btn-base border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
              Load more posts
            </button>
          </div>
        </section>

        {/* Call to action for creators */}
        <section className="mt-12 text-center">
          <div className="card-base max-w-lg mx-auto bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Ready to start creating?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Join ParaSocial and broadcast your content to the entire fediverse.
            </p>
            <a 
              href="/register" 
              className="btn-base bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Create your account
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}