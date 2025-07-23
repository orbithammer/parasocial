// frontend/src/components/common/__tests__/LoadingSpinner.test.tsx
// Version: 1.0.0
// Initial test suite for LoadingSpinner component

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '../LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    render(<LoadingSpinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays default loading text', () => {
    render(<LoadingSpinner />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays custom loading text when provided', () => {
    const customText = 'Please wait while we process your request'
    render(<LoadingSpinner text={customText} />)
    expect(screen.getByText(customText)).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-label', 'Loading')
  })

  it('applies custom className when provided', () => {
    const customClass = 'custom-spinner-class'
    render(<LoadingSpinner className={customClass} />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass(customClass)
  })

  it('renders with different sizes', () => {
    render(<LoadingSpinner size="small" />)
    const smallSpinner = screen.getByRole('status')
    expect(smallSpinner).toHaveClass('spinner-small')
  })

  it('renders with large size', () => {
    render(<LoadingSpinner size="large" />)
    const largeSpinner = screen.getByRole('status')
    expect(largeSpinner).toHaveClass('spinner-large')
  })

  it('renders with default medium size when no size specified', () => {
    render(<LoadingSpinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveClass('spinner-medium')
  })

  it('shows spinner animation element', () => {
    render(<LoadingSpinner />)
    const spinnerAnimation = screen.getByTestId('spinner-animation')
    expect(spinnerAnimation).toBeInTheDocument()
  })

  it('hides text when showText is false', () => {
    render(<LoadingSpinner showText={false} />)
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('maintains accessibility when text is hidden', () => {
    render(<LoadingSpinner showText={false} />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-label', 'Loading')
  })

  it('applies custom aria-label when provided', () => {
    const customLabel = 'Processing your payment'
    render(<LoadingSpinner ariaLabel={customLabel} />)
    const spinner = screen.getByRole('status')
    expect(spinner).toHaveAttribute('aria-label', customLabel)
  })
})

// frontend/src/components/common/__tests__/LoadingSpinner.test.tsx
// Version: 1.0.0