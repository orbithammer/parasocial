// frontend/src/components/test/PostFeedTest.tsx
import React, { useState, useEffect } from 'react'

// Types for API responses
interface Author {
  id: string
  username: string
  displayName: string
  avatar: string | null
  isVerified: boolean
  verificationTier: 'none' | 'email' | 'phone' | 'identity' | 'notable'
}

interface Post {
  id: string
  content: string
  contentWarning: string | null
  createdAt: string
  publishedAt: string
  isPublished: boolean
  author: Author
  media: any[]
}

interface Pagination {
  currentPage: number
  totalPages: number
  totalPosts: number
  hasNext: boolean
  hasPrev: boolean
}

interface PostFeedResponse {
  success: boolean
  data: {
    posts: Post[]
    pagination: Pagination
  }
}

// Mock API service for testing post feed
const mockFeedAPI = {
  async getPosts(page: number = 1, limit: number = 20): Promise<PostFeedResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600))
    
    const mockPosts: Post[] = [
      {
        id: 'post1',
        content: 'Just shipped a major feature update! 🚀 The new dashboard is live and includes real-time analytics, improved user management, and a completely redesigned interface. Big thanks to the entire team for making this happen.',
        contentWarning: null,
        createdAt: '2024-01-15T14:30:00Z',
        publishedAt: '2024-01-15T14:30:00Z',
        isPublished: true,
        author: {
          id: 'user1',
          username: 'techceo',
          displayName: 'Sarah Chen',
          avatar: null,
          isVerified: true,
          verificationTier: 'notable'
        },
        media: []
      },
      {
        id: 'post2',
        content: 'Hot take: The best programming language is the one that gets your project shipped on time and under budget. Stop bikeshedding and start building! 💻',
        contentWarning: null,
        createdAt: '2024-01-15T12:15:00Z',
        publishedAt: '2024-01-15T12:15:00Z',
        isPublished: true,
        author: {
          id: 'user2',
          username: 'devguru',
          displayName: 'Alex Rodriguez',
          avatar: null,
          isVerified: false,
          verificationTier: 'email'
        },
        media: []
      },
      {
        id: 'post3',
        content: 'Reminder: Mental health is just as important as physical health. Take breaks, step outside, talk to someone. You are not your code, and your worth is not measured by your productivity.',
        contentWarning: 'Mental health discussion',
        createdAt: '2024-01-15T10:45:00Z',
        publishedAt: '2024-01-15T10:45:00Z',
        isPublished: true,
        author: {
          id: 'user3',
          username: 'wellness_coach',
          displayName: 'Dr. Maria Santos',
          avatar: null,
          isVerified: true,
          verificationTier: 'identity'
        },
        media: []
      },
      {
        id: 'post4',
        content: 'The future of web development is here! Just tried out the new framework everyone\'s talking about. The developer experience is incredible - hot reloading, built-in TypeScript support, and zero-config deployment. Game changer! 🔥\n\nAnyone else experimenting with cutting-edge tools?',
        contentWarning: null,
        createdAt: '2024-01-15T09:20:00Z',
        publishedAt: '2024-01-15T09:20:00Z',
        isPublished: true,
        author: {
          id: 'user4',
          username: 'frontend_wizard',
          displayName: 'Jamie Kim',
          avatar: null,
          isVerified: false,
          verificationTier: 'phone'
        },
        media: []
      },
      {
        id: 'post5',
        content: 'Breaking: Our startup just closed Series A funding! 🎉 $10M to accelerate our mission of making technology more accessible to everyone. Special thanks to our amazing investors and the incredible team that made this possible.',
        contentWarning: null,
        createdAt: '2024-01-15T08:00:00Z',
        publishedAt: '2024-01-15T08:00:00Z',
        isPublished: true,
        author: {
          id: 'user5',
          username: 'startup_founder',
          displayName: 'Marcus Johnson',
          avatar: null,
          isVerified: true,
          verificationTier: 'notable'
        },
        media: []
      },
      {
        id: 'post6',
        content: 'Coffee shop coding session complete ☕ Spent the morning refactoring legacy code and it feels so good to see clean, maintainable functions. Sometimes the best feature you can ship is the one that makes your codebase more readable.',
        contentWarning: null,
        createdAt: '2024-01-15T07:30:00Z',
        publishedAt: '2024-01-15T07:30:00Z',
        isPublished: true,
        author: {
          id: 'user6',
          username: 'code_cleaner',
          displayName: 'Emma Wilson',
          avatar: null,
          isVerified: false,
          verificationTier: 'email'
        },
        media: []
      },
      {
        id: 'post7',
        content: 'PSA: Always backup your data before major system updates. Learned this the hard way when my laptop decided to eat my entire project folder. Thank goodness for version control and cloud storage! 🙏',
        contentWarning: null,
        createdAt: '2024-01-14T22:15:00Z',
        publishedAt: '2024-01-14T22:15:00Z',
        isPublished: true,
        author: {
          id: 'user7',
          username: 'backup_believer',
          displayName: 'Jordan Taylor',
          avatar: null,
          isVerified: false,
          verificationTier: 'phone'
        },
        media: []
      },
      {
        id: 'post8',
        content: 'Just wrapped up a fascinating conversation about AI ethics with some brilliant minds in the industry. The questions we\'re grappling with today will shape the technology landscape for decades to come.',
        contentWarning: 'Technology ethics discussion',
        createdAt: '2024-01-14T20:45:00Z',
        publishedAt: '2024-01-14T20:45:00Z',
        isPublished: true,
        author: {
          id: 'user8',
          username: 'ai_ethicist',
          displayName: 'Dr. Priya Patel',
          avatar: null,
          isVerified: true,
          verificationTier: 'identity'
        },
        media: []
      },
      {
        id: 'post9',
        content: 'Celebrating 5 years of remote work today! 🎉 To anyone just starting their remote journey: invest in a good chair, set boundaries, and remember that your home office doesn\'t have to be perfect to be productive.',
        contentWarning: null,
        createdAt: '2024-01-14T18:30:00Z',
        publishedAt: '2024-01-14T18:30:00Z',
        isPublished: true,
        author: {
          id: 'user9',
          username: 'remote_veteran',
          displayName: 'Carlos Martinez',
          avatar: null,
          isVerified: false,
          verificationTier: 'email'
        },
        media: []
      },
      {
        id: 'post10',
        content: 'Late night debugging session turned into an accidental all-nighter. Sometimes the bugs are so interesting you forget to sleep! 🐛💻 Time for coffee and maybe a power nap.',
        contentWarning: null,
        createdAt: '2024-01-14T06:00:00Z',
        publishedAt: '2024-01-14T06:00:00Z',
        isPublished: true,
        author: {
          id: 'user10',
          username: 'night_coder',
          displayName: 'Riley Chen',
          avatar: null,
          isVerified: false,
          verificationTier: 'phone'
        },
        media: []
      }
    ]
    
    // Simulate pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedPosts = mockPosts.slice(startIndex, endIndex)
    
    return {
      success: true,
      data: {
        posts: paginatedPosts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(mockPosts.length / limit),
          totalPosts: mockPosts.length,
          hasNext: endIndex < mockPosts.length,
          hasPrev: page > 1
        }
      }
    }
  }
}

/**
 * Individual Post Component
 * Renders a single post with all its information
 */
interface PostCardProps {
  post: Post
  showContentWarnings: boolean
}

function PostCard({ post, showContentWarnings }: PostCardProps): React.JSX.Element {
  const [isContentVisible, setIsContentVisible] = useState<boolean>(!post.contentWarning)
  
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date()
    const postDate = new Date(dateString)
    const diffInHours = Math.floor((now.getTime() - postDate.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return postDate.toLocaleDateString()
  }

  const getVerificationBadgeColor = (tier: Author['verificationTier']): string => {
    switch (tier) {
      case 'notable': return 'text-purple-500'
      case 'identity': return 'text-blue-500'
      case 'phone': return 'text-green-500'
      case 'email': return 'text-gray-500'
      default: return 'text-gray-400'
    }
  }

  const getInitials = (name: string): string => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase()
  }

  return (
    <article className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Author Header */}
      <header className="flex items-center space-x-3 mb-4">
        {/* Avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {getInitials(post.author.displayName)}
          </span>
        </div>
        
        {/* Author Info */}
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900">{post.author.displayName}</h3>
            {post.author.isVerified && (
              <svg 
                className={`w-5 h-5 ${getVerificationBadgeColor(post.author.verificationTier)}`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <title>{`Verified ${post.author.verificationTier}`}</title>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            )}
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>@{post.author.username}</span>
            <span>•</span>
            <time dateTime={post.publishedAt}>{formatTimeAgo(post.publishedAt)}</time>
          </div>
        </div>
      </header>

      {/* Content Warning */}
      {post.contentWarning && showContentWarnings && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
              <span className="text-yellow-800 text-sm font-medium">{post.contentWarning}</span>
            </div>
            <button
              onClick={() => setIsContentVisible(!isContentVisible)}
              className="text-yellow-700 hover:text-yellow-900 text-sm font-medium"
            >
              {isContentVisible ? 'Hide' : 'Show'} Content
            </button>
          </div>
        </div>
      )}

      {/* Post Content */}
      {isContentVisible && (
        <div className="mb-4">
          <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>
        </div>
      )}

      {/* Post Actions */}
      <footer className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="text-sm text-gray-500">
          Post ID: {post.id}
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>Published: {new Date(post.publishedAt).toLocaleDateString()}</span>
        </div>
      </footer>
    </article>
  )
}

/**
 * Post Feed Component
 * Displays a paginated list of posts
 */
function PostFeed(): React.JSX.Element {
  const [posts, setPosts] = useState<Post[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [showContentWarnings, setShowContentWarnings] = useState<boolean>(true)

  const loadPosts = async (page: number = 1): Promise<void> => {
    setLoading(true)
    setError('')
    
    try {
      const result = await mockFeedAPI.getPosts(page, 3)
      setPosts(result.data.posts)
      setPagination(result.data.pagination)
      setCurrentPage(page)
    } catch (err) {
      setError('Failed to load posts. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts(1)
  }, [])

  const handlePageChange = (newPage: number): void => {
    if (newPage >= 1 && newPage <= (pagination?.totalPages || 0)) {
      loadPosts(newPage)
    }
  }

  if (loading && posts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Feed Controls */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Public Feed</h2>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showContentWarnings}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowContentWarnings(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Show content warnings</span>
        </label>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => loadPosts(currentPage)}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            showContentWarnings={showContentWarnings}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-8 space-y-4">
          {/* Page Info - Mobile */}
          <div className="text-center text-sm text-gray-600 sm:hidden">
            Page {pagination.currentPage} of {pagination.totalPages}
            <br />
            {pagination.totalPosts} total posts
          </div>
          
          {/* Pagination Controls */}
          <div className="flex items-center justify-between sm:justify-center sm:space-x-8">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.hasPrev || loading}
              className={`px-4 py-2 rounded-md font-medium ${
                pagination.hasPrev && !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Previous
            </button>
            
            {/* Page Info - Desktop */}
            <span className="hidden sm:block text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.totalPages} 
              ({pagination.totalPosts} total posts)
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.hasNext || loading}
              className={`px-4 py-2 rounded-md font-medium ${
                pagination.hasNext && !loading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && posts.length > 0 && (
        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 text-gray-600">
            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading posts...</span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Test Scenarios Component
 */
interface Scenario {
  id: string
  name: string
  description: string
}

function FeedTestScenarios(): React.JSX.Element {
  const scenarios: Scenario[] = [
    {
      id: 'content-warnings',
      name: 'Content Warnings',
      description: 'Toggle content warning display and show/hide functionality'
    },
    {
      id: 'pagination',
      name: 'Pagination',
      description: 'Test previous/next navigation and page state'
    },
    {
      id: 'verification-badges',
      name: 'Verification Badges',
      description: 'See different verification tiers (notable, identity, phone, email)'
    },
    {
      id: 'time-display',
      name: 'Time Formatting',
      description: 'Check relative time display (hours ago, days ago)'
    },
    {
      id: 'loading-states',
      name: 'Loading States',
      description: 'Observe skeleton loading and pagination loading'
    },
    {
      id: 'responsive-design',
      name: 'Responsive Layout',
      description: 'Resize window to test mobile/desktop layouts'
    }
  ]

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-50 rounded-lg mb-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Test Scenarios</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="p-3 bg-white rounded border"
          >
            <h4 className="font-medium text-gray-900">{scenario.name}</h4>
            <p className="text-sm text-gray-600">{scenario.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PostFeedTestComponent(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Post Feed Display Test</h1>
          <p className="text-gray-600">Test how posts render in a feed with pagination, content warnings, and verification badges</p>
        </div>
        
        <FeedTestScenarios />
        <PostFeed />
        
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>This component tests PostController.getPosts() and PostController.getPostById() functionality</p>
        </div>
      </div>
    </div>
  )
}