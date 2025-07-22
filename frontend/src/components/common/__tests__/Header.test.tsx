// frontend/src/components/posts/__tests__/Header.test.tsx
// Version: 1.0.1
// Fixed style prop test to expect RGB color format instead of named color

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '../Header'

// Mock Next.js router for navigation testing
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}))

describe('Header Component', () => {
  describe('Rendering', () => {
    it('should render the header element', () => {
      render(<Header />)
      
      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
    })

    it('should display the default title when no title prop is provided', () => {
      render(<Header />)
      
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Posts')
    })

    it('should display custom title when title prop is provided', () => {
      const customTitle = 'My Blog Posts'
      render(<Header title={customTitle} />)
      
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveTextContent(customTitle)
    })

    it('should render navigation menu', () => {
      render(<Header />)
      
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('should render home link', () => {
      render(<Header />)
      
      const homeLink = screen.getByRole('link', { name: /home/i })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute('href', '/')
    })
  })

  describe('User Interactions', () => {
    it('should handle menu toggle click', () => {
      const mockOnMenuToggle = vi.fn()
      render(<Header onMenuToggle={mockOnMenuToggle} />)
      
      const menuButton = screen.getByRole('button', { name: /menu/i })
      fireEvent.click(menuButton)
      
      expect(mockOnMenuToggle).toHaveBeenCalledTimes(1)
    })

    it('should handle search input changes', () => {
      const mockOnSearch = vi.fn()
      render(<Header onSearch={mockOnSearch} />)
      
      const searchInput = screen.getByRole('searchbox')
      fireEvent.change(searchInput, { target: { value: 'test query' } })
      
      expect(mockOnSearch).toHaveBeenCalledWith('test query')
    })

    it('should handle search form submission', () => {
      const mockOnSearchSubmit = vi.fn()
      render(<Header onSearchSubmit={mockOnSearchSubmit} />)
      
      const searchForm = screen.getByRole('search')
      const searchInput = screen.getByRole('searchbox')
      
      fireEvent.change(searchInput, { target: { value: 'test search' } })
      fireEvent.submit(searchForm)
      
      expect(mockOnSearchSubmit).toHaveBeenCalledWith('test search')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      render(<Header />)
      
      const menuButton = screen.getByRole('button', { name: /menu/i })
      expect(menuButton).toHaveAttribute('aria-label')
      
      const searchInput = screen.getByRole('searchbox')
      expect(searchInput).toHaveAttribute('aria-label')
    })

    it('should have proper heading hierarchy', () => {
      render(<Header />)
      
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toBeInTheDocument()
    })

    it('should be keyboard navigable', () => {
      render(<Header />)
      
      const menuButton = screen.getByRole('button', { name: /menu/i })
      const searchInput = screen.getByRole('searchbox')
      
      // These elements should be focusable
      expect(menuButton).toHaveAttribute('tabIndex', '0')
      expect(searchInput).not.toHaveAttribute('tabIndex', '-1')
    })
  })

  describe('Conditional Rendering', () => {
    it('should show search when showSearch prop is true', () => {
      render(<Header showSearch={true} />)
      
      const searchInput = screen.getByRole('searchbox')
      expect(searchInput).toBeInTheDocument()
    })

    it('should hide search when showSearch prop is false', () => {
      render(<Header showSearch={false} />)
      
      const searchInput = screen.queryByRole('searchbox')
      expect(searchInput).not.toBeInTheDocument()
    })

    it('should show user menu when user is logged in', () => {
      const mockUser = { name: 'John Doe', email: 'john@example.com' }
      render(<Header user={mockUser} />)
      
      const userMenu = screen.getByRole('button', { name: /john doe/i })
      expect(userMenu).toBeInTheDocument()
    })

    it('should show login button when user is not logged in', () => {
      render(<Header user={null} />)
      
      const loginButton = screen.getByRole('link', { name: /login/i })
      expect(loginButton).toBeInTheDocument()
    })
  })

  describe('Props Interface', () => {
    it('should accept optional className prop', () => {
      const customClass = 'custom-header-class'
      render(<Header className={customClass} />)
      
      const header = screen.getByRole('banner')
      expect(header).toHaveClass(customClass)
    })

    it('should accept optional style prop', () => {
      const customStyle = { backgroundColor: 'red' }
      render(<Header style={customStyle} />)
      
      const header = screen.getByRole('banner')
      expect(header).toHaveStyle('background-color: rgb(255, 0, 0)')
    })
  })
})

// frontend/src/components/posts/__tests__/Header.test.tsx
// Version: 1.0.1
// Fixed style prop test to expect RGB color format instead of named color