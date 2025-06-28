// backend/tests/routes/users.router.test.ts
// Unit tests for refactored users router with FollowController integration

import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import express from 'express'
import { createUsersRouter } from '../../src/routes/users'

/**
 * Mock controller interfaces for testing
 */
interface MockUserController {
  getUserProfile: ReturnType<typeof vi.fn>
  blockUser: ReturnType<typeof vi.fn>
  unblockUser: ReturnType<typeof vi.fn>
}

interface MockPostController {
  getUserPosts: ReturnType<typeof vi.fn>
}

interface MockFollowController {
  followUser: ReturnType<typeof vi.fn>
  unfollowUser: ReturnType<typeof vi.fn>
  getUserFollowers: ReturnType<typeof vi.fn>
  getUserFollowing: ReturnType<typeof vi.fn>
  getUserFollowStats: ReturnType<typeof vi.fn>
}

/**
 * Mock middleware function type
 */
type MockMiddleware = ReturnType<typeof vi.fn>

describe('Users Router Refactoring Tests', () => {
  let app: express.Application
  let mockUserController: MockUserController
  let mockPostController: MockPostController
  let mockFollowController: MockFollowController
  let mockAuthMiddleware: MockMiddleware
  let mockOptionalAuthMiddleware: MockMiddleware

  /**
   * Set up test environment before each test
   */
  beforeEach(() => {
    // Create fresh Express app for each test
    app = express()
    app.use(express.json())

    // Create mock controllers with spy functions
    mockUserController = {
      getUserProfile: vi.fn().mockImplementation((req, res) => {
        res.json({ success: true, controller: 'UserController', method: 'getUserProfile' })
      }),
      blockUser: vi.fn().mockImplementation((req, res) => {
        res.json({ success: true, controller: 'UserController', method: 'blockUser' })
      }),
      unblockUser: vi.fn().mockImplementation((req, res) => {
        res.json({ success: true, controller: 'UserController', method: 'unblockUser' })
      })
    }

    mockPostController = {
      getUserPosts: vi.fn().mockImplementation((req, res) => {
        res.json({ success: true, controller: 'PostController', method: 'getUserPosts' })
      })
    }

    mockFollowController = {
      followUser: vi.fn().mockImplementation((req, res) => {
        res.json({ success: true, controller: 'FollowController', method: 'followUser' })
      }),
      unfollowUser: vi.fn().mockImplementation((req, res) => {
        res.json({ success: true, controller: 'FollowController', method: 'unfollowUser' })
      }),
      getUserFollowers: vi.fn().mockImplementation((req, res) => {
        res.json({ success: true, controller: 'FollowController', method: 'getUserFollowers' })
      }),
      getUserFollowing: vi.fn().mockImplementation((req, res) => {
        res.json({ success: true, controller: 'FollowController', method: 'getUserFollowing' })
      }),
      getUserFollowStats: vi.fn().mockImplementation((req, res) => {
        res.json({ success: true, controller: 'FollowController', method: 'getUserFollowStats' })
      })
    }

    // Create mock middleware that passes through
    mockAuthMiddleware = vi.fn().mockImplementation((req, res, next) => {
      req.user = { id: 'test-user-id', username: 'testuser' }
      next()
    })

    mockOptionalAuthMiddleware = vi.fn().mockImplementation((req, res, next) => {
      // Optional auth - sometimes adds user, sometimes doesn't
      if (req.headers.authorization) {
        req.user = { id: 'test-user-id', username: 'testuser' }
      }
      next()
    })

    // Create and mount the users router with mocked dependencies
    const usersRouter = createUsersRouter({
      userController: mockUserController as any,
      postController: mockPostController as any,
      followController: mockFollowController as any,
      authMiddleware: mockAuthMiddleware,
      optionalAuthMiddleware: mockOptionalAuthMiddleware
    })

    // Mount router for testing
    app.use('/users', usersRouter)
  })

  /**
   * Test router dependency injection
   */
  describe('Dependency Injection', () => {
    it('should create router with all required dependencies', () => {
      // Test that router creation doesn't throw with proper dependencies
      expect(() => {
        createUsersRouter({
          userController: mockUserController as any,
          postController: mockPostController as any,
          followController: mockFollowController as any,
          authMiddleware: mockAuthMiddleware,
          optionalAuthMiddleware: mockOptionalAuthMiddleware
        })
      }).not.toThrow()
    })

    it('should properly inject FollowController for follow operations', async () => {
      // Test that follow operations use FollowController
      const response = await request(app)
        .post('/users/testuser/follow')
        .expect(200)

      expect(response.body.controller).toBe('FollowController')
      expect(response.body.method).toBe('followUser')
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(1)
    })
  })

  /**
   * Test that follow operations use FollowController
   */
  describe('Follow Operations - FollowController Usage', () => {
    it('should use FollowController for POST /users/:username/follow', async () => {
      const response = await request(app)
        .post('/users/testuser/follow')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      // Verify FollowController method was called
      expect(mockFollowController.followUser).toHaveBeenCalledTimes(1)
      expect(response.body.controller).toBe('FollowController')
      
      // Verify optional auth middleware was applied
      expect(mockOptionalAuthMiddleware).toHaveBeenCalled()
    })

    it('should use FollowController for DELETE /users/:username/follow', async () => {
      const response = await request(app)
        .delete('/users/testuser/follow')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      // Verify FollowController method was called
      expect(mockFollowController.unfollowUser).toHaveBeenCalledTimes(1)
      expect(response.body.controller).toBe('FollowController')
      
      // Verify auth middleware was applied
      expect(mockAuthMiddleware).toHaveBeenCalled()
    })

    it('should use FollowController for GET /users/:username/followers', async () => {
      const response = await request(app)
        .get('/users/testuser/followers')
        .expect(200)

      // Verify FollowController method was called
      expect(mockFollowController.getUserFollowers).toHaveBeenCalledTimes(1)
      expect(response.body.controller).toBe('FollowController')
    })

    it('should use FollowController for GET /users/:username/following', async () => {
      const response = await request(app)
        .get('/users/testuser/following')
        .expect(200)

      // Verify FollowController method was called
      expect(mockFollowController.getUserFollowing).toHaveBeenCalledTimes(1)
      expect(response.body.controller).toBe('FollowController')
    })

    it('should use FollowController for GET /users/:username/stats', async () => {
      const response = await request(app)
        .get('/users/testuser/stats')
        .expect(200)

      // Verify FollowController method was called
      expect(mockFollowController.getUserFollowStats).toHaveBeenCalledTimes(1)
      expect(response.body.controller).toBe('FollowController')
    })
  })

  /**
   * Test that user management operations still use UserController
   */
  describe('User Management Operations - UserController Usage', () => {
    it('should use UserController for GET /users/:username', async () => {
      const response = await request(app)
        .get('/users/testuser')
        .expect(200)

      // Verify UserController method was called
      expect(mockUserController.getUserProfile).toHaveBeenCalledTimes(1)
      expect(response.body.controller).toBe('UserController')
    })

    it('should use UserController for POST /users/:username/block', async () => {
      const response = await request(app)
        .post('/users/testuser/block')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      // Verify UserController method was called
      expect(mockUserController.blockUser).toHaveBeenCalledTimes(1)
      expect(response.body.controller).toBe('UserController')
      
      // Verify auth middleware was applied
      expect(mockAuthMiddleware).toHaveBeenCalled()
    })

    it('should use UserController for DELETE /users/:username/block', async () => {
      const response = await request(app)
        .delete('/users/testuser/block')
        .set('Authorization', 'Bearer test-token')
        .expect(200)

      // Verify UserController method was called
      expect(mockUserController.unblockUser).toHaveBeenCalledTimes(1)
      expect(response.body.controller).toBe('UserController')
    })
  })

  /**
   * Test that PostController is used for post operations
   */
  describe('Post Operations - PostController Usage', () => {
    it('should use PostController for GET /users/:username/posts', async () => {
      const response = await request(app)
        .get('/users/testuser/posts')
        .expect(200)

      // Verify PostController method was called
      expect(mockPostController.getUserPosts).toHaveBeenCalledTimes(1)
      expect(response.body.controller).toBe('PostController')
    })
  })

  /**
   * Test middleware application
   */
  describe('Middleware Application', () => {
    it('should apply optional auth middleware to follow operations', async () => {
      await request(app)
        .post('/users/testuser/follow')
        .expect(200)

      // Verify optional auth middleware was called
      expect(mockOptionalAuthMiddleware).toHaveBeenCalled()
    })

    it('should apply required auth middleware to unfollow operations', async () => {
      await request(app)
        .delete('/users/testuser/follow')
        .expect(200)

      // Verify required auth middleware was called
      expect(mockAuthMiddleware).toHaveBeenCalled()
    })

    it('should apply required auth middleware to block operations', async () => {
      await request(app)
        .post('/users/testuser/block')
        .expect(200)

      // Verify required auth middleware was called
      expect(mockAuthMiddleware).toHaveBeenCalled()
    })
  })

  /**
   * Test parameter handling
   */
  describe('Parameter Handling', () => {
    it('should pass username parameter to controllers', async () => {
      await request(app)
        .get('/users/specificuser')
        .expect(200)

      // Verify controller was called with request containing username parameter
      expect(mockUserController.getUserProfile).toHaveBeenCalledTimes(1)
      const callArgs = mockUserController.getUserProfile.mock.calls[0]
      expect(callArgs[0].params.username).toBe('specificuser')
    })
  })

  /**
   * Test separation of concerns
   */
  describe('Separation of Concerns', () => {
    it('should not use UserController for follow operations', async () => {
      await request(app)
        .post('/users/testuser/follow')
        .expect(200)

      // Verify UserController follow methods are NOT called
      expect(mockUserController.getUserProfile).not.toHaveBeenCalled()
      expect(mockUserController.blockUser).not.toHaveBeenCalled()
      expect(mockUserController.unblockUser).not.toHaveBeenCalled()
    })

    it('should not use FollowController for user management operations', async () => {
      await request(app)
        .post('/users/testuser/block')
        .expect(200)

      // Verify FollowController methods are NOT called
      expect(mockFollowController.followUser).not.toHaveBeenCalled()
      expect(mockFollowController.unfollowUser).not.toHaveBeenCalled()
      expect(mockFollowController.getUserFollowers).not.toHaveBeenCalled()
    })
  })
})