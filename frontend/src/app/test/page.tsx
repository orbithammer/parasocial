'use client'

import { useState } from 'react'
import PostCreationForm from '@/components/PostCreationForm'
import PostFeed from '@/components/PostFeed'
import PostCard from '@/components/PostCard'
import UserProfile from '@/components/UserProfile'
import FollowButton from '@/components/FollowButton'
import { Code, Sparkles, TestTube, Users, MessageSquare, User } from 'lucide-react'

/**
 * Mock data for testing components
 */
const mockPost = {
  id: 'post123',
  content: 'This is a test post to demonstrate the PostCard component! 🎉\n\nIt supports multiple lines, emojis, and various content types. This is what a typical post would look like in the ParaSocial platform.',
  contentWarning: null,
  createdAt: '2024-06-25T10:30:00Z',
  publishedAt: '2024-06-25T10:30:00Z',
  author: {
    id: 'user456',
    username: 'testuser',
    displayName: 'Test User',
    avatar: null,
    isVerified: true,
    verificationTier: 'email'
  },
  media: [
    {
      id: 'media123',
      url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop',
      altText: 'Beautiful landscape',
      mimeType: 'image/jpeg',
      width: 800,
      height: 400
    }
  ]
}

const mockPostWithWarning = {
  ...mockPost,
  id: 'post124',
  content: 'This post contains sensitive content that might not be suitable for all audiences. The content warning system allows users to hide potentially disturbing content behind a warning.',
  contentWarning: 'Contains discussion of sensitive topics',
  media: []
}

const mockScheduledPost = {
  ...mockPost,
  id: 'post125',
  content: 'This is a scheduled post that will be published later! ⏰',
  isScheduled: true,
  scheduledFor: '2024-12-31T23:59:59Z',
  media: []
}

const mockUserProfile = {
  id: 'user456',
  username: 'testuser',
  displayName: 'Test User',
  bio: 'This is a sample bio for testing the UserProfile component. I\'m passionate about technology, design, and creating amazing user experiences! 🚀\n\nLove building things with React and TypeScript.',
  avatar: null,
  website: 'https://example.com',
  isVerified: true,
  verificationTier: 'identity',
  followersCount: 1234,
  postsCount: 89,
  createdAt: '2023-01-15T12:00:00Z'
}

/**
 * Component showcase section wrapper
 */
function ShowcaseSection({ 
  title, 
  description, 
  icon: Icon, 
  children 
}: { 
  title: string
  description: string
  icon: any
  children: React.ReactNode 
}) {
  return (
    <section className="mb-16">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg text-white">
            <Icon className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        <p className="text-gray-600 max-w-3xl">{description}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <span className="text-sm text-gray-500 ml-2">Component Preview</span>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </section>
  )
}

/**
 * Test page for showcasing all ParaSocial components
 */
export default function TestPage() {
  const [currentUserId] = useState('user123') // Mock current user

  // Mock handlers for component testing
  const handlePostSubmit = async (data: any) => {
    console.log('Post submitted:', data)
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    alert('Post created successfully! (This is just a test)')
  }

  const handleFollow = async (username: string) => {
    console.log('Following:', username)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const handleUnfollow = async (username: string) => {
    console.log('Unfollowing:', username)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const handleBlock = async (username: string) => {
    console.log('Blocking:', username)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const handleReport = async (username: string) => {
    console.log('Reporting:', username)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const handleEditProfile = () => {
    alert('Edit profile clicked! (This would open an edit form)')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
              <TestTube className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ParaSocial Component Showcase</h1>
              <p className="text-gray-600">Testing all components for Phase 2.2 - Create/read posts, follow/unfollow users</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Introduction */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Phase 2.2 Components
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Modern Social Media Components
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Explore all the components built for the ParaSocial platform. Each component is fully functional, 
            beautifully styled with Tailwind CSS, and ready for production use.
          </p>
        </div>

        {/* PostCreationForm Showcase */}
        <ShowcaseSection
          title="PostCreationForm"
          description="A comprehensive form for creating posts with content warnings, scheduling, and character limits. Features real-time validation and modern UI patterns."
          icon={MessageSquare}
        >
          <div className="max-w-2xl mx-auto">
            <PostCreationForm 
              onSubmit={handlePostSubmit}
              className="shadow-lg"
            />
          </div>
        </ShowcaseSection>

        {/* PostCard Showcase */}
        <ShowcaseSection
          title="PostCard"
          description="Individual post display component with engagement buttons, media support, and content warnings. Supports different states and user interactions."
          icon={MessageSquare}
        >
          <div className="space-y-6 max-w-2xl mx-auto">
            {/* Regular Post */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Regular Post</h4>
              <PostCard 
                post={mockPost}
                currentUserId={currentUserId}
                onLike={(postId) => console.log('Liked post:', postId)}
                onBookmark={(postId) => console.log('Bookmarked post:', postId)}
                onShare={(post) => console.log('Shared post:', post)}
              />
            </div>

            {/* Post with Content Warning */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Post with Content Warning</h4>
              <PostCard 
                post={mockPostWithWarning}
                currentUserId={currentUserId}
              />
            </div>

            {/* Scheduled Post */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Scheduled Post</h4>
              <PostCard 
                post={mockScheduledPost}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        </ShowcaseSection>

        {/* UserProfile Showcase */}
        <ShowcaseSection
          title="UserProfile"
          description="Complete user profile component with follow functionality, statistics, and user actions. Includes verification badges and social features."
          icon={User}
        >
          <div className="max-w-2xl mx-auto">
            <UserProfile
              username="testuser"
              currentUserId={currentUserId}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              onBlock={handleBlock}
              onReport={handleReport}
              onEditProfile={handleEditProfile}
            />
          </div>
        </ShowcaseSection>

        {/* FollowButton Showcase */}
        <ShowcaseSection
          title="FollowButton"
          description="Versatile follow button component with multiple variants and sizes. Handles all follow states with proper loading and error handling."
          icon={Users}
        >
          <div className="space-y-8">
            {/* Button Variants */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Button Variants</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Default</h5>
                  <FollowButton
                    username="user1"
                    currentUserId={currentUserId}
                    targetUserId="user1"
                    variant="default"
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                  />
                </div>
                <div className="text-center">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Outline</h5>
                  <FollowButton
                    username="user2"
                    currentUserId={currentUserId}
                    targetUserId="user2"
                    variant="outline"
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                  />
                </div>
                <div className="text-center">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Ghost</h5>
                  <FollowButton
                    username="user3"
                    currentUserId={currentUserId}
                    targetUserId="user3"
                    variant="ghost"
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                  />
                </div>
                <div className="text-center">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Compact</h5>
                  <FollowButton
                    username="user4"
                    currentUserId={currentUserId}
                    targetUserId="user4"
                    variant="compact"
                    size="sm"
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                  />
                </div>
                <div className="text-center">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Icon Only</h5>
                  <FollowButton
                    username="user5"
                    currentUserId={currentUserId}
                    targetUserId="user5"
                    variant="icon-only"
                    showLabel={false}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                  />
                </div>
                <div className="text-center">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">With Count</h5>
                  <FollowButton
                    username="user6"
                    currentUserId={currentUserId}
                    targetUserId="user6"
                    showCount={true}
                    followerCount={1234}
                    onFollow={handleFollow}
                    onUnfollow={handleUnfollow}
                  />
                </div>
              </div>
            </div>

            {/* Button States */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Button States</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Not Following</h5>
                  <FollowButton
                    username="state1"
                    currentUserId={currentUserId}
                    targetUserId="state1"
                    initialState="not-following"
                    onFollow={handleFollow}
                  />
                </div>
                <div className="text-center">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Following</h5>
                  <FollowButton
                    username="state2"
                    currentUserId={currentUserId}
                    targetUserId="state2"
                    initialState="following"
                    onUnfollow={handleUnfollow}
                  />
                </div>
                <div className="text-center">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Blocked</h5>
                  <FollowButton
                    username="state3"
                    currentUserId={currentUserId}
                    targetUserId="state3"
                    initialState="blocked"
                    onUnblock={handleUnfollow}
                  />
                </div>
                <div className="text-center">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Self Profile</h5>
                  <FollowButton
                    username="self"
                    currentUserId={currentUserId}
                    targetUserId={currentUserId}
                    initialState="self"
                  />
                </div>
              </div>
            </div>
          </div>
        </ShowcaseSection>

        {/* PostFeed Showcase */}
        // In your test page, replace the PostFeed section with:
// Replace the UserProfile section with:
<ShowcaseSection
  title="UserProfile"
  description="Complete user profile component with follow functionality."
  icon={User}
>
  <div className="max-w-2xl mx-auto">
    {/* Create a static profile display instead of the API-fetching one */}
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Mock profile content here */}
      <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
      <div className="p-6">
        <div className="flex items-center gap-4 -mt-12">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white">
            TU
          </div>
          <div className="mt-8">
            <h2 className="text-2xl font-bold">Test User</h2>
            <p className="text-gray-600">@testuser</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</ShowcaseSection>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              All components ready for production!
            </div>
            <p className="text-gray-600">
              These components are fully functional and styled for the ParaSocial platform. 
              Integrate them into your pages and connect to your backend APIs.
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}