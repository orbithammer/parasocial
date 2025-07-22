// frontend/src/components/posts/PostCreator.tsx
// Version: 1.0.0
// Initial PostCreator component for creating posts with content warnings and scheduling

'use client'

import { useState } from 'react'
import { Send, Calendar, AlertTriangle, Clock, X } from 'lucide-react'

/**
 * Post form data interface for submission
 */
interface PostFormData {
  content: string
  contentWarning: string
  isScheduled: boolean
  scheduledFor: string
}

/**
 * Props interface for PostCreator component
 */
interface PostCreatorProps {
  onSubmit?: (data: PostFormData) => Promise<void>
  disabled?: boolean
  className?: string
  placeholder?: string
  maxLength?: number
}

/**
 * PostCreator component for creating new posts
 * Supports content warnings, scheduling, and character limits
 * 
 * @param onSubmit - Callback function called when form is submitted
 * @param disabled - Whether the form should be disabled
 * @param className - Additional CSS classes for the container
 * @param placeholder - Placeholder text for the main content area
 * @param maxLength - Maximum character length for post content
 */
export default function PostCreator({ 
  onSubmit, 
  disabled = false, 
  className = '',
  placeholder = "What's happening?",
  maxLength = 5000 
}: PostCreatorProps) {
  // Form state management
  const [content, setContent] = useState('')
  const [contentWarning, setContentWarning] = useState('')
  const [showContentWarning, setShowContentWarning] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Constants for validation
  const MAX_CONTENT_LENGTH = maxLength
  const MAX_WARNING_LENGTH = 200
  
  // Calculate character counts and validation states
  const contentLength = content.length
  const warningLength = contentWarning.length
  const isContentValid = contentLength > 0 && contentLength <= MAX_CONTENT_LENGTH
  const isWarningValid = !showContentWarning || warningLength <= MAX_WARNING_LENGTH
  const isScheduleValid = !isScheduled || (scheduledFor && new Date(scheduledFor) > new Date())
  const canSubmit = isContentValid && isWarningValid && isScheduleValid && !isSubmitting

  /**
   * Get minimum datetime for scheduling (current time + 5 minutes)
   * Prevents scheduling posts in the immediate past
   */
  const getMinScheduleTime = (): string => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 5)
    return now.toISOString().slice(0, 16)
  }

  /**
   * Handle form submission
   * Validates data and calls onSubmit callback if provided
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!canSubmit || !onSubmit) return

    setIsSubmitting(true)

    try {
      const formData: PostFormData = {
        content: content.trim(),
        contentWarning: showContentWarning ? contentWarning.trim() : '',
        isScheduled,
        scheduledFor: isScheduled ? scheduledFor : ''
      }

      await onSubmit(formData)
      
      // Reset form after successful submission
      resetForm()
    } catch (error) {
      console.error('Error submitting post:', error)
      // Note: Error handling should be implemented by parent component
      // via onSubmit callback rejection
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Reset form to initial state
   * Called after successful submission
   */
  const resetForm = (): void => {
    setContent('')
    setContentWarning('')
    setShowContentWarning(false)
    setIsScheduled(false)
    setScheduledFor('')
  }

  /**
   * Toggle content warning section visibility
   */
  const toggleContentWarning = (): void => {
    setShowContentWarning(!showContentWarning)
    if (showContentWarning) {
      setContentWarning('')
    }
  }

  /**
   * Toggle post scheduling section visibility
   */
  const toggleScheduled = (): void => {
    setIsScheduled(!isScheduled)
    if (isScheduled) {
      setScheduledFor('')
    }
  }

  /**
   * Handle content textarea change
   * Updates content state and ensures character limit
   */
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const newContent = e.target.value
    if (newContent.length <= MAX_CONTENT_LENGTH) {
      setContent(newContent)
    }
  }

  /**
   * Handle content warning input change
   * Updates warning state and ensures character limit
   */
  const handleWarningChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newWarning = e.target.value
    if (newWarning.length <= MAX_WARNING_LENGTH) {
      setContentWarning(newWarning)
    }
  }

  /**
   * Handle schedule datetime input change
   */
  const handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setScheduledFor(e.target.value)
  }

  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`} 
      data-testid="post-creator"
    >
      <form onSubmit={handleSubmit} data-testid="post-creator-form">
        {/* Content Warning Section */}
        {showContentWarning && (
          <div 
            className="bg-amber-50 border-b border-amber-200 p-3" 
            data-testid="content-warning-section"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Content Warning</span>
              </div>
              <button
                type="button"
                onClick={toggleContentWarning}
                className="text-amber-600 hover:text-amber-800 transition-colors"
                data-testid="remove-content-warning-btn"
                aria-label="Remove content warning"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={contentWarning}
              onChange={handleWarningChange}
              placeholder="Describe the potentially sensitive content..."
              className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              disabled={disabled || isSubmitting}
              data-testid="content-warning-input"
              aria-label="Content warning description"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-amber-600">
                This warning will be shown before your post content
              </p>
              <span className={`text-xs font-medium ${
                warningLength > MAX_WARNING_LENGTH * 0.8 
                  ? 'text-amber-600' : 'text-amber-500'
              }`}>
                {warningLength}/{MAX_WARNING_LENGTH}
              </span>
            </div>
          </div>
        )}

        {/* Main Content Textarea */}
        <div className="relative">
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder={placeholder}
            className="w-full min-h-[120px] p-4 text-lg border-0 resize-none focus:outline-none placeholder-gray-400"
            disabled={disabled || isSubmitting}
            data-testid="content-textarea"
            aria-label="Post content"
          />
          
          {/* Character Counter */}
          <div className="absolute bottom-3 right-3">
            <div 
              className={`text-sm font-medium ${
                contentLength > MAX_CONTENT_LENGTH * 0.9 
                  ? 'text-red-500' 
                  : contentLength > MAX_CONTENT_LENGTH * 0.7 
                  ? 'text-amber-500' 
                  : 'text-gray-400'
              }`}
              data-testid="character-counter"
            >
              {contentLength}/{MAX_CONTENT_LENGTH}
            </div>
          </div>
        </div>

        {/* Schedule Section */}
        {isScheduled && (
          <div 
            className="bg-blue-50 border border-blue-200 rounded-lg p-3 mx-4 mb-3" 
            data-testid="schedule-section"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Schedule Post</span>
              </div>
              <button
                type="button"
                onClick={toggleScheduled}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                data-testid="remove-schedule-btn"
                aria-label="Remove schedule"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={handleScheduleChange}
              min={getMinScheduleTime()}
              className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="schedule-input"
              aria-label="Schedule date and time"
            />
            <p className="text-xs text-blue-600 mt-1">
              Your post will be published automatically at the scheduled time
            </p>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 p-4">
          {/* Left side - Additional options */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleContentWarning}
              className={`p-2 rounded-full transition-colors ${
                showContentWarning 
                  ? 'bg-amber-100 text-amber-600' 
                  : 'text-gray-400 hover:bg-gray-100 hover:text-amber-600'
              }`}
              title="Add content warning"
              data-testid="content-warning-btn"
              aria-label="Add content warning"
            >
              <AlertTriangle className="w-5 h-5" />
            </button>
            
            <button
              type="button"
              onClick={toggleScheduled}
              className={`p-2 rounded-full transition-colors ${
                isScheduled 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:bg-gray-100 hover:text-blue-600'
              }`}
              title="Schedule post"
              data-testid="schedule-btn"
              aria-label="Schedule post"
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>

          {/* Right side - Submit button */}
          <button
            type="submit"
            disabled={!canSubmit || disabled}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all duration-200
              ${canSubmit && !disabled
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
            data-testid="submit-btn"
            aria-label={isScheduled ? 'Schedule post' : 'Post now'}
          >
            {isSubmitting ? (
              <>
                <div 
                  className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" 
                  data-testid="loading-spinner" 
                />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>{isScheduled ? 'Schedule' : 'Post'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// frontend/src/components/posts/PostCreator.tsx