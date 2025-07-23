// frontend/src/app/profile/[username]/__tests__/profilePage.test.tsx
// Version: 1.0.0
// Initial test suite for profile page component

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import ProfilePage from '../page'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
}))

// Mock any API calls or data fetching
vi.mock('@/lib/api', () => ({
  getUserProfile: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}))

interface MockParams {
  username: string
}

interface UserProfile {
  id: string
  username: string
  displayName: string
  bio: string
  followerCount: number
  followingCount: number
  postCount: number
  isFollowing: boolean
  avatarUrl: string
  joinedDate: string
}

describe('ProfilePage', () => {
  const mockUser: UserProfile = {
    id: '1',
    username: 'testuser',
    displayName: 'Test User',
    bio: 'This is a test user bio',
    followerCount: 150,
    followingCount: 75,
    postCount: 42,
    isFollowing: false,
    avatarUrl: '/avatars/testuser.jpg',
    joinedDate: '2023-01-15',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      const { useParams } = require('next/navigation')
      useParams.mockReturnValue({ username: 'testuser' } as MockParams)

      render(<ProfilePage />)
      
      // Check for loading indicator
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
    })

    it('should render user profile information when data loads', async () => {
      const { useParams } = require('next/navigation')
      const { getUserProfile } = require('@/lib/api')
      
      useParams.mockReturnValue({ username: 'testuser' } as MockParams)
      getUserProfile.mockResolvedValue(mockUser)

      render(<ProfilePage />)

      // Wait for profile data to load
      await waitFor(() => {
        expect(screen.getByText(mockUser.displayName)).toBeInTheDocument()
      })

      // Check all profile elements are rendered
      expect(screen.getByText(`@${mockUser.username}`)).toBeInTheDocument()
      expect(screen.getByText(mockUser.bio)).toBeInTheDocument()
      expect(screen.getByText(`${mockUser.followerCount} followers`)).toBeInTheDocument()
      expect(screen.getByText(`${mockUser.followingCount} following`)).toBeInTheDocument()
      expect(screen.getByText(`${mockUser.postCount} posts`)).toBeInTheDocument()
    })

    it('should render profile avatar with correct alt text', async () => {
      const { useParams } = require('next/navigation')
      const { getUserProfile } = require('@/lib/api')
      
      useParams.mockReturnValue({ username: 'testuser' } as MockParams)
      getUserProfile.mockResolvedValue(mockUser)

      render(<ProfilePage />)

      await waitFor(() => {
        const avatar = screen.getByAltText(`${mockUser.displayName}'s profile picture`)
        expect(avatar).toBeInTheDocument()
        expect(avatar).toHaveAttribute('src', mockUser.avatarUrl)
      })
    })
  })

  describe('Username Parameter Handling', () => {
    it('should fetch profile data with correct username from URL params', async () => {
      const { useParams } = require('next/navigation')
      const { getUserProfile } = require('@/lib/api')
      
      useParams.mockReturnValue({ username: 'johndoe' } as MockParams)
      getUserProfile.mockResolvedValue({ ...mockUser, username: 'johndoe' })

      render(<ProfilePage />)

      expect(getUserProfile).toHaveBeenCalledWith('johndoe')
    })

    it('should handle special characters in username', async () => {
      const { useParams } = require('next/navigation')
      const { getUserProfile } = require('@/lib/api')
      
      const usernameWithSpecialChars = 'user.name-123'
      useParams.mockReturnValue({ username: usernameWithSpecialChars } as MockParams)
      getUserProfile.mockResolvedValue({ ...mockUser, username: usernameWithSpecialChars })

      render(<ProfilePage />)

      expect(getUserProfile).toHaveBeenCalledWith(usernameWithSpecialChars)
    })
  })

  describe('Error States', () => {
    it('should display error message when user is not found', async () => {
      const { useParams } = require('next/navigation')
      const { getUserProfile } = require('@/lib/api')
      
      useParams.mockReturnValue({ username: 'nonexistent' } as MockParams)
      getUserProfile.mockRejectedValue(new Error('User not found'))

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText(/user not found/i)).toBeInTheDocument()
      })
    })

    it('should display generic error message for API failures', async () => {
      const { useParams } = require('next/navigation')
      const { getUserProfile } = require('@/lib/api')
      
      useParams.mockReturnValue({ username: 'testuser' } as MockParams)
      getUserProfile.mockRejectedValue(new Error('Network error'))

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })
    })
  })

  describe('Follow/Unfollow Functionality', () => {
    it('should display follow button when user is not following', async () => {
      const { useParams } = require('next/navigation')
      const { getUserProfile } = require('@/lib/api')
      
      useParams.mockReturnValue({ username: 'testuser' } as MockParams)
      getUserProfile.mockResolvedValue({ ...mockUser, isFollowing: false })

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /follow/i })).toBeInTheDocument()
      })
    })

    it('should display unfollow button when user is following', async () => {
      const { useParams } = require('next/navigation')
      const { getUserProfile } = require('@/lib/api')
      
      useParams.mockReturnValue({ username: 'testuser' } as MockParams)
      getUserProfile.mockResolvedValue({ ...mockUser, isFollowing: true })

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /unfollow/i })).toBeInTheDocument()
      })
    })

    it('should handle follow action correctly', async () => {
      const user = userEvent.setup()
      const { useParams } = require('next/navigation')
      const { getUserProfile, followUser } = require('@/lib/api')
      
      useParams.mockReturnValue({ username: 'testuser' } as MockParams)
      getUserProfile.mockResolvedValue({ ...mockUser, isFollowing: false })
      followUser.mockResolvedValue({ success: true })

      render(<ProfilePage />)

      const followButton = await screen.findByRole('button', { name: /follow/i })
      await user.click(followButton)

      expect(followUser).toHaveBeenCalledWith(mockUser.id)
    })

    it('should handle unfollow action correctly', async () => {
      const user = userEvent.setup()
      const { useParams } = require('next/navigation')
      const { getUserProfile, unfollowUser } = require('@/lib/api')
      
      useParams.mockReturnValue({ username: 'testuser' } as MockParams)
      getUserProfile.mockResolvedValue({ ...mockUser, isFollowing: true })
      unfollowUser.mockResolvedValue({ success: true })

      render(<ProfilePage />)

      const unfollowButton = await screen.findByRole('button', { name: /unfollow/i })
      await user.click(unfollowButton)

      expect(unfollowUser).toHaveBeenCalledWith(mockUser.id)
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      const { useParams } = require('next/navigation')
      const { getUserProfile } = require('@/lib/api')
      
      useParams.mockReturnValue({ username: 'testuser' } as MockParams)
      getUserProfile.mockResolvedValue(mockUser)

      render(<ProfilePage />)

      await waitFor(() => {
        // Main profile heading should be h1
        expect(screen.getByRole('heading', { level: 1, name: mockUser.displayName })).toBeInTheDocument()
      })
    })

    it('should have descriptive button labels', async () => {
      const { useParams } = require('next/navigation')
      const { getUserProfile } = require('@/lib/api')
      
      useParams.mockReturnValue({ username: 'testuser' } as MockParams)
      getUserProfile.mockResolvedValue(mockUser)

      render(<ProfilePage />)

      await waitFor(() => {
        // Follow button should have descriptive label
        const followButton = screen.getByRole('button', { name: /follow/i })
        expect(followButton).toHaveAccessibleName()
      })
    })

    it('should provide proper alt text for images', async () => {
      const { useParams } = require('next/navigation')
      const { getUserProfile } = require('@/lib/api')
      
      useParams.mockReturnValue({ username: 'testuser' } as MockParams)
      getUserProfile.mockResolvedValue(mockUser)

      render(<ProfilePage />)

      await waitFor(() => {
        const avatar = screen.getByAltText(`${mockUser.displayName}'s profile picture`)
        expect(avatar).toBeInTheDocument()
      })
    })
  })
})

// frontend/src/app/profile/[username]/__tests__/profilePage.test.tsx
// Version: 1.0.0
// Initial test suite for profile page component