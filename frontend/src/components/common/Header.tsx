// frontend/src/components/posts/Header.tsx
// Version: 1.0.0
// Header component for posts section with navigation, search, and user menu functionality

'use client'

import { useState, FormEvent, ChangeEvent, CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Type definitions for component props
interface User {
  name: string
  email: string
}

interface HeaderProps {
  title?: string
  className?: string
  style?: CSSProperties
  showSearch?: boolean
  user?: User | null
  onMenuToggle?: () => void
  onSearch?: (query: string) => void
  onSearchSubmit?: (query: string) => void
}

// Main Header component
export function Header({
  title = 'Posts',
  className = '',
  style,
  showSearch = true,
  user = null,
  onMenuToggle,
  onSearch,
  onSearchSubmit
}: HeaderProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)

  // Handle search input changes
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value
    setSearchQuery(query)
    if (onSearch) {
      onSearch(query)
    }
  }

  // Handle search form submission
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (onSearchSubmit) {
      onSearchSubmit(searchQuery)
    }
  }

  // Handle menu toggle click
  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen)
    if (onMenuToggle) {
      onMenuToggle()
    }
  }

  return (
    <header 
      role="banner" 
      className={`header ${className}`}
      style={style}
    >
      <div className="header-container">
        {/* Main heading */}
        <h1 className="header-title">{title}</h1>

        {/* Navigation menu */}
        <nav role="navigation" className="header-nav">
          <Link href="/" className="nav-link">
            Home
          </Link>
        </nav>

        {/* Search functionality - conditionally rendered */}
        {showSearch && (
          <form 
            role="search" 
            className="search-form"
            onSubmit={handleSearchSubmit}
          >
            <input
              type="search"
              role="searchbox"
              aria-label="Search posts"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
              tabIndex={0}
            />
            <button 
              type="submit" 
              className="search-button"
              aria-label="Submit search"
            >
              Search
            </button>
          </form>
        )}

        {/* Menu toggle button */}
        <button
          type="button"
          className="menu-toggle"
          aria-label="Toggle navigation menu"
          tabIndex={0}
          onClick={handleMenuToggle}
        >
          Menu
        </button>

        {/* User authentication section */}
        <div className="auth-section">
          {user ? (
            // User menu when logged in
            <button
              type="button"
              className="user-menu"
              aria-label={`User menu for ${user.name}`}
            >
              {user.name}
            </button>
          ) : (
            // Login link when not logged in
            <Link href="/login" className="login-link">
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Basic styling for the component */}
      <style jsx>{`
        .header {
          background-color: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem 0;
        }

        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .header-title {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0;
          color: #1f2937;
        }

        .header-nav {
          display: flex;
          gap: 1rem;
        }

        .nav-link {
          text-decoration: none;
          color: #4b5563;
          font-weight: 500;
          transition: color 0.2s;
        }

        .nav-link:hover {
          color: #1f2937;
        }

        .search-form {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .search-input {
          padding: 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          width: 200px;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .search-button {
          padding: 0.5rem 1rem;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-size: 0.875rem;
          transition: background-color 0.2s;
        }

        .search-button:hover {
          background-color: #2563eb;
        }

        .menu-toggle {
          padding: 0.5rem;
          background: none;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          cursor: pointer;
          color: #4b5563;
          font-size: 0.875rem;
        }

        .menu-toggle:hover {
          background-color: #f3f4f6;
        }

        .auth-section {
          display: flex;
          align-items: center;
        }

        .user-menu {
          padding: 0.5rem 1rem;
          background: none;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          cursor: pointer;
          color: #4b5563;
          font-size: 0.875rem;
        }

        .user-menu:hover {
          background-color: #f3f4f6;
        }

        .login-link {
          text-decoration: none;
          color: #3b82f6;
          font-weight: 500;
          padding: 0.5rem 1rem;
        }

        .login-link:hover {
          color: #2563eb;
        }

        @media (max-width: 768px) {
          .header-container {
            flex-direction: column;
            align-items: stretch;
          }

          .search-form {
            order: 3;
            width: 100%;
          }

          .search-input {
            flex: 1;
          }
        }
      `}</style>
    </header>
  )
}

// frontend/src/components/posts/Header.tsx
// Version: 1.0.0
// Header component for posts section with navigation, search, and user menu functionality