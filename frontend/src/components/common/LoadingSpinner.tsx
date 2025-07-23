// frontend/src/components/common/LoadingSpinner.tsx
// Version: 1.0.0
// Initial LoadingSpinner component with size variants and accessibility features

import { FC } from 'react'

// Define the available spinner sizes
type SpinnerSize = 'small' | 'medium' | 'large'

// Props interface for the LoadingSpinner component
interface LoadingSpinnerProps {
  text?: string
  className?: string
  size?: SpinnerSize
  showText?: boolean
  ariaLabel?: string
}

// LoadingSpinner component that displays a spinning animation with optional text
const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  text = 'Loading...',
  className = '',
  size = 'medium',
  showText = true,
  ariaLabel = 'Loading'
}) => {
  // Generate size-specific CSS class
  const sizeClass = `spinner-${size}`
  
  // Combine all CSS classes
  const containerClasses = `loading-spinner ${sizeClass} ${className}`.trim()

  return (
    <div 
      role="status" 
      aria-label={ariaLabel}
      className={containerClasses}
    >
      {/* Spinner animation element */}
      <div 
        data-testid="spinner-animation"
        className="spinner-animation"
      >
        {/* SVG spinner icon */}
        <svg
          className="spinner-svg"
          viewBox="0 0 50 50"
          width="100%"
          height="100%"
        >
          <circle
            className="spinner-circle"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="31.416"
            strokeDashoffset="31.416"
          />
        </svg>
      </div>
      
      {/* Loading text - only show if showText is true */}
      {showText && (
        <span className="loading-text">
          {text}
        </span>
      )}

      <style jsx>{`
        .loading-spinner {
          display: inline-flex
          flex-direction: column
          align-items: center
          gap: 0.5rem
        }

        .spinner-animation {
          display: flex
          align-items: center
          justify-content: center
        }

        .spinner-svg {
          animation: spin 1s linear infinite
        }

        .spinner-circle {
          animation: dash 1.5s ease-in-out infinite
        }

        .spinner-small .spinner-animation {
          width: 1rem
          height: 1rem
        }

        .spinner-medium .spinner-animation {
          width: 1.5rem
          height: 1.5rem
        }

        .spinner-large .spinner-animation {
          width: 2rem
          height: 2rem
        }

        .loading-text {
          font-size: 0.875rem
          color: #6b7280
          text-align: center
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg)
          }
          100% {
            transform: rotate(360deg)
          }
        }

        @keyframes dash {
          0% {
            stroke-dasharray: 1, 150
            stroke-dashoffset: 0
          }
          50% {
            stroke-dasharray: 90, 150
            stroke-dashoffset: -35
          }
          100% {
            stroke-dasharray: 90, 150
            stroke-dashoffset: -124
          }
        }
      `}</style>
    </div>
  )
}

export default LoadingSpinner

// frontend/src/components/common/LoadingSpinner.tsx
// Version: 1.0.0