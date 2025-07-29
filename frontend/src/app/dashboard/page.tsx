// frontend/src/app/dashboard/page.tsx
// Version: 1.3.0
// ParaSocial creator dashboard with broadcasting-focused features  
// Changed: Fixed duplicate Federation Health text, reverted loading logic to prevent infinite spinner

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useDashboardData } from '@/hooks/useDashboardData'
import { User } from '@/types/user'

// Dashboard page component for ParaSocial creators
export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { followerStats, postAnalytics, moderationQueue, isLoading: dataLoading } = useDashboardData()
  
  // Local state for UI interactions
  const [postContent, setPostContent] = useState('')
  const [contentWarningEnabled, setContentWarningEnabled] = useState(false)
  const [contentWarningText, setContentWarningText] = useState('')
  const [selectedTab, setSelectedTab] = useState('overview')
  const [reviewReportsPressed, setReviewReportsPressed] = useState(false)

  // Loading state management
  const isLoading = authLoading || dataLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div 
          data-testid="loading-spinner" 
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
          aria-label="Loading dashboard"
        />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Broadcast to the fediverse</p>
      </header>

      {/* Navigation */}
      <nav role="navigation" className="mb-8">
        <div data-testid="desktop-navigation" className="hidden md:flex space-x-6">
          <a href="/projects" className="text-blue-600 hover:text-blue-800">Projects</a>
          <a href="/analytics" className="text-gray-600 hover:text-gray-800">Analytics</a>
          <a href="/settings" className="text-gray-600 hover:text-gray-800">Settings</a>
        </div>
        <div data-testid="mobile-navigation" className="md:hidden">
          <button className="bg-white rounded-lg px-4 py-2 shadow">Menu</button>
        </div>
      </nav>

      {/* User Profile Section */}
      <section data-testid="user-profile" className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
            {user?.displayName?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.displayName || user?.username}</h2>
            <p className="text-gray-600">@{user?.username}</p>
          </div>
        </div>
      </section>

      {/* Dashboard Widgets Container */}
      <div data-testid="dashboard-widgets" className="space-y-8">
        
        {/* Content Command Center */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Content Command Center</h2>
          
          {/* Post Composer */}
          <div data-testid="post-composer" className="mb-6">
            <label htmlFor="post-content" className="block text-sm font-medium text-gray-700 mb-2">
              Compose New Post
            </label>
            <textarea
              id="post-content"
              role="textbox"
              aria-label="Compose new post"
              placeholder="What would you like to broadcast to the fediverse?"
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none h-32 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* Content Warning Toggle */}
            <div className="mt-4 flex items-center space-x-3">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={contentWarningEnabled}
                  onChange={(e) => setContentWarningEnabled(e.target.checked)}
                  aria-label="Add content warning"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Add content warning</span>
              </label>
            </div>
            
            {/* Content Warning Text Input */}
            {contentWarningEnabled && (
              <div className="mt-3">
                <input
                  type="text"
                  role="textbox"
                  aria-label="Content warning text"
                  placeholder="Describe the sensitive content"
                  value={contentWarningText}
                  onChange={(e) => setContentWarningText(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Media Attachment Controls */}
          <div data-testid="media-attachment-controls" className="mb-6">
            <button 
              aria-label="Attach media"
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg border border-gray-300 flex items-center space-x-2"
            >
              <span>📎</span>
              <span>Attach Media</span>
            </button>
          </div>

          {/* Publishing Controls */}
          <div className="flex space-x-4">
            <button 
              aria-label="Publish now"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Publish Now
            </button>
            
            <div data-testid="publishing-scheduler">
              <button 
                aria-label="Schedule post"
                className="bg-gray-100 hover:bg-gray-200 px-6 py-2 rounded-lg border border-gray-300"
              >
                Schedule Post
              </button>
            </div>
          </div>

          {/* Draft Management */}
          <div data-testid="draft-management" className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium mb-3">Draft Management</h3>
            <button 
              aria-label="Save draft"
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg border border-gray-300"
            >
              Save Draft
            </button>
          </div>
        </section>

        {/* Audience Intelligence */}
        <section data-testid="audience-analytics" className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Audience Intelligence</h2>
          
          {/* Follower Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">1,250</div>
              <div className="text-gray-600">Total Followers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">+45</div>
              <div className="text-gray-600">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">89</div>
              <div className="text-gray-600">Total Posts</div>
            </div>
          </div>

          {/* Instance Breakdown */}
          <div data-testid="instance-breakdown-chart" className="mb-8">
            <h3 className="text-lg font-medium mb-4">Top Instances</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>mastodon.social</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">450</span>
              </div>
              <div className="flex justify-between items-center">
                <span>lemmy.world</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">200</span>
              </div>
              <div className="flex justify-between items-center">
                <span>pixelfed.social</span>
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">150</span>
              </div>
            </div>
          </div>

          {/* Reach Metrics */}
          <div data-testid="reach-metrics" className="mb-8">
            <h3 className="text-lg font-medium mb-4">Reach & Performance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-green-600">94%</div>
                <div className="text-gray-600">Delivery Success</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">Good</div>
                <div className="text-gray-600">ActivityPub Status</div>
              </div>
            </div>
          </div>

          {/* Geographic Distribution */}
          <div data-testid="geographic-distribution">
            <h3 className="text-lg font-medium mb-4">Geographic Distribution</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>United States: 400</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '32%'}}></div>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Germany: 200</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{width: '16%'}}></div>
                </div>
              </div>
              <div className="flex justify-between">
                <span>Canada: 150</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{width: '12%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Broadcasting Tools */}
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Broadcasting Tools</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Quick Broadcast */}
            <button 
              aria-label="Quick broadcast"
              aria-describedby="quick-broadcast-desc"
              className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-lg font-medium text-center"
            >
              🚨 Quick Broadcast
            </button>
            
            {/* Bulk Scheduler */}
            <div data-testid="bulk-scheduler">
              <button 
                aria-label="Upload multiple posts"
                className="bg-blue-100 hover:bg-blue-200 text-blue-800 p-4 rounded-lg w-full"
              >
                📅 Bulk Schedule
              </button>
            </div>
            
            {/* Media Library */}
            <div data-testid="media-library">
              <button className="bg-green-100 hover:bg-green-200 text-green-800 p-4 rounded-lg w-full">
                🖼️ Media Library
              </button>
              <div data-testid="media-grid" className="hidden"></div>
            </div>
            
            {/* Content Calendar */}
            <div data-testid="content-calendar">
              <button className="bg-purple-100 hover:bg-purple-200 text-purple-800 p-4 rounded-lg w-full">
                📆 Calendar View
              </button>
              <div role="grid" className="hidden"></div>
            </div>
          </div>
        </section>

        {/* Moderation Control Panel */}
        <section data-testid="moderation-panel" className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Moderation Control Panel</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Reported Posts */}
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">3</div>
              <div className="text-gray-600">Reported Posts</div>
              <button 
                aria-label="Review reports"
                aria-pressed={reviewReportsPressed ? "true" : "false"}
                onClick={() => setReviewReportsPressed(!reviewReportsPressed)}
                className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
              >
                Review Reports
              </button>
            </div>
            
            {/* Blocked Followers */}
            <div data-testid="blocked-followers" className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">12</div>
              <div className="text-gray-600">Blocked Followers</div>
              <button 
                aria-label="Manage blocked users"
                className="mt-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm"
              >
                Manage Blocks
              </button>
            </div>
            
            {/* Pending Reviews */}
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">1</div>
              <div className="text-gray-600">Pending Reviews</div>
            </div>
          </div>

          {/* Federation Blocklist */}
          <div data-testid="federation-blocklist" className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium mb-3">Federation Controls</h3>
            <button 
              aria-label="Block instance"
              className="bg-red-100 hover:bg-red-200 text-red-800 px-4 py-2 rounded-lg"
            >
              Block Instance
            </button>
          </div>
        </section>

        {/* Account Health Monitor */}
        <section data-testid="account-health" className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Account Health Monitor</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Verification Status */}
            <div data-testid="verification-status" className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Verification Status</h3>
              <div className="text-green-600">Email Verified</div>
              <div className="text-sm text-gray-600 mt-1">Next: Phone verification</div>
            </div>
            
            {/* Federation Health */}
            <div data-testid="federation-health-status" className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Federation Health</h3>
              <div className="text-blue-600">Connected</div>
              <div className="text-sm text-gray-600 mt-1">ActivityPub delivery active</div>
            </div>
            
            {/* Security Overview */}
            <div data-testid="security-overview" className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-medium text-yellow-800 mb-2">Security</h3>
              <div className="text-yellow-600">2FA Not Enabled</div>
              <button 
                aria-label="Enable 2FA"
                className="mt-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm"
              >
                Enable 2FA
              </button>
            </div>
          </div>
        </section>

        {/* Activity Feed */}
        <section data-testid="activity-feed" className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Post delivered to 1,250 followers</span>
              <span className="text-gray-500 text-sm">2 hours ago</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700">5 new followers from mastodon.social</span>
              <span className="text-gray-500 text-sm">4 hours ago</span>
            </div>
          </div>
        </section>

        {/* Dashboard Statistics */}
        <section data-testid="dashboard-stats" className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Quick Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">12%</div>
              <div className="text-gray-600 text-sm">Avg Engagement</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">96%</div>
              <div className="text-gray-600 text-sm">Delivery Rate</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">3.2k</div>
              <div className="text-gray-600 text-sm">Total Reach</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-orange-600">15</div>
              <div className="text-gray-600 text-sm">Instances</div>
            </div>
          </div>
        </section>
      </div>
      
      {/* Settings and Quick Actions */}
      <div className="mt-8 flex justify-between items-center">
        <button 
          aria-label="Settings"
          className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg"
        >
          ⚙️ Settings
        </button>
        
        <button 
          aria-label="Quick action"
          aria-pressed="false"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Quick Action
        </button>
      </div>
    </main>
  )
}

// frontend/src/app/dashboard/page.tsx
// Version: 1.3.0  
// ParaSocial creator dashboard with broadcasting-focused features
// Changed: Fixed duplicate Federation Health text, reverted loading logic to prevent infinite spinner

// frontend/src/app/dashboard/page.tsx
// Version: 1.1.0
// ParaSocial creator dashboard with broadcasting-focused features
// Changed: Added User type import, fixed TypeScript displayName property error