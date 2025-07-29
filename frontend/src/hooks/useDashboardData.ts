// frontend/src/hooks/useDashboardData.ts
// Version: 1.3.0
// Dashboard data hook for ParaSocial broadcasting analytics
// Changed: Removed async delay completely for test compatibility

import { useState, useEffect } from 'react'

// Type definitions for dashboard data
interface FollowerStats {
  total: number
  weeklyGrowth: number
  topInstances: string[]
  geographicDistribution: Array<{
    country: string
    count: number
  }>
}

interface PostAnalytics {
  totalPosts: number
  avgEngagement: number
  bestPostingTimes: string[]
  reachMetrics: {
    deliverySuccess: number
    federationHealth: 'good' | 'fair' | 'poor'
  }
}

interface ModerationQueue {
  reportedPosts: number
  blockedFollowers: number
  pendingReviews: number
}

interface DashboardData {
  followerStats: FollowerStats | null
  postAnalytics: PostAnalytics | null
  moderationQueue: ModerationQueue | null
  isLoading: boolean
  error: string | null
}

// Custom hook for dashboard data management
export function useDashboardData(): DashboardData {
  const [followerStats, setFollowerStats] = useState<FollowerStats | null>(null)
  const [postAnalytics, setPostAnalytics] = useState<PostAnalytics | null>(null)
  const [moderationQueue, setModerationQueue] = useState<ModerationQueue | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Simulate API call with mock data for development
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // No delay for testing compatibility

        // Mock follower statistics
        const mockFollowerStats: FollowerStats = {
          total: 1250,
          weeklyGrowth: 45,
          topInstances: ['mastodon.social', 'lemmy.world', 'pixelfed.social'],
          geographicDistribution: [
            { country: 'US', count: 400 },
            { country: 'DE', count: 200 },
            { country: 'CA', count: 150 },
            { country: 'UK', count: 120 },
            { country: 'FR', count: 100 },
          ]
        }

        // Mock post analytics
        const mockPostAnalytics: PostAnalytics = {
          totalPosts: 89,
          avgEngagement: 0.12,
          bestPostingTimes: ['09:00', '15:00', '20:00'],
          reachMetrics: {
            deliverySuccess: 0.94,
            federationHealth: 'good'
          }
        }

        // Mock moderation queue
        const mockModerationQueue: ModerationQueue = {
          reportedPosts: 3,
          blockedFollowers: 12,
          pendingReviews: 1
        }

        // Set the mock data
        setFollowerStats(mockFollowerStats)
        setPostAnalytics(mockPostAnalytics)
        setModerationQueue(mockModerationQueue)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  return {
    followerStats,
    postAnalytics,
    moderationQueue,
    isLoading,
    error
  }
}

// frontend/src/hooks/useDashboardData.ts
// Version: 1.3.0
// Dashboard data hook for ParaSocial broadcasting analytics
// Changed: Removed async delay completely for test compatibility

// frontend/src/hooks/useDashboardData.ts
// Version: 1.0.0
// Dashboard data hook for ParaSocial broadcasting analytics
// Provides: follower stats, post analytics, moderation queue data