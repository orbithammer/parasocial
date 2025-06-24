'use client'

import { useState } from 'react'
import PostCreationTest from '../../components/test/PostCreationTest'
import PostFeedTest from '../../components/test/PostFeedTest'
import FollowUnfollowTest from '../../components/test/FollowUnfollowTest'

export default function TestPage() {
  const [activeTest, setActiveTest] = useState('post-creation')

  const tests = [
    { id: 'post-creation', name: 'Post Creation', component: PostCreationTest },
    { id: 'post-feed', name: 'Post Feed', component: PostFeedTest },
    { id: 'follow-unfollow', name: 'Follow/Unfollow', component: FollowUnfollowTest }
  ]

  const ActiveComponent = tests.find(test => test.id === activeTest)?.component

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Test Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Component Tests</h1>
          <div className="flex space-x-4">
            {tests.map((test) => (
              <button
                key={test.id}
                onClick={() => setActiveTest(test.id)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  activeTest === test.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {test.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Active Test Component */}
      <main>
        {ActiveComponent && <ActiveComponent />}
      </main>
    </div>
  )
}