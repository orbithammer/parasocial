// backend/src/models/__tests__/Report.test.ts
// Version: 1.0.0 - Initial unit test suite for Report model interfaces and utilities
// Unit tests for Report model types, interfaces, utility functions, and error classes

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  Report,
  ReportType,
  ReportStatus,
  CreateReportData,
  buildCreateReportData,
  UpdateReportData,
  ReportQuery,
  PaginatedReports,
  ReportStatistics,
  ReportError,
  ReportRepositoryInterface
} from '../Report'

// ============================================================================
// ENUM TESTS
// ============================================================================

describe('ReportType enum', () => {
  it('should contain all expected report types', () => {
    // Test that all report type values are present and correct
    expect(ReportType.HARASSMENT).toBe('HARASSMENT')
    expect(ReportType.SPAM).toBe('SPAM')
    expect(ReportType.MISINFORMATION).toBe('MISINFORMATION')
    expect(ReportType.INAPPROPRIATE_CONTENT).toBe('INAPPROPRIATE_CONTENT')
    expect(ReportType.COPYRIGHT).toBe('COPYRIGHT')
    expect(ReportType.OTHER).toBe('OTHER')
  })

  it('should have exactly 6 report types', () => {
    // Test that no unexpected types are added
    const typeCount = Object.keys(ReportType).length
    expect(typeCount).toBe(6)
  })
})

describe('ReportStatus enum', () => {
  it('should contain all expected report statuses', () => {
    // Test that all status values are present and correct
    expect(ReportStatus.PENDING).toBe('PENDING')
    expect(ReportStatus.REVIEWED).toBe('REVIEWED')
    expect(ReportStatus.RESOLVED).toBe('RESOLVED')
    expect(ReportStatus.DISMISSED).toBe('DISMISSED')
  })

  it('should have exactly 4 report statuses', () => {
    // Test that no unexpected statuses are added
    const statusCount = Object.keys(ReportStatus).length
    expect(statusCount).toBe(4)
  })
})

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('buildCreateReportData function', () => {
  it('should build basic report data with required fields only', () => {
    // Test creating report data with only required fields
    const input = {
      type: ReportType.SPAM,
      description: 'This is spam content'
    }

    const result = buildCreateReportData(input)

    expect(result).toEqual({
      type: ReportType.SPAM,
      description: 'This is spam content'
    })
  })

  it('should build report data with user ID when provided', () => {
    // Test creating report data targeting a user
    const input = {
      type: ReportType.HARASSMENT,
      description: 'User harassment report',
      reportedUserId: 'user123'
    }

    const result = buildCreateReportData(input)

    expect(result).toEqual({
      type: ReportType.HARASSMENT,
      description: 'User harassment report',
      reportedUserId: 'user123'
    })
  })

  it('should build report data with post ID when provided', () => {
    // Test creating report data targeting a post
    const input = {
      type: ReportType.INAPPROPRIATE_CONTENT,
      description: 'Inappropriate post content',
      reportedPostId: 'post456'
    }

    const result = buildCreateReportData(input)

    expect(result).toEqual({
      type: ReportType.INAPPROPRIATE_CONTENT,
      description: 'Inappropriate post content',
      reportedPostId: 'post456'
    })
  })

  it('should build report data with reporter ID when provided', () => {
    // Test creating report data with known reporter
    const input = {
      type: ReportType.MISINFORMATION,
      description: 'False information shared',
      reportedPostId: 'post789',
      reporterId: 'reporter123'
    }

    const result = buildCreateReportData(input)

    expect(result).toEqual({
      type: ReportType.MISINFORMATION,
      description: 'False information shared',
      reportedPostId: 'post789',
      reporterId: 'reporter123'
    })
  })

  it('should build report data with federated actor ID when provided', () => {
    // Test creating report data from federated actor
    const input = {
      type: ReportType.COPYRIGHT,
      description: 'Copyright violation',
      reportedPostId: 'post999',
      reporterActorId: 'https://example.com/users/actor1'
    }

    const result = buildCreateReportData(input)

    expect(result).toEqual({
      type: ReportType.COPYRIGHT,
      description: 'Copyright violation',
      reportedPostId: 'post999',
      reporterActorId: 'https://example.com/users/actor1'
    })
  })

  it('should build complete report data with all optional fields', () => {
    // Test creating report data with all possible fields
    const input = {
      type: ReportType.OTHER,
      description: 'Custom report reason',
      reportedUserId: 'user456',
      reportedPostId: 'post123',
      reporterId: 'reporter789',
      reporterActorId: 'https://remote.site/actor'
    }

    const result = buildCreateReportData(input)

    expect(result).toEqual({
      type: ReportType.OTHER,
      description: 'Custom report reason',
      reportedUserId: 'user456',
      reportedPostId: 'post123',
      reporterId: 'reporter789',
      reporterActorId: 'https://remote.site/actor'
    })
  })

  it('should not include undefined optional fields in result', () => {
    // Test that undefined fields are not included (exactOptionalPropertyTypes compatibility)
    const input = {
      type: ReportType.SPAM,
      description: 'Spam report',
      reportedUserId: undefined,
      reportedPostId: 'post123',
      reporterId: undefined
    }

    const result = buildCreateReportData(input)

    // Should only include defined fields
    expect(result).toEqual({
      type: ReportType.SPAM,
      description: 'Spam report',
      reportedPostId: 'post123'
    })

    // Verify undefined fields are not present as properties
    expect(result.hasOwnProperty('reportedUserId')).toBe(false)
    expect(result.hasOwnProperty('reporterId')).toBe(false)
  })
})

// ============================================================================
// ERROR CLASS TESTS
// ============================================================================

describe('ReportError class', () => {
  it('should create error with message and code', () => {
    // Test basic error creation
    const error = new ReportError('Test error message', 'TEST_ERROR')

    expect(error.message).toBe('Test error message')
    expect(error.code).toBe('TEST_ERROR')
    expect(error.statusCode).toBe(500) // Default status code
    expect(error.name).toBe('ReportError')
    expect(error instanceof Error).toBe(true)
  })

  it('should create error with custom status code', () => {
    // Test error creation with custom status code
    const error = new ReportError('Validation failed', 'VALIDATION_ERROR', 400)

    expect(error.message).toBe('Validation failed')
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.statusCode).toBe(400)
    expect(error.name).toBe('ReportError')
  })

  it('should be instance of base Error class', () => {
    // Test inheritance from Error class
    const error = new ReportError('Test', 'TEST')

    expect(error instanceof Error).toBe(true)
    expect(error instanceof ReportError).toBe(true)
  })

  it('should have stack trace when thrown', () => {
    // Test that error maintains stack trace for debugging
    expect(() => {
      throw new ReportError('Stack test', 'STACK_ERROR')
    }).toThrow(ReportError)

    try {
      throw new ReportError('Stack test', 'STACK_ERROR')
    } catch (error) {
      expect(error instanceof ReportError).toBe(true)
      expect((error as ReportError).stack).toBeDefined()
    }
  })
})

// ============================================================================
// INTERFACE TYPE TESTS
// ============================================================================

describe('Report interface type compatibility', () => {
  it('should accept valid Report object structure', () => {
    // Test that valid Report objects match the interface
    const validReport: Report = {
      id: 'report123',
      type: ReportType.SPAM,
      description: 'Spam content reported',
      status: ReportStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // TypeScript compilation serves as the test - if this compiles, interface is correct
    expect(validReport.id).toBe('report123')
    expect(validReport.type).toBe(ReportType.SPAM)
    expect(validReport.status).toBe(ReportStatus.PENDING)
  })

  it('should accept Report object with all optional fields', () => {
    // Test Report interface with all possible fields
    const fullReport: Report = {
      id: 'report456',
      type: ReportType.HARASSMENT,
      description: 'Harassment report',
      status: ReportStatus.RESOLVED,
      reportedUserId: 'user123',
      reportedPostId: 'post456',
      reporterId: 'reporter789',
      reporterActorId: 'https://remote.site/actor',
      moderatorNotes: 'Reviewed and resolved',
      moderatorId: 'admin123',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    expect(fullReport.reportedUserId).toBe('user123')
    expect(fullReport.moderatorNotes).toBe('Reviewed and resolved')
  })
})

describe('UpdateReportData interface type compatibility', () => {
  it('should accept valid update data', () => {
    // Test UpdateReportData interface with valid data
    const updateData: UpdateReportData = {
      status: ReportStatus.RESOLVED,
      moderatorNotes: 'Report has been reviewed and resolved',
      moderatorId: 'admin456'
    }

    expect(updateData.status).toBe(ReportStatus.RESOLVED)
    expect(updateData.moderatorNotes).toBe('Report has been reviewed and resolved')
  })

  it('should accept partial update data', () => {
    // Test that UpdateReportData allows partial updates
    const partialUpdate: UpdateReportData = {
      status: ReportStatus.REVIEWED
    }

    expect(partialUpdate.status).toBe(ReportStatus.REVIEWED)
  })
})

describe('ReportQuery interface type compatibility', () => {
  it('should accept valid query parameters', () => {
    // Test ReportQuery interface with pagination and filters
    const query: ReportQuery = {
      page: 1,
      limit: 10,
      status: ReportStatus.PENDING,
      type: ReportType.SPAM,
      reportedUserId: 'user123'
    }

    expect(query.page).toBe(1)
    expect(query.limit).toBe(10)
    expect(query.status).toBe(ReportStatus.PENDING)
  })

  it('should accept empty query object', () => {
    // Test that all ReportQuery fields are optional
    const emptyQuery: ReportQuery = {}
    expect(Object.keys(emptyQuery).length).toBe(0)
  })
})

describe('PaginatedReports interface type compatibility', () => {
  it('should accept valid paginated results structure', () => {
    // Test PaginatedReports interface structure
    const mockReport: Report = {
      id: 'report1',
      type: ReportType.SPAM,
      description: 'Test report',
      status: ReportStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const paginatedResults: PaginatedReports = {
      reports: [mockReport],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    }

    expect(paginatedResults.reports).toHaveLength(1)
    expect(paginatedResults.pagination.total).toBe(1)
  })
})

describe('ReportStatistics interface type compatibility', () => {
  it('should accept valid statistics structure', () => {
    // Test ReportStatistics interface structure
    const stats: ReportStatistics = {
      totalReports: 100,
      pendingReports: 25,
      resolvedToday: 10,
      reportsByType: {
        [ReportType.SPAM]: 40,
        [ReportType.HARASSMENT]: 30,
        [ReportType.MISINFORMATION]: 15,
        [ReportType.INAPPROPRIATE_CONTENT]: 10,
        [ReportType.COPYRIGHT]: 3,
        [ReportType.OTHER]: 2
      },
      topReportedUsers: [
        { userId: 'user1', reportCount: 5 },
        { userId: 'user2', reportCount: 3 }
      ]
    }

    expect(stats.totalReports).toBe(100)
    expect(stats.reportsByType[ReportType.SPAM]).toBe(40)
    expect(stats.topReportedUsers).toHaveLength(2)
  })
})