// frontend/src/app/test/page.tsx
// Test page to demonstrate all Phase 2.2 components working together

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

  // Mock users for testing
  const testUsers = [
    { username: 'alice', displayName: 'Alice Johnson', isVerified: true, followerCount: 1234 },
    { username: 'bob', displayName: 'Bob Smith', isVerified: false, followerCount: 567 },
    { username: 'charlie', displayName: 'Charlie Brown', isVerified: true, followerCount: 890 },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Phase 2.2 Component Testing
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Testing create/read posts and follow/unfollow functionality
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Left Column - Post Creation & Feed */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* Post Creation Section */}
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  📝 Test Post Creation
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  This tests your <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">POST /posts</code> endpoint
                </p>
                
                <PostCreationForm
                  onPostCreated={(post) => {
                    if (post) {
                      console.log('New post created:', post)
                      // Refresh the feed when a new post is created
                      setRefreshTrigger(prev => prev + 1)
                      // Show success notification
                      alert(`Post created successfully! ID: ${post.id}`)
                    } else {
                      console.warn('Post creation callback received undefined post')
                    }
                  }}
                  className="max-w-none"
                />
              </div>
            </section>

            {/* Post Feed Section */}
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  📰 Test Post Feed
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  This tests your <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">GET /posts</code> endpoint with user filtering
                </p>
                
                <PostFeed
                  refreshTrigger={refreshTrigger}
                  postsPerPage={10}
                  onPostClick={(post) => {
                    setSelectedPost(post)
                    console.log('Post clicked:', post)
                  }}
                />
              </div>
            </section>

            {/* Selected Post Details */}
            {selectedPost && (
              <section>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-6">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
                    🔍 Selected Post Details
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-2">
                    <p><strong>ID:</strong> {selectedPost.id}</p>
                    <p><strong>Author:</strong> @{selectedPost.author?.username}</p>
                    <p><strong>Content:</strong> {selectedPost.content?.substring(0, 100)}...</p>
                    <p><strong>Created:</strong> {selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleString() : 'Unknown'}</p>
                    {selectedPost.contentWarning && (
                      <p><strong>Warning:</strong> {selectedPost.contentWarning}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="mt-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Close Details
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* Right Column - User Profiles & Follow Testing */}
          <div className="space-y-8">
            
            {/* User Profile Section */}
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  👤 Test User Profiles
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Tests <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">GET /users/:username</code> endpoint
                </p>

                {/* Username Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter username to view profile:
                  </label>
                  <input
                    type="text"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    placeholder="e.g., testuser"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm
                             dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* User Profile Display */}
                {selectedUser && (
                  <UserProfile
                    username={selectedUser}
                    onFollowClick={(username) => {
                      console.log('Follow clicked for:', username)
                      alert(`Follow clicked for @${username}`)
                    }}
                    onPostsClick={(username) => {
                      console.log('Posts clicked for:', username)
                      alert(`Show posts for @${username}`)
                    }}
                  />
                )}
              </div>
            </section>

            {/* Follow Button Testing */}
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  ➕ Test Follow Buttons
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Tests <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">POST/DELETE /users/:username/follow</code>
                </p>

                <div className="space-y-4">
                  {/* Different Button Variants */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Button Variants:
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                        variant="secondary"
                        size="md"
                        onFollowChange={(isFollowing) => {
                          console.log(`Bob follow state: ${isFollowing}`)
                        }}
                      />
                      <FollowButton
                        username="charlie"
                        variant="outline"
                        size="lg"
                        onFollowChange={(isFollowing) => {
                          console.log(`Charlie follow state: ${isFollowing}`)
                        }}
                      />
                    </div>
                  </div>

                  {/* User Cards with Follow Buttons */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      User Cards with Follow:
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
            </section>

            {/* API Status Checker */}
            <section>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  🔧 API Status
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Quick health check for your backend
                </p>
                
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('http://localhost:3001/health')
                      const data = await response.json()
                      alert(`API Status: ${data.status}\nEnvironment: ${data.environment}\nTime: ${data.timestamp}`)
                    } catch (error) {
                      alert(`API Error: ${error}`)
                    }
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                >
                  Check API Health
                </button>

                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <p><strong>Expected Endpoints:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>POST /api/v1/posts</li>
                    <li>GET /api/v1/posts</li>
                    <li>GET /api/v1/users/:username</li>
                    <li>POST /api/v1/users/:username/follow</li>
                    <li>DELETE /api/v1/users/:username/follow</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Debug Console */}
        <section className="mt-8">
          <div className="bg-gray-900 text-green-400 rounded-lg p-6 font-mono text-sm">
            <h3 className="text-white mb-3">🖥️ Debug Console</h3>
            <p className="opacity-75">Check your browser's developer console for detailed API responses and component interactions.</p>
            <p className="opacity-75 mt-2">
              <strong>Tips:</strong>
            </p>
            <ul className="list-disc list-inside opacity-75 mt-1 space-y-1">
              <li>Make sure your backend is running on localhost:3001</li>
              <li>Ensure you have a valid auth token in localStorage</li>
              <li>Check network tab for failed API calls</li>
              <li>All component interactions are logged to console</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  )
}