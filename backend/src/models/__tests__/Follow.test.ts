// backend/src/models/__tests__/Follow.test.ts
// Version: 1.0.0
// Initial test suite for Follow model interfaces, enums, and validation constants

import { describe, it, expect, beforeEach } from 'vitest'
import {
  Follow,
  FollowStatus,
  CreateFollowData,
  UpdateFollowData,
  FollowQuery,
  FollowResult,
  FollowStats,
  ActivityPubFollow,
  FollowValidation
} from '../Follow'

describe('Follow Model', () => {
  // Mock data for testing
  let mockFollow: Follow
  let mockCreateFollowData: CreateFollowData
  let mockUpdateFollowData: UpdateFollowData
  let mockFollowQuery: FollowQuery

  beforeEach(() => {
    // Reset mock data before each test
    mockFollow = {
      id: 'follow_123',
      followerId: 'user_456',
      followingId: 'user_789',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      status: FollowStatus.ACCEPTED,
      federated: false
    }

    mockCreateFollowData = {
      followerId: 'user_456',
      followingId: 'user_789',
      federated: false
    }

    mockUpdateFollowData = {
      status: FollowStatus.ACCEPTED,
      updatedAt: new Date('2024-01-01T11:00:00Z')
    }

    mockFollowQuery = {
      followerId: 'user_456',
      status: FollowStatus.ACCEPTED,
      limit: 10,
      offset: 0
    }
  })

  describe('FollowStatus Enum', () => {
    it('should have correct PENDING status', () => {
      expect(FollowStatus.PENDING).toBe('PENDING')
    })

    it('should have correct ACCEPTED status', () => {
      expect(FollowStatus.ACCEPTED).toBe('ACCEPTED')
    })

    it('should have correct REJECTED status', () => {
      expect(FollowStatus.REJECTED).toBe('REJECTED')
    })

    it('should contain exactly 3 status values', () => {
      const statusValues = Object.values(FollowStatus)
      expect(statusValues).toHaveLength(3)
      expect(statusValues).toEqual(['PENDING', 'ACCEPTED', 'REJECTED'])
    })
  })

  describe('Follow Interface', () => {
    it('should create a valid local follow object', () => {
      expect(mockFollow.id).toBe('follow_123')
      expect(mockFollow.followerId).toBe('user_456')
      expect(mockFollow.followingId).toBe('user_789')
      expect(mockFollow.status).toBe(FollowStatus.ACCEPTED)
      expect(mockFollow.federated).toBe(false)
      expect(mockFollow.createdAt).toBeInstanceOf(Date)
      expect(mockFollow.updatedAt).toBeInstanceOf(Date)
    })

    it('should create a valid federated follow object', () => {
      const federatedFollow: Follow = {
        ...mockFollow,
        federated: true,
        federatedDomain: 'mastodon.social',
        activityId: 'https://mastodon.social/activities/123'
      }

      expect(federatedFollow.federated).toBe(true)
      expect(federatedFollow.federatedDomain).toBe('mastodon.social')
      expect(federatedFollow.activityId).toBe('https://mastodon.social/activities/123')
    })

    it('should handle optional fields correctly', () => {
      // Test that optional fields can be undefined
      const minimalFollow: Follow = {
        id: 'follow_123',
        followerId: 'user_456',
        followingId: 'user_789',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: FollowStatus.PENDING,
        federated: false
      }

      expect(minimalFollow.activityId).toBeUndefined()
      expect(minimalFollow.federatedDomain).toBeUndefined()
    })
  })

  describe('CreateFollowData Interface', () => {
    it('should create valid local follow data', () => {
      expect(mockCreateFollowData.followerId).toBe('user_456')
      expect(mockCreateFollowData.followingId).toBe('user_789')
      expect(mockCreateFollowData.federated).toBe(false)
    })

    it('should create valid federated follow data', () => {
      const federatedCreateData: CreateFollowData = {
        followerId: 'user_456',
        followingId: 'user_789@mastodon.social',
        activityId: 'https://mastodon.social/activities/456',
        federated: true,
        federatedDomain: 'mastodon.social'
      }

      expect(federatedCreateData.federated).toBe(true)
      expect(federatedCreateData.federatedDomain).toBe('mastodon.social')
      expect(federatedCreateData.activityId).toBeDefined()
    })

    it('should handle minimal required fields', () => {
      const minimalCreateData: CreateFollowData = {
        followerId: 'user_123',
        followingId: 'user_456'
      }

      expect(minimalCreateData.followerId).toBe('user_123')
      expect(minimalCreateData.followingId).toBe('user_456')
      expect(minimalCreateData.federated).toBeUndefined()
      expect(minimalCreateData.activityId).toBeUndefined()
    })
  })

  describe('UpdateFollowData Interface', () => {
    it('should create valid update data', () => {
      expect(mockUpdateFollowData.status).toBe(FollowStatus.ACCEPTED)
      expect(mockUpdateFollowData.updatedAt).toBeInstanceOf(Date)
    })

    it('should allow status change to rejected', () => {
      const rejectData: UpdateFollowData = {
        status: FollowStatus.REJECTED,
        updatedAt: new Date()
      }

      expect(rejectData.status).toBe(FollowStatus.REJECTED)
    })
  })

  describe('FollowQuery Interface', () => {
    it('should create valid query with all filters', () => {
      const fullQuery: FollowQuery = {
        followerId: 'user_123',
        followingId: 'user_456',
        status: FollowStatus.ACCEPTED,
        federated: true,
        federatedDomain: 'mastodon.social',
        limit: 20,
        offset: 10
      }

      expect(fullQuery.followerId).toBe('user_123')
      expect(fullQuery.followingId).toBe('user_456')
      expect(fullQuery.status).toBe(FollowStatus.ACCEPTED)
      expect(fullQuery.federated).toBe(true)
      expect(fullQuery.federatedDomain).toBe('mastodon.social')
      expect(fullQuery.limit).toBe(20)
      expect(fullQuery.offset).toBe(10)
    })

    it('should work with minimal query parameters', () => {
      const minimalQuery: FollowQuery = {}
      
      expect(minimalQuery.followerId).toBeUndefined()
      expect(minimalQuery.limit).toBeUndefined()
    })

    it('should handle pagination parameters', () => {
      expect(mockFollowQuery.limit).toBe(10)
      expect(mockFollowQuery.offset).toBe(0)
    })
  })

  describe('FollowResult Interface', () => {
    it('should create successful result with follow data', () => {
      const successResult: FollowResult = {
        success: true,
        follow: mockFollow
      }

      expect(successResult.success).toBe(true)
      expect(successResult.follow).toBeDefined()
      expect(successResult.error).toBeUndefined()
    })

    it('should create error result without follow data', () => {
      const errorResult: FollowResult = {
        success: false,
        error: 'User not found'
      }

      expect(errorResult.success).toBe(false)
      expect(errorResult.error).toBe('User not found')
      expect(errorResult.follow).toBeUndefined()
    })
  })

  describe('FollowStats Interface', () => {
    it('should create valid follow statistics', () => {
      const stats: FollowStats = {
        followingCount: 150,
        followerCount: 1200,
        pendingCount: 5
      }

      expect(stats.followingCount).toBe(150)
      expect(stats.followerCount).toBe(1200)
      expect(stats.pendingCount).toBe(5)
    })

    it('should handle zero counts', () => {
      const emptyStats: FollowStats = {
        followingCount: 0,
        followerCount: 0,
        pendingCount: 0
      }

      expect(emptyStats.followingCount).toBe(0)
      expect(emptyStats.followerCount).toBe(0)
      expect(emptyStats.pendingCount).toBe(0)
    })
  })

  describe('ActivityPubFollow Interface', () => {
    it('should create valid ActivityPub follow activity', () => {
      const apFollow: ActivityPubFollow = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        id: 'https://example.com/activities/123',
        type: 'Follow',
        actor: 'https://example.com/users/alice',
        object: 'https://mastodon.social/users/bob',
        published: '2024-01-01T10:00:00Z'
      }

      expect(apFollow['@context']).toBe('https://www.w3.org/ns/activitystreams')
      expect(apFollow.type).toBe('Follow')
      expect(apFollow.actor).toContain('users/alice')
      expect(apFollow.object).toContain('users/bob')
      expect(apFollow.published).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)
    })
  })

  describe('FollowValidation Constants', () => {
    it('should have correct MAX_FOLLOWING limit', () => {
      expect(FollowValidation.MAX_FOLLOWING).toBe(7500)
      expect(typeof FollowValidation.MAX_FOLLOWING).toBe('number')
    })

    it('should have correct MAX_FOLLOWERS limit', () => {
      expect(FollowValidation.MAX_FOLLOWERS).toBe(1000000)
      expect(typeof FollowValidation.MAX_FOLLOWERS).toBe('number')
    })

    it('should have correct MIN_FOLLOW_INTERVAL', () => {
      const expectedInterval = 1000 * 60 * 5 // 5 minutes in milliseconds
      expect(FollowValidation.MIN_FOLLOW_INTERVAL).toBe(expectedInterval)
      expect(FollowValidation.MIN_FOLLOW_INTERVAL).toBe(300000)
    })

    it('should have correct MAX_DOMAIN_LENGTH', () => {
      expect(FollowValidation.MAX_DOMAIN_LENGTH).toBe(255)
      expect(typeof FollowValidation.MAX_DOMAIN_LENGTH).toBe('number')
    })

    it('should have validation constants with correct types', () => {
      // Test that all validation constants are numbers
      expect(typeof FollowValidation.MAX_FOLLOWING).toBe('number')
      expect(typeof FollowValidation.MAX_FOLLOWERS).toBe('number')
      expect(typeof FollowValidation.MIN_FOLLOW_INTERVAL).toBe('number')
      expect(typeof FollowValidation.MAX_DOMAIN_LENGTH).toBe('number')
      
      // Test that values are positive
      expect(FollowValidation.MAX_FOLLOWING).toBeGreaterThan(0)
      expect(FollowValidation.MAX_FOLLOWERS).toBeGreaterThan(0)
      expect(FollowValidation.MIN_FOLLOW_INTERVAL).toBeGreaterThan(0)
      expect(FollowValidation.MAX_DOMAIN_LENGTH).toBeGreaterThan(0)
    })
  })

  describe('Type Safety', () => {
    it('should enforce required fields in Follow interface', () => {
      // This test ensures TypeScript compilation catches missing required fields
      const validFollow: Follow = {
        id: 'test_id',
        followerId: 'follower_id',
        followingId: 'following_id',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: FollowStatus.PENDING,
        federated: false
      }

      expect(validFollow).toBeDefined()
    })

    it('should allow valid FollowStatus enum values only', () => {
      const validStatuses: FollowStatus[] = [
        FollowStatus.PENDING,
        FollowStatus.ACCEPTED,
        FollowStatus.REJECTED
      ]

      validStatuses.forEach(status => {
        const follow: Follow = {
          ...mockFollow,
          status
        }
        expect(Object.values(FollowStatus)).toContain(follow.status)
      })
    })

    it('should maintain consistent validation values', () => {
      // Test that validation constants have expected specific values
      expect(FollowValidation.MAX_FOLLOWING).toBe(7500)
      expect(FollowValidation.MAX_FOLLOWERS).toBe(1000000)
      expect(FollowValidation.MIN_FOLLOW_INTERVAL).toBe(300000)
      expect(FollowValidation.MAX_DOMAIN_LENGTH).toBe(255)
    })
  })
})