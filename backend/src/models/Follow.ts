// backend/src/models/Follow.ts
// Version: 1.0.0
// Initial creation of Follow relationship model for user following system

/**
 * Follow model representing the relationship between users in the ParaSocial platform
 * Handles follower/following relationships with proper ActivityPub support
 */

export interface Follow {
  /** Unique identifier for the follow relationship */
  id: string
  
  /** ID of the user who is following (follower) */
  followerId: string
  
  /** ID of the user being followed (following) */
  followingId: string
  
  /** Timestamp when the follow relationship was created */
  createdAt: Date
  
  /** Timestamp when the follow relationship was last updated */
  updatedAt: Date
  
  /** Status of the follow request (for future private account support) */
  status: FollowStatus
  
  /** ActivityPub activity ID for federation (nullable for local follows) */
  activityId?: string
  
  /** Whether this follow came from a federated instance */
  federated: boolean
  
  /** The instance domain if this is a federated follow */
  federatedDomain?: string
}

/**
 * Possible states of a follow relationship
 */
export enum FollowStatus {
  /** Follow request is pending approval (for private accounts) */
  PENDING = 'PENDING',
  
  /** Follow relationship is active and confirmed */
  ACCEPTED = 'ACCEPTED',
  
  /** Follow request was rejected (for private accounts) */
  REJECTED = 'REJECTED'
}

/**
 * Data required to create a new follow relationship
 */
export interface CreateFollowData {
  /** ID of the user who wants to follow */
  followerId: string
  
  /** ID of the user to be followed */
  followingId: string
  
  /** ActivityPub activity ID for federation */
  activityId?: string
  
  /** Whether this follow is from a federated instance */
  federated?: boolean
  
  /** The domain of the federated instance */
  federatedDomain?: string
}

/**
 * Data for updating a follow relationship status
 */
export interface UpdateFollowData {
  /** New status for the follow relationship */
  status: FollowStatus
  
  /** Updated timestamp */
  updatedAt: Date
}

/**
 * Query parameters for retrieving follow relationships
 */
export interface FollowQuery {
  /** Filter by follower ID */
  followerId?: string
  
  /** Filter by following ID */
  followingId?: string
  
  /** Filter by follow status */
  status?: FollowStatus
  
  /** Filter by federation status */
  federated?: boolean
  
  /** Filter by specific federated domain */
  federatedDomain?: string
  
  /** Limit number of results */
  limit?: number
  
  /** Offset for pagination */
  offset?: number
}

/**
 * Result of follow relationship operations
 */
export interface FollowResult {
  /** Whether the operation was successful */
  success: boolean
  
  /** The follow relationship data */
  follow?: Follow
  
  /** Error message if operation failed */
  error?: string
}

/**
 * Statistics about user follow relationships
 */
export interface FollowStats {
  /** Number of users this user is following */
  followingCount: number
  
  /** Number of users following this user */
  followerCount: number
  
  /** Number of pending follow requests */
  pendingCount: number
}

/**
 * ActivityPub Follow activity data structure
 */
export interface ActivityPubFollow {
  /** ActivityPub context */
  '@context': string
  
  /** Activity ID */
  id: string
  
  /** Activity type (Follow) */
  type: 'Follow'
  
  /** Actor performing the follow */
  actor: string
  
  /** Object being followed */
  object: string
  
  /** Timestamp of the activity */
  published: string
}

/**
 * Validation rules for follow relationships
 */
export const FollowValidation = {
  /** Maximum number of users one user can follow */
  MAX_FOLLOWING: 7500,
  
  /** Maximum number of followers a user can have */
  MAX_FOLLOWERS: 1000000,
  
  /** Minimum time between follow requests to same user (in milliseconds) */
  MIN_FOLLOW_INTERVAL: 1000 * 60 * 5, // 5 minutes
  
  /** Maximum length of federated domain */
  MAX_DOMAIN_LENGTH: 255
} as const