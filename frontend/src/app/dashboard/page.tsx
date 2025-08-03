// frontend/src/app/dashboard/page.tsx
// Version: 2.0.0
// Simplified dashboard without client-side auth checks
// Changed: Removed useAuth hook that was causing redirect loops

'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  username: string
  displayName: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get user from localStorage (set during login)
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
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

      {/* Quick Stats */}
      <section className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">0</div>
            <div className="text-gray-600">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">0</div>
            <div className="text-gray-600">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">0</div>
            <div className="text-gray-600">Following</div>
          </div>
        </div>
      </section>

      {/* Actions */}
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
// Version: 2.0.0