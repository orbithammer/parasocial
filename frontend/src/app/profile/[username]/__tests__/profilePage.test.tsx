// frontend/src/app/profile/[username]/__tests__/profilePage.test.tsx
// Version: 1.8.0
// Fixed mock functions to use direct vi.fn() approach instead of vi.mocked()

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'

// Create mock functions
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDel = vi.fn()

// Mock the API module
vi.mock('../../../lib/api', () => ({
  get: mockGet,
  post: mockPost,
  del: mockDel,
}))

// Mock Next.js navigation
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

// Mock Next.js Image 
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}))

import ProfilePage from '../page'

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
    mockUseParams.mockReset()
    mockGet.mockReset()
    mockPost.mockReset()
    mockDel.mockReset()
  })

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      
      render(<ProfilePage />)
      
      // Look for any loading indicator
      const loadingElements = screen.queryAllByText(/loading/i)
      expect(loadingElements.length).toBeGreaterThan(0)
    })

    it('should make API call with correct username', async () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockResolvedValue({ data: mockUser, status: 200 })

      render(<ProfilePage />)

      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/api/users/testuser')
      })
    })

    it('should render user profile when API succeeds', async () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockResolvedValue({ data: mockUser, status: 200 })

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText('Test User')).toBeInTheDocument()
      }, { timeout: 5000 })

      expect(screen.getByText('@testuser')).toBeInTheDocument()
      expect(screen.getByText('This is a test user bio')).toBeInTheDocument()
    })
  })

  describe('Error States', () => {
    it('should display generic error for API failures', async () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockRejectedValue(new Error('Network error'))

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
      })
    })

    it('should display user not found for missing users', async () => {
      mockUseParams.mockReturnValue({ username: 'nonexistent' })
      mockGet.mockRejectedValue(new Error('User not found'))

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByText(/user not found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Follow Functionality', () => {
    it('should show follow button for non-followed users', async () => {
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockResolvedValue({ 
        data: { ...mockUser, isFollowing: false },
        status: 200
      })

      render(<ProfilePage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /follow/i })).toBeInTheDocument()
      })
    })

    it('should handle follow action', async () => {
      const user = userEvent.setup()
      mockUseParams.mockReturnValue({ username: 'testuser' })
      mockGet.mockResolvedValue({ 
        data: { ...mockUser, isFollowing: false },
        status: 200
      })
      mockPost.mockResolvedValue({ data: { success: true }, status: 200 })

      render(<ProfilePage />)

      const followButton = await screen.findByRole('button', { name: /follow/i })
      await user.click(followButton)

      expect(mockPost).toHaveBeenCalledWith('/api/users/1/follow', {})
    })
  })
})

// frontend/src/app/profile/[username]/__tests__/profilePage.test.tsx
// Version: 1.8.0
// Fixed mock functions to use direct vi.fn() approach instead of vi.mocked()