// frontend/src/components/PostCreationForm.tsx
// Form component for creating new posts with validation and API integration

'use client'

import { useState, useCallback } from 'react'

// Types for the post creation form
interface PostFormData {
  content: string
  contentWarning: string
  isScheduled: boolean
  scheduledFor: string
}

interface PostCreationResponse {
  success: boolean
  data?: {
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
  error?: string
  message?: string
}

interface PostCreationFormProps {
  onPostCreated?: (post: PostCreationResponse['data']) => void
  className?: string
}

export default function PostCreationForm({ onPostCreated, className = '' }: PostCreationFormProps) {
  // Form state
  const [formData, setFormData] = useState<PostFormData>({
    content: '',
    contentWarning: '',
    isScheduled: false,
    scheduledFor: ''
  })

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  // Constants
  const MAX_CONTENT_LENGTH = 5000
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Get minimum date for scheduling (current time + 1 minute)
  const getMinScheduleDate = useCallback(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1)
    return now.toISOString().slice(0, 16) // Format for datetime-local input
  }, [])

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {}

    // Content validation
    if (!formData.content.trim()) {
      newErrors.content = 'Post content is required'
    } else if (formData.content.length > MAX_CONTENT_LENGTH) {
      newErrors.content = `Post content cannot exceed ${MAX_CONTENT_LENGTH} characters`
    }

    // Scheduled post validation
    if (formData.isScheduled) {
      if (!formData.scheduledFor) {
        newErrors.scheduledFor = 'Scheduled date is required for scheduled posts'
      } else {
        const scheduledDate = new Date(formData.scheduledFor)
        const now = new Date()
        
        if (scheduledDate <= now) {
          newErrors.scheduledFor = 'Scheduled date must be in the future'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // Handle form input changes
  const handleInputChange = useCallback((field: keyof PostFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    
    // Clear success message when user starts editing
    if (successMessage) {
      setSuccessMessage('')
    }
  }, [errors, successMessage])

  // Submit form to API
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})
    setSuccessMessage('')

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        setErrors({ submit: 'You must be logged in to create posts' })
        return
      }

      // Prepare request body
      const requestBody = {
        content: formData.content.trim(),
        contentWarning: formData.contentWarning.trim() || null,
        isScheduled: formData.isScheduled,
        scheduledFor: formData.isScheduled ? formData.scheduledFor : null
      }

      // Make API request
      const response = await fetch(`${API_BASE_URL}/api/v1/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      })

      const result: PostCreationResponse = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      if (result.success && result.data) {
        // Success - reset form and show success message
        setFormData({
          content: '',
          contentWarning: '',
          isScheduled: false,
          scheduledFor: ''
        })
        
        setSuccessMessage(
          formData.isScheduled 
            ? 'Post scheduled successfully!' 
            : 'Post created successfully!'
        )

        // Call callback if provided
        if (onPostCreated) {
          onPostCreated(result.data)
        }
      } else {
        throw new Error(result.error || 'Failed to create post')
      }

    } catch (error) {
      console.error('Post creation error:', error)
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create post. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, validateForm, onPostCreated, API_BASE_URL])

  // Calculate remaining characters
  const remainingChars = MAX_CONTENT_LENGTH - formData.content.length
  const isNearLimit = remainingChars < 100

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Form Header */}
      <header>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create New Post
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Share your thoughts with your followers
        </p>
      </header>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-md">
          {successMessage}
        </div>
      )}

      {/* Global Error */}
      {errors.submit && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {errors.submit}
        </div>
      )}

      {/* Content Input */}
      <div className="space-y-2">
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Post Content *
        </label>
        <textarea
          id="content"
          value={formData.content}
          onChange={(e) => handleInputChange('content', e.target.value)}
          placeholder="What's on your mind?"
          rows={6}
          maxLength={MAX_CONTENT_LENGTH}
          className={`
            w-full px-3 py-2 border rounded-md shadow-sm resize-vertical
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            dark:bg-gray-800 dark:border-gray-600 dark:text-white
            ${errors.content ? 'border-red-500' : 'border-gray-300'}
          `}
          disabled={isSubmitting}
        />
        
        {/* Character Counter */}
        <div className="flex justify-between text-sm">
          <span className={`${errors.content ? 'text-red-600' : 'text-gray-500'}`}>
            {errors.content || ''}
          </span>
          <span className={`${isNearLimit ? 'text-orange-600' : 'text-gray-500'}`}>
            {remainingChars} characters remaining
          </span>
        </div>
      </div>

      {/* Content Warning */}
      <div className="space-y-2">
        <label htmlFor="contentWarning" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Content Warning (Optional)
        </label>
        <input
          type="text"
          id="contentWarning"
          value={formData.contentWarning}
          onChange={(e) => handleInputChange('contentWarning', e.target.value)}
          placeholder="e.g., Contains sensitive content"
          maxLength={200}
          className="
            w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            dark:bg-gray-800 dark:border-gray-600 dark:text-white
          "
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-500">
          Add a warning if your post contains sensitive or potentially upsetting content
        </p>
      </div>

      {/* Scheduling Options */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isScheduled"
            checked={formData.isScheduled}
            onChange={(e) => handleInputChange('isScheduled', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            disabled={isSubmitting}
          />
          <label htmlFor="isScheduled" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Schedule this post for later
          </label>
        </div>

        {/* Scheduled Date Input */}
        {formData.isScheduled && (
          <div className="ml-6 space-y-2">
            <label htmlFor="scheduledFor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Publish Date & Time *
            </label>
            <input
              type="datetime-local"
              id="scheduledFor"
              value={formData.scheduledFor}
              min={getMinScheduleDate()}
              onChange={(e) => handleInputChange('scheduledFor', e.target.value)}
              className={`
                w-full px-3 py-2 border rounded-md shadow-sm
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                dark:bg-gray-800 dark:border-gray-600 dark:text-white
                ${errors.scheduledFor ? 'border-red-500' : 'border-gray-300'}
              `}
              disabled={isSubmitting}
            />
            {errors.scheduledFor && (
              <p className="text-sm text-red-600">{errors.scheduledFor}</p>
            )}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            setFormData({
              content: '',
              contentWarning: '',
              isScheduled: false,
              scheduledFor: ''
            })
            setErrors({})
            setSuccessMessage('')
          }}
          disabled={isSubmitting}
          className="
            px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 
            rounded-md shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 
            disabled:opacity-50 disabled:cursor-not-allowed
            dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700
          "
        >
          Clear
        </button>
        
        <button
          type="submit"
          disabled={isSubmitting || !formData.content.trim()}
          className="
            px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent 
            rounded-md shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isSubmitting ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {formData.isScheduled ? 'Scheduling...' : 'Publishing...'}
            </span>
          ) : (
            formData.isScheduled ? 'Schedule Post' : 'Publish Post'
          )}
        </button>
      </div>
    </form>
  )
}