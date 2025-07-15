// backend\src\types\Report.ts
// Version: 1.0
// Initial Report type definitions and enums

/**
 * Enumeration of possible report types
 * Used to categorize different kinds of reports in the system
 */
export enum ReportType {
  SPAM = 'spam',
  HARASSMENT = 'harassment', 
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  COPYRIGHT_VIOLATION = 'copyright_violation',
  MISINFORMATION = 'misinformation',
  HATE_SPEECH = 'hate_speech',
  VIOLENCE = 'violence',
  NUDITY = 'nudity',
  SELF_HARM = 'self_harm',
  OTHER = 'other'
}

/**
 * Enumeration of possible report statuses
 * Tracks the lifecycle of a report through the moderation process
 */
export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  ESCALATED = 'escalated'
}

/**
 * Base interface for a report entity
 * Contains all fields that define a report in the system
 */
export interface Report {
  id: string
  type: ReportType
  description: string
  status: ReportStatus
  reportedUserId?: string
  reportedPostId?: string
  reporterId?: string
  reporterActorId?: string
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  resolvedBy?: string
  moderatorNotes?: string
}

/**
 * Interface for creating a new report
 * Excludes auto-generated fields like id, timestamps, and status
 */
export interface CreateReportData {
  type: ReportType
  description: string
  reportedUserId?: string
  reportedPostId?: string
  reporterId?: string
  reporterActorId?: string
}

/**
 * Interface for updating an existing report
 * All fields are optional to allow partial updates
 */
export interface UpdateReportData {
  type?: ReportType
  description?: string
  status?: ReportStatus
  moderatorNotes?: string
  resolvedBy?: string
  resolvedAt?: Date
}

/**
 * Interface for filtering reports in queries
 * Used for search and listing operations
 */
export interface ReportFilters {
  type?: ReportType
  status?: ReportStatus
  reporterId?: string
  reportedUserId?: string
  reportedPostId?: string
  createdAfter?: Date
  createdBefore?: Date
  resolvedBy?: string
}

/**
 * Interface for report statistics and analytics
 * Used for dashboard and reporting features
 */
export interface ReportStats {
  totalReports: number
  pendingReports: number
  resolvedReports: number
  dismissedReports: number
  reportsByType: Record<ReportType, number>
  reportsByStatus: Record<ReportStatus, number>
  averageResolutionTime: number
}