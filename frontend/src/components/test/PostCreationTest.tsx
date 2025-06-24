// frontend/src/components/test/PostCreationTest.tsx
import React, { useState } from 'react'

// Types for API responses
interface PostCreateResponse {
  success: boolean
  data: {
    id: string
    content: string
    contentWarning: string | null
    isScheduled: boolean
    scheduledFor: string | null
    isPublished: boolean
    publishedAt: string | null
    author: {
      id: string
      username: string
      displayName: string
      avatar: string | null
      isVerified: boolean
    }
  }
}

interface PostCreateRequest {
  content: string
  contentWarning?: string | null
  isScheduled?: boolean
  scheduledFor?: string | null
}

// Mock API service for testing
const mockPostAPI = {
  async createPost(postData: PostCreateRequest): Promise<PostCreateResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Simulate validation errors
    if (!postData.content || postData.content.trim().length === 0) {
      throw new Error('Post content is required')
    }
    
    if (postData.content.length > 5000) {
      throw new Error('Post content cannot exceed 5000 characters')
    }
    
    if (postData.isScheduled && !postData.scheduledFor) {
      throw new Error('Scheduled posts must include scheduledFor date')
    }
    
    if (postData.isScheduled && new Date(postData.scheduledFor!) <= new Date()) {
      throw new Error('Scheduled date must be in the future')
    }
    
    // Simulate successful creation
    return {
      success: true,
      data: {
        id: 'post_' + Date.now(),
        content: postData.content,
        contentWarning: postData.contentWarning || null,
        isScheduled: postData.isScheduled || false,
        scheduledFor: postData.scheduledFor || null,
        isPublished: !postData.isScheduled,
        publishedAt: !postData.isScheduled ? new Date().toISOString() : null,
        author: {
          id: 'user123',
          username: 'testuser',
          displayName: 'Test User',
          avatar: null,
          isVerified: true
        }
      }
    }
  }
}

/**
 * Post Creation Form Component
 * Tests the UI for creating posts with validation
 */
function PostCreationForm(): React.JSX.Element {
  const [content, setContent] = useState<string>('')
  const [contentWarning, setContentWarning] = useState<string>('')
  const [isScheduled, setIsScheduled] = useState<boolean>(false)
  const [scheduledFor, setScheduledFor] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [createdPost, setCreatedPost] = useState<PostCreateResponse['data'] | null>(null)

  // Calculate minimum date for scheduling (1 hour from now)
  const minScheduleDate: string = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16) // Format for datetime-local input

  const handleSubmit = async (): Promise<void> => {
    setError('')
    setIsSubmitting(true)

    try {
      const postData: PostCreateRequest = {
        content: content.trim(),
        contentWarning: contentWarning.trim() || null,
        isScheduled,
        scheduledFor: isScheduled ? scheduledFor : null
      }

      const result = await mockPostAPI.createPost(postData)
      setCreatedPost(result.data)
      
      // Reset form
      setContent('')
      setContentWarning('')
      setIsScheduled(false)
      setScheduledFor('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const characterCount: number = content.length
  const isOverLimit: boolean = characterCount > 5000
  const isNearLimit: boolean = characterCount > 4500
  
  // Check if scheduled date is valid (must be in the future)
  const isScheduledDateValid: boolean = !isScheduled || (!!scheduledFor && new Date(scheduledFor) > new Date())
  
  // Button should be disabled if any of these conditions are true
  const isFormInvalid: boolean = isSubmitting || !content.trim() || isOverLimit || (isScheduled && !isScheduledDateValid)

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Post</h2>
      
      <div className="space-y-6">
        {/* Content Input */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            Post Content *
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={6}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 resize-none ${
              isOverLimit 
                ? 'border-red-500 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          <div className="flex justify-between items-center mt-1">
            <span className={`text-sm ${
              isOverLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-600' : 'text-gray-500'
            }`}>
              {characterCount}/5000 characters
            </span>
            {isOverLimit && (
              <span className="text-red-500 text-sm">Character limit exceeded</span>
            )}
          </div>
        </div>

        {/* Content Warning */}
        <div>
          <label htmlFor="contentWarning" className="block text-sm font-medium text-gray-700 mb-2">
            Content Warning (optional)
          </label>
          <input
            type="text"
            id="contentWarning"
            value={contentWarning}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContentWarning(e.target.value)}
            placeholder="e.g., Contains discussion of sensitive topics"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Scheduling */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isScheduled}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsScheduled(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Schedule for later</span>
          </label>

          {isScheduled && (
            <div>
              <label htmlFor="scheduledFor" className="block text-sm font-medium text-gray-700 mb-2">
                Publish Date & Time
              </label>
              <input
                type="datetime-local"
                id="scheduledFor"
                value={scheduledFor}
                min={minScheduleDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduledFor(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  scheduledFor && new Date(scheduledFor) <= new Date()
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
              />
              {scheduledFor && new Date(scheduledFor) <= new Date() && (
                <p className="text-red-500 text-sm mt-1">Scheduled date must be in the future</p>
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isFormInvalid}
          className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
            isFormInvalid
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating Post...
            </span>
          ) : isScheduled ? 'Schedule Post' : 'Publish Post'}
        </button>
      </div>

      {/* Success Display */}
      {createdPost && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
          <h3 className="text-green-800 font-medium mb-2">
            {createdPost.isScheduled ? 'Post Scheduled Successfully!' : 'Post Published Successfully!'}
          </h3>
          <div className="bg-white border rounded-md p-3">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {createdPost.author.displayName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{createdPost.author.displayName}</p>
                <p className="text-sm text-gray-500">@{createdPost.author.username}</p>
              </div>
              {createdPost.author.isVerified && (
                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <title>Verified User</title>
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              )}
            </div>
            {createdPost.contentWarning && (
              <div className="mb-2 text-sm text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                ⚠️ {createdPost.contentWarning}
              </div>
            )}
            <p className="text-gray-800">{createdPost.content}</p>
            <p className="text-sm text-gray-500 mt-2">
              {createdPost.isScheduled 
                ? `Scheduled for: ${new Date(createdPost.scheduledFor!).toLocaleString()}`
                : `Published: ${new Date(createdPost.publishedAt!).toLocaleString()}`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Test Scenarios Component
 * Demonstrates different test cases
 */
interface TestCase {
  id: string
  name: string
  description: string
  action: () => void
}

function TestScenarios(): React.JSX.Element {
  const [currentTest, setCurrentTest] = useState<string>('')

  const testCases: TestCase[] = [
    {
      id: 'empty-content',
      name: 'Empty Content',
      description: 'Try submitting with no content',
      action: () => setCurrentTest('Submit the form with empty content to test validation')
    },
    {
      id: 'long-content',
      name: 'Character Limit',
      description: 'Test character limit validation',
      action: () => setCurrentTest('Type more than 5000 characters to see the error state')
    },
    {
      id: 'scheduled-past',
      name: 'Past Schedule Date',
      description: 'Try scheduling for the past',
      action: () => setCurrentTest('Check "Schedule for later" and select a past date')
    },
    {
      id: 'valid-post',
      name: 'Valid Post',
      description: 'Create a successful post',
      action: () => setCurrentTest('Fill out valid content and submit')
    },
    {
      id: 'scheduled-post',
      name: 'Scheduled Post',
      description: 'Create a scheduled post',
      action: () => setCurrentTest('Check "Schedule for later" and select a future date')
    }
  ]

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Test Scenarios</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {testCases.map((test) => (
          <button
            key={test.id}
            onClick={test.action}
            className="text-left p-3 bg-white rounded border hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            <h4 className="font-medium text-gray-900">{test.name}</h4>
            <p className="text-sm text-gray-600">{test.description}</p>
          </button>
        ))}
      </div>
      {currentTest && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-blue-800 text-sm">{currentTest}</p>
        </div>
      )}
    </div>
  )
}

export default function PostCreationTestComponent(): React.JSX.Element {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Post Creation Test</h1>
          <p className="text-gray-600">Test the post creation functionality with validation and error handling</p>
        </div>
        
        <TestScenarios />
        <PostCreationForm />
        
        <div className="text-center text-sm text-gray-500">
          <p>This component tests PostController.createPost() functionality</p>
        </div>
      </div>
    </div>
  )
}