'use client'

import { useState } from 'react'
import { Calendar, AlertTriangle, Send, Clock, X } from 'lucide-react'

/**
 * Post creation form interface
 */
interface PostFormData {
  content: string
  contentWarning: string
  isScheduled: boolean
  scheduledFor: string
}

/**
 * Props for PostCreationForm component
 */
interface PostCreationFormProps {
  onSubmit?: (data: PostFormData) => Promise<void>
  disabled?: boolean
  className?: string
}

/**
 * Modern post creation form component
 * Styled to look like contemporary social media platforms
 */
export default function PostCreationForm({ 
  onSubmit, 
  disabled = false, 
  className = '' 
}: PostCreationFormProps) {
  // Form state management
  const [content, setContent] = useState('')
  const [contentWarning, setContentWarning] = useState('')
  const [showContentWarning, setShowContentWarning] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Constants for validation
  const MAX_CONTENT_LENGTH = 5000
  const MAX_WARNING_LENGTH = 200
  
  // Calculate character counts and validation
  const contentLength = content.length
  const warningLength = contentWarning.length
  const isContentValid = contentLength > 0 && contentLength <= MAX_CONTENT_LENGTH
  const isWarningValid = !showContentWarning || warningLength <= MAX_WARNING_LENGTH
  const isScheduleValid = !isScheduled || (scheduledFor && new Date(scheduledFor) > new Date())
  const canSubmit = isContentValid && isWarningValid && isScheduleValid && !isSubmitting

  // Get minimum datetime for scheduling (current time + 5 minutes)
  const getMinScheduleTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 5)
    return now.toISOString().slice(0, 16)
  }

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
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
      
      // Reset form on successful submission
      setContent('')
      setContentWarning('')
      setShowContentWarning(false)
      setIsScheduled(false)
      setScheduledFor('')
    } catch (error) {
      console.error('Failed to create post:', error)
      // Error handling would typically show a toast or error message
    } finally {
      setIsSubmitting(false)
    }
  }

  /**
   * Toggle content warning section
   */
  const toggleContentWarning = () => {
    setShowContentWarning(!showContentWarning)
    if (showContentWarning) {
      setContentWarning('')
    }
  }

  /**
   * Toggle scheduled posting
   */
  const toggleScheduled = () => {
    setIsScheduled(!isScheduled)
    if (isScheduled) {
      setScheduledFor('')
    }
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-lg">U</span>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Create a post</h3>
          <p className="text-sm text-gray-500">Share your thoughts with the world</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Content Warning Section */}
        {showContentWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Content Warning</span>
              </div>
              <button
                type="button"
                onClick={toggleContentWarning}
                className="text-amber-600 hover:text-amber-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              value={contentWarning}
              onChange={(e) => setContentWarning(e.target.value)}
              placeholder="Describe the sensitive content..."
              className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              maxLength={MAX_WARNING_LENGTH}
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-amber-600">
                Help others understand what to expect
              </span>
              <span className={`text-xs ${warningLength > MAX_WARNING_LENGTH * 0.8 ? 'text-amber-600' : 'text-amber-500'}`}>
                {warningLength}/{MAX_WARNING_LENGTH}
              </span>
            </div>
          </div>
        )}

        {/* Main Content Textarea */}
        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening?"
            className="w-full min-h-[120px] p-4 text-lg border-0 resize-none focus:outline-none placeholder-gray-400"
            maxLength={MAX_CONTENT_LENGTH}
            disabled={disabled || isSubmitting}
          />
          
          {/* Character Counter */}
          <div className="absolute bottom-3 right-3">
            <div className={`text-sm font-medium ${
              contentLength > MAX_CONTENT_LENGTH * 0.9 
                ? 'text-red-500' 
                : contentLength > MAX_CONTENT_LENGTH * 0.7 
                ? 'text-amber-500' 
                : 'text-gray-400'
            }`}>
              {contentLength}/{MAX_CONTENT_LENGTH}
            </div>
          </div>
        </div>

        {/* Schedule Section */}
        {isScheduled && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Schedule Post</span>
              </div>
              <button
                type="button"
                onClick={toggleScheduled}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              min={getMinScheduleTime()}
              className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-blue-600 mt-1">
              Your post will be published automatically at the scheduled time
            </p>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
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
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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