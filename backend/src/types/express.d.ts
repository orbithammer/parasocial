// backend/src/types/express.d.ts
// Version: 1.0.0 - Global Express Request type augmentation
// Added: User property to Express Request interface for authentication middleware

/**
 * Global augmentation of Express Request interface
 * Adds user property that gets populated by authentication middleware
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * User object populated by authentication middleware
       * Contains authenticated user information from JWT token
       */
      user?: {
        id: string
        email: string
        username: string
      }
    }
  }
}

/**
 * Export statement to make this file a module
 * Required for global declaration augmentation to work
 */
export {}export {}
