// backend/src/models/Report.ts
// Report model and repository for content moderation system using Prisma ORM
// Version: 2.4.0 - Added utility function for exactOptionalPropertyTypes compatibility
//
// SETUP INSTRUCTIONS:
// 1. Add the Report model and enums to your schema.prisma file (see bottom of this file)
// 2. Run: npm run db:generate
// 3. Run: npm run db:push
// 4. Then this repository will work with full type safety

import { PrismaClient, Prisma } from '@prisma/client'

/**
 * Enum for report types to ensure type safety
 * Note: These should match the Prisma schema enums exactly
 */
export enum ReportType {
  HARASSMENT = 'HARASSMENT',
  SPAM = 'SPAM', 
  MISINFORMATION = 'MISINFORMATION',
  INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
  COPYRIGHT = 'COPYRIGHT',
  OTHER = 'OTHER'
}

/**
 * Enum for report status to track moderation progress
 * Note: These should match the Prisma schema enums exactly
 */
export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED'
}

/**
 * Alternative: Use Prisma-generated types (uncomment these after running db:generate)
 * This ensures perfect type compatibility but requires schema to be generated first
 */
// export { ReportType, ReportStatus } from '@prisma/client'

/**
 * Core report entity interface
 * Represents a report submitted for moderation
 */
export interface Report {
  id: string
  type: ReportType
  description: string
  status: ReportStatus
  reportedUserId?: string // Optional - report targets a user
  reportedPostId?: string // Optional - report targets a post
  reporterId?: string // Optional - anonymous reports allowed for federation
  reporterActorId?: string // Optional - federated actor who submitted report
  moderatorNotes?: string // Optional - admin notes on moderation decision
  moderatorId?: string // Optional - which moderator handled the report
  createdAt: Date
  updatedAt: Date
}

/**
 * Interface for creating new reports
 * Omits auto-generated fields like id, timestamps, status
 * Compatible with exactOptionalPropertyTypes: true
 */
export interface CreateReportData {
  type: ReportType
  description: string
  reportedUserId?: string | undefined
  reportedPostId?: string | undefined
  reporterId?: string | undefined
  reporterActorId?: string | undefined
}

/**
 * Utility function to build CreateReportData with proper optional handling
 * Compatible with exactOptionalPropertyTypes: true
 */
export function buildCreateReportData(data: {
  type: ReportType
  description: string
  reportedUserId?: string
  reportedPostId?: string
  reporterId?: string
  reporterActorId?: string
}): CreateReportData {
  const result: CreateReportData = {
    type: data.type,
    description: data.description
  }

  // Only include optional properties if they have values
  if (data.reportedUserId) {
    result.reportedUserId = data.reportedUserId
  }
  
  if (data.reportedPostId) {
    result.reportedPostId = data.reportedPostId
  }
  
  if (data.reporterId) {
    result.reporterId = data.reporterId
  }
  
  if (data.reporterActorId) {
    result.reporterActorId = data.reporterActorId
  }

  return result
}

/**
 * Interface for updating report status during moderation
 * Only allows updating moderation-related fields
 * Compatible with exactOptionalPropertyTypes: true
 */
export interface UpdateReportData {
  status: ReportStatus
  moderatorNotes?: string | undefined
  moderatorId?: string | undefined
}

/**
 * Interface for report pagination and filtering
 */
export interface ReportQuery {
  page?: number
  limit?: number
  status?: ReportStatus
  type?: ReportType
  reportedUserId?: string
  reportedPostId?: string // Added missing property for post-based filtering
  reporterId?: string
}

/**
 * Interface for paginated report results
 */
export interface PaginatedReports {
  reports: Report[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Interface for report statistics used in admin dashboards
 */
export interface ReportStatistics {
  totalReports: number
  pendingReports: number
  resolvedToday: number
  reportsByType: Record<ReportType, number>
  topReportedUsers: Array<{
    userId: string
    reportCount: number
  }>
}

/**
 * Custom error class for report-related operations
 */
export class ReportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message)
    this.name = 'ReportError'
  }
}

/**
 * Repository interface defining all report data operations
 * Follows repository pattern for clean separation of concerns
 */
export interface ReportRepositoryInterface {
  create(data: CreateReportData): Promise<Report>
  findById(id: string): Promise<Report | null>
  findMany(query: ReportQuery): Promise<PaginatedReports>
  updateStatus(id: string, data: UpdateReportData): Promise<Report>
  delete(id: string): Promise<boolean>
  getStatistics(): Promise<ReportStatistics>
  countByUser(userId: string): Promise<number>
  findByReportedUser(userId: string, query?: ReportQuery): Promise<PaginatedReports>
  findByReportedPost(postId: string, query?: ReportQuery): Promise<PaginatedReports>
}

/**
 * Prisma implementation of the report repository
 * Handles all database operations for reports with proper error handling
 * 
 * Note: Uses 'any' types temporarily until Report model is added to schema.prisma
 * After adding the schema and running db:generate, you can replace 'any' with proper Prisma types
 */
export class ReportRepository implements ReportRepositoryInterface {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new report in the database
   * Validates required fields and generates unique ID
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

      // Create the report using Prisma with defensive typing
      // Note: Using any type until Report model is added to schema
      const createData: any = {
        type: data.type,
        description: data.description,
        status: 'PENDING'
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

      const report = await this.prisma.report.create({
        data: createData
      })

      return this.mapPrismaToReport(report)

    } catch (error) {
      if (error instanceof ReportError) {
        throw error
      }
      
      // Handle Prisma-specific errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new ReportError(
          'Database constraint violation',
          'CONSTRAINT_ERROR',
          400
        )
      }

      throw new ReportError(
        'Failed to create report',
        'CREATE_FAILED',
        500
      )
    }
  }

  /**
   * Find a specific report by ID
   * Returns null if not found
   */
  async findById(id: string): Promise<Report | null> {
    try {
      const report = await this.prisma.report.findUnique({
        where: { id }
      })

      return report ? this.mapPrismaToReport(report) : null

    } catch (error) {
      throw new ReportError(
        'Failed to find report',
        'FIND_FAILED',
        500
      )
    }
  }

  /**
   * Find multiple reports with pagination and filtering
   * Supports filtering by status, type, and other criteria
   */
  async findMany(query: ReportQuery = {}): Promise<PaginatedReports> {
    try {
      const page = query.page || 1
      const limit = Math.min(query.limit || 20, 50) // Max 50 per page
      const skip = (page - 1) * limit

      // Build where clause based on filters with defensive typing
      // Note: Cast to any to handle case where Report model isn't in schema yet
      const where: any = {}

      if (query.status) {
        where.status = query.status
      }

      if (query.type) {
        where.type = query.type
      }

      if (query.reportedUserId) {
        where.reportedUserId = query.reportedUserId
      }

      if (query.reportedPostId) {
        where.reportedPostId = query.reportedPostId
      }

      if (query.reporterId) {
        where.reporterId = query.reporterId
      }

      // Get total count and reports in parallel
      const [total, reports] = await Promise.all([
        this.prisma.report.count({ where }),
        this.prisma.report.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        })
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        reports: reports.map(report => this.mapPrismaToReport(report)),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }

    } catch (error) {
      throw new ReportError(
        'Failed to fetch reports',
        'FETCH_FAILED',
        500
      )
    }
  }

  /**
   * Update report status and moderation notes
   * Used by moderators to process reports
   */
  async updateStatus(id: string, data: UpdateReportData): Promise<Report> {
    try {
      // Build update data object with only defined values
      const updateData: any = {
        status: data.status,
        updatedAt: new Date()
      }

      // Only include optional fields if they have values
      if (data.moderatorNotes !== undefined) {
        updateData.moderatorNotes = data.moderatorNotes
      }
      
      if (data.moderatorId !== undefined) {
        updateData.moderatorId = data.moderatorId
      }

      const updatedReport = await this.prisma.report.update({
        where: { id },
        data: updateData
      })

      return this.mapPrismaToReport(updatedReport)

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new ReportError(
            'Report not found',
            'NOT_FOUND',
            404
          )
        }
      }

      throw new ReportError(
        'Failed to update report',
        'UPDATE_FAILED',
        500
      )
    }
  }

  /**
   * Delete a report by ID
   * Returns true if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.report.delete({
        where: { id }
      })
      return true

    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return false // Record not found
        }
      }

      throw new ReportError(
        'Failed to delete report',
        'DELETE_FAILED',
        500
      )
    }
  }

  /**
   * Get comprehensive statistics for admin dashboard
   * Includes counts by type, status, and trending data
   * Note: Uses defensive typing until Report model is added to schema
   */
  async getStatistics(): Promise<ReportStatistics> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Execute multiple queries in parallel for better performance
      const [
        totalReports,
        pendingReports,
        resolvedToday
      ] = await Promise.all([
        // Total reports count
        this.prisma.report.count(),

        // Pending reports count
        this.prisma.report.count({
          where: { status: 'PENDING' }
        }),

        // Reports resolved today
        this.prisma.report.count({
          where: {
            status: { 
              in: ['RESOLVED', 'DISMISSED'] 
            },
            updatedAt: { gte: today }
          }
        })
      ])

      // Get reports grouped by type using raw query (more defensive)
      // Note: After adding Report model to schema, you can use this instead:
      // const reportsByType = await this.prisma.report.groupBy({
      //   by: ['type'],
      //   _count: { type: true }
      // })
      const reportsByTypeRaw = await this.prisma.$queryRaw`
        SELECT type, COUNT(*) as count 
        FROM reports 
        GROUP BY type
      ` as Array<{ type: string; count: bigint }>

      // Get top reported users using raw query (more defensive)
      // Note: After adding Report model to schema, you can use this instead:
      // const topReportedUsers = await this.prisma.report.groupBy({
      //   by: ['reportedUserId'],
      //   where: { reportedUserId: { not: null } },
      //   _count: { reportedUserId: true },
      //   orderBy: { _count: { reportedUserId: 'desc' } },
      //   take: 10
      // })
      const topReportedUsersRaw = await this.prisma.$queryRaw`
        SELECT reportedUserId as userId, COUNT(*) as count 
        FROM reports 
        WHERE reportedUserId IS NOT NULL 
        GROUP BY reportedUserId 
        ORDER BY count DESC 
        LIMIT 10
      ` as Array<{ userId: string; count: bigint }>

      // Build reportsByType object with all types initialized to 0
      const reportsByTypeMap: Record<ReportType, number> = {
        [ReportType.HARASSMENT]: 0,
        [ReportType.SPAM]: 0,
        [ReportType.MISINFORMATION]: 0,
        [ReportType.INAPPROPRIATE_CONTENT]: 0,
        [ReportType.COPYRIGHT]: 0,
        [ReportType.OTHER]: 0
      }

      // Fill in actual counts from raw query results
      reportsByTypeRaw.forEach(item => {
        const type = item.type as ReportType
        if (type in reportsByTypeMap) {
          reportsByTypeMap[type] = Number(item.count)
        }
      })

      // Map top reported users from raw query results
      const topReportedUsersMap = topReportedUsersRaw.map(item => ({
        userId: item.userId,
        reportCount: Number(item.count)
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
        'Failed to get statistics',
        'STATS_FAILED',
        500
      )
    }
  }

  /**
   * Count total reports for a specific user
   * Useful for identifying frequently reported users
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
   * Find all reports for a specific user
   * Used for admin user management
   */
  async findByReportedUser(userId: string, query: ReportQuery = {}): Promise<PaginatedReports> {
    return this.findMany({
      ...query,
      reportedUserId: userId
    })
  }

  /**
   * Find all reports for a specific post
   * Used for content moderation
   */
  async findByReportedPost(postId: string, query: ReportQuery = {}): Promise<PaginatedReports> {
    return this.findMany({
      ...query,
      reportedPostId: postId
    })
  }

  /**
   * Map Prisma report object to Report interface
   * Handles type conversion and ensures consistent data structure
   */
  private mapPrismaToReport(prismaReport: any): Report {
    return {
      id: prismaReport.id,
      type: prismaReport.type as ReportType,
      description: prismaReport.description,
      status: prismaReport.status as ReportStatus,
      reportedUserId: prismaReport.reportedUserId,
      reportedPostId: prismaReport.reportedPostId,
      reporterId: prismaReport.reporterId,
      reporterActorId: prismaReport.reporterActorId,
      moderatorNotes: prismaReport.moderatorNotes,
      moderatorId: prismaReport.moderatorId,
      createdAt: prismaReport.createdAt,
      updatedAt: prismaReport.updatedAt
    }
  }
}

/**
 * Prisma schema for reports table
 * Add this to your schema.prisma file
 * 
 * SETUP STEPS:
 * 1. Copy the enums and model below to your schema.prisma file
 * 2. Add the relations to your existing User and Post models (shown below)
 * 3. Run: npm run db:generate
 * 4. Run: npm run db:push
 * 5. After setup, you can optionally replace the custom enums in this file with:
 *    export { ReportType, ReportStatus } from '@prisma/client'
 * 
 * REQUIRED ADDITIONS TO EXISTING MODELS:
 * 
 * model User {
 *   // ... your existing fields ...
 *   
 *   // Add these new relations for reports
 *   reportsAgainst    Report[]     @relation("ReportedUser")
 *   reportsSubmitted  Report[]     @relation("ReporterUser") 
 *   reportsModerated  Report[]     @relation("ModeratorUser")
 * }
 * 
 * model Post {
 *   // ... your existing fields ...
 *   
 *   // Add this new relation for reports
 *   reports           Report[]     @relation("ReportedPost")
 * }
 */
export const reportsPrismaSchema = `
// Add these enums at the top level of your schema.prisma
enum ReportType {
  HARASSMENT
  SPAM
  MISINFORMATION
  INAPPROPRIATE_CONTENT
  COPYRIGHT
  OTHER
}

enum ReportStatus {
  PENDING
  REVIEWED
  RESOLVED
  DISMISSED
}

// Add this model to your schema.prisma
model Report {
  id                String         @id @default(cuid())
  type              ReportType     // Uses the enum above
  description       String
  status            ReportStatus   @default(PENDING) // Uses the enum above
  reportedUserId    String?        // Optional - can report content without user
  reportedPostId    String?        // Optional - can report user without specific post
  reporterId        String?        // Optional - allows anonymous reports for federation
  reporterActorId   String?        // Optional - ActivityPub actor who reported
  moderatorNotes    String?        // Optional - added during moderation
  moderatorId       String?        // Optional - admin who processed the report
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  // Relationships
  reportedUser      User?          @relation("ReportedUser", fields: [reportedUserId], references: [id], onDelete: Cascade)
  reportedPost      Post?          @relation("ReportedPost", fields: [reportedPostId], references: [id], onDelete: Cascade)
  reporter          User?          @relation("ReporterUser", fields: [reporterId], references: [id], onDelete: SetNull)
  moderator         User?          @relation("ModeratorUser", fields: [moderatorId], references: [id], onDelete: SetNull)

  @@map("reports")
  @@index([status])
  @@index([type])
  @@index([reportedUserId])
  @@index([reportedPostId])
  @@index([createdAt])
}
`