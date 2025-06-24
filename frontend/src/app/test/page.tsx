// frontend/src/app/test/page.tsx (App Router)
// OR frontend/src/pages/test.tsx (Pages Router)
'use client' // Only needed for App Router

import React, { useState } from 'react'
import PostCreationTest from '../../components/test/PostCreationTest'
import PostFeedTest from '../../components/test/PostFeedTest'
import FollowUnfollowTest from '../../components/test/FollowUnfollowTest'

interface TestComponent {
  id: string
  name: string
  description: string
  component: React.ComponentType
}

export default function TestPage(): React.JSX.Element {
  const [activeTest, setActiveTest] = useState<string>('post-creation')

  const tests: TestComponent[] = [
    { 
      id: 'post-creation', 
      name: 'Post Creation', 
      description: 'Test post creation with validation, scheduling, and error handling',
      component: PostCreationTest 
    },
    { 
      id: 'post-feed', 
      name: 'Post Feed', 
      description: 'Test post display, pagination, content warnings, and verification badges',
      component: PostFeedTest 
    },
    { 
      id: 'follow-unfollow', 
      name: 'Follow/Unfollow', 
      description: 'Test user following functionality with different scenarios and error handling',
      component: FollowUnfollowTest 
    }
  ]

  const ActiveComponent = tests.find(test => test.id === activeTest)?.component

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Test Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">ParaSocial Component Tests</h1>
            <div className="text-sm text-gray-500">
              Phase 2.2 - Create/read posts, follow/unfollow users
            </div>
          </div>
          
          {/* Test Description */}
          <p className="text-gray-600 mb-4">
            Interactive test components for validating controller functionality and UI behavior
          </p>
          
          {/* Test Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {tests.map((test) => (
              <button
                key={test.id}
                onClick={() => setActiveTest(test.id)}
                className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 text-left ${
                  activeTest === test.id
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                <div className="font-semibold">{test.name}</div>
                <div className="text-xs opacity-90 mt-1">
                  {test.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Active Test Component */}
      <main className="transition-all duration-300">
        {ActiveComponent && <ActiveComponent />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Backend Implementation</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ PostController - CRUD operations</li>
                <li>✅ UserController - Follow/unfollow, profiles</li>
                <li>✅ Repositories - Data access layer</li>
                <li>✅ Routes - RESTful endpoints</li>
                <li>✅ Unit Tests - All green!</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Frontend Testing</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ Form validation & error handling</li>
                <li>✅ Loading states & transitions</li>
                <li>✅ Responsive design</li>
                <li>✅ Content warnings & verification</li>
                <li>✅ Pagination & user interactions</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Test Coverage</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>📝 Post creation with scheduling</li>
                <li>📰 Feed display with pagination</li>
                <li>👥 Follow/unfollow with error cases</li>
                <li>🔒 Authentication & authorization</li>
                <li>⚠️ Edge cases & error handling</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-6 text-center text-sm text-gray-500">
            <p>ParaSocial - Phase 2.2 Implementation ✅ Ready for Phase 3: ActivityPub Federation</p>
          </div>
        </div>
      </footer>
    </div>
  )
}