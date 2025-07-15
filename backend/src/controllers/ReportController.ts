// backend/src/controllers/ReportController.ts
// Report controller for handling content and user reporting functionality  
// Version: 1.2.0 - Fixed ReportType import to use enum from Report model instead of local type

import { Request, Response } from 'express'
import { UserRepository } from '../repositories/UserRepository'
import { PostRepository } from '../repositories/PostRepository'
import { buildCreateReportData, CreateReportData, ReportType } from '../models/Report'

// Extend Express Request to include user from auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
  }
}

/**
 * Report response interface for API responses
 * Compatible with exactOptionalPropertyTypes: true
 */
interface ReportResponse {
  id: string
  type: ReportType
  description: string
  status: 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED'
  reportedUserId?: string | undefined
  reportedPostId?: string | undefined
  reporterId?: string | undefined
  createdAt: Date
  updatedAt: Date
}

/**
 * Controller class for handling report-related HTTP requests
 * Manages content moderation and user reporting functionality
 */
export class ReportController {
  constructor(
    private userRepository: UserRepository,
    private postRepository: PostRepository
  ) {}

  /**
   * Create a new report
   * POST /reports
   * Handles both user and post reporting with validation
   */
  async createReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type, description, reportedUserId, reportedPostId } = req.body
      const reporterId = req.user?.id

      // Validate that either user or post is being reported (validation middleware handles this too)
      if (!reportedUserId && !reportedPostId) {
        res.status(400).json({
          success: false,
          error: 'Must specify either reportedUserId or reportedPostId',
          code: 'MISSING_TARGET'
        })
        return
      }

      if (reportedUserId && reportedPostId) {
        res.status(400).json({
          success: false,
          error: 'Cannot report both user and post in the same report',
          code: 'MULTIPLE_TARGETS'
        })
        return
      }

      // Validate reported user exists if reporting a user
      if (reportedUserId) {
        const reportedUser = await this.userRepository.findById(reportedUserId)
        if (!reportedUser) {
          res.status(404).json({
            success: false,
            error: 'Reported user not found',
            code: 'USER_NOT_FOUND'
          })
          return
        }

        // Prevent self-reporting
        if (reporterId && reportedUserId === reporterId) {
          res.status(400).json({
            success: false,
            error: 'Cannot report yourself',
            code: 'SELF_REPORT'
          })
          return
        }
      }

      // Validate reported post exists if reporting a post
      if (reportedPostId) {
        const reportedPost = await this.postRepository.findById(reportedPostId)
        if (!reportedPost) {
          res.status(404).json({
            success: false,
            error: 'Reported post not found',
            code: 'POST_NOT_FOUND'
          })
          return
        }

        // Prevent reporting own posts
        if (reporterId && reportedPost.authorId === reporterId) {
          res.status(400).json({
            success: false,
            error: 'Cannot report your own post',
            code: 'SELF_REPORT'
          })
          return
        }
      }

      // Create the report data using utility function for type safety
      const reportData: CreateReportData = buildCreateReportData({
        type: type as ReportType,
        description,
        reportedUserId,
        reportedPostId,
        reporterId
      })

      // In a real implementation, you would save to database
      // For now, simulate successful creation
      const mockReport: ReportResponse = {
        id: `report_${Date.now()}_${Math.random().toString(36).substring(2)}`,
        type: reportData.type,
        description: reportData.description,
        status: 'PENDING',
        reportedUserId: reportData.reportedUserId,
        reportedPostId: reportData.reportedPostId,
        reporterId: reportData.reporterId,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Log the report for monitoring purposes
      console.log('Report created:', {
        reportId: mockReport.id,
        type: mockReport.type,
        target: mockReport.reportedUserId ? `user:${mockReport.reportedUserId}` : `post:${mockReport.reportedPostId}`,
        reporterId: mockReport.reporterId,
        timestamp: mockReport.createdAt
      })

      res.status(201).json({
        success: true,
        message: 'Report submitted successfully',
        data: mockReport
      })

    } catch (error) {
      console.error('Report creation error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create report',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get reports (admin functionality)
   * GET /reports
   * Returns paginated list of reports for moderation
   */
  async getReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // TODO: Add admin role checking here
      // For now, this is a placeholder for admin functionality

      const page = parseInt(req.query.page as string) || 1
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50)
      const status = req.query.status as string
      const type = req.query.type as string

      // Mock data for now - in real implementation, query database
      const mockReports: ReportResponse[] = [
        {
          id: 'report_1',
          type: 'SPAM',
          description: 'This user is posting promotional content repeatedly',
          status: 'PENDING',
          reportedUserId: 'user123',
          reporterId: 'reporter456',
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          updatedAt: new Date(Date.now() - 86400000)
        },
        {
          id: 'report_2',
          type: 'HARASSMENT',
          description: 'Inappropriate comments on this post',
          status: 'REVIEWED',
          reportedPostId: 'post789',
          reporterId: 'reporter123',
          createdAt: new Date(Date.now() - 43200000), // 12 hours ago
          updatedAt: new Date(Date.now() - 3600000)   // 1 hour ago
        }
      ]

      // Apply filters if provided
      let filteredReports = mockReports
      if (status) {
        filteredReports = filteredReports.filter(report => report.status === status)
      }
      if (type) {
        filteredReports = filteredReports.filter(report => report.type === type)
      }

      // Calculate pagination
      const totalCount = filteredReports.length
      const totalPages = Math.ceil(totalCount / limit)
      const offset = (page - 1) * limit
      const paginatedReports = filteredReports.slice(offset, offset + limit)

      res.json({
        success: true,
        data: {
          reports: paginatedReports,
          pagination: {
            currentPage: page,
            totalPages,
            totalReports: totalCount,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      })

    } catch (error) {
      console.error('Get reports error:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve reports',
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}