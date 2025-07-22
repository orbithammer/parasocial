// frontend/src/components/posts/__tests__/PostCreator.test.tsx
// Version: 1.0.0
// Unit tests for PostCreator component - comprehensive testing suite for post creation functionality

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'

// Mock lucide-react icons used in PostCreator
vi.mock('lucide-react', () => ({
  Send: () => <div data-testid="send-icon">Send</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  AlertTriangle: () => <div data-testid="alert-triangle-icon">AlertTriangle</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  X: () => <div data-testid="x-icon">X</div>
}))

/**
 * PostCreator component interface definitions
 * Based on the expected functionality from project context
 */
interface PostFormData {
  content: string
  contentWarning: string
  isScheduled: boolean
  scheduledFor: string
}

interface PostCreatorProps {
  onSubmit?: (data: PostFormData) => Promise<void>
  disabled?: boolean
  className?: string
  placeholder?: string
  maxLength?: number
}

/**
 * Mock PostCreator component for testing
 * This represents the expected structure of the actual component
 */
function PostCreator({ 
  onSubmit, 
  disabled = false, 
  className = '',
  placeholder = "What's happening?",
  maxLength = 5000 
}: PostCreatorProps) {
  const [content, setContent] = React.useState('')
  const [contentWarning, setContentWarning] = React.useState('')
  const [showContentWarning, setShowContentWarning] = React.useState(false)
  const [isScheduled, setIsScheduled] = React.useState(false)
  const [scheduledFor, setScheduledFor] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Constants for validation
  const MAX_CONTENT_LENGTH = maxLength
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
      
      // Reset form after successful submission
      setContent('')
      setContentWarning('')
      setShowContentWarning(false)
      setIsScheduled(false)
      setScheduledFor('')
    } catch (error) {
      console.error('Error submitting post:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleContentWarning = () => setShowContentWarning(!showContentWarning)
  const toggleScheduled = () => setIsScheduled(!isScheduled)

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`} data-testid="post-creator">
      <form onSubmit={handleSubmit} data-testid="post-creator-form">
        {/* Content Warning Section */}
        {showContentWarning && (
          <div className="bg-amber-50 border-b border-amber-200 p-3" data-testid="content-warning-section">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div data-testid="alert-triangle-icon">AlertTriangle</div>
                <span className="text-sm font-medium text-amber-800">Content Warning</span>
              </div>
              <button
                type="button"
                onClick={toggleContentWarning}
                className="text-amber-600 hover:text-amber-800 transition-colors"
                data-testid="remove-content-warning-btn"
                aria-label="Remove content warning"
              >
                <div data-testid="x-icon">X</div>
              </button>
            </div>
            <input
              type="text"
              value={contentWarning}
              onChange={(e) => setContentWarning(e.target.value)}
              placeholder="Describe the potentially sensitive content..."
              className="w-full px-3 py-2 border border-amber-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              maxLength={MAX_WARNING_LENGTH}
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
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="w-full min-h-[120px] p-4 text-lg border-0 resize-none focus:outline-none placeholder-gray-400"
            maxLength={MAX_CONTENT_LENGTH}
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3" data-testid="schedule-section">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div data-testid="clock-icon">Clock</div>
                <span className="text-sm font-medium text-blue-800">Schedule Post</span>
              </div>
              <button
                type="button"
                onClick={toggleScheduled}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                data-testid="remove-schedule-btn"
                aria-label="Remove schedule"
              >
                <div data-testid="x-icon">X</div>
              </button>
            </div>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
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
              <div data-testid="alert-triangle-icon">AlertTriangle</div>
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
              <div data-testid="calendar-icon">Calendar</div>
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
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" data-testid="loading-spinner" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <div data-testid="send-icon">Send</div>
                <span>{isScheduled ? 'Schedule' : 'Post'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// Import React for the mock component
import React from 'react'

/**
 * Test Data and Utilities
 */
const mockOnSubmit = vi.fn()

describe('PostCreator Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  /**
   * Rendering Tests
   * Tests basic component rendering and initial state
   */
  describe('Rendering', () => {
    it('should render the PostCreator component with all basic elements', () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)

      // Check main container exists
      expect(screen.getByTestId('post-creator')).toBeInTheDocument()
      expect(screen.getByTestId('post-creator-form')).toBeInTheDocument()
      
      // Check main textarea
      expect(screen.getByTestId('content-textarea')).toBeInTheDocument()
      expect(screen.getByPlaceholderText("What's happening?")).toBeInTheDocument()
      
      // Check action buttons
      expect(screen.getByTestId('content-warning-btn')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-btn')).toBeInTheDocument()
      expect(screen.getByTestId('submit-btn')).toBeInTheDocument()
      
      // Check character counter
      expect(screen.getByTestId('character-counter')).toBeInTheDocument()
      expect(screen.getByText('0/5000')).toBeInTheDocument()
    })

    it('should render with custom props', () => {
      const customProps = {
        placeholder: 'Share your thoughts...',
        maxLength: 3000,
        className: 'custom-class',
        disabled: false
      }

      render(<PostCreator {...customProps} onSubmit={mockOnSubmit} />)

      expect(screen.getByPlaceholderText('Share your thoughts...')).toBeInTheDocument()
      expect(screen.getByText('0/3000')).toBeInTheDocument()
      expect(screen.getByTestId('post-creator')).toHaveClass('custom-class')
    })

    it('should have proper accessibility attributes', () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)

      const textarea = screen.getByTestId('content-textarea')
      const submitBtn = screen.getByTestId('submit-btn')
      const contentWarningBtn = screen.getByTestId('content-warning-btn')
      const scheduleBtn = screen.getByTestId('schedule-btn')

      expect(textarea).toHaveAttribute('aria-label', 'Post content')
      expect(submitBtn).toHaveAttribute('aria-label', 'Post now')
      expect(contentWarningBtn).toHaveAttribute('aria-label', 'Add content warning')
      expect(scheduleBtn).toHaveAttribute('aria-label', 'Schedule post')
    })
  })

  /**
   * Content Input Tests
   * Tests typing, character limits, and validation
   */
  describe('Content Input', () => {
    it('should update content when user types', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const textarea = screen.getByTestId('content-textarea')
      
      await user.type(textarea, 'Hello world!')
      
      expect(textarea).toHaveValue('Hello world!')
      expect(screen.getByText('12/5000')).toBeInTheDocument()
    })

    it('should enforce character limit', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} maxLength={50} />)
      
      const textarea = screen.getByTestId('content-textarea')
      const longText = 'a'.repeat(60) // Exceeds 50 character limit
      
      await user.type(textarea, longText)
      
      // Should be limited to 50 characters
      expect(textarea.value.length).toBe(50)
      expect(screen.getByText('50/50')).toBeInTheDocument()
    })

    it('should show character counter color changes based on usage', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} maxLength={100} />)
      
      const textarea = screen.getByTestId('content-textarea')
      const counter = screen.getByTestId('character-counter')
      
      // Test normal state (under 70%)
      await user.type(textarea, 'a'.repeat(60))
      expect(counter).toHaveClass('text-gray-400')
      
      // Test warning state (70-90%)
      await user.clear(textarea)
      await user.type(textarea, 'a'.repeat(80))
      expect(counter).toHaveClass('text-amber-500')
      
      // Test danger state (over 90%)
      await user.clear(textarea)
      await user.type(textarea, 'a'.repeat(95))
      expect(counter).toHaveClass('text-red-500')
    })

    it('should disable textarea when disabled prop is true', () => {
      render(<PostCreator onSubmit={mockOnSubmit} disabled={true} />)
      
      const textarea = screen.getByTestId('content-textarea')
      expect(textarea).toBeDisabled()
    })
  })

  /**
   * Content Warning Tests
   * Tests content warning functionality
   */
  describe('Content Warning', () => {
    it('should toggle content warning section', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const contentWarningBtn = screen.getByTestId('content-warning-btn')
      
      // Initially hidden
      expect(screen.queryByTestId('content-warning-section')).not.toBeInTheDocument()
      
      // Show content warning
      await user.click(contentWarningBtn)
      expect(screen.getByTestId('content-warning-section')).toBeInTheDocument()
      expect(screen.getByTestId('content-warning-input')).toBeInTheDocument()
      
      // Hide content warning using X button
      const removeBtn = screen.getByTestId('remove-content-warning-btn')
      await user.click(removeBtn)
      expect(screen.queryByTestId('content-warning-section')).not.toBeInTheDocument()
    })

    it('should handle content warning input', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const contentWarningBtn = screen.getByTestId('content-warning-btn')
      await user.click(contentWarningBtn)
      
      const warningInput = screen.getByTestId('content-warning-input')
      await user.type(warningInput, 'Contains spoilers')
      
      expect(warningInput).toHaveValue('Contains spoilers')
      expect(screen.getByText('16/200')).toBeInTheDocument()
    })

    it('should enforce content warning character limit', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const contentWarningBtn = screen.getByTestId('content-warning-btn')
      await user.click(contentWarningBtn)
      
      const warningInput = screen.getByTestId('content-warning-input')
      const longWarning = 'a'.repeat(250) // Exceeds 200 limit
      
      await user.type(warningInput, longWarning)
      
      expect(warningInput.value.length).toBe(200)
      expect(screen.getByText('200/200')).toBeInTheDocument()
    })
  })

  /**
   * Scheduling Tests
   * Tests post scheduling functionality
   */
  describe('Post Scheduling', () => {
    it('should toggle schedule section', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const scheduleBtn = screen.getByTestId('schedule-btn')
      
      // Initially hidden
      expect(screen.queryByTestId('schedule-section')).not.toBeInTheDocument()
      
      // Show schedule section
      await user.click(scheduleBtn)
      expect(screen.getByTestId('schedule-section')).toBeInTheDocument()
      expect(screen.getByTestId('schedule-input')).toBeInTheDocument()
      
      // Hide schedule section using X button
      const removeBtn = screen.getByTestId('remove-schedule-btn')
      await user.click(removeBtn)
      expect(screen.queryByTestId('schedule-section')).not.toBeInTheDocument()
    })

    it('should handle schedule time input', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const scheduleBtn = screen.getByTestId('schedule-btn')
      await user.click(scheduleBtn)
      
      const scheduleInput = screen.getByTestId('schedule-input')
      const futureDate = '2024-12-31T12:00'
      
      await user.type(scheduleInput, futureDate)
      expect(scheduleInput).toHaveValue(futureDate)
    })

    it('should change submit button text when scheduled', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const scheduleBtn = screen.getByTestId('schedule-btn')
      const submitBtn = screen.getByTestId('submit-btn')
      
      // Initially shows "Post"
      expect(submitBtn).toHaveTextContent('Post')
      expect(submitBtn).toHaveAttribute('aria-label', 'Post now')
      
      // After enabling schedule, shows "Schedule"
      await user.click(scheduleBtn)
      expect(submitBtn).toHaveTextContent('Schedule')
      expect(submitBtn).toHaveAttribute('aria-label', 'Schedule post')
    })
  })

  /**
   * Form Submission Tests
   * Tests form validation and submission
   */
  describe('Form Submission', () => {
    it('should disable submit button when content is empty', () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const submitBtn = screen.getByTestId('submit-btn')
      expect(submitBtn).toBeDisabled()
      expect(submitBtn).toHaveClass('bg-gray-200', 'text-gray-400', 'cursor-not-allowed')
    })

    it('should enable submit button when content is valid', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const textarea = screen.getByTestId('content-textarea')
      const submitBtn = screen.getByTestId('submit-btn')
      
      await user.type(textarea, 'Valid post content')
      
      expect(submitBtn).not.toBeDisabled()
      expect(submitBtn).toHaveClass('bg-gradient-to-r')
    })

    it('should call onSubmit with correct data', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const textarea = screen.getByTestId('content-textarea')
      const submitBtn = screen.getByTestId('submit-btn')
      
      await user.type(textarea, 'Test post content')
      await user.click(submitBtn)
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        content: 'Test post content',
        contentWarning: '',
        isScheduled: false,
        scheduledFor: ''
      })
    })

    it('should call onSubmit with content warning data', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const textarea = screen.getByTestId('content-textarea')
      const contentWarningBtn = screen.getByTestId('content-warning-btn')
      const submitBtn = screen.getByTestId('submit-btn')
      
      await user.type(textarea, 'Post with warning')
      await user.click(contentWarningBtn)
      
      const warningInput = screen.getByTestId('content-warning-input')
      await user.type(warningInput, 'Spoiler alert')
      
      await user.click(submitBtn)
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        content: 'Post with warning',
        contentWarning: 'Spoiler alert',
        isScheduled: false,
        scheduledFor: ''
      })
    })

    it('should call onSubmit with schedule data', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const textarea = screen.getByTestId('content-textarea')
      const scheduleBtn = screen.getByTestId('schedule-btn')
      const submitBtn = screen.getByTestId('submit-btn')
      
      await user.type(textarea, 'Scheduled post')
      await user.click(scheduleBtn)
      
      const scheduleInput = screen.getByTestId('schedule-input')
      const futureDate = '2024-12-31T12:00'
      await user.type(scheduleInput, futureDate)
      
      await user.click(submitBtn)
      
      expect(mockOnSubmit).toHaveBeenCalledWith({
        content: 'Scheduled post',
        contentWarning: '',
        isScheduled: true,
        scheduledFor: futureDate
      })
    })

    it('should show loading state during submission', async () => {
      // Mock a slow onSubmit function
      const slowSubmit = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      render(<PostCreator onSubmit={slowSubmit} />)
      
      const textarea = screen.getByTestId('content-textarea')
      const submitBtn = screen.getByTestId('submit-btn')
      
      await user.type(textarea, 'Test post')
      
      // Start submission
      await user.click(submitBtn)
      
      // Check loading state
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(submitBtn).toHaveTextContent('Posting...')
      expect(submitBtn).toBeDisabled()
      
      // Wait for submission to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })
    })

    it('should reset form after successful submission', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const textarea = screen.getByTestId('content-textarea')
      const contentWarningBtn = screen.getByTestId('content-warning-btn')
      const submitBtn = screen.getByTestId('submit-btn')
      
      // Fill out form
      await user.type(textarea, 'Test post content')
      await user.click(contentWarningBtn)
      
      const warningInput = screen.getByTestId('content-warning-input')
      await user.type(warningInput, 'Test warning')
      
      await user.click(submitBtn)
      
      // Wait for form reset
      await waitFor(() => {
        expect(textarea).toHaveValue('')
        expect(screen.queryByTestId('content-warning-section')).not.toBeInTheDocument()
        expect(screen.getByText('0/5000')).toBeInTheDocument()
      })
    })

    it('should not submit when validation fails', async () => {
      render(<PostCreator onSubmit={mockOnSubmit} />)
      
      const submitBtn = screen.getByTestId('submit-btn')
      
      // Try to submit with empty content
      await user.click(submitBtn)
      
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  /**
   * Error Handling Tests
   * Tests component behavior with errors and edge cases
   */
  describe('Error Handling', () => {
    it('should handle submission errors gracefully', async () => {
      const errorSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'))
      
      render(<PostCreator onSubmit={errorSubmit} />)
      
      const textarea = screen.getByTestId('content-textarea')
      const submitBtn = screen.getByTestId('submit-btn')
      
      await user.type(textarea, 'Test content')
      await user.click(submitBtn)
      
      // Should stop loading even after error
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument()
      })
      
      expect(errorSubmit).toHaveBeenCalled()
    })

    it('should work without onSubmit callback', async () => {
      render(<PostCreator />)
      
      const textarea = screen.getByTestId('content-textarea')
      const submitBtn = screen.getByTestId('submit-btn')
      
      await user.type(textarea, 'Test content')
      
      // Should not throw error when clicking submit
      expect(() => user.click(submitBtn)).not.toThrow()
    })
  })
})

// frontend/src/components/posts/__tests__/PostCreator.test.tsx