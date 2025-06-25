// frontend/src/app/test/page.tsx
// Social media style test page for demonstrating all Phase 2.2 components

'use client'

import { useState } from 'react'
import PostCreationForm from '@/components/PostCreationForm'
import PostFeed from '@/components/PostFeed'
import UserProfile from '@/components/UserProfile'
import FollowButton, { FollowButtonWithUser } from '@/components/FollowButton'

export default function TestPage() {
  // State for coordinating components
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [selectedUser, setSelectedUser] = useState<string>('testuser')
  const [showDeveloperTools, setShowDeveloperTools] = useState(false)

  // Mock users for testing
  const testUsers = [
    { username: 'alice', displayName: 'Alice Johnson', isVerified: true, followerCount: 1234 },
    { username: 'bob', displayName: 'Bob Smith', isVerified: false, followerCount: 567 },
    { username: 'charlie', displayName: 'Charlie Brown', isVerified: true, followerCount: 890 },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation Header */}
      <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">PS</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">ParaSocial</h1>
            </div>

            {/* Navigation Items */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowDeveloperTools(!showDeveloperTools)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                {showDeveloperTools ? 'Hide' : 'Show'} Dev Tools
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Developer Tools Panel */}
      {showDeveloperTools && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  localStorage.setItem('auth_token', 'mock_test_token_123')
                  alert('✅ Mock auth token set! You can now create posts.')
                }}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                🔑 Set Auth Token
              </button>
              
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('http://localhost:3001/api/v1/dev/seed', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    })
                    const data = await response.json()
                    if (data.success) {
                      alert(`✅ Test data created!\nUsers: ${data.data.users}\nPosts: ${data.data.posts}`)
                    } else {
                      alert(`❌ Failed: ${data.error}`)
                    }
                  } catch (error) {
                    alert(`❌ Error: ${error}`)
                  }
                }}
                className="inline-flex items-center px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
              >
                🌱 Create Test Data
              </button>

              <button
                onClick={async () => {
                  try {
                    const response = await fetch('http://localhost:3001/health')
                    const data = await response.json()
                    alert(`✅ API: ${data.status}`)
                  } catch (error) {
                    alert(`❌ API Error: ${error}`)
                  }
                }}
                className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
              >
                💚 Check API
              </button>

              <button
                onClick={() => {
                  localStorage.removeItem('auth_token')
                  alert('🗑️ Auth token cleared!')
                }}
                className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
              >
                🗑️ Clear Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Sidebar - User Profile */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  User Profile
                </h2>
                
                {/* Username Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    placeholder="Enter username"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* User Profile Display */}
                {selectedUser && (
                  <UserProfile
                    username={selectedUser}
                    showFullProfile={false}
                    onFollowClick={(username) => {
                      alert(`Follow clicked for @${username}`)
                    }}
                    onPostsClick={(username) => {
                      alert(`Show posts for @${username}`)
                    }}
                  />
                )}
              </div>
            </div>

            {/* Suggested Users */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Suggested Users
                </h3>
                <div className="space-y-3">
                  {testUsers.map((user) => (
                    <FollowButtonWithUser
                      key={user.username}
                      username={user.username}
                      displayName={user.displayName}
                      isVerified={user.isVerified}
                      showFollowerCount={true}
                      followerCount={user.followerCount}
                      size="sm"
                      variant="primary"
                      onFollowChange={(isFollowing, count) => {
                        console.log(`${user.username} follow state: ${isFollowing}, count: ${count}`)
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-6 space-y-6">
            {/* Post Creation */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">You</span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    What's happening?
                  </h2>
                </div>
                
                <PostCreationForm
                  onPostCreated={(post) => {
                    if (post) {
                      console.log('New post created:', post)
                      setRefreshTrigger(prev => prev + 1)
                      
                      // Show success with a more social media style notification
                      const notification = document.createElement('div')
                      notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300'
                      notification.innerHTML = `
                        <div class="flex items-center space-x-2">
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                          <span>Post published successfully!</span>
                        </div>
                      `
                      document.body.appendChild(notification)
                      setTimeout(() => {
                        notification.style.transform = 'translateX(100%)'
                        setTimeout(() => notification.remove(), 300)
                      }, 3000)
                    }
                  }}
                  className="max-w-none"
                />
              </div>
            </div>

            {/* Post Feed */}
            <div className="space-y-4">
              <PostFeed
                refreshTrigger={refreshTrigger}
                postsPerPage={10}
                onPostClick={(post) => {
                  setSelectedPost(post)
                  console.log('Post clicked:', post)
                }}
                className="space-y-4"
              />
            </div>

            {/* Selected Post Modal */}
            {selectedPost && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Post Details
                      </h3>
                      <button
                        onClick={() => setSelectedPost(null)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                      >
                        <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-3 gap-4">
                        <span className="font-medium text-gray-700 dark:text-gray-300">ID:</span>
                        <span className="col-span-2 text-gray-900 dark:text-white font-mono text-xs">{selectedPost.id}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Author:</span>
                        <span className="col-span-2 text-gray-900 dark:text-white">@{selectedPost.author?.username}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Content:</span>
                        <span className="col-span-2 text-gray-900 dark:text-white">{selectedPost.content}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                        <span className="col-span-2 text-gray-900 dark:text-white">
                          {selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleString() : 'Unknown'}
                        </span>
                      </div>
                      {selectedPost.contentWarning && (
                        <div className="grid grid-cols-3 gap-4">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Warning:</span>
                          <span className="col-span-2 text-amber-600 dark:text-amber-400">{selectedPost.contentWarning}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Follow Testing */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Follow Testing
                </h3>
                
                <div className="space-y-4">
                  {/* Different Button Variants */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Button Styles
                    </h4>
                    <div className="space-y-2">
                      <FollowButton
                        username="alice"
                        variant="primary"
                        size="sm"
                        showFollowerCount={true}
                        followerCount={1234}
                        onFollowChange={(isFollowing, count) => {
                          console.log(`Alice follow state: ${isFollowing}, count: ${count}`)
                        }}
                      />
                      <FollowButton
                        username="bob"
                        variant="outline"
                        size="md"
                        onFollowChange={(isFollowing) => {
                          console.log(`Bob follow state: ${isFollowing}`)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trending Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  What's happening
                </h3>
                <div className="space-y-3">
                  <div className="hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-lg cursor-pointer">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Trending in Technology</p>
                    <p className="font-semibold text-gray-900 dark:text-white">ParaSocial</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">2,847 posts</p>
                  </div>
                  <div className="hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-lg cursor-pointer">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Trending</p>
                    <p className="font-semibold text-gray-900 dark:text-white">#ActivityPub</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">1,234 posts</p>
                  </div>
                  <div className="hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-lg cursor-pointer">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Trending in Social</p>
                    <p className="font-semibold text-gray-900 dark:text-white">#Decentralized</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">892 posts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}