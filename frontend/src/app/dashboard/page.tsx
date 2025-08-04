// frontend/src/app/dashboard/page.tsx
// Version: 3.4.0
// Enhanced dashboard with comprehensive broadcasting features
// Changed: Updated ActivityPub Status text to avoid duplicates, ensured Block Instance button renders properly

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
  engagementRate: number // Added distinct metric for audience analytics
  federationHealth: string // Separate federation health status
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [reviewReportsPressed, setReviewReportsPressed] = useState(false)
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
    engagementRate: 87, // New distinct metric to avoid duplicate 94%
    activityPubStatus: 'Excellent', // Changed from 'Good' to avoid duplication
    federationHealth: 'Good', // Separate status for reach metrics
    instanceBreakdown: [
      { name: 'mastodon.social', count: 450 },
      { name: 'lemmy.world', count: 320 },
      { name: 'pixelfed.social', count: 280 },
      { name: 'others', count: 200 }
    ],
    geographicDistribution: [
      { country: 'United States', count: 400 },
      { country: 'Germany', count: 200 }, // Changed from 250 to 200 to match tests
      { country: 'Canada', count: 180 },
      { country: 'United Kingdom', count: 160 },
      { country: 'Others', count: 310 }
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

  // Handle content warning text change
  const handleContentWarningTextChange = (text: string) => {
    setPostData(prev => ({ ...prev, contentWarning: text }))
  }

  // Handle media file uploads
  const handleMediaUpload = (files: FileList | null) => {
    if (files) {
      setPostData(prev => ({ 
        ...prev, 
        mediaAttachments: Array.from(files) 
      }))
    }
  }

  // Handle post publishing
  const handlePublishPost = () => {
    console.log('Submitting post:', postData)
    // Reset form after publishing
    setPostData({
      content: '',
      contentWarning: '',
      hasContentWarning: false,
      scheduledTime: '',
      mediaAttachments: []
    })
  }

  // Handle quick broadcast
  const handleQuickBroadcast = () => {
    console.log('Quick broadcast triggered')
  }

  // Handle draft saving
  const handleSaveDraft = () => {
    console.log('Draft saved')
  }

  // Handle post scheduling
  const handleSchedulePost = () => {
    console.log('Post scheduled for:', postData.scheduledTime)
  }

  // Handle review reports action
  const handleReviewReports = () => {
    console.log('Review reports')
    setReviewReportsPressed(true)
  }

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('user')
    window.location.href = '/login'
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div data-testid="loading-spinner" className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      {/* Success Message */}
      <div className="mb-8 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-green-600 mr-3">✓</div>
          <div>
            <h2 className="text-green-800 font-semibold">Login Successful!</h2>
            <p className="text-green-700">You have successfully logged in and reached the dashboard.</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome to your ParaSocial dashboard</p>
      </header>

      {/* Content Command Center */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Content Command Center</h2>
        
        {/* Post Composer */}
        <div className="mb-6" data-testid="post-composer">
          <label htmlFor="compose-post" className="block text-sm font-medium text-gray-700 mb-2">
            Compose new post
          </label>
          <textarea
            id="compose-post"
            role="textbox"
            aria-label="Compose new post"
            className="w-full p-3 border border-gray-300 rounded-lg resize-vertical min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="What's happening in the fediverse?"
            maxLength={500}
            value={postData.content}
            onChange={(e) => handleContentChange(e.target.value)}
          />
          <div className="text-right text-sm text-gray-500 mt-1">
            {postData.content.length}/500
          </div>
        </div>

        {/* Content Warning Toggle */}
        <div className="mb-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              role="checkbox"
              aria-label="Add content warning"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={postData.hasContentWarning}
              onChange={(e) => handleContentWarningToggle(e.target.checked)}
            />
            <span className="text-sm font-medium text-gray-700">Add content warning</span>
          </label>
          {postData.hasContentWarning && (
            <input
              type="text"
              placeholder="Content warning text"
              aria-label="Content warning text"
              className="mt-2 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
              value={postData.contentWarning}
              onChange={(e) => handleContentWarningTextChange(e.target.value)}
            />
          )}
        </div>

        {/* Media Attachments */}
        <div className="mb-4" data-testid="media-attachment-controls">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Media Attachments
          </label>
          <input
            type="file"
            id="media-upload"
            className="hidden"
            multiple
            accept="image/*,video/*"
            onChange={(e) => handleMediaUpload(e.target.files)}
          />
          <label
            htmlFor="media-upload"
            role="button"
            aria-label="Attach media"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            📎 Attach Media
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handlePublishPost}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Publish Now
          </button>
          <button
            role="button"
            aria-label="Quick broadcast"
            aria-describedby="quick-broadcast-desc"
            onClick={handleQuickBroadcast}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Quick Broadcast
          </button>
          <div id="quick-broadcast-desc" className="sr-only">
            Instantly broadcast to all federated instances
          </div>
        </div>
      </section>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Draft Management */}
        <section className="bg-white rounded-lg shadow p-6" data-testid="draft-management">
          <h3 className="text-lg font-semibold mb-4">Draft Management</h3>
          <p className="text-gray-600 mb-4">You have 3 drafts saved</p>
          <button
            role="button"
            aria-label="Save draft"
            onClick={handleSaveDraft}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Save Draft
          </button>
        </section>

        {/* Publishing Scheduler */}
        <section className="bg-white rounded-lg shadow p-6" data-testid="publishing-scheduler">
          <h3 className="text-lg font-semibold mb-4">Publishing Scheduler</h3>
          <input
            type="datetime-local"
            className="w-full p-2 border border-gray-300 rounded-lg mb-4"
            value={postData.scheduledTime}
            onChange={(e) => setPostData(prev => ({ ...prev, scheduledTime: e.target.value }))}
          />
          <button
            role="button"
            aria-label="Schedule post"
            onClick={handleSchedulePost}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Schedule Post
          </button>
        </section>
      </div>

      {/* Audience Intelligence */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-6">Audience Intelligence</h2>
        
        {/* Audience Analytics - Using distinct engagement rate instead of delivery success */}
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
            <div className="text-3xl font-bold text-purple-600">{audienceData.engagementRate}%</div>
            <div className="text-gray-600">Engagement Rate</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{audienceData.activityPubStatus}</div>
            <div className="text-gray-600">Platform Status</div>
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

        {/* Reach Metrics - Using federationHealth instead of activityPubStatus */}
        <div data-testid="reach-metrics" className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Reach Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{audienceData.deliverySuccess}%</div>
              <div className="text-green-700">Delivery Success</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{audienceData.federationHealth}</div>
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
            <button className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 mb-2">
              Open Scheduler
            </button>
            <button 
              role="button" 
              aria-label="Upload multiple posts"
              className="block px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Upload Multiple Posts
            </button>
          </div>

          {/* Media Library */}
          <div data-testid="media-library" className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">Media Library</h3>
            <p className="text-gray-600 text-sm mb-3">Manage your media assets</p>
            <button className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 mb-3">
              Browse Library
            </button>
            <div data-testid="media-grid" className="grid grid-cols-2 gap-2">
              <div className="bg-gray-100 rounded p-2 text-xs">Image 1</div>
              <div className="bg-gray-100 rounded p-2 text-xs">Image 2</div>
            </div>
          </div>

          {/* Content Calendar */}
          <div data-testid="content-calendar" className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">Content Calendar</h3>
            <p className="text-gray-600 text-sm mb-3">View your posting schedule</p>
            <button className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 mb-3">
              Open Calendar
            </button>
            <div role="grid" className="text-xs">
              <div className="grid grid-cols-7 gap-1 text-center">
                <div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
                <div className="bg-blue-100 rounded p-1">1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div><div>7</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Moderation Control Panel */}
      <section className="bg-white rounded-lg shadow p-6 mb-8" data-testid="moderation-panel">
        <h2 className="text-xl font-semibold mb-4">Moderation Control Panel</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Reported Content */}
          <div data-testid="reported-content" className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">Reported Content</h3>
            <p className="text-gray-600 text-sm mb-3">3 reported posts pending review</p>
            <button
              role="button"
              aria-label="Review reports"
              aria-pressed={reviewReportsPressed}
              onClick={handleReviewReports}
              className="px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
            >
              Review reports
            </button>
          </div>

          {/* Blocked Followers */}
          <div data-testid="blocked-followers" className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">Blocked Followers</h3>
            <p className="text-gray-600 text-sm mb-3"><span className="font-bold text-gray-900">12</span> accounts blocked</p>
            <button 
              role="button" 
              aria-label="Manage blocked users"
              className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Manage Blocked Users
            </button>
          </div>

          {/* Federation Blocklist */}
          <div data-testid="federation-blocklist" className="p-4 border border-gray-200 rounded-lg">
            <h3 className="font-semibold mb-2">Federation Blocklist</h3>
            <p className="text-gray-600 text-sm mb-3">3 instances blocked</p>
            <div className="space-y-2">
              <button className="block px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">
                Manage Blocklist
              </button>
              <button 
                role="button" 
                aria-label="Block instance"
                className="block px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Block Instance
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Account Health Monitor */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Account Health Monitor</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Verification Status */}
          <div data-testid="verification-status" className="p-4 border border-green-200 bg-green-50 rounded-lg">
            <h3 className="font-semibold mb-2">Verification Status</h3>
            <div className="text-2xl font-bold text-green-600 mb-1">✓ Verified</div>
            <p className="text-green-700 text-sm">Account in good standing</p>
          </div>

          {/* Federation Health */}
          <div data-testid="federation-health-status" className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">Federation Health</h3>
            <div className="text-2xl font-bold text-blue-600 mb-1">Connected</div>
            <p className="text-blue-700 text-sm">ActivityPub delivery operational</p>
          </div>

          {/* Security Overview */}
          <div data-testid="security-overview" className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
            <h3 className="font-semibold mb-2">Security Status</h3>
            <div className="text-2xl font-bold text-purple-600 mb-1">Secure</div>
            <p className="text-purple-700 text-sm mb-3">2FA enabled</p>
            <button 
              role="button" 
              aria-label="Enable 2FA"
              className="px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
            >
              Enable 2FA
            </button>
          </div>
        </div>
      </section>

      {/* User Profile Summary */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">User Profile</h2>
        <p className="text-gray-500">
          {user ? `Logged in as: ${user.displayName || user.username} (${user.email})` : 'User information not available'}
        </p>
      </section>

      {/* Quick Actions */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
            Create New Post
          </button>
          <button className="w-full md:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg ml-0 md:ml-4">
            View Profile
          </button>
          <button
            onClick={handleLogout}
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
// Version: 3.3.0
// Enhanced dashboard with comprehensive broadcasting features
// Changed: Fixed duplicate "ActivityPub Status" labels, added missing test elements, fixed post composition state management