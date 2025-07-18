// backend/src/routes/reports.ts
// Express routes for report/moderation operations using TypeScript
// Version: 1.0.2 - Fixed all unused req parameter warnings
// Changed: Prefixed unused req parameters with underscore in rate limiting and stats endpoint

import { Router, Request, Response, NextFunction } from 'express'
import { ReportController } from '../controllers/ReportController'
import { validateCreateReport } from '../middleware/mediaModerationValidationMiddleware'
import { rateLimit } from 'express-rate-limit'

// Middleware function type
type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>

// Dependencies interface for dependency injection
interface ReportsRouterDependencies {
  reportController: ReportController
  authMiddleware: MiddlewareFunction
  optionalAuthMiddleware: MiddlewareFunction
}

// ============================================================================
// RATE LIMITING CONFIGURATION
// ============================================================================

/**
 * Rate limiting for report creation
 * More restrictive to prevent spam reporting
 */
const reportCreationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 reports per window
  message: {
    success: false,
    error: 'Too many reports submitted. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for authenticated admin users (TODO: implement admin check)
  skip: (_req) => { // FIXED: prefixed with underscore
    // TODO: Add admin role check here
    return false
  }
})

/**
 * Rate limiting for admin report management
 * Less restrictive for legitimate moderation work
 */
const reportManagementRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes  
  max: 50, // 50 requests per window
  message: {
    success: false,
    error: 'Too many moderation requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
})

/**
 * Create reports router with dependency injection
 * Handles content and user reporting for moderation
 * @param dependencies - Injected dependencies
 * @returns Configured Express router
 */
export function createReportsRouter(dependencies: ReportsRouterDependencies): Router {
  const { reportController, authMiddleware, optionalAuthMiddleware } = dependencies
  const router = Router()

  // ============================================================================
  // PUBLIC REPORT SUBMISSION
  // ============================================================================

  /**
   * POST /reports
   * Submit a new report for content or user
   * Supports both authenticated users and external ActivityPub actors
   * 
   * Body:
   * {
   *   "type": "HARASSMENT" | "SPAM" | "MISINFORMATION" | "INAPPROPRIATE_CONTENT" | "COPYRIGHT" | "OTHER",
   *   "description": "Detailed description (10-1000 chars)",
   *   "reportedUserId": "user_id", // either this
   *   "reportedPostId": "post_id"  // or this, but not both
   * }
   */
  router.post('/',
    reportCreationRateLimit,
    optionalAuthMiddleware, // Optional auth allows federated users to report
    validateCreateReport,   // Apply validation middleware
    async (req: Request, res: Response) => {
      await reportController.createReport(req, res)
    }
  )

  // ============================================================================
  // ADMIN/MODERATOR ENDPOINTS
  // ============================================================================

  /**
   * GET /reports
   * Get paginated list of reports for moderation
   * Requires authentication (TODO: add admin role check)
   * 
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 20, max: 50)
   * - status: Filter by status (PENDING, REVIEWED, RESOLVED, DISMISSED)
   * - type: Filter by report type
   */
  router.get('/',
    reportManagementRateLimit,
    authMiddleware, // TODO: Replace with admin middleware when implemented
    async (req: Request, res: Response) => {
      await reportController.getReports(req, res)
    }
  )

  /**
   * GET /reports/:id
   * Get specific report by ID for detailed moderation
   * Requires authentication (TODO: add admin role check)
   */
  router.get('/:id',
    reportManagementRateLimit,
    authMiddleware, // TODO: Replace with admin middleware when implemented
    async (req: Request, res: Response) => {
      await reportController.getReportById(req, res)
    }
  )

  /**
   * PUT /reports/:id
   * Update report status and add moderation notes
   * Requires authentication (TODO: add admin role check)
   * 
   * Body:
   * {
   *   "status": "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED",
   *   "moderatorNotes": "Optional notes about the moderation decision"
   * }
   */
  router.put('/:id',
    reportManagementRateLimit,
    authMiddleware, // TODO: Replace with admin middleware when implemented
    async (req: Request, res: Response) => {
      await reportController.updateReportStatus(req, res)
    }
  )

  // ============================================================================
  // STATISTICS ENDPOINTS (FUTURE)
  // ============================================================================

  /**
   * GET /reports/stats
   * Get report statistics for admin dashboard
   * Currently returns placeholder data
   */
  router.get('/stats',
    reportManagementRateLimit,
    authMiddleware, // TODO: Replace with admin middleware when implemented
    async (_req: Request, res: Response) => { // ← FIXED: prefixed with underscore
      // TODO: Implement real statistics
      res.json({
        success: true,
        data: {
          totalReports: 42,
          pendingReports: 15,
          resolvedToday: 8,
          reportsByType: {
            SPAM: 18,
            HARASSMENT: 12,
            MISINFORMATION: 8,
            INAPPROPRIATE_CONTENT: 3,
            COPYRIGHT: 1,
            OTHER: 0
          },
          topReportedUsers: [
            { userId: 'user123', reportCount: 5 },
            { userId: 'user456', reportCount: 3 }
          ]
        }
      })
    }
  )

  return router
}

/**
 * Export default router for backward compatibility
 * This allows importing as either named export or default
 */
export default createReportsRouter