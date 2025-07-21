// Path: frontend/src/app/dashboard/page.tsx
// Version: 1.1.0
// Dashboard page component with user info, widgets, and interactive elements
// Changed: Added React import to fix JSX namespace error

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Types for dashboard data
interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

interface DashboardStats {
  totalProjects: number
  completedTasks: number
  pendingTasks: number
  teamMembers: number
}

interface ActivityItem {
  id: string
  type: 'task' | 'project' | 'comment'
  message: string
  timestamp: Date
}

interface DashboardData {
  stats: DashboardStats
  recentActivity: ActivityItem[]
}

// Mock hook for authentication (would be replaced with actual implementation)
const useAuth = () => ({
  user: {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    avatar: '/placeholder-avatar.jpg'
  } as User,
  isLoading: false,
  isAuthenticated: true,
  error: null
})

// Mock hook for dashboard data (would be replaced with actual API calls)
const useDashboardData = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      try {
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setData({
          stats: {
            totalProjects: 12,
            completedTasks: 48,
            pendingTasks: 15,
            teamMembers: 8
          },
          recentActivity: [
            {
              id: '1',
              type: 'task',
              message: 'Completed user authentication feature',
              timestamp: new Date()
            },
            {
              id: '2',
              type: 'project',
              message: 'Created new project "Dashboard Redesign"',
              timestamp: new Date(Date.now() - 3600000)
            }
          ]
        })
        setIsLoading(false)
      } catch (err) {
        setError('Failed to load dashboard data')
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return { data, isLoading, error }
}

export default function DashboardPage(): React.JSX.Element {
  const router = useRouter()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const { data: dashboardData, isLoading: dataLoading, error } = useDashboardData()
  
  // State for interactive elements
  const [quickActionPressed, setQuickActionPressed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Check viewport size for responsive design
  useEffect(() => {
    const checkViewport = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkViewport()
    window.addEventListener('resize', checkViewport)
    
    return () => window.removeEventListener('resize', checkViewport)
  }, [])

  // Handle quick action button click
  const handleQuickAction = () => {
    setQuickActionPressed(true)
    setTimeout(() => setQuickActionPressed(false), 2000)
  }

  // Handle settings button click
  const handleSettings = () => {
    router.push('/settings')
  }

  // Redirect if not authenticated
  if (!isAuthenticated && !authLoading) {
    router.push('/login')
    return <div>Redirecting...</div>
  }

  // Show loading state
  if (authLoading || dataLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div 
          data-testid="loading-spinner"
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
          aria-label="Loading dashboard"
        >
        </div>
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </main>
    )
  }

  // Show error state
  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div 
          role="alert"
          className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md"
        >
          <h2 className="text-red-800 font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-red-700">{error}</p>
        </div>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav 
        role="navigation"
        aria-label="Main navigation"
        className="bg-white shadow-sm border-b border-gray-200"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Mobile navigation */}
            {isMobile && (
              <div data-testid="mobile-navigation" className="flex items-center">
                <button
                  type="button"
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900"
                  aria-label="Open mobile menu"
                >
                  <span className="sr-only">Open main menu</span>
                  ☰
                </button>
              </div>
            )}
            
            {/* Desktop navigation */}
            {!isMobile && (
              <div data-testid="desktop-navigation" className="flex items-center space-x-8">
                <div className="text-xl font-bold text-gray-900">Dashboard</div>
                <div className="flex space-x-4">
                  <a href="/projects" className="text-gray-600 hover:text-gray-900">
                    Projects
                  </a>
                  <a href="/tasks" className="text-gray-600 hover:text-gray-900">
                    Tasks
                  </a>
                  <a href="/team" className="text-gray-600 hover:text-gray-900">
                    Team
                  </a>
                </div>
              </div>
            )}

            {/* User profile section */}
            <div data-testid="user-profile" className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
              <img
                src={user?.avatar || '/placeholder-avatar.jpg'}
                alt={`${user?.name} avatar`}
                className="h-8 w-8 rounded-full bg-gray-300"
              />
              <button
                type="button"
                onClick={handleSettings}
                className="p-1 rounded-full text-gray-600 hover:text-gray-900"
                aria-label="Settings"
              >
                ⚙️
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main role="main" className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="px-4 py-6 sm:px-0">
          <h1 
            className="text-3xl font-bold text-gray-900"
            data-testid="first-focusable"
            tabIndex={0}
          >
            Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {user?.name}! Here's what's happening with your projects.
          </p>
        </div>

        {/* Quick actions */}
        <div className="px-4 py-4 sm:px-0">
          <button
            type="button"
            onClick={handleQuickAction}
            aria-pressed={quickActionPressed}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Quick Action
          </button>
        </div>

        {/* Dashboard statistics */}
        <div 
          data-testid="dashboard-stats"
          className="px-4 py-6 sm:px-0"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">📊</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Projects
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardData?.stats.totalProjects}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">✅</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Completed Tasks
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardData?.stats.completedTasks}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">⏳</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pending Tasks
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardData?.stats.pendingTasks}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl">👥</div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Team Members
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {dashboardData?.stats.teamMembers}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard widgets */}
        <div 
          data-testid="dashboard-widgets"
          className="px-4 py-6 sm:px-0 grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Recent activity */}
          <div 
            className="bg-white shadow rounded-lg p-6"
            role="region"
            aria-label="Recent activity"
          >
            <div data-testid="activity-feed">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {dashboardData?.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">
                        {activity.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Additional widget placeholder */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Links</h3>
            <div className="space-y-3">
              <a 
                href="/projects/new" 
                className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Create New Project</div>
                <div className="text-sm text-gray-500">Start a new project from scratch</div>
              </a>
              <a 
                href="/tasks/new" 
                className="block p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Add New Task</div>
                <div className="text-sm text-gray-500">Add a task to an existing project</div>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Path: frontend/src/app/dashboard/page.tsx
// Version: 1.1.0
// Dashboard page component with user info, widgets, and interactive elements
// Changed: Added React import to fix JSX namespace error