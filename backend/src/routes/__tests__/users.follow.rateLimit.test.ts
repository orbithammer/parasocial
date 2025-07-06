// backend/src/routes/__tests__/users.follow.rateLimit.test.ts
// Version: 1.1.0 - Colocated test for follow operations rate limiting
// Tests rate limiting on follow/unfollow operations to prevent automation abuse

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express, { Application } from 'express'
import request from 'supertest'
import { createUsersRouter } from '../users'

/**
 * Mock controllers for testing
 * Include required properties to match controller interfaces
 */
const mockUserController = {
  // Required properties from UserController class
  userRepository: {} as any,
  followRepository: {} as any,
  blockRepository: {} as any,

  // Method implementations
  getUserProfile: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      data: {
        id: 'target_user',
        username: req.params.username,
        displayName: null,
        bio: null,
        avatar: null,
        isVerified: false,
        followersCount: 10,
        followingCount: 5
      }
    })
  }),

  // Additional methods required by UserController interface
  followUser: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(201).json({
      success: true,
      message: `Successfully followed ${req.params.username}`
    })
  }),

  unfollowUser: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      message: `Successfully unfollowed ${req.params.username}`
    })
  }),

  getUserFollowers: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      data: {
        followers: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalFollowers: 0
        }
      }
    })
  }),

  blockUser: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(201).json({
      success: true,
      message: `Successfully blocked ${req.params.username}`
    })
  }),

  unblockUser: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      message: `Successfully unblocked ${req.params.username}`
    })
  })
}

const mockPostController = {
  // Required properties from PostController class
  postRepository: {} as any,
  userRepository: {} as any,

  // Method implementations
  getUserPosts: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      data: {
        posts: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalPosts: 0,
          hasNext: false,
          hasPrev: false
        }
      }
    })
  })
}

const mockFollowController = {
  // Required properties from FollowController class
  followService: {} as any,
  userRepository: {} as any,

  // Method implementations
  followUser: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(201).json({
      success: true,
      message: `Successfully followed ${req.params.username}`,
      data: {
        followerId: req.user?.id || 'anonymous_follower',
        followingId: 'target_user_id',
        followedAt: new Date().toISOString()
      }
    })
  }),

  unfollowUser: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      message: `Successfully unfollowed ${req.params.username}`
    })
  }),

  getFollowers: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      data: {
        followers: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalFollowers: 0
        }
      }
    })
  }),

  getFollowing: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      data: {
        following: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalFollowing: 0
        }
      }
    })
  }),

  getUserFollowStats: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      data: {
        followersCount: 10,
        followingCount: 5
      }
    })
  }),

  blockUser: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(201).json({
      success: true,
      message: `Successfully blocked ${req.params.username}`
    })
  }),

  unblockUser: vi.fn().mockImplementation(async (req: any, res: any) => {
    res.status(200).json({
      success: true,
      message: `Successfully unblocked ${req.params.username}`
    })
  })
}

/**
 * Mock auth middleware for testing
 * @param userId - User ID for authenticated requests
 */
const createMockAuthMiddleware = (userId: string = 'follower_123') => {
  return vi.fn().mockImplementation(async (req: any, res: any, next: any) => {
    req.user = {
      id: userId,
      email: `${userId}@example.com`,
      username: `user_${userId}`
    }
    next()
  })
}

/**
 * Mock optional auth middleware for testing
 */
const mockOptionalAuthMiddleware = vi.fn().mockImplementation(async (req: any, res: any, next: any) => {
  // Sometimes add user, sometimes don't (for testing optional auth)
  if (req.headers.authorization) {
    req.user = {
      id: 'follower_123',
      email: 'follower@example.com',
      username: 'follower_user'
    }
  }
  next()
})

/**
 * Create test Express application with users routes
 * @param userId - User ID for authenticated requests
 */
function createTestApp(userId: string = 'follower_123'): Application {
  const app = express()
  
  // Basic middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  
  // Mount users routes with rate limiting
  app.use('/users', createUsersRouter({
    userController: mockUserController,
    postController: mockPostController,
    followController: mockFollowController,
    authMiddleware: createMockAuthMiddleware(userId),
    optionalAuthMiddleware: mockOptionalAuthMiddleware
  }))
  
  return app
}

/**
 * Helper function to make sequential follow/unfollow requests
 * @param app - Express application
 * @param operation - 'follow' or 'unfollow'
 * @param username - Username to follow/unfollow
 * @param count - Number of requests to make
 * @returns Array of response objects
 */
async function makeSequentialFollowRequests(
  app: Application, 
  operation: 'follow' | 'unfollow', 
  username: string, 
  count: number
): Promise<request.Response[]> {
  const responses: request.Response[] = []
  
  for (let i = 0; i < count; i++) {
    let response: request.Response
    
    if (operation === 'follow') {
      response = await request(app)
        .post(`/users/${username}/follow`)
        .send({})
    } else {
      response = await request(app)
        .delete(`/users/${username}/follow`)
    }
    
    responses.push(response)
    
    // Small delay to ensure requests are processed sequentially
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  return responses
}

describe('Follow Operations Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('POST /users/:username/follow Rate Limiting', () => {
    const targetUsername = 'targetuser'

    it('should allow follow operations within the limit (20 per hour)', async () => {
      const app = createTestApp('follower_test_1')
      const responses = await makeSequentialFollowRequests(app, 'follow', targetUsername, 20)
      
      // All 20 requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.message).toContain(`Successfully followed ${targetUsername}`)
      })
      
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(20)
    })

    it('should block 21st follow operation with rate limit error', async () => {
      const app = createTestApp('follower_test_2')
      const responses = await makeSequentialFollowRequests(app, 'follow', targetUsername, 21)
      
      // First 20 should succeed
      for (let i = 0; i < 20; i++) {
        expect(responses[i].status).toBe(201)
        expect(responses[i].body.success).toBe(true)
      }
      
      // 21st request should be rate limited
      expect(responses[20].status).toBe(429)
      expect(responses[20].body.success).toBe(false)
      expect(responses[20].body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      expect(responses[20].body.error.message).toContain('Follow action limit reached')
      expect(responses[20].body.error.message).toContain('20 follow/unfollow actions per hour')
      
      // Controller should only be called 20 times
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(20)
    })

    it('should include rate limit headers in response', async () => {
      const app = createTestApp('follower_test_3')
      const response = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .send({})
      
      expect(response.headers['ratelimit-limit']).toBeDefined()
      expect(response.headers['ratelimit-remaining']).toBeDefined()
      expect(response.headers['ratelimit-reset']).toBeDefined()
      
      // Should start with 19 remaining (20 total - 1 used)
      expect(response.headers['ratelimit-remaining']).toBe('19')
      expect(response.headers['ratelimit-limit']).toBe('20')
    })

    it('should track rate limits by user ID when authenticated', async () => {
      const user1App = createTestApp('follower_rate_1')
      const user2App = createTestApp('follower_rate_2')
      
      // User 1 makes 20 follow requests (hits limit)
      const user1Responses = await makeSequentialFollowRequests(user1App, 'follow', targetUsername, 21)
      
      // User 1's 21st follow should be rate limited
      expect(user1Responses[20].status).toBe(429)
      
      // User 2 should still be able to follow (separate rate limit)
      const user2Response = await request(user2App)
        .post(`/users/${targetUsername}/follow`)
        .send({})
      
      expect(user2Response.status).toBe(201)
      expect(user2Response.body.success).toBe(true)
    })
  })

  describe('DELETE /users/:username/follow Rate Limiting', () => {
    const targetUsername = 'targetuser'

    it('should allow unfollow operations within the limit', async () => {
      const app = createTestApp('unfollower_test_1')
      const responses = await makeSequentialFollowRequests(app, 'unfollow', targetUsername, 20)
      
      // All 20 requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.message).toContain(`Successfully unfollowed ${targetUsername}`)
      })
      
      expect(mockFollowController.unfollowUser).toHaveBeenCalledTimes(20)
    })

    it('should block 21st unfollow operation with rate limit error', async () => {
      const app = createTestApp('unfollower_test_2')
      const responses = await makeSequentialFollowRequests(app, 'unfollow', targetUsername, 21)
      
      // First 20 should succeed
      for (let i = 0; i < 20; i++) {
        expect(responses[i].status).toBe(200)
        expect(responses[i].body.success).toBe(true)
      }
      
      // 21st request should be rate limited
      expect(responses[20].status).toBe(429)
      expect(responses[20].body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      
      expect(mockFollowController.unfollowUser).toHaveBeenCalledTimes(20)
    })
  })

  describe('Shared Rate Limiting Between Follow and Unfollow', () => {
    it('should share rate limit between follow and unfollow operations', async () => {
      const app = createTestApp('mixed_operations_user')
      const targetUsername = 'targetuser'
      
      // Make 10 follow requests
      const followResponses = await makeSequentialFollowRequests(app, 'follow', targetUsername, 10)
      followResponses.forEach(response => {
        expect(response.status).toBe(201)
      })
      
      // Make 10 unfollow requests (should all succeed - total 20)
      const unfollowResponses = await makeSequentialFollowRequests(app, 'unfollow', targetUsername, 10)
      unfollowResponses.forEach(response => {
        expect(response.status).toBe(200)
      })
      
      // Make 1 more follow request (should be rate limited - would be 21st)
      const rateLimitedResponse = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .send({})
      
      expect(rateLimitedResponse.status).toBe(429)
      expect(rateLimitedResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED')
      
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(10)
      expect(mockFollowController.unfollowUser).toHaveBeenCalledTimes(10)
    })

    it('should handle alternating follow/unfollow operations', async () => {
      const app = createTestApp('alternating_user')
      const targetUsername = 'targetuser'
      
      // Alternate between follow and unfollow 10 times each (20 total)
      for (let i = 0; i < 10; i++) {
        // Follow
        const followResponse = await request(app)
          .post(`/users/${targetUsername}/follow`)
          .send({})
        expect(followResponse.status).toBe(201)
        
        // Unfollow
        const unfollowResponse = await request(app)
          .delete(`/users/${targetUsername}/follow`)
        expect(unfollowResponse.status).toBe(200)
      }
      
      // 21st operation should be rate limited
      const rateLimitedResponse = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .send({})
      
      expect(rateLimitedResponse.status).toBe(429)
    })
  })

  describe('Non-Rate-Limited User Operations', () => {
    it('should not apply rate limiting to GET /users/:username (profile views)', async () => {
      const app = createTestApp('profile_viewer')
      
      // Make many profile view requests - should not be rate limited
      const responses = []
      for (let i = 0; i < 30; i++) {
        const response = await request(app).get('/users/testuser')
        responses.push(response)
      }
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
      
      expect(mockUserController.getUserProfile).toHaveBeenCalledTimes(30)
    })

    it('should not apply rate limiting to follower/following lists', async () => {
      const app = createTestApp('list_viewer')
      
      // Make many requests to view followers/following - should not be rate limited
      for (let i = 0; i < 25; i++) {
        const followersResponse = await request(app).get('/users/testuser/followers')
        const followingResponse = await request(app).get('/users/testuser/following')
        
        expect(followersResponse.status).toBe(200)
        expect(followingResponse.status).toBe(200)
      }
      
      expect(mockFollowController.getFollowers).toHaveBeenCalledTimes(25)
      expect(mockFollowController.getFollowing).toHaveBeenCalledTimes(25)
    })

    it('should not apply rate limiting to block/unblock operations', async () => {
      const app = createTestApp('blocker_user')
      
      // Make many block/unblock requests - should not be rate limited
      // (Users should be able to block quickly in case of harassment)
      for (let i = 0; i < 15; i++) {
        const blockResponse = await request(app)
          .post('/users/harasser/block')
          .send({})
        
        const unblockResponse = await request(app)
          .delete('/users/harasser/block')
        
        expect(blockResponse.status).toBe(201)
        expect(unblockResponse.status).toBe(200)
      }
      
      expect(mockFollowController.blockUser).toHaveBeenCalledTimes(15)
      expect(mockFollowController.unblockUser).toHaveBeenCalledTimes(15)
    })
  })

  describe('Rate Limit Error Response Format', () => {
    it('should return consistent error format when rate limited', async () => {
      const app = createTestApp('error_format_test')
      const targetUsername = 'targetuser'
      
      // Hit the rate limit (make 20 follow requests)
      await makeSequentialFollowRequests(app, 'follow', targetUsername, 20)
      
      // Make one more request to trigger rate limit
      const response = await request(app)
        .post(`/users/${targetUsername}/follow`)
        .send({})
      
      expect(response.status).toBe(429)
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: expect.stringContaining('Follow action limit reached'),
          retryAfter: '60 seconds'
        }
      })
    })
  })
})