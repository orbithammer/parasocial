// backend/src/utils/constants.ts
// Version: 1.0.0 - Initial implementation of centralized application constants
// Centralized constants for the social media backend application

// ============================================================================
// POST CONSTANTS
// ============================================================================

/**
 * Maximum length for post content in characters
 * Used in post validation middleware and content creation
 */
export const MAX_CONTENT_LENGTH = 5000

/**
 * Maximum length for content warning text in characters
 * Used for content moderation and user safety features
 */
export const MAX_CONTENT_WARNING_LENGTH = 280

/**
 * Maximum number of media attachments per post
 * Prevents spam and maintains reasonable post size
 */
export const MAX_MEDIA_ATTACHMENTS = 4

/**
 * Regular expression for validating post IDs
 * Allows alphanumeric characters, hyphens, and underscores
 */
export const POST_ID_REGEX = /^[a-zA-Z0-9_-]+$/

// ============================================================================
// USER CONSTANTS
// ============================================================================

/**
 * Minimum username length in characters
 * Ensures usernames are long enough to be meaningful
 */
export const MIN_USERNAME_LENGTH = 3

/**
 * Maximum username length in characters
 * Prevents excessively long usernames in UI
 */
export const MAX_USERNAME_LENGTH = 30

/**
 * Maximum email address length in characters
 * Based on RFC 5321 standard
 */
export const MAX_EMAIL_LENGTH = 254

/**
 * Maximum display name length in characters
 * For user profile display names
 */
export const MAX_DISPLAY_NAME_LENGTH = 50

/**
 * Maximum biography length in characters
 * For user profile biography/description
 */
export const MAX_BIO_LENGTH = 500

/**
 * Regular expression for validating usernames
 * Allows letters, numbers, and underscores only
 */
export const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/

// ============================================================================
// FOLLOW RELATIONSHIP CONSTANTS
// ============================================================================

/**
 * Maximum number of users one user can follow
 * Prevents spam and maintains reasonable social graph size
 */
export const MAX_FOLLOWING_COUNT = 7500

/**
 * Maximum number of followers a user can have
 * Set high to allow popular accounts but prevent system abuse
 */
export const MAX_FOLLOWERS_COUNT = 1000000

/**
 * Minimum time between follow requests to same user (in milliseconds)
 * 5 minutes - prevents rapid follow/unfollow spam
 */
export const MIN_FOLLOW_INTERVAL = 1000 * 60 * 5

/**
 * Maximum length of federated domain name
 * For ActivityPub federation with other instances
 */
export const MAX_DOMAIN_LENGTH = 255

// ============================================================================
// FILE UPLOAD CONSTANTS
// ============================================================================

/**
 * Maximum file size for general uploads (50MB in bytes)
 * For media attachments and general file uploads
 */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/**
 * Maximum file size for user avatar images (5MB in bytes)
 * Smaller limit for profile pictures to optimize loading
 */
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024

/**
 * Maximum file size for profile header images (10MB in bytes)
 * Moderate limit for header banners
 */
export const MAX_HEADER_SIZE = 10 * 1024 * 1024

/**
 * Allowed MIME types for image uploads
 * Common web-safe image formats
 */
export const ALLOWED_IMAGE_TYPES: readonly string[] = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
] as const

/**
 * Allowed MIME types for all media uploads
 * Includes images, videos, and audio files
 */
export const ALLOWED_MEDIA_TYPES: readonly string[] = [
  ...ALLOWED_IMAGE_TYPES,
  'video/mp4',
  'video/webm',
  'video/ogg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/mpeg'
] as const

// ============================================================================
// RATE LIMITING CONSTANTS
// ============================================================================

/**
 * Default rate limit window duration (15 minutes in milliseconds)
 * Standard window for most API endpoints
 */
export const DEFAULT_RATE_LIMIT_WINDOW = 15 * 60 * 1000

/**
 * Default maximum requests per rate limit window
 * General limit for most API endpoints
 */
export const DEFAULT_RATE_LIMIT_MAX = 100

/**
 * Maximum authentication attempts per window
 * Stricter limit for login/register endpoints to prevent brute force
 */
export const AUTH_RATE_LIMIT_MAX = 5

/**
 * Maximum post creation requests per window
 * Prevents spam posting while allowing normal usage
 */
export const POST_RATE_LIMIT_MAX = 10

/**
 * Maximum media upload requests per window
 * Stricter limit for resource-intensive operations
 */
export const MEDIA_UPLOAD_RATE_LIMIT_MAX = 10

/**
 * Maximum follow operations per window
 * Prevents follow/unfollow spam
 */
export const FOLLOW_RATE_LIMIT_MAX = 20

/**
 * Rate limit window for follow operations (1 hour in milliseconds)
 * Longer window for follow operations to prevent abuse
 */
export const FOLLOW_RATE_LIMIT_WINDOW = 60 * 60 * 1000

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

/**
 * JWT access token expiry time
 * Short-lived tokens for security
 */
export const JWT_EXPIRY_TIME = '15m'

/**
 * Refresh token expiry time
 * Longer-lived for user convenience
 */
export const REFRESH_TOKEN_EXPIRY = '7d'

/**
 * Minimum password length in characters
 * Security requirement for user passwords
 */
export const PASSWORD_MIN_LENGTH = 8

/**
 * Maximum password length in characters
 * Prevents DoS attacks from extremely long passwords
 */
export const PASSWORD_MAX_LENGTH = 128

/**
 * Number of salt rounds for bcrypt password hashing
 * Balance between security and performance
 */
export const BCRYPT_SALT_ROUNDS = 12

/**
 * Session cookie name for authentication
 * Used for session management
 */
export const SESSION_COOKIE_NAME = 'session'

/**
 * CSRF token header name
 * For CSRF protection
 */
export const CSRF_TOKEN_HEADER = 'X-CSRF-Token'

// ============================================================================
// ACTIVITYPUB FEDERATION CONSTANTS
// ============================================================================

/**
 * ActivityPub JSON-LD context URL
 * Standard context for ActivityPub activities
 */
export const ACTIVITYPUB_CONTEXT = 'https://www.w3.org/ns/activitystreams'

/**
 * Maximum size for ActivityPub activities (1MB in bytes)
 * Prevents abuse while allowing reasonable content
 */
export const MAX_ACTIVITY_SIZE = 1 * 1024 * 1024

/**
 * Timeout for federation HTTP requests (30 seconds in milliseconds)
 * Reasonable timeout for network requests to other instances
 */
export const FEDERATION_TIMEOUT = 30 * 1000

/**
 * Maximum number of retries for federation requests
 * Retry failed federation attempts with exponential backoff
 */
export const FEDERATION_MAX_RETRIES = 3

/**
 * ActivityPub actor type for users
 * Standard ActivityPub actor type
 */
export const ACTIVITYPUB_ACTOR_TYPE = 'Person'

/**
 * Regular expression for validating ActivityPub activity IDs
 * Must be valid HTTPS URLs
 */
export const ACTIVITY_ID_REGEX = /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/.*$/

// ============================================================================
// PAGINATION CONSTANTS
// ============================================================================

/**
 * Default number of items per page
 * Standard pagination size for API responses
 */
export const DEFAULT_PAGE_SIZE = 20

/**
 * Maximum number of items per page
 * Prevents excessive data transfer in single request
 */
export const MAX_PAGE_SIZE = 100

/**
 * Minimum page number (1-indexed)
 * Pages start at 1, not 0
 */
export const MIN_PAGE_NUMBER = 1

/**
 * Maximum page number
 * Reasonable limit to prevent abuse
 */
export const MAX_PAGE_NUMBER = 1000

// ============================================================================
// DATABASE CONSTANTS
// ============================================================================

/**
 * Maximum database connection pool size
 * Limits concurrent database connections
 */
export const DB_MAX_CONNECTIONS = 20

/**
 * Database connection timeout (30 seconds in milliseconds)
 * Timeout for database operations
 */
export const DB_CONNECTION_TIMEOUT = 30 * 1000

/**
 * Database query timeout (10 seconds in milliseconds)
 * Timeout for individual database queries
 */
export const DB_QUERY_TIMEOUT = 10 * 1000

// ============================================================================
// HTTP STATUS CODES
// ============================================================================

/**
 * Common HTTP status codes used throughout the application
 * Centralized for consistency
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const

// ============================================================================
// APPLICATION METADATA
// ============================================================================

/**
 * API version string
 * Used in API routes and responses
 */
export const API_VERSION = 'v1'

/**
 * Application name
 * Used in various places throughout the application
 */
export const APP_NAME = 'SocialMedia'

/**
 * Supported API content types
 * MIME types the API can handle
 */
export const SUPPORTED_CONTENT_TYPES: readonly string[] = [
  'application/json',
  'application/ld+json',
  'application/activity+json'
] as const

// ============================================================================
// ENVIRONMENT CONSTANTS
// ============================================================================

/**
 * Valid environment values
 * Supported deployment environments
 */
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  TESTING: 'test',
  STAGING: 'staging',
  PRODUCTION: 'production'
} as const

/**
 * Default environment if not specified
 */
export const DEFAULT_ENVIRONMENT = ENVIRONMENTS.DEVELOPMENT

// ============================================================================
// VALIDATION ERROR MESSAGES
// ============================================================================

/**
 * Common validation error messages
 * Centralized for consistency across the application
 */
export const VALIDATION_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_USERNAME: 'Username can only contain letters, numbers, and underscores',
  PASSWORD_TOO_SHORT: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  PASSWORD_TOO_LONG: `Password must be less than ${PASSWORD_MAX_LENGTH} characters`,
  CONTENT_TOO_LONG: `Content must be less than ${MAX_CONTENT_LENGTH} characters`,
  INVALID_FILE_TYPE: 'File type not supported',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later'
} as const

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Type for environment values
 */
export type Environment = typeof ENVIRONMENTS[keyof typeof ENVIRONMENTS]

/**
 * Type for HTTP status codes
 */
export type HttpStatusCode = typeof HTTP_STATUS[keyof typeof HTTP_STATUS]

/**
 * Type for allowed image MIME types
 */
export type AllowedImageType = typeof ALLOWED_IMAGE_TYPES[number]

/**
 * Type for allowed media MIME types
 */
export type AllowedMediaType = typeof ALLOWED_MEDIA_TYPES[number]

/**
 * Type for supported content types
 */
export type SupportedContentType = typeof SUPPORTED_CONTENT_TYPES[number]

// backend/src/utils/constants.ts
// Version: 1.0.0 - Initial implementation of centralized application constants