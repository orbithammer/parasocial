// backend/src/controllers/__tests__/ReportController.test.ts
// Unit tests for ReportController with mocked dependencies
// Version: 1.0.0 - Initial test implementation for report functionality

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReportController } from '../ReportController'
import { UserRepository } from '../../repositories/UserRepository'
import { PostRepository } from '../../repositories/PostRepository'

/**
 * Mock request and response objects for testing
 */
const createMockRequest = (body: any = {}, params: any = {}, query: any = {}, user?: any) => ({
  body,
  params,
  query,
  user
} as any)

const createMockResponse = () => {
  const res: any = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res
}

/**
 * Test suite for ReportController
 */
describe('ReportController', () => {
  let reportController: ReportController
  let mockUserRepository: UserRepository
  let mockPostRepository: PostRepository

  beforeEach(() => {
    // Create mock repositories
    mockUserRepository = {
      findById: vi.fn()
    } as any

    mockPostRepository = {
      findById: vi.fn()
    } as any

    // Create controller instance with mocked dependencies
    reportController = new ReportController(mockUserRepository, mockPostRepository)
  })

  describe('createReport', () => {
    describe('Valid Report Creation', () => {
      it('should create user report successfully', async () => {
        // Arrange
        const mockUser = { id: 'user123', username: 'testuser' }
        mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)

        const req = createMockRequest({
          type: 'HARASSMENT',
          description: 'This user is posting inappropriate content',
          reportedUserId: 'user123'
        }, {}, {}, { id: 'reporter456', username: 'reporter' })

        const res = createMockResponse()

        // Act
        await reportController.createReport(req, res)

        // Assert
        expect(mockUserRepository.findById).toHaveBeenCalledWith('user123')
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Report submitted successfully',
            data: expect.objectContaining({
              type: 'HARASSMENT',
              description: 'This user is posting inappropriate content',
              reportedUserId: 'user123',
              reporterId: 'reporter456',
              status: 'PENDING'
            })
          })
        )
      })

      it('should create post report successfully', async () => {
        // Arrange
        const mockPost = { id: 'post123', authorId: 'author456', content: 'Test post' }
        mockPostRepository.findById = vi.fn().mockResolvedValue(mockPost)

        const req = createMockRequest({
          type: 'SPAM',
          description: 'This post contains promotional links',
          reportedPostId: 'post123'
        }, {}, {}, { id: 'reporter789', username: 'reporter' })

        const res = createMockResponse()

        // Act
        await reportController.createReport(req, res)

        // Assert
        expect(mockPostRepository.findById).toHaveBeenCalledWith('post123')
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            message: 'Report submitted successfully',
            data: expect.objectContaining({
              type: 'SPAM',
              description: 'This post contains promotional links',
              reportedPostId: 'post123',
              reporterId: 'reporter789',
              status: 'PENDING'
            })
          })
        )
      })

      it('should create anonymous report (no auth)', async () => {
        // Arrange
        const mockUser = { id: 'user123', username: 'testuser' }
        mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)

        const req = createMockRequest({
          type: 'MISINFORMATION',
          description: 'This user is spreading false information',
          reportedUserId: 'user123'
        })

        const res = createMockResponse()

        // Act
        await reportController.createReport(req, res)

        // Assert
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: true,
            data: expect.objectContaining({
              reporterId: undefined // Anonymous report
            })
          })
        )
      })
    })

    describe('Invalid Report Creation', () => {
      it('should reject report with neither user nor post ID', async () => {
        // Arrange
        const req = createMockRequest({
          type: 'SPAM',
          description: 'Valid description'
        }, {}, {}, { id: 'reporter123' })

        const res = createMockResponse()

        // Act
        await reportController.createReport(req, res)

        // Assert
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Must specify either reportedUserId or reportedPostId',
            code: 'MISSING_TARGET'
          })
        )
      })

      it('should reject report with both user and post ID', async () => {
        // Arrange
        const req = createMockRequest({
          type: 'HARASSMENT',
          description: 'Valid description',
          reportedUserId: 'user123',
          reportedPostId: 'post456'
        }, {}, {}, { id: 'reporter789' })

        const res = createMockResponse()

        // Act
        await reportController.createReport(req, res)

        // Assert
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Cannot report both user and post in the same report',
            code: 'MULTIPLE_TARGETS'
          })
        )
      })

      it('should reject report of non-existent user', async () => {
        // Arrange
        mockUserRepository.findById = vi.fn().mockResolvedValue(null)

        const req = createMockRequest({
          type: 'SPAM',
          description: 'Valid description',
          reportedUserId: 'nonexistent123'
        }, {}, {}, { id: 'reporter456' })

        const res = createMockResponse()

        // Act
        await reportController.createReport(req, res)

        // Assert
        expect(mockUserRepository.findById).toHaveBeenCalledWith('nonexistent123')
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Reported user not found',
            code: 'USER_NOT_FOUND'
          })
        )
      })

      it('should reject report of non-existent post', async () => {
        // Arrange
        mockPostRepository.findById = vi.fn().mockResolvedValue(null)

        const req = createMockRequest({
          type: 'INAPPROPRIATE_CONTENT',
          description: 'Valid description',
          reportedPostId: 'nonexistent456'
        }, {}, {}, { id: 'reporter789' })

        const res = createMockResponse()

        // Act
        await reportController.createReport(req, res)

        // Assert
        expect(mockPostRepository.findById).toHaveBeenCalledWith('nonexistent456')
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Reported post not found',
            code: 'POST_NOT_FOUND'
          })
        )
      })

      it('should reject self-reporting user', async () => {
        // Arrange
        const mockUser = { id: 'user123', username: 'testuser' }
        mockUserRepository.findById = vi.fn().mockResolvedValue(mockUser)

        const req = createMockRequest({
          type: 'HARASSMENT',
          description: 'Valid description',
          reportedUserId: 'user123'
        }, {}, {}, { id: 'user123', username: 'testuser' }) // Same user

        const res = createMockResponse()

        // Act
        await reportController.createReport(req, res)

        // Assert
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Cannot report yourself',
            code: 'SELF_REPORT'
          })
        )
      })

      it('should reject self-reporting post', async () => {
        // Arrange
        const mockPost = { id: 'post123', authorId: 'author456', content: 'Test post' }
        mockPostRepository.findById = vi.fn().mockResolvedValue(mockPost)

        const req = createMockRequest({
          type: 'SPAM',
          description: 'Valid description',
          reportedPostId: 'post123'
        }, {}, {}, { id: 'author456', username: 'author' }) // Same as post author

        const res = createMockResponse()

        // Act
        await reportController.createReport(req, res)

        // Assert
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Cannot report your own post',
            code: 'SELF_REPORT'
          })
        )
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        // Arrange
        mockUserRepository.findById = vi.fn().mockRejectedValue(new Error('Database connection failed'))

        const req = createMockRequest({
          type: 'SPAM',
          description: 'Valid description',
          reportedUserId: 'user123'
        }, {}, {}, { id: 'reporter456' })

        const res = createMockResponse()

        // Act
        await reportController.createReport(req, res)

        // Assert
        expect(res.status).toHaveBeenCalledWith(500)
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({
            success: false,
            error: 'Failed to create report',
            code: 'INTERNAL_ERROR',
            message: 'Database connection failed'
          })
        )
      })
    })
  })

  describe('getReports', () => {
    it('should return paginated reports', async () => {
      // Arrange
      const req = createMockRequest({}, {}, { page: '1', limit: '20' }, { id: 'admin123' })
      const res = createMockResponse()

      // Act
      await reportController.getReports(req, res)

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            reports: expect.any(Array),
            pagination: expect.objectContaining({
              currentPage: 1,
              totalPages: expect.any(Number),
              totalReports: expect.any(Number),
              hasNext: expect.any(Boolean),
              hasPrev: expect.any(Boolean)
            })
          })
        })
      )
    })

    it('should handle filter parameters', async () => {
      // Arrange
      const req = createMockRequest({}, {}, { 
        status: 'PENDING', 
        type: 'SPAM',
        page: '1',
        limit: '10'
      }, { id: 'admin123' })
      const res = createMockResponse()

      // Act
      await reportController.getReports(req, res)

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.any(Object)
        })
      )
    })
  })

  describe('updateReportStatus', () => {
    it('should update report status successfully', async () => {
      // Arrange
      const req = createMockRequest({
        status: 'RESOLVED',
        moderatorNotes: 'Issue resolved - user warned'
      }, { id: 'report123' }, {}, { id: 'moderator456' })

      const res = createMockResponse()

      // Act
      await reportController.updateReportStatus(req, res)

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Report status updated successfully',
          data: expect.objectContaining({
            status: 'RESOLVED'
          })
        })
      )
    })

    it('should reject invalid status', async () => {
      // Arrange
      const req = createMockRequest({
        status: 'INVALID_STATUS'
      }, { id: 'report123' }, {}, { id: 'moderator456' })

      const res = createMockResponse()

      // Act
      await reportController.updateReportStatus(req, res)

      // Assert
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Invalid status',
          code: 'INVALID_STATUS'
        })
      )
    })
  })

  describe('getReportById', () => {
    it('should return specific report', async () => {
      // Arrange
      const req = createMockRequest({}, { id: 'report123' }, {}, { id: 'admin456' })
      const res = createMockResponse()

      // Act
      await reportController.getReportById(req, res)

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'report123',
            type: expect.any(String),
            description: expect.any(String),
            status: expect.any(String)
          })
        })
      )
    })
  })
})