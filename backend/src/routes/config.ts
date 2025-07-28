// Path: backend/src/routes/config.ts
// Version: 1.2.0
// Updated to match project structure - simple router export

import { Request, Response, Router } from 'express'

// Define the configuration interface
interface AppConfig {
  appName: string
  version: string
  environment: string
  features: {
    registration: boolean
    socialLogin: boolean
    emailVerification: boolean
  }
  api: {
    baseUrl: string
    timeout: number
  }
}

// Create Express router
const configRouter = Router()

/**
 * GET /config
 * Returns application configuration data
 */
configRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Define the application configuration
    const config: AppConfig = {
      appName: 'ParaSocial',
      version: '1.0.0',
      environment: process.env['NODE_ENV'] || 'development',
      features: {
        registration: true,
        socialLogin: false,
        emailVerification: false
      },
      api: {
        baseUrl: process.env['API_BASE_URL'] || 'http://localhost:3001/api',
        timeout: 30000
      }
    }

    // Set cache headers
    res.set({
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
    })

    // Return the configuration as JSON
    res.status(200).json(config)
  } catch (error) {
    // Log the error for debugging
    console.error('Error in config API route:', error)
    
    // Return an error response
    res.status(500).json({ error: 'Failed to load configuration' })
  }
})

// Export the router as default
export default configRouter

// Path: backend/src/routes/config.ts
// Version: 1.2.0
// Updated to match project structure - simple router export