// frontend/src/app/dashboard/page.tsx
// Version: 3.0.0
// Enhanced dashboard with comprehensive broadcasting features
// Added: Content Command Center, Audience Intelligence, Broadcasting Tools, Moderation Panel, Account Health Monitor

'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  username: string
  displayName: string
}

interface PostData {
  content: string
  contentWarning: string
  hasContentWarning: boolean
  scheduledTime: string
  mediaAttachments: File[]
}

interface AudienceData {
  totalFollowers: number
  weeklyGrowth: number
  deliverySuccess: number
  activityPubStatus: string
  instanceBreakdown: { name: string; count: number }[]
  geographicDistribution: { country: string; count: number }[]
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [postData, setPostData] = useState<PostData>({
    content: '',
    contentWarning: '',
    hasContentWarning: false,
    scheduledTime: '',
    mediaAttachments: []
  })
  
  // Mock audience data for demonstration
  const [audienceData] = useState<AudienceData>({
    totalFollowers: 1250,
    weeklyGrowth: 45,
    deliverySuccess: 94,
    activityPubStatus: 'Good',
    instanceBreakdown: [
      { name: 'mastodon.social', count: 450 },
      { name: 'lemmy.world', count: 320 },
      { name: 'pixelfed.social', count: 280 },
      { name: 'others', count: 200 }
    ],
    geographicDistribution: [
      { country: 'United States', count: 400 },
      { country: 'Germany', count: 250 },
      { country: 'Canada', count: 180 },
      { country: 'United Kingdom', count: 160 },
      { country: 'Others', count: 260 }
    ]
  })

  useEffect(() => {
    // Get user from localStorage (set during login)
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    setIsLoading(false)
  }, [])

  // Handle post content changes
  const handleContentChange = (content: string) => {
    setPostData(prev => ({ ...prev, content }))
  }

  // Handle content warning toggle
  const handleContentWarningToggle = (checked: boolean) => {
    setPostData(prev => ({ 
      ...prev, 
      hasContentWarning: checked,
      contentWarning: checked ? prev.contentWarning : ''
    }))
  }

  // Handle content warning text changes
  const handleContentWarningChange = (warning: string) => {
    setPostData(prev => ({ ...prev, contentWarning: warning }))
  }

  // Handle media attachment
  const handleMediaAttachment = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files)
      setPostData(prev => ({ 
        ...prev, 
        mediaAttachments: [...prev.mediaAttachments, ...newFiles]
      }))
    }
  }

  // Handle post submission
  const handlePostSubmit = () => {
    console.log('Submitting post:', postData)
    // Implementation would call API to create post
  }

  // Handle draft save
  const handleSaveDraft = () => {
    console.log('Saving draft:', postData)
    // Implementation would save to drafts
  }

  // Handle scheduled post
  const handleSchedulePost = () => {
    console.log('Scheduling post:', postData)
    // Implementation would schedule post
  }

  // Handle quick broadcast
  const handleQuickBroadcast = () => {
    console.log('Quick broadcast')
    // Implementation would trigger quick broadcast
  }

  // Handle review reports
  const handleReviewReports = () => {
    console.log('Review reports')
    // Implementation would open moderation interface
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div 
          data-testid="loading-spinner"
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" 
        />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      {/* Success Message */}
      <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-green-600 mr-3">✅</div>
          <div>
            <h2 className="text-green-800 font-semibold">Login Successful!</h2>
            <p className="text-green-700">You have successfully logged in and reached the dashboard.</p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to your ParaSocial dashboard</p>
      </header>

      {/* Content Command Center */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Content Command Center</h2>
        
        {/* Post Composer */}
        <div data-testid="post-composer" className="mb-6">
          <label htmlFor="compose-post" className="block text-sm font-medium text-gray-700 mb-2">
            Compose new post
          </label>
          <textarea
            id="compose-post"
            role="textbox"
            aria-label="Compose new post"
            placeholder="What's happening in the fediverse?"
            value={postData.content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg resize-vertical min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={500}
          />
          <div className="text-right text-sm text-gray-500 mt-1">
            {postData.content.length}/500
          </div>
        </div>

        {/* Content Warning Controls */}
        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              role="checkbox"
              aria-label="Add content warning"
              checked={postData.hasContentWarning}
              onChange={(e) => handleContentWarningToggle(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Add content warning</span>
          </label>
          
          {postData.hasContentWarning && (
            <input
              type="text"
              placeholder="Content warning text"
              value={postData.contentWarning}
              onChange={(e) => handleContentWarningChange(e.target.value)}
              className="mt-2 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
            />
          )}
        </div>

        {/* Media Attachment Controls */}
        <div data-testid="media-attachment-controls" className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Media Attachments
          </label>
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={(e) => handleMediaAttachment(e.target.files)}
            className="hidden"
            id="media-upload"
          />
          <label
            htmlFor="media-upload"
            role="button"
            aria-label="Attach media"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            📎 Attach Media
          </label>
          
          {postData.mediaAttachments.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              {postData.mediaAttachments.length} file(s) attached
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePostSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Publish Now
          </button>
          
          <button
            onClick={handleQuickBroadcast}
            role="button"
            aria-label="Quick broadcast"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Quick Broadcast
          </button>
        </div>
      </section>

      {/* Draft Management & Publishing Scheduler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Draft Management */}
        <section data-testid="draft-management" className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Draft Management</h3>
          <p className="text-gray-600 mb-4">You have 3 drafts saved</p>
          <button
            onClick={handleSaveDraft}
            role="button"
            aria-label="Save draft"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Save Draft
          </button>
        </section>

        {/* Publishing Scheduler */}
        <section data-testid="publishing-scheduler" className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Publishing Scheduler</h3>
          <input
            type="datetime-local"
            value={postData.scheduledTime}
            onChange={(e) => setPostData(prev => ({ ...prev, scheduledTime: e.target.value }))}
            className="w-full p-2 border border-gray-300 rounded-lg mb-4"
          />
          <button
            onClick={handleSchedulePost}
            role="button"
            aria-label="Schedule post"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Schedule Post
          </button>
        </section>
      </div>

      {/* Audience Intelligence */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Audience Intelligence</h2>
        
        {/* Audience Analytics */}
        <div data-testid="audience-analytics" className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{audienceData.totalFollowers.toLocaleString()}</div>
            <div className="text-gray-600">Total Followers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">+{audienceData.weeklyGrowth}</div>
            <div className="text-gray-600">This Week</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{audienceData.deliverySuccess}%</div>
            <div className="text-gray-600">Delivery Success</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{audienceData.activityPubStatus}</div>
            <div className="text-gray-600">ActivityPub Status</div>
          </div>
        </div>

        {/* Instance Breakdown Chart */}
        <div data-testid="instance-breakdown-chart" className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Instance Breakdown</h3>
          <div className="space-y-2">
            {audienceData.instanceBreakdown.map((instance) => (
              <div key={instance.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">{instance.name}</span>
                <span className="text-gray-600">{instance.count} followers</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reach Metrics */}
        <div data-testid="reach-metrics" className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Reach Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{audienceData.deliverySuccess}%</div>
              <div className="text-green-700">Delivery Success</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{audienceData.activityPubStatus}</div>
              <div className="text-blue-700">ActivityPub Status</div>
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div data-testid="geographic-distribution">
          <h3 className="text-lg font-semibold mb-3">Geographic Distribution</h3>
          <div className="space-y-2">
            {audienceData.geographicDistribution.map((geo) => (
              <div key={geo.country} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="font-medium">{geo.country}: {geo.count}</span>
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(geo.count / audienceData.totalFollowers) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Broadcasting Tools */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Broadcasting Tools</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bulk Scheduler */}
          <div data-testid="bulk-scheduler" className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">Bulk Scheduler</h3>
            <p className="text-gray-600 text-sm mb-3">Schedule multiple posts at once</p>
            <button className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              Open Scheduler
            </button>
          </div>

          {/* Media Library */}
          <div data-testid="media-library" className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">Media Library</h3>
            <p className="text-gray-600 text-sm mb-3">Manage your media assets</p>
            <button className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">
              Browse Library
            </button>
          </div>

          {/* Content Calendar */}
          <div data-testid="content-calendar" className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">Content Calendar</h3>
            <p className="text-gray-600 text-sm mb-3">View your posting schedule</p>
            <button className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">
              Open Calendar
            </button>
          </div>
        </div>
      </section>

      {/* Moderation Control Panel */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Moderation Control Panel</h2>
        
        <div data-testid="moderation-panel" className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Reported Content */}
          <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
            <h3 className="font-semibold mb-2">Reported Content</h3>
            <p className="text-gray-600 text-sm mb-3">5 reports pending review</p>
            <button
              onClick={handleReviewReports}
              role="button"
              aria-label="Review reports"
              className="px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
            >
              Review Reports
            </button>
          </div>

          {/* Blocked Followers */}
          <div data-testid="blocked-followers" className="p-4 border border-red-200 bg-red-50 rounded-lg">
            <h3 className="font-semibold mb-2">Blocked Followers</h3>
            <p className="text-gray-600 text-sm mb-3">12 users blocked</p>
            <button className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">
              Manage Blocks
            </button>
          </div>

          {/* Federation Blocklist */}
          <div data-testid="federation-blocklist" className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">Federation Blocklist</h3>
            <p className="text-gray-600 text-sm mb-3">3 instances blocked</p>
            <button className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
              Manage Blocklist
            </button>
          </div>
        </div>
      </section>

      {/* Account Health Monitor */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Account Health Monitor</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Account Health */}
          <div data-testid="account-health" className="p-4 border border-green-200 bg-green-50 rounded-lg">
            <h3 className="font-semibold mb-2">Verification Status</h3>
            <div className="text-2xl font-bold text-green-600 mb-1">✓ Verified</div>
            <p className="text-green-700 text-sm">Account in good standing</p>
          </div>

          {/* Federation Health */}
          <div data-testid="federation-health-status" className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">Federation Health</h3>
            <div className="text-2xl font-bold text-blue-600 mb-1">Excellent</div>
            <p className="text-blue-700 text-sm">All connections active</p>
          </div>

          {/* Security Overview */}
          <div data-testid="security-overview" className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
            <h3 className="font-semibold mb-2">Security Status</h3>
            <div className="text-2xl font-bold text-purple-600 mb-1">Secure</div>
            <p className="text-purple-700 text-sm">2FA enabled</p>
          </div>
        </div>
      </section>

      {/* User Profile Section */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">User Profile</h2>
        {user ? (
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {user.displayName?.charAt(0) || user.username?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{user.displayName || user.username}</h3>
              <p className="text-gray-600">@{user.username}</p>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No user data found</p>
        )}
      </section>

      {/* Quick Actions */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="space-y-4">
          <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
            Create New Post
          </button>
          <button className="w-full md:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg ml-0 md:ml-4">
            View Profile
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('authToken')
              localStorage.removeItem('user')
              document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
              window.location.href = '/login'
            }}
            className="w-full md:w-auto bg-red-100 hover:bg-red-200 text-red-700 px-6 py-2 rounded-lg ml-0 md:ml-4"
          >
            Logout
          </button>
        </div>
      </section>
    </main>
  )
}

// frontend/src/app/dashboard/page.tsx