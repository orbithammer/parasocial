// frontend/src/app/profile/[username]/__tests__/profilePage.test.tsx
// Version: 1.4.0
// Fixed API mock setup and added Next.js Image mock

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'

// Create API mocks before any imports
const mockGet = vi.fn()
const mockPost = vi.fn()  
const mockDel = vi.fn()

// Mock the API module first
vi.mock('../../lib/api.ts', () => ({
  get: mockGet,
  post: mockPost,
  del: mockDel,
}))

// Mock Next.js router
const mockUseParams = vi.fn()
vi.mock('next/navigation', () => ({
  useParams: () => mockUseParams(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })),
}))

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}))

// Import component after mocks are set up
import ProfilePage from '../page'

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
    // Reset all mocks before each test
    vi.clearAllMocks()
    mockGet.mockReset()
    mockPost.mockReset()
    mockDel.mockReset()
    mockUseParams.mockReset()
  })

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })

      render(<ProfilePage />)
      
      // Check for any loading indicator (skeleton or spinner)
      expect(screen.getByText(/loading/i) || screen.getByRole('status', { hidden: true })).toBeTruthy()
    })

    it('should render user profile information when data loads', async () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      // Mock successful API response
      mockGet.mockResolvedValueOnce({ data: mockUser })

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText(mockUser.displayName)).toBeInTheDocument()
      }, { timeout: 3000 })

      expect(screen.getByText(`@${mockUser.username}`)).toBeInTheDocument()
      expect(screen.getByText(mockUser.bio)).toBeInTheDocument()
      expect(screen.getByText(`${mockUser.followerCount} followers`)).toBeInTheDocument()
      expect(screen.getByText(`${mockUser.followingCount} following`)).toBeInTheDocument()
      expect(screen.getByText(`${mockUser.postCount} posts`)).toBeInTheDocument()
    })

    it('should render profile avatar with correct alt text', async () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockResolvedValue({ data: mockUser })

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
      mockUseParams.mockReturnValue({ username: 'johndoe' })
      mockGet.mockResolvedValue({ data: { ...mockUser, username: 'johndoe' } })

      render(<ProfilePage />)

      expect(mockGet).toHaveBeenCalledWith('/api/users/johndoe')
    })

    it('should handle special characters in username', async () => {
      const usernameWithSpecialChars = 'user.name-123'
      mockUseParams.mockReturnValue({ username: usernameWithSpecialChars })
      mockGet.mockResolvedValue({ data: { ...mockUser, username: usernameWithSpecialChars } })

      render(<ProfilePage />)

      expect(mockGet).toHaveBeenCalledWith('/api/users/user.name-123')
    })
  })

  describe('Error States', () => {
    it('should display error message when user is not found', async () => {
      mockUseParams.mockReturnValue({ username: 'nonexistent' })
      mockGet.mockRejectedValue(new Error('User not found'))

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText(/user not found/i)).toBeInTheDocument()
      })
    })

    it('should display generic error message for API failures', async () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockRejectedValue(new Error('Network error'))

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })
    })
  })

  describe('Follow/Unfollow Functionality', () => {
    it('should display follow button when user is not following', async () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockResolvedValue({ data: { ...mockUser, isFollowing: false } })

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /follow/i })).toBeInTheDocument()
      })
    })

    it('should display unfollow button when user is following', async () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockResolvedValue({ data: { ...mockUser, isFollowing: true } })

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /unfollow/i })).toBeInTheDocument()
      })
    })

    it('should handle follow action correctly', async () => {
      const user = userEvent.setup()
      
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockResolvedValue({ data: { ...mockUser, isFollowing: false } })
      mockPost.mockResolvedValue({ success: true })

      render(<ProfilePage />)

      const followButton = await screen.findByRole('button', { name: /follow/i })
      await user.click(followButton)

      expect(mockPost).toHaveBeenCalledWith(`/api/users/${mockUser.id}/follow`, {})
    })

    it('should handle unfollow action correctly', async () => {
      const user = userEvent.setup()
      
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockResolvedValue({ data: { ...mockUser, isFollowing: true } })
      mockDel.mockResolvedValue({ success: true })

      render(<ProfilePage />)

      const unfollowButton = await screen.findByRole('button', { name: /unfollow/i })
      await user.click(unfollowButton)

      expect(mockDel).toHaveBeenCalledWith(`/api/users/${mockUser.id}/follow`)
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockResolvedValue({ data: mockUser })

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: mockUser.displayName })).toBeInTheDocument()
      })
    })

    it('should have descriptive button labels', async () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockResolvedValue({ data: mockUser })

      render(<ProfilePage />)

      await waitFor(() => {
        const followButton = screen.getByRole('button', { name: /follow/i })
        expect(followButton).toHaveAccessibleName()
      })
    })

    it('should provide proper alt text for images', async () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockResolvedValue({ data: mockUser })

      render(<ProfilePage />)

      await waitFor(() => {
        const avatar = screen.getByAltText(`${mockUser.displayName}'s profile picture`)
        expect(avatar).toBeInTheDocument()
      })
    })
  })
})

// frontend/src/app/profile/[username]/__tests__/profilePage.test.tsx
// Version: 1.1.0
// Updated to mock existing API methods instead of custom functions