// backend/src/repositories/__tests__/ReportRepository.test.ts
// Version: 1.1.0
// Fixed test suite with proper error handling expectations and update validation
// Changes: Fixed error message expectations, added updatedAt field validation, corrected filename

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { ReportRepository } from '../ReportRepository'
import { 
  ReportType, 
  ReportStatus, 
  Report, 
  CreateReportData,
  UpdateReportData,
  ReportQuery,
  ReportError,
  buildCreateReportData
} from '../../models/Report'

// Mock Prisma client with simplified typing approach
const mockReportCreate = vi.fn()
const mockReportFindUnique = vi.fn()
const mockReportFindMany = vi.fn()
const mockReportUpdate = vi.fn()
const mockReportDelete = vi.fn()
const mockReportCount = vi.fn()
const mockUserFindUnique = vi.fn()
const mockPostFindUnique = vi.fn()

const mockPrisma = {
  report: {
    create: mockReportCreate,
    findUnique: mockReportFindUnique,
    findMany: mockReportFindMany,
    update: mockReportUpdate,
    delete: mockReportDelete,
    count: mockReportCount,
    aggregate: vi.fn(),
    groupBy: vi.fn()
  },
  user: {
    findUnique: mockUserFindUnique
  },
  post: {
    findUnique: mockPostFindUnique
  }
} as unknown as PrismaClient

describe('ReportRepository', () => {
  let reportRepository: ReportRepository

  // Sample test data
  const mockReport: Report = {
    id: 'report-123',
    type: ReportType.SPAM,
    description: 'This is spam content',
    status: ReportStatus.PENDING,
    reportedUserId: 'user-456',
    reportedPostId: undefined,
    reporterId: 'reporter-789',
    reporterActorId: undefined,
    moderatorId: undefined,
    moderatorNotes: undefined,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z')
  }

  const mockUser = { id: 'user-456', email: 'user@example.com' }
  const mockPost = { id: 'post-123', content: 'Sample post' }

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks()
    
    // Create fresh repository instance
    reportRepository = new ReportRepository(mockPrisma)
  })

  describe('create', () => {
    it('should successfully create a user report', async () => {
      // Arrange: Setup mock data and responses
      const createData = buildCreateReportData({
        type: ReportType.HARASSMENT,
        description: 'User harassment report',
        reportedUserId: 'user-456',
        reporterId: 'reporter-789'
      })

      mockUserFindUnique.mockResolvedValue(mockUser)
      mockReportCreate.mockResolvedValue(mockReport)

      // Act: Call the method under test
      const result = await reportRepository.create(createData)

      // Assert: Verify the results and mock calls
      expect(result).toEqual(mockReport)
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: { id: 'user-456' }
      })
      expect(mockReportCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: ReportType.HARASSMENT,
          description: 'User harassment report',
          status: 'PENDING',
          reportedUserId: 'user-456',
          reporterId: 'reporter-789'
        })
      })
    })

    it('should successfully create a post report', async () => {
      // Arrange: Setup for post report
      const createData = buildCreateReportData({
        type: ReportType.INAPPROPRIATE_CONTENT,
        description: 'Inappropriate post content',
        reportedPostId: 'post-123',
        reporterId: 'reporter-789'
      })

      mockPostFindUnique.mockResolvedValue(mockPost)
      mockReportCreate.mockResolvedValue({
        ...mockReport,
        reportedUserId: undefined,
        reportedPostId: 'post-123'
      })

      // Act: Create post report
      const result = await reportRepository.create(createData)

      // Assert: Verify post validation and creation
      expect(mockPostFindUnique).toHaveBeenCalledWith({
        where: { id: 'post-123' }
      })
      expect(result.reportedPostId).toBe('post-123')
      expect(result.reportedUserId).toBeUndefined()
    })

    it('should throw error when both user and post are specified', async () => {
      // Arrange: Invalid data with both targets
      const invalidData = buildCreateReportData({
        type: ReportType.SPAM,
        description: 'Invalid report',
        reportedUserId: 'user-456',
        reportedPostId: 'post-123'
      })

      // Act & Assert: Expect validation error
      await expect(reportRepository.create(invalidData)).rejects.toThrow(ReportError)
      await expect(reportRepository.create(invalidData)).rejects.toThrow('Cannot report both user and post in same report')
    })

    it('should throw error when neither user nor post is specified', async () => {
      // Arrange: Missing target data
      const invalidData = buildCreateReportData({
        type: ReportType.SPAM,
        description: 'Invalid report'
      })

      // Act & Assert: Expect validation error
      await expect(reportRepository.create(invalidData)).rejects.toThrow(ReportError)
      await expect(reportRepository.create(invalidData)).rejects.toThrow('Must specify either reportedUserId or reportedPostId')
    })

    it('should throw error when reported user does not exist', async () => {
      // Arrange: Non-existent user
      const createData = buildCreateReportData({
        type: ReportType.SPAM,
        description: 'Report non-existent user',
        reportedUserId: 'non-existent-user'
      })

      mockUserFindUnique.mockResolvedValue(null)

      // Act & Assert: Expect user not found error
      await expect(reportRepository.create(createData)).rejects.toThrow(ReportError)
      await expect(reportRepository.create(createData)).rejects.toThrow('Reported user does not exist')
    })

    it('should throw error when reported post does not exist', async () => {
      // Arrange: Non-existent post
      const createData = buildCreateReportData({
        type: ReportType.SPAM,
        description: 'Report non-existent post',
        reportedPostId: 'non-existent-post'
      })

      mockPostFindUnique.mockResolvedValue(null)

      // Act & Assert: Expect post not found error
      await expect(reportRepository.create(createData)).rejects.toThrow(ReportError)
      await expect(reportRepository.create(createData)).rejects.toThrow('Reported post does not exist')
    })
  })

  describe('findById', () => {
    it('should return report when found', async () => {
      // Arrange: Mock successful find
      mockReportFindUnique.mockResolvedValue(mockReport)

      // Act: Find report by ID
      const result = await reportRepository.findById('report-123')

      // Assert: Verify result and query
      expect(result).toEqual(mockReport)
      expect(mockReportFindUnique).toHaveBeenCalledWith({
        where: { id: 'report-123' }
      })
    })

    it('should return null when report not found', async () => {
      // Arrange: Mock not found
      mockReportFindUnique.mockResolvedValue(null)

      // Act: Attempt to find non-existent report
      const result = await reportRepository.findById('non-existent')

      // Assert: Verify null result
      expect(result).toBeNull()
      expect(mockReportFindUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' }
      })
    })

    it('should handle database errors gracefully', async () => {
      // Arrange: Mock database error
      const dbError = new Error('Database connection failed')
      mockReportFindUnique.mockRejectedValue(dbError)

      // Act & Assert: Expect repository's wrapped error message
      await expect(reportRepository.findById('report-123')).rejects.toThrow('Failed to find report by ID')
      await expect(reportRepository.findById('report-123')).rejects.toThrow(ReportError)
    })
  })

  describe('findMany', () => {
    const mockReports = [mockReport, { ...mockReport, id: 'report-456' }]

    it('should return paginated reports with default parameters', async () => {
      // Arrange: Mock find many and count
      mockReportFindMany.mockResolvedValue(mockReports)
      mockReportCount.mockResolvedValue(2)

      // Act: Find reports with no query
      const result = await reportRepository.findMany({})

      // Assert: Verify pagination structure
      expect(result.reports).toEqual(mockReports)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      })
    })

    it('should apply filters and pagination correctly', async () => {
      // Arrange: Mock with specific query
      const query: ReportQuery = {
        page: 2,
        limit: 5,
        status: ReportStatus.PENDING,
        type: ReportType.SPAM
      }

      mockReportFindMany.mockResolvedValue([mockReport])
      mockReportCount.mockResolvedValue(7)

      // Act: Find with filters
      const result = await reportRepository.findMany(query)

      // Assert: Verify filter application
      expect(mockReportFindMany).toHaveBeenCalledWith({
        where: {
          status: ReportStatus.PENDING,
          type: ReportType.SPAM
        },
        skip: 5, // (page - 1) * limit
        take: 5,
        orderBy: { createdAt: 'desc' }
      })

      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 7,
        totalPages: 2,
        hasNext: false,
        hasPrev: true
      })
    })

    it('should filter by reported user ID', async () => {
      // Arrange: User-specific query
      const query: ReportQuery = { reportedUserId: 'user-456' }

      mockReportFindMany.mockResolvedValue([mockReport])
      mockReportCount.mockResolvedValue(1)

      // Act: Find reports for specific user
      await reportRepository.findMany(query)

      // Assert: Verify user filter
      expect(mockReportFindMany).toHaveBeenCalledWith({
        where: { reportedUserId: 'user-456' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    })
  })

  describe('updateStatus', () => {
    it('should successfully update report status', async () => {
      // Arrange: Setup update data
      const updateData: UpdateReportData = {
        status: ReportStatus.RESOLVED,
        moderatorNotes: 'Report resolved - no violation found',
        moderatorId: 'moderator-123'
      }

      const updatedReport: Report = {
        ...mockReport,
        status: ReportStatus.RESOLVED,
        moderatorNotes: 'Report resolved - no violation found',
        moderatorId: 'moderator-123'
      }

      mockReportUpdate.mockResolvedValue(updatedReport)

      // Act: Update report status
      const result = await reportRepository.updateStatus('report-123', updateData)

      // Assert: Verify update call and result
      expect(result).toEqual(updatedReport)
      expect(mockReportUpdate).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: expect.objectContaining({
          status: ReportStatus.RESOLVED,
          moderatorNotes: 'Report resolved - no violation found',
          moderatorId: 'moderator-123',
          updatedAt: expect.any(Date)
        })
      })
    })

    it('should handle update failures', async () => {
      // Arrange: Mock update failure
      const updateError = new Error('Update failed')
      mockReportUpdate.mockRejectedValue(updateError)

      // Act & Assert: Expect repository's wrapped error message
      await expect(
        reportRepository.updateStatus('report-123', {
          status: ReportStatus.RESOLVED
        })
      ).rejects.toThrow('Failed to update report status')
      await expect(
        reportRepository.updateStatus('report-123', {
          status: ReportStatus.RESOLVED
        })
      ).rejects.toThrow(ReportError)
    })
  })

  describe('delete', () => {
    it('should successfully delete report', async () => {
      // Arrange: Mock successful deletion
      mockReportDelete.mockResolvedValue(mockReport)

      // Act: Delete report
      const result = await reportRepository.delete('report-123')

      // Assert: Verify deletion
      expect(result).toBe(true)
      expect(mockReportDelete).toHaveBeenCalledWith({
        where: { id: 'report-123' }
      })
    })

    it('should handle deletion failures', async () => {
      // Arrange: Mock deletion failure
      const deleteError = new Error('Report not found')
      mockReportDelete.mockRejectedValue(deleteError)

      // Act & Assert: Expect repository's wrapped error message
      await expect(reportRepository.delete('non-existent')).rejects.toThrow('Failed to delete report')
      await expect(reportRepository.delete('non-existent')).rejects.toThrow(ReportError)
    })
  })

  describe('countByUser', () => {
    it('should return correct report count for user', async () => {
      // Arrange: Mock count response
      mockReportCount.mockResolvedValue(5)

      // Act: Count reports for user
      const result = await reportRepository.countByUser('user-456')

      // Assert: Verify count query
      expect(result).toBe(5)
      expect(mockReportCount).toHaveBeenCalledWith({
        where: { reportedUserId: 'user-456' }
      })
    })

    it('should return zero for user with no reports', async () => {
      // Arrange: Mock zero count
      mockReportCount.mockResolvedValue(0)

      // Act: Count for user with no reports
      const result = await reportRepository.countByUser('clean-user')

      // Assert: Verify zero result
      expect(result).toBe(0)
    })
  })

  describe('findByReportedUser', () => {
    it('should find reports for specific user', async () => {
      // Arrange: Mock user reports
      mockReportFindMany.mockResolvedValue([mockReport])
      mockReportCount.mockResolvedValue(1)

      // Act: Find reports by user
      const result = await reportRepository.findByReportedUser('user-456')

      // Assert: Verify user-specific query
      expect(result.reports).toEqual([mockReport])
      expect(mockReportFindMany).toHaveBeenCalledWith({
        where: { reportedUserId: 'user-456' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    })
  })

  describe('findByReportedPost', () => {
    it('should find reports for specific post', async () => {
      // Arrange: Mock post reports
      const postReport = { ...mockReport, reportedUserId: undefined, reportedPostId: 'post-123' }
      mockReportFindMany.mockResolvedValue([postReport])
      mockReportCount.mockResolvedValue(1)

      // Act: Find reports by post
      const result = await reportRepository.findByReportedPost('post-123')

      // Assert: Verify post-specific query
      expect(result.reports).toEqual([postReport])
      expect(mockReportFindMany).toHaveBeenCalledWith({
        where: { reportedPostId: 'post-123' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' }
      })
    })
  })
})

// backend/src/repositories/__tests__/ReportRepository.test.ts
// Version: 1.1.0
// Fixed test suite with proper error handling expectations and update validation