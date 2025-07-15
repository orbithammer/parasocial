// backend\src\controllers\ReportController.ts
// Version: 1.1
// Fixed exactOptionalPropertyTypes compatibility and improved type handling

import { Request, Response } from 'express'
import { ReportType, CreateReportData } from '../types/Report'

// Interface for creating a new report from request body
interface CreateReportRequest {
  type: ReportType
  description: string
  reportedUserId?: string
  reportedPostId?: string
  reporterId?: string
  reporterActorId?: string
}

export class ReportController {
  /**
   * Creates a new report with proper type validation
   * @param req - Express request object containing report data
   * @param res - Express response object
   */
  async createReport(req: Request, res: Response): Promise<void> {
    try {
      const { type, description, reportedUserId, reportedPostId, reporterId, reporterActorId } = req.body as CreateReportRequest
      
      // Validate required fields
      if (!type || !description) {
        res.status(400).json({ error: 'Type and description are required' })
        return
      }

      // Validate that either reportedUserId or reportedPostId is provided
      if (!reportedUserId && !reportedPostId) {
        res.status(400).json({ error: 'Either reportedUserId or reportedPostId must be provided' })
        return
      }

      // Create validated report data with proper types - only include defined values
      const validatedReportData: CreateReportData = {
        type,
        description: String(description)
      }

      // Only add optional properties if they have values
      if (reportedUserId) {
        validatedReportData.reportedUserId = String(reportedUserId)
      }
      
      if (reportedPostId) {
        validatedReportData.reportedPostId = String(reportedPostId)
      }
      
      if (reporterId) {
        validatedReportData.reporterId = String(reporterId)
      }
      
      if (reporterActorId) {
        validatedReportData.reporterActorId = String(reporterActorId)
      }

      // TODO: Replace with actual database save operation
      // const savedReport = await ReportService.create(validatedReportData)
      
      res.status(201).json({ 
        message: 'Report created successfully',
        report: validatedReportData 
      })
    } catch (error) {
      console.error('Error creating report:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Retrieves reports with optional filtering
   * @param req - Express request object with query parameters
   * @param res - Express response object
   */
  async getReports(req: Request, res: Response): Promise<void> {
    try {
      const { type, reporterId } = req.query

      // Build filter object with proper types - only include defined values
      const filters: Partial<CreateReportData> = {}
      
      if (type && typeof type === 'string') {
        filters.type = type as ReportType
      }
      
      if (reporterId && typeof reporterId === 'string') {
        filters.reporterId = reporterId
      }

      // TODO: Replace with actual database query
      // const reports = await ReportService.findByFilters(filters)
      
      res.status(200).json({ 
        message: 'Reports retrieved successfully',
        filters,
        reports: [] // Placeholder until database integration
      })
    } catch (error) {
      console.error('Error retrieving reports:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  /**
   * Updates report status (e.g., pending, resolved, dismissed)
   * @param req - Express request object with report ID and status
   * @param res - Express response object
   */
  async updateReportStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { status } = req.body

      // Validate required fields
      if (!id || !status) {
        res.status(400).json({ error: 'Report ID and status are required' })
        return
      }

      // TODO: Replace with actual database update operation
      // const updatedReport = await ReportService.updateStatus(id, status)
      
      res.status(200).json({ 
        message: 'Report status updated successfully',
        reportId: id,
        newStatus: status
      })
    } catch (error) {
      console.error('Error updating report status:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}