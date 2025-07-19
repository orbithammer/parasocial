// backend/src/repositories/ReportRepository.ts
// Version: 1.0.0
// Complete ReportRepository implementation for content moderation system
//
// IMPORTANT: Run these commands to enable full type safety:
// 1. npm run db:generate  (generates Prisma types)
// 2. npm run db:push      (applies schema to database)
// 3. Replace 'any' types with proper Prisma types after generation

import { PrismaClient, Prisma } from '@prisma/client'
import { 
  Report, 
  ReportType, 
  ReportStatus, 
  CreateReportData, 
  UpdateReportData, 
  ReportQuery, 
  PaginatedReports, 
  ReportStatistics, 
  ReportRepositoryInterface, 
  ReportError 
} from '../models/Report'

/**
 * Prisma implementation of the report repository
 * Handles all database operations for reports with proper error handling and validation
 * Provides comprehensive CRUD operations and specialized queries for moderation workflows
 */
export class ReportRepository implements ReportRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new report in the database
   * Validates required fields, ensures target entity exists, and prevents invalid combinations
   * @param data - Report creation data with type-safe optional fields
   * @returns Promise<Report> - Created report with all fields populated
   */
  async create(data: CreateReportData): Promise<Report> {
    try {
      // Validate that either user or post is being reported (not both)
      if (data.reportedUserId && data.reportedPostId) {
        throw new ReportError(
          'Cannot report both user and post in same report',
          'INVALID_TARGET',
          400
        )
      }
      
      if (!data.reportedUserId && !data.reportedPostId) {
        throw new ReportError(
          'Must specify either reportedUserId or reportedPostId',
          'MISSING_TARGET',
          400
        )
      }

      // Validate that referenced user exists if reporting a user
      if (data.reportedUserId) {
        const userExists = await this.prisma.user.findUnique({
          where: { id: data.reportedUserId }
        })
        if (!userExists) {
          throw new ReportError(
            'Reported user does not exist',
            'USER_NOT_FOUND',
            404
          )
        }
      }

      // Validate that referenced post exists if reporting a post
      if (data.reportedPostId) {
        const postExists = await this.prisma.post.findUnique({
          where: { id: data.reportedPostId }
        })
        if (!postExists) {
          throw new ReportError(
            'Reported post does not exist',
            'POST_NOT_FOUND',
            404
          )
        }
      }

      // Build create data object using any type until schema is generated
      // After running db:generate, you can replace 'any' with 'Prisma.ReportCreateInput'
      const createData: any = {
        type: data.type,
        description: data.description,
        status: ReportStatus.PENDING
      }

      // Only include optional fields if they have values
      if (data.reportedUserId) {
        createData.reportedUserId = data.reportedUserId
      }
      
      if (data.reportedPostId) {
        createData.reportedPostId = data.reportedPostId
      }
      
      if (data.reporterId) {
        createData.reporterId = data.reporterId
      }
      
      if (data.reporterActorId) {
        createData.reporterActorId = data.reporterActorId
      }

      // Create the report with simplified approach until schema is generated
      const report = await this.prisma.report.create({
        data: createData
      })

      return this.mapPrismaToReport(report)

    } catch (error) {
      if (error instanceof ReportError) {
        throw error
      }
      
      // Handle Prisma-specific errors with detailed context
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ReportError(
          'Database constraint violation during report creation',
          'CONSTRAINT_ERROR',
          400
        )
      }

      throw new ReportError(
        'Failed to create report due to unexpected error',
        'CREATE_FAILED',
        500
      )
    }
  }

  /**
   * Find a specific report by ID with full validation
   * @param id - Unique report identifier
   * @returns Promise<Report | null> - Report if found, null otherwise
   */
  async findById(id: string): Promise<Report | null> {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id }
      })

      return report ? this.mapPrismaToReport(report) : null

    } catch (error) {
      throw new ReportError(
        'Failed to find report by ID',
        'FIND_BY_ID_FAILED',
        500
      )
    }
  }

  /**
   * Find multiple reports with filtering, pagination, and sorting
   * @param query - Optional query parameters for filtering and pagination
   * @returns Promise<PaginatedReports> - Paginated report results with metadata
   */
  async findMany(query: ReportQuery = {}): Promise<PaginatedReports> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        type,
        reportedUserId,
        reportedPostId,
        reporterId
      } = query

      // Calculate pagination offset
      const skip = (page - 1) * limit

      // Build filter conditions dynamically using any type until schema is generated
      const whereConditions: any = {}

      if (status) {
        whereConditions.status = status
      }

      if (type) {
        whereConditions.type = type
      }

      if (reportedUserId) {
        whereConditions.reportedUserId = reportedUserId
      }

      if (reportedPostId) {
        whereConditions.reportedPostId = reportedPostId
      }

      if (reporterId) {
        whereConditions.reporterId = reporterId
      }

      // Execute count and data queries in parallel for performance
      const [reports, totalCount] = await Promise.all([
        this.prisma.report.findMany({
          where: whereConditions,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.report.count({
          where: whereConditions
        })
      ])

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / limit)

      return {
        reports: reports.map(report => this.mapPrismaToReport(report)),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }

    } catch (error) {
      throw new ReportError(
        'Failed to find reports with query parameters',
        'FIND_MANY_FAILED',
        500
      )
    }
  }

  /**
   * Update report status and moderation details
   * @param id - Report ID to update
   * @param data - Update data containing status and moderation info
   * @returns Promise<Report> - Updated report with new status
   */
  async updateStatus(id: string, data: UpdateReportData): Promise<Report> {
    try {
      // Build update data with only provided fields using any type until schema is generated
      const updateData: any = {
        status: data.status,
        updatedAt: new Date()
      }

      if (data.moderatorNotes !== undefined) {
        updateData.moderatorNotes = data.moderatorNotes
      }

      if (data.moderatorId) {
        updateData.moderatorId = data.moderatorId
      }

      const updatedReport = await this.prisma.report.update({
        where: { id },
        data: updateData
      })

      return this.mapPrismaToReport(updatedReport)

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ReportError(
          'Report not found for status update',
          'REPORT_NOT_FOUND',
          404
        )
      }

      throw new ReportError(
        'Failed to update report status',
        'UPDATE_STATUS_FAILED',
        500
      )
    }
  }

  /**
   * Delete a report from the database
   * @param id - Report ID to delete
   * @returns Promise<boolean> - True if deletion was successful
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.report.delete({
        where: { id }
      })

      return true

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new ReportError(
          'Report not found for deletion',
          'REPORT_NOT_FOUND',
          404
        )
      }

      throw new ReportError(
        'Failed to delete report',
        'DELETE_FAILED',
        500
      )
    }
  }

  /**
   * Get comprehensive report statistics for admin dashboards
   * @returns Promise<ReportStatistics> - Aggregated statistics about reports
   */
  async getStatistics(): Promise<ReportStatistics> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Execute all statistics queries in parallel for performance
      const [
        totalReports,
        pendingReports,
        resolvedToday,
        reportsByType,
        topReportedUsers
      ] = await Promise.all([
        // Total reports count
        this.prisma.report.count(),

        // Pending reports count
        this.prisma.report.count({
          where: { status: ReportStatus.PENDING }
        }),

        // Reports resolved today
        this.prisma.report.count({
          where: {
            status: ReportStatus.RESOLVED,
            updatedAt: { gte: today }
          }
        }),

        // Reports grouped by type - using any to avoid Prisma enum issues
        (this.prisma.report.groupBy as any)({
          by: ['type'],
          _count: { type: true }
        }),

        // Top reported users - using any to avoid Prisma enum issues
        (this.prisma.report.groupBy as any)({
          by: ['reportedUserId'],
          where: { reportedUserId: { not: null } },
          _count: { reportedUserId: true },
          orderBy: { _count: { reportedUserId: 'desc' } },
          take: 5
        })
      ])

      // Transform grouped data into proper format
      const reportsByTypeMap: Record<ReportType, number> = {
        [ReportType.HARASSMENT]: 0,
        [ReportType.SPAM]: 0,
        [ReportType.MISINFORMATION]: 0,
        [ReportType.INAPPROPRIATE_CONTENT]: 0,
        [ReportType.COPYRIGHT]: 0,
        [ReportType.OTHER]: 0
      }

      reportsByType.forEach((item: any) => {
        reportsByTypeMap[item.type as ReportType] = item._count.type
      })

      const topReportedUsersMap = topReportedUsers
        .filter((item: any) => item.reportedUserId !== null)
        .map((item: any) => ({
          userId: item.reportedUserId as string,
          reportCount: item._count.reportedUserId
        }))

      return {
        totalReports,
        pendingReports,
        resolvedToday,
        reportsByType: reportsByTypeMap,
        topReportedUsers: topReportedUsersMap
      }

    } catch (error) {
      throw new ReportError(
        'Failed to generate report statistics',
        'STATS_FAILED',
        500
      )
    }
  }

  /**
   * Count total reports for a specific user
   * @param userId - User ID to count reports for
   * @returns Promise<number> - Number of reports against this user
   */
  async countByUser(userId: string): Promise<number> {
    try {
      return await this.prisma.report.count({
        where: { reportedUserId: userId }
      })
    } catch (error) {
      throw new ReportError(
        'Failed to count user reports',
        'COUNT_USER_FAILED',
        500
      )
    }
  }

  /**
   * Find all reports for a specific user with pagination
   * @param userId - User ID to find reports for
   * @param query - Optional query parameters for filtering and pagination
   * @returns Promise<PaginatedReports> - Paginated reports for this user
   */
  async findByReportedUser(userId: string, query: ReportQuery = {}): Promise<PaginatedReports> {
    return this.findMany({
      ...query,
      reportedUserId: userId
    })
  }

  /**
   * Find all reports for a specific post with pagination
   * @param postId - Post ID to find reports for
   * @param query - Optional query parameters for filtering and pagination
   * @returns Promise<PaginatedReports> - Paginated reports for this post
   */
  async findByReportedPost(postId: string, query: ReportQuery = {}): Promise<PaginatedReports> {
    return this.findMany({
      ...query,
      reportedPostId: postId
    })
  }

  /**
   * Map Prisma report object to Report interface
   * Handles type conversion and ensures consistent data structure across the application
   * @param prismaReport - Raw Prisma report object with relations
   * @returns Report - Clean report object matching interface
   */
  private mapPrismaToReport(prismaReport: any): Report {
    return {
      id: prismaReport.id,
      type: prismaReport.type as ReportType,
      description: prismaReport.description,
      status: prismaReport.status as ReportStatus,
      reportedUserId: prismaReport.reportedUserId || undefined,
      reportedPostId: prismaReport.reportedPostId || undefined,
      reporterId: prismaReport.reporterId || undefined,
      reporterActorId: prismaReport.reporterActorId || undefined,
      moderatorNotes: prismaReport.moderatorNotes || undefined,
      moderatorId: prismaReport.moderatorId || undefined,
      createdAt: prismaReport.createdAt,
      updatedAt: prismaReport.updatedAt
    }
  }
}

// backend/src/repositories/ReportRepository.ts
// Version: 1.0.0
// Complete ReportRepository implementation for content moderation system